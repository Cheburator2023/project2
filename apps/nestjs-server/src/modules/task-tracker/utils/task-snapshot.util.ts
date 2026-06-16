import { createHash } from "node:crypto";
import * as ExcelJS from "exceljs";
import {
	TASK_TRACKER_SCHEMA_VERSION,
	type SnapshotMeta,
	type TaskRecord,
} from "@smart-anketa/api-contract";

export function canonicalize(rows: TaskRecord[]): TaskRecord[] {
	return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

export function hashPayload(rows: TaskRecord[]): string {
	return createHash("sha256")
		.update(JSON.stringify(canonicalize(rows)))
		.digest("hex");
}

export function buildMeta(rows: TaskRecord[], stand: string): SnapshotMeta {
	return {
		schemaVersion: TASK_TRACKER_SCHEMA_VERSION,
		sourceStand: stand,
		exportedAt: new Date().toISOString(),
		rowCount: rows.length,
		sha256: hashPayload(rows),
	};
}

export async function exportXlsx(
	rows: TaskRecord[],
	stand: string,
): Promise<Buffer> {
	const payload = canonicalize(rows);
	const meta = buildMeta(payload, stand);

	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("tasks");
	worksheet.columns = [
		{ header: "ID", key: "id", width: 28 },
		{ header: "Статус", key: "status", width: 16 },
		{ header: "Поз.", key: "position", width: 8 },
		{ header: "Заголовок", key: "title", width: 40 },
		{ header: "Описание", key: "description", width: 50 },
		{ header: "Приоритет", key: "priority", width: 12 },
		{ header: "Исполнитель", key: "assignee", width: 18 },
		{ header: "Обновлено", key: "updatedAt", width: 24 },
		{ header: "__json", key: "json", width: 10 },
	];

	for (const task of payload) {
		worksheet.addRow({
			id: task.id,
			status: task.parentId,
			position: task.position,
			title: task.content.title,
			description: task.content.description ?? "",
			priority: task.content.priority ?? "",
			assignee: task.content.assignee ?? "",
			updatedAt: task.updatedAt,
			json: JSON.stringify(task),
		});
	}

	worksheet.getColumn("json").hidden = true;
	worksheet.getRow(1).font = { bold: true };
	worksheet.views = [{ state: "frozen", ySplit: 1 }];

	const metaWorksheet = workbook.addWorksheet("_meta");
	metaWorksheet.addRows([
		["schemaVersion", meta.schemaVersion],
		["sourceStand", meta.sourceStand],
		["exportedAt", meta.exportedAt],
		["rowCount", meta.rowCount],
		["sha256", meta.sha256],
	]);
	metaWorksheet.state = "veryHidden";

	return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function importXlsx(
	buf: Buffer,
): Promise<{ meta: SnapshotMeta; payload: TaskRecord[] }> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buf);

	const worksheet = workbook.getWorksheet("tasks");
	if (!worksheet) {
		throw new Error("Лист tasks не найден");
	}

	const header = worksheet.getRow(1);
	let jsonCol = -1;
	header.eachCell((cell, col) => {
		if (cell.value === "__json") jsonCol = col;
	});
	if (jsonCol === -1) {
		throw new Error("Колонка __json не найдена");
	}

	const payload: TaskRecord[] = [];
	worksheet.eachRow((row, idx) => {
		if (idx === 1) return;
		const raw = row.getCell(jsonCol).value;
		if (raw) payload.push(JSON.parse(String(raw)) as TaskRecord);
	});

	const metaWorksheet = workbook.getWorksheet("_meta");
	const map = new Map<string, unknown>();
	metaWorksheet?.eachRow((row) => {
		map.set(String(row.getCell(1).value), row.getCell(2).value);
	});

	const meta: SnapshotMeta = {
		schemaVersion: Number(map.get("schemaVersion") ?? TASK_TRACKER_SCHEMA_VERSION),
		sourceStand: String(map.get("sourceStand") ?? ""),
		exportedAt: String(map.get("exportedAt") ?? ""),
		rowCount: payload.length,
		sha256: String(map.get("sha256") ?? ""),
	};

	return { meta, payload };
}

export class SnapshotIntegrityError extends Error {
	constructor(
		message: string,
		readonly expectedSha256: string,
		readonly actualSha256: string,
	) {
		super(message);
		this.name = "SnapshotIntegrityError";
	}
}

export class SnapshotSchemaError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SnapshotSchemaError";
	}
}

export function assertSnapshotImportable(
	meta: SnapshotMeta,
	payload: TaskRecord[],
): void {
	const actualSha256 = hashPayload(payload);
	if (actualSha256 !== meta.sha256) {
		throw new SnapshotIntegrityError(
			"Integrity check failed",
			meta.sha256,
			actualSha256,
		);
	}

	if (meta.schemaVersion > TASK_TRACKER_SCHEMA_VERSION) {
		throw new SnapshotSchemaError(
			`Снапшот новее, чем приёмник (schemaVersion ${meta.schemaVersion} > ${TASK_TRACKER_SCHEMA_VERSION})`,
		);
	}
}
