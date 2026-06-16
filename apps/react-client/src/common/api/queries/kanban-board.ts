import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	CreateKanbanBoardBoardRequestDto,
	CreateKanbanBoardProjectRequestDto,
	CreateKanbanBoardTaskRequestDto,
	KanbanBoardBoardDto,
	KanbanBoardData,
	KanbanBoardProjectDto,
	KanbanBoardTaskRecord,
	KanbanBoardTaskRegistryDto,
	UpdateKanbanBoardBoardRequestDto,
	UpdateKanbanBoardProjectRequestDto,
	UpdateKanbanBoardTaskRequestDto,
} from "@smart-anketa/api-contract";
import { apiClient } from "../helpers/apiClient";

export interface KanbanBoardConfig {
	standId: string;
}

export interface KanbanBoardImportResult {
	meta: {
		schemaVersion: number;
		sourceStand: string;
		exportedAt: string;
		rowCount: number;
		sha256: string;
	};
	tasks: KanbanBoardTaskRecord[];
}

const invalidateTracker = (queryClient: ReturnType<typeof useQueryClient>) => {
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardProjects"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardBoards"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardTasksRegistry"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardTasks"] });
};

export const kanbanBoardGetConfig = (signal?: AbortSignal) =>
	apiClient<KanbanBoardConfig>({
		url: "/kanban-board/config",
		method: "GET",
		signal,
	});

export const useKanbanBoardConfig = () =>
	useQuery({
		queryKey: ["kanbanBoardConfig"],
		queryFn: ({ signal }) => kanbanBoardGetConfig(signal),
	});

export const useKanbanBoardProjects = () =>
	useQuery({
		queryKey: ["kanbanBoardProjects"],
		queryFn: ({ signal }) =>
			apiClient<KanbanBoardProjectDto[]>({
				url: "/kanban-board/projects",
				method: "GET",
				signal,
			}),
	});

export const useCreateKanbanBoardProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateKanbanBoardProjectRequestDto) =>
			apiClient<KanbanBoardProjectDto>({
				url: "/kanban-board/projects",
				method: "POST",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useUpdateKanbanBoardProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateKanbanBoardProjectRequestDto;
		}) =>
			apiClient<KanbanBoardProjectDto>({
				url: `/kanban-board/projects/${id}`,
				method: "PUT",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useDeleteKanbanBoardProject = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient<void>({
				url: `/kanban-board/projects/${id}`,
				method: "DELETE",
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useKanbanBoardBoards = () =>
	useQuery({
		queryKey: ["kanbanBoardBoards"],
		queryFn: ({ signal }) =>
			apiClient<KanbanBoardBoardDto[]>({
				url: "/kanban-board/boards",
				method: "GET",
				signal,
			}),
	});

export const useCreateKanbanBoardBoard = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateKanbanBoardBoardRequestDto) =>
			apiClient<KanbanBoardBoardDto>({
				url: "/kanban-board/boards",
				method: "POST",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useUpdateKanbanBoardBoard = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateKanbanBoardBoardRequestDto;
		}) =>
			apiClient<KanbanBoardBoardDto>({
				url: `/kanban-board/boards/${id}`,
				method: "PUT",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useDeleteKanbanBoardBoard = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient<void>({
				url: `/kanban-board/boards/${id}`,
				method: "DELETE",
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useKanbanBoardTasksRegistry = () =>
	useQuery({
		queryKey: ["kanbanBoardTasksRegistry"],
		queryFn: ({ signal }) =>
			apiClient<KanbanBoardTaskRegistryDto[]>({
				url: "/kanban-board/tasks/registry",
				method: "GET",
				signal,
			}),
	});

export const useCreateKanbanBoardTask = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateKanbanBoardTaskRequestDto) =>
			apiClient<KanbanBoardTaskRegistryDto>({
				url: "/kanban-board/tasks",
				method: "POST",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useUpdateKanbanBoardTask = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateKanbanBoardTaskRequestDto;
		}) =>
			apiClient<KanbanBoardTaskRegistryDto>({
				url: `/kanban-board/tasks/${id}`,
				method: "PUT",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useDeleteKanbanBoardTask = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient<void>({
				url: `/kanban-board/tasks/${id}`,
				method: "DELETE",
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const kanbanBoardGetBoardTasks = (boardId: string, signal?: AbortSignal) =>
	apiClient<KanbanBoardTaskRecord[]>({
		url: `/kanban-board/boards/${boardId}/tasks`,
		method: "GET",
		signal,
	});

export const kanbanBoardSaveBoardTasks = (
	boardId: string,
	tasks: KanbanBoardTaskRecord[],
	signal?: AbortSignal,
) =>
	apiClient<KanbanBoardTaskRecord[]>({
		url: `/kanban-board/boards/${boardId}/tasks`,
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		data: tasks,
		signal,
	});

export const kanbanBoardExportBoardSnapshot = (boardId: string, signal?: AbortSignal) =>
	apiClient<Blob>({
		url: `/kanban-board/boards/${boardId}/export`,
		method: "GET",
		signal,
		responseType: "blob",
	});

export const kanbanBoardImportBoardSnapshot = async (
	boardId: string,
	file: File,
	signal?: AbortSignal,
): Promise<KanbanBoardImportResult> => {
	const formData = new FormData();
	formData.append("file", file);
	return apiClient<KanbanBoardImportResult>({
		url: `/kanban-board/boards/${boardId}/import`,
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

export type { KanbanBoardData, KanbanBoardTaskRecord };
