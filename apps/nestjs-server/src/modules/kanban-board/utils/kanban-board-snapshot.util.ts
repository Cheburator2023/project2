import { createHash } from "node:crypto";
import * as ExcelJS from "exceljs";
import {
	KANBAN_BOARD_SCHEMA_VERSION,
	kanbanBoardTaskAssigneesTitle,
	type KanbanBoardSnapshotMeta,
	type KanbanBoardTaskRecord,
} from "@smart-anketa/api-contract";

export function canonicalize(
	rows: KanbanBoardTaskRecord[],
): KanbanBoardTaskRecord[] {
	return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

export function hashPayload(rows: KanbanBoardTaskRecord[]): string {
	return createHash("sha256")
		.update(JSON.stringify(canonicalize(rows)))
		.digest("hex");
}

export function buildMeta(
	rows: KanbanBoardTaskRecord[],
	stand: string,
): KanbanBoardSnapshotMeta {
	return {
		schemaVersion: KANBAN_BOARD_SCHEMA_VERSION,
		sourceStand: stand,
		exportedAt: new Date().toISOString(),
		rowCount: rows.length,
		sha256: hashPayload(rows),
	};
}

export async function exportXlsx(
	rows: KanbanBoardTaskRecord[],
	stand: string,
): Promise<Buffer> {
	const payload = canonicalize(rows);
	const meta = buildMeta(payload, stand);

	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet("kanban_board_tasks");
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
			assignee: kanbanBoardTaskAssigneesTitle(task.content),
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

const WORKSHEET_NAMES = ["kanban_board_tasks", "tasks"] as const;

export async function importXlsx(
	buf: Buffer,
): Promise<{ meta: KanbanBoardSnapshotMeta; payload: KanbanBoardTaskRecord[] }> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buf);

	const worksheet = WORKSHEET_NAMES.map((name) =>
		workbook.getWorksheet(name),
	).find(Boolean);
	if (!worksheet) {
		throw new Error("Лист kanban_board_tasks не найден");
	}

	const header = worksheet.getRow(1);
	let jsonCol = -1;
	header.eachCell((cell, col) => {
		if (cell.value === "__json") jsonCol = col;
	});
	if (jsonCol === -1) {
		throw new Error("Колонка __json не найдена");
	}

	const payload: KanbanBoardTaskRecord[] = [];
	worksheet.eachRow((row, idx) => {
		if (idx === 1) return;
		const raw = row.getCell(jsonCol).value;
		if (raw) payload.push(JSON.parse(String(raw)) as KanbanBoardTaskRecord);
	});

	const metaWorksheet = workbook.getWorksheet("_meta");
	const map = new Map<string, unknown>();
	metaWorksheet?.eachRow((row) => {
		map.set(String(row.getCell(1).value), row.getCell(2).value);
	});

	const meta: KanbanBoardSnapshotMeta = {
		schemaVersion: Number(
			map.get("schemaVersion") ?? KANBAN_BOARD_SCHEMA_VERSION,
		),
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
	meta: KanbanBoardSnapshotMeta,
	payload: KanbanBoardTaskRecord[],
): void {
	const actualSha256 = hashPayload(payload);
	if (actualSha256 !== meta.sha256) {
		throw new SnapshotIntegrityError(
			"Integrity check failed",
			meta.sha256,
			actualSha256,
		);
	}

	if (meta.schemaVersion > KANBAN_BOARD_SCHEMA_VERSION) {
		throw new SnapshotSchemaError(
			`Снапшот новее, чем приёмник (schemaVersion ${meta.schemaVersion} > ${KANBAN_BOARD_SCHEMA_VERSION})`,
		);
	}
}
