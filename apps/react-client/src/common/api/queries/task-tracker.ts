import type { KanbanBoardData, TaskRecord } from "@smart-anketa/api-contract";
import { apiClient } from "../helpers/apiClient";

export interface TaskTrackerConfig {
	standId: string;
}

export interface TaskTrackerImportResult {
	meta: {
		schemaVersion: number;
		sourceStand: string;
		exportedAt: string;
		rowCount: number;
		sha256: string;
	};
	tasks: TaskRecord[];
}

export interface TaskTrackerImportError {
	message: string;
	expectedSha256?: string;
	actualSha256?: string;
}

export const taskTrackerGetConfig = (signal?: AbortSignal) =>
	apiClient<TaskTrackerConfig>({
		url: "/task-tracker/config",
		method: "GET",
		signal,
	});

export const taskTrackerGetTasks = (signal?: AbortSignal) =>
	apiClient<TaskRecord[]>({
		url: "/task-tracker/tasks",
		method: "GET",
		signal,
	});

export const taskTrackerSaveTasks = (tasks: TaskRecord[], signal?: AbortSignal) =>
	apiClient<TaskRecord[]>({
		url: "/task-tracker/tasks",
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		data: tasks,
		signal,
	});

export const taskTrackerDeleteTask = (id: string, signal?: AbortSignal) =>
	apiClient<void>({
		url: `/task-tracker/tasks/${id}`,
		method: "DELETE",
		signal,
	});

export const taskTrackerExportSnapshot = (signal?: AbortSignal) =>
	apiClient<Blob>({
		url: "/task-tracker/export",
		method: "GET",
		signal,
		responseType: "blob",
	});

export const taskTrackerImportSnapshot = async (
	file: File,
	signal?: AbortSignal,
): Promise<TaskTrackerImportResult> => {
	const formData = new FormData();
	formData.append("file", file);
	return apiClient<TaskTrackerImportResult>({
		url: "/task-tracker/import",
		method: "POST",
		data: formData,
		signal,
	});
};

export const downloadBlob = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
};

export type { KanbanBoardData, TaskRecord };
