import * as ExcelJS from "exceljs";
import {
	type KanbanBoardSnapshotMeta,
	type KanbanBoardTaskRecord,
} from "@smart-anketa/api-contract";
import {
	isSnapshotWorkbook,
	parsePlanningWorkbook,
	type PlanningImportColumnRef,
} from "./kanban-board-planning-import.util";
import {
	assertSnapshotImportable,
	buildMeta,
	importXlsx,
} from "./kanban-board-snapshot.util";

export type KanbanBoardImportFormat = "snapshot" | "planning";

export interface KanbanBoardImportOptions {
	boardId: string;
	standId: string;
	columns: PlanningImportColumnRef[];
}

export interface KanbanBoardImportResult {
	format: KanbanBoardImportFormat;
	meta: KanbanBoardSnapshotMeta;
	payload: KanbanBoardTaskRecord[];
	warnings: string[];
}

export async function importBoardXlsx(
	buf: Buffer,
	options: KanbanBoardImportOptions,
): Promise<KanbanBoardImportResult> {
	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.load(buf);

	if (isSnapshotWorkbook(workbook)) {
		const { meta, payload } = await importXlsx(buf);
		assertSnapshotImportable(meta, payload);
		return { format: "snapshot", meta, payload, warnings: [] };
	}

	const planning = parsePlanningWorkbook(workbook, options);
	const meta = buildMeta(planning.payload, options.standId);
	return {
		format: "planning",
		meta,
		payload: planning.payload,
		warnings: planning.warnings,
	};
}
