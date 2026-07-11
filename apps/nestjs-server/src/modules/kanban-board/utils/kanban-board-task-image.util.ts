import {
	KANBAN_BOARD_DONE_COLUMN_ID,
	KANBAN_BOARD_TASK_IMAGE_DONE_RETENTION_DAYS,
} from "@smart-anketa/api-contract";
import { join } from "node:path";

export function kanbanBoardTaskImageExtension(
	mimeType: string,
): "png" | "webp" {
	return mimeType === "image/png" ? "png" : "webp";
}

export function kanbanBoardTaskImageStoragePaths(
	uploadRoot: string,
	row: { id: string; taskId: string; mimeType: string },
): { fullPath: string; thumbPath: string } {
	const ext = kanbanBoardTaskImageExtension(row.mimeType);
	const taskDir = join(uploadRoot, row.taskId);
	return {
		fullPath: join(taskDir, `${row.id}-full.${ext}`),
		thumbPath: join(taskDir, `${row.id}-thumb.${ext}`),
	};
}

/** Порядок: канонический путь в uploadRoot, затем сохранённый абсолютный/относительный. */
export function kanbanBoardTaskImageReadCandidates(
	uploadRoot: string,
	row: {
		id: string;
		taskId: string;
		mimeType: string;
		fullPath: string;
		thumbPath: string;
	},
	variant: "full" | "thumb",
): string[] {
	const canonical = kanbanBoardTaskImageStoragePaths(uploadRoot, row);
	const stored = variant === "thumb" ? row.thumbPath : row.fullPath;
	const candidates = [
		variant === "thumb" ? canonical.thumbPath : canonical.fullPath,
		stored,
	];
	if (stored && !stored.startsWith("/") && !/^[A-Za-z]:\\/.test(stored)) {
		candidates.push(join(uploadRoot, stored));
	}
	return [...new Set(candidates.filter(Boolean))];
}

export function kanbanBoardTaskImageRefsEqual(
	left: Array<{ id: string }>,
	right: Array<{ id: string }>,
): boolean {
	if (left.length !== right.length) return false;
	return left.every((item, index) => item.id === right[index]?.id);
}

export function kanbanBoardIsDoneColumn(
	column: Pick<{ id: string; title: string }, "id" | "title">,
): boolean {
	if (column.id === KANBAN_BOARD_DONE_COLUMN_ID) return true;
	return column.title.trim().toLowerCase() === "готово";
}

export function kanbanBoardTaskImageDoneRetentionDays(
	envValue: string | undefined,
): number {
	if (!envValue?.trim()) return KANBAN_BOARD_TASK_IMAGE_DONE_RETENTION_DAYS;
	const parsed = Number(envValue);
	if (!Number.isFinite(parsed) || parsed < 1) {
		return KANBAN_BOARD_TASK_IMAGE_DONE_RETENTION_DAYS;
	}
	return Math.floor(parsed);
}

export function kanbanBoardTaskImageCleanupCutoffIso(retentionDays: number): string {
	return new Date(
		Date.now() - retentionDays * 24 * 60 * 60 * 1000,
	).toISOString();
}
