import {
	KANBAN_BOARD_TASK_IMAGE_DONE_RETENTION_DAYS,
	kanbanBoardIsDoneColumn,
} from "@smart-anketa/api-contract";
import { join } from "node:path";

export { kanbanBoardIsDoneColumn };

const KANBAN_TASK_IMAGES_DIR_MARKER = "kanban-task-images";

export function kanbanBoardTaskImageExtension(
	mimeType: string,
): "png" | "webp" {
	return mimeType === "image/png" ? "png" : "webp";
}

export function kanbanBoardTaskImageExtensions(): Array<"png" | "webp"> {
	return ["webp", "png"];
}

/** Из абсолютного пути вида …/kanban-task-images/{taskId}/{file} → {taskId}/{file}. */
export function kanbanBoardTaskImageRelativeFromStored(
	stored: string,
): string | null {
	if (!stored?.trim()) return null;
	const normalized = stored.replace(/\\/g, "/");
	const marker = `/${KANBAN_TASK_IMAGES_DIR_MARKER}/`;
	const idx = normalized.indexOf(marker);
	if (idx === -1) return null;
	return normalized.slice(idx + marker.length);
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

/** Порядок: blob в БД не здесь; файлы — канонический путь, stored, relative из stored, alt ext. */
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
	const suffix = variant === "thumb" ? "thumb" : "full";
	const candidates: string[] = [
		variant === "thumb" ? canonical.thumbPath : canonical.fullPath,
		stored,
	];

	const relativeFromStored = kanbanBoardTaskImageRelativeFromStored(stored);
	if (relativeFromStored) {
		candidates.push(join(uploadRoot, relativeFromStored));
	}
	if (stored && !stored.startsWith("/") && !/^[A-Za-z]:\\/.test(stored)) {
		candidates.push(join(uploadRoot, stored));
	}

	const taskDir = join(uploadRoot, row.taskId);
	for (const ext of kanbanBoardTaskImageExtensions()) {
		candidates.push(join(taskDir, `${row.id}-${suffix}.${ext}`));
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
