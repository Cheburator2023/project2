import {
	KANBAN_BOARD_TASK_FILE_ALLOWED_MIME,
	type KanbanBoardTaskFileRef,
} from "@smart-anketa/api-contract";
import { extname } from "node:path";

const ALLOWED_MIME = new Set<string>(
	KANBAN_BOARD_TASK_FILE_ALLOWED_MIME.map((item) => item.toLowerCase()),
);

const EXT_TO_MIME: Record<string, string> = {
	".pdf": "application/pdf",
	".doc": "application/msword",
	".docx":
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	".xls": "application/vnd.ms-excel",
	".xlsx":
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	".ppt": "application/vnd.ms-powerpoint",
	".pptx":
		"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	".odt": "application/vnd.oasis.opendocument.text",
	".ods": "application/vnd.oasis.opendocument.spreadsheet",
	".odp": "application/vnd.oasis.opendocument.presentation",
	".rtf": "application/rtf",
	".txt": "text/plain",
	".csv": "text/csv",
};

export function resolveKanbanBoardTaskFileMime(
	mimeType: string | undefined,
	fileName: string,
): string {
	const normalized = (mimeType ?? "").trim().toLowerCase();
	if (normalized && normalized !== "application/octet-stream") {
		return normalized;
	}
	const ext = extname(fileName).toLowerCase();
	return EXT_TO_MIME[ext] ?? (normalized || "application/octet-stream");
}

export function isAllowedKanbanBoardTaskFile(
	mimeType: string,
	fileName: string,
): boolean {
	const resolved = resolveKanbanBoardTaskFileMime(mimeType, fileName);
	if (ALLOWED_MIME.has(resolved)) return true;
	const ext = extname(fileName).toLowerCase();
	return Boolean(EXT_TO_MIME[ext]);
}

export function kanbanBoardTaskFileExtension(fileName: string, mimeType: string): string {
	const fromName = extname(fileName).replace(/^\./, "").toLowerCase();
	if (fromName) return fromName.slice(0, 16);
	if (mimeType.includes("pdf")) return "pdf";
	if (mimeType.includes("wordprocessingml") || mimeType.includes("msword")) {
		return "docx";
	}
	if (mimeType.includes("spreadsheetml") || mimeType.includes("ms-excel")) {
		return "xlsx";
	}
	if (mimeType.includes("presentationml") || mimeType.includes("ms-powerpoint")) {
		return "pptx";
	}
	return "bin";
}

export function kanbanBoardTaskFileRefsEqual(
	left: readonly KanbanBoardTaskFileRef[],
	right: readonly KanbanBoardTaskFileRef[],
): boolean {
	if (left.length !== right.length) return false;
	return left.every((item, index) => {
		const other = right[index];
		return (
			item.id === other?.id &&
			item.name === other?.name &&
			item.mimeType === other?.mimeType &&
			item.byteSize === other?.byteSize
		);
	});
}
