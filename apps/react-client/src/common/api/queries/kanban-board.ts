import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	AssignKanbanBoardTasksToBoardRequestDto,
	AssignKanbanBoardTasksToBoardResultDto,
	CreateKanbanBoardAssigneeRequestDto,
	CreateKanbanBoardBoardRequestDto,
	CreateKanbanBoardColumnRequestDto,
	CreateKanbanBoardCustomerRequestDto,
	CreateKanbanBoardProjectRequestDto,
	CreateKanbanBoardSprintRequestDto,
	CreateKanbanBoardStreamRequestDto,
	CreateKanbanBoardSupersprintRequestDto,
	CreateKanbanBoardTaskRequestDto,
	KanbanBoardAssigneeDto,
	KanbanBoardBoardDto,
	KanbanBoardColumnDto,
	KanbanBoardCustomerDto,
	KanbanBoardData,
	KanbanBoardPlanningImportResultDto,
	KanbanBoardProjectDto,
	KanbanBoardSprintDto,
	KanbanBoardSettingsDto,
	KanbanBoardStreamDto,
	KanbanBoardSupersprintDto,
	KanbanBoardTaskRecord,
	KanbanBoardTaskRegistryDto,
	KanbanBoardTaskImageDto,
	KanbanBoardTaskCommentDto,
	CreateKanbanBoardTaskCommentRequestDto,
	KanbanBoardHistoryDto,
	KanbanBoardHistoryOverviewDto,
	UpdateKanbanBoardAssigneeRequestDto,
	UpdateKanbanBoardBoardRequestDto,
	UpdateKanbanBoardColumnRequestDto,
	UpdateKanbanBoardCustomerRequestDto,
	UpdateKanbanBoardProjectRequestDto,
	UpdateKanbanBoardSettingsRequestDto,
	UpdateKanbanBoardSprintRequestDto,
	UpdateKanbanBoardStreamRequestDto,
	UpdateKanbanBoardSupersprintRequestDto,
	UpdateKanbanBoardTaskRequestDto,
	ResetKanbanBoardColumnsResultDto,
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
	importFormat?: "snapshot" | "planning";
	warnings?: string[];
}

const invalidateTracker = (queryClient: ReturnType<typeof useQueryClient>) => {
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardProjects"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardBoards"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardColumns"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardAssignees"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardCustomers"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardSupersprints"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardSprints"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardStreams"] });
	queryClient.invalidateQueries({ queryKey: ["kanbanBoardSettings"] });
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

export const useKanbanBoardAssignees = () =>
	useQuery({
		queryKey: ["kanbanBoardAssignees"],
		queryFn: ({ signal }) =>
			apiClient<KanbanBoardAssigneeDto[]>({
				url: "/kanban-board/assignees",
				method: "GET",
				signal,
			}),
	});

export const useCreateKanbanBoardAssignee = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateKanbanBoardAssigneeRequestDto) =>
			apiClient<KanbanBoardAssigneeDto>({
				url: "/kanban-board/assignees",
				method: "POST",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useUpdateKanbanBoardAssignee = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateKanbanBoardAssigneeRequestDto;
		}) =>
			apiClient<KanbanBoardAssigneeDto>({
				url: `/kanban-board/assignees/${id}`,
				method: "PUT",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useDeleteKanbanBoardAssignee = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient<void>({
				url: `/kanban-board/assignees/${id}`,
				method: "DELETE",
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useKanbanBoardCustomers = () =>
	useQuery({
		queryKey: ["kanbanBoardCustomers"],
		queryFn: ({ signal }) =>
			apiClient<KanbanBoardCustomerDto[]>({
				url: "/kanban-board/customers",
				method: "GET",
				signal,
			}),
	});

export const useCreateKanbanBoardCustomer = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateKanbanBoardCustomerRequestDto) =>
			apiClient<KanbanBoardCustomerDto>({
				url: "/kanban-board/customers",
				method: "POST",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useUpdateKanbanBoardCustomer = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateKanbanBoardCustomerRequestDto;
		}) =>
			apiClient<KanbanBoardCustomerDto>({
				url: `/kanban-board/customers/${id}`,
				method: "PUT",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useDeleteKanbanBoardCustomer = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient<void>({
				url: `/kanban-board/customers/${id}`,
				method: "DELETE",
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useKanbanBoardSettings = () =>
	useQuery({
		queryKey: ["kanbanBoardSettings"],
		queryFn: ({ signal }) =>
			apiClient<KanbanBoardSettingsDto>({
				url: "/kanban-board/settings",
				method: "GET",
				signal,
			}),
	});

export const useUpdateKanbanBoardSettings = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: UpdateKanbanBoardSettingsRequestDto) =>
			apiClient<KanbanBoardSettingsDto>({
				url: "/kanban-board/settings",
				method: "PUT",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useKanbanBoardSupersprints = () =>
	useQuery({
		queryKey: ["kanbanBoardSupersprints"],
		queryFn: ({ signal }) =>
			apiClient<KanbanBoardSupersprintDto[]>({
				url: "/kanban-board/supersprints",
				method: "GET",
				signal,
			}),
	});

export const useCreateKanbanBoardSupersprint = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateKanbanBoardSupersprintRequestDto) =>
			apiClient<KanbanBoardSupersprintDto>({
				url: "/kanban-board/supersprints",
				method: "POST",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useUpdateKanbanBoardSupersprint = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateKanbanBoardSupersprintRequestDto;
		}) =>
			apiClient<KanbanBoardSupersprintDto>({
				url: `/kanban-board/supersprints/${id}`,
				method: "PUT",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useDeleteKanbanBoardSupersprint = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient<void>({
				url: `/kanban-board/supersprints/${id}`,
				method: "DELETE",
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useKanbanBoardSprints = () =>
	useQuery({
		queryKey: ["kanbanBoardSprints"],
		queryFn: ({ signal }) =>
			apiClient<KanbanBoardSprintDto[]>({
				url: "/kanban-board/sprints",
				method: "GET",
				signal,
			}),
	});

export const useCreateKanbanBoardSprint = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateKanbanBoardSprintRequestDto) =>
			apiClient<KanbanBoardSprintDto>({
				url: "/kanban-board/sprints",
				method: "POST",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useUpdateKanbanBoardSprint = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateKanbanBoardSprintRequestDto;
		}) =>
			apiClient<KanbanBoardSprintDto>({
				url: `/kanban-board/sprints/${id}`,
				method: "PUT",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useDeleteKanbanBoardSprint = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient<void>({
				url: `/kanban-board/sprints/${id}`,
				method: "DELETE",
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useKanbanBoardStreams = () =>
	useQuery({
		queryKey: ["kanbanBoardStreams"],
		queryFn: ({ signal }) =>
			apiClient<KanbanBoardStreamDto[]>({
				url: "/kanban-board/streams",
				method: "GET",
				signal,
			}),
	});

export const useCreateKanbanBoardStream = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateKanbanBoardStreamRequestDto) =>
			apiClient<KanbanBoardStreamDto>({
				url: "/kanban-board/streams",
				method: "POST",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useUpdateKanbanBoardStream = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateKanbanBoardStreamRequestDto;
		}) =>
			apiClient<KanbanBoardStreamDto>({
				url: `/kanban-board/streams/${id}`,
				method: "PUT",
				data,
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const useDeleteKanbanBoardStream = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient<void>({
				url: `/kanban-board/streams/${id}`,
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

export const kanbanBoardExportTasksRegistry = (signal?: AbortSignal) =>
	apiClient<Blob>({
		url: "/kanban-board/tasks/registry/export",
		method: "GET",
		signal,
		responseType: "blob",
	});

export const kanbanBoardExportSprintsRegistry = (signal?: AbortSignal) =>
	apiClient<Blob>({
		url: "/kanban-board/sprints/export",
		method: "GET",
		signal,
		responseType: "blob",
	});

export const kanbanBoardExportSupersprintsRegistry = (signal?: AbortSignal) =>
	apiClient<Blob>({
		url: "/kanban-board/supersprints/export",
		method: "GET",
		signal,
		responseType: "blob",
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

export const kanbanBoardImportPlanningTasks = async (
	file: File,
	signal?: AbortSignal,
): Promise<KanbanBoardPlanningImportResultDto> => {
	const formData = new FormData();
	formData.append("file", file);
	return apiClient<KanbanBoardPlanningImportResultDto>({
		url: "/kanban-board/tasks/import-planning",
		method: "POST",
		data: formData,
		signal,
		timeout: 120_000,
	});
};

export const useKanbanBoardImportPlanningTasks = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (file: File) => kanbanBoardImportPlanningTasks(file),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const kanbanBoardAssignTasksToBoard = (
	data: AssignKanbanBoardTasksToBoardRequestDto,
	signal?: AbortSignal,
) =>
	apiClient<AssignKanbanBoardTasksToBoardResultDto>({
		url: "/kanban-board/tasks/assign-board",
		method: "POST",
		data,
		signal,
	});

export const useAssignKanbanBoardTasksToBoard = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: AssignKanbanBoardTasksToBoardRequestDto) =>
			kanbanBoardAssignTasksToBoard(data),
		onSuccess: (_result, variables) => {
			invalidateTracker(queryClient);
			queryClient.invalidateQueries({
				queryKey: ["kanbanBoardTasks", variables.boardId],
			});
		},
	});
};

export const kanbanBoardGetBoardColumns = (
	boardId: string,
	signal?: AbortSignal,
) =>
	apiClient<KanbanBoardColumnDto[]>({
		url: `/kanban-board/boards/${boardId}/columns`,
		method: "GET",
		signal,
	});

export const useKanbanBoardColumns = (boardId: string) =>
	useQuery({
		queryKey: ["kanbanBoardColumns", boardId],
		enabled: Boolean(boardId),
		queryFn: ({ signal }) => kanbanBoardGetBoardColumns(boardId, signal),
	});

export const useCreateKanbanBoardColumn = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			boardId,
			data,
		}: {
			boardId: string;
			data: CreateKanbanBoardColumnRequestDto;
		}) =>
			apiClient<KanbanBoardColumnDto>({
				url: `/kanban-board/boards/${boardId}/columns`,
				method: "POST",
				data,
			}),
		onSuccess: (_column, { boardId }) => {
			queryClient.invalidateQueries({ queryKey: ["kanbanBoardColumns", boardId] });
		},
	});
};

export const useUpdateKanbanBoardColumn = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			boardId,
			columnId,
			data,
		}: {
			boardId: string;
			columnId: string;
			data: UpdateKanbanBoardColumnRequestDto;
		}) =>
			apiClient<KanbanBoardColumnDto>({
				url: `/kanban-board/boards/${boardId}/columns/${columnId}`,
				method: "PUT",
				data,
			}),
		onSuccess: (_column, { boardId }) => {
			queryClient.invalidateQueries({ queryKey: ["kanbanBoardColumns", boardId] });
		},
	});
};

export const useDeleteKanbanBoardColumn = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			boardId,
			columnId,
		}: {
			boardId: string;
			columnId: string;
		}) =>
			apiClient<void>({
				url: `/kanban-board/boards/${boardId}/columns/${columnId}`,
				method: "DELETE",
			}),
		onSuccess: (_result, { boardId }) => {
			queryClient.invalidateQueries({ queryKey: ["kanbanBoardColumns", boardId] });
		},
	});
};

export const useResetKanbanBoardColumnsToDefault = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () =>
			apiClient<ResetKanbanBoardColumnsResultDto>({
				url: "/kanban-board/columns/reset-default",
				method: "POST",
			}),
		onSuccess: () => invalidateTracker(queryClient),
	});
};

export const kanbanBoardGetTaskByRef = (ref: string, signal?: AbortSignal) =>
	apiClient<KanbanBoardTaskRegistryDto>({
		url: `/kanban-board/tasks/ref/${encodeURIComponent(ref)}`,
		method: "GET",
		signal,
	});

export const useKanbanBoardTaskByRef = (ref: string | undefined) =>
	useQuery({
		queryKey: ["kanbanBoardTaskRef", ref],
		enabled: Boolean(ref),
		queryFn: ({ signal }) => kanbanBoardGetTaskByRef(ref!, signal),
	});

export const kanbanBoardListTaskImages = (
	taskId: string,
	signal?: AbortSignal,
) =>
	apiClient<KanbanBoardTaskImageDto[]>({
		url: `/kanban-board/tasks/${taskId}/images`,
		method: "GET",
		signal,
	});

export const useKanbanBoardTaskImages = (taskId: string | undefined) =>
	useQuery({
		queryKey: ["kanbanBoardTaskImages", taskId],
		enabled: Boolean(taskId),
		queryFn: ({ signal }) => kanbanBoardListTaskImages(taskId!, signal),
	});

export const kanbanBoardFetchTaskImageBlob = async (
	taskId: string,
	imageId: string,
	variant: "full" | "thumb" = "full",
	signal?: AbortSignal,
): Promise<Blob> => {
	const blob = await apiClient<Blob>({
		url: `/kanban-board/tasks/${taskId}/images/${imageId}`,
		method: "GET",
		params: { variant },
		responseType: "blob",
		signal,
	});
	if (
		!blob.size ||
		blob.type === "application/json" ||
		blob.type === "application/problem+json"
	) {
		throw new Error("Не удалось загрузить изображение");
	}
	return blob;
};

export type KanbanBoardTaskImageUploadPayload = {
	name: string;
	mimeType: string;
	width: number;
	height: number;
	full: Blob;
	thumb: Blob;
};

export const kanbanBoardUploadTaskImage = async (
	taskId: string,
	prepared: KanbanBoardTaskImageUploadPayload,
	signal?: AbortSignal,
): Promise<KanbanBoardTaskImageDto> => {
	const formData = new FormData();
	formData.append("full", prepared.full, "full");
	formData.append("thumb", prepared.thumb, "thumb");
	formData.append("name", prepared.name);
	formData.append("mimeType", prepared.mimeType);
	formData.append("width", String(prepared.width));
	formData.append("height", String(prepared.height));
	return apiClient<KanbanBoardTaskImageDto>({
		url: `/kanban-board/tasks/${taskId}/images`,
		method: "POST",
		data: formData,
		signal,
		timeout: 120_000,
	});
};

export const useUploadKanbanBoardTaskImage = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			taskId,
			prepared,
		}: {
			taskId: string;
			prepared: KanbanBoardTaskImageUploadPayload;
		}) => kanbanBoardUploadTaskImage(taskId, prepared),
		onSuccess: (_image, { taskId }) => {
			invalidateTracker(queryClient);
			queryClient.invalidateQueries({
				queryKey: ["kanbanBoardTaskImages", taskId],
			});
			queryClient.invalidateQueries({ queryKey: ["kanbanBoardTaskRef"] });
		},
	});
};

export const useDeleteKanbanBoardTaskImage = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			taskId,
			imageId,
		}: {
			taskId: string;
			imageId: string;
		}) =>
			apiClient<void>({
				url: `/kanban-board/tasks/${taskId}/images/${imageId}`,
				method: "DELETE",
			}),
		onSuccess: (_result, { taskId }) => {
			invalidateTracker(queryClient);
			queryClient.invalidateQueries({
				queryKey: ["kanbanBoardTaskImages", taskId],
			});
			queryClient.invalidateQueries({ queryKey: ["kanbanBoardTaskRef"] });
		},
	});
};

export const kanbanBoardListTaskComments = (
	taskId: string,
	signal?: AbortSignal,
) =>
	apiClient<KanbanBoardTaskCommentDto[]>({
		url: `/kanban-board/tasks/${taskId}/comments`,
		method: "GET",
		signal,
	});

export const useKanbanBoardTaskComments = (taskId: string | undefined) =>
	useQuery({
		queryKey: ["kanbanBoardTaskComments", taskId],
		enabled: Boolean(taskId),
		queryFn: ({ signal }) => kanbanBoardListTaskComments(taskId!, signal),
	});

export const useCreateKanbanBoardTaskComment = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			taskId,
			data,
		}: {
			taskId: string;
			data: CreateKanbanBoardTaskCommentRequestDto;
		}) =>
			apiClient<KanbanBoardTaskCommentDto>({
				url: `/kanban-board/tasks/${taskId}/comments`,
				method: "POST",
				data,
			}),
		onSuccess: (_comment, { taskId }) => {
			queryClient.invalidateQueries({
				queryKey: ["kanbanBoardTaskComments", taskId],
			});
		},
	});
};

export const useDeleteKanbanBoardTaskComment = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({
			taskId,
			commentId,
		}: {
			taskId: string;
			commentId: string;
		}) =>
			apiClient<void>({
				url: `/kanban-board/tasks/${taskId}/comments/${commentId}`,
				method: "DELETE",
			}),
		onSuccess: (_result, { taskId }) => {
			queryClient.invalidateQueries({
				queryKey: ["kanbanBoardTaskComments", taskId],
			});
		},
	});
};

export const kanbanBoardGetBoardByRef = (ref: string, signal?: AbortSignal) =>
	apiClient<KanbanBoardBoardDto>({
		url: `/kanban-board/boards/ref/${encodeURIComponent(ref)}`,
		method: "GET",
		signal,
	});

export const kanbanBoardGetBoardHistory = (
	boardRef: string,
	signal?: AbortSignal,
) =>
	apiClient<KanbanBoardHistoryDto>({
		url: `/kanban-board/boards/${encodeURIComponent(boardRef)}/history`,
		method: "GET",
		signal,
	});

export const kanbanBoardGetHistoryOverview = (signal?: AbortSignal) =>
	apiClient<KanbanBoardHistoryOverviewDto>({
		url: "/kanban-board/history/overview",
		method: "GET",
		signal,
	});

export const useKanbanBoardHistory = (boardRef: string | undefined) =>
	useQuery({
		queryKey: ["kanbanBoardHistory", boardRef],
		enabled: Boolean(boardRef),
		queryFn: ({ signal }) => kanbanBoardGetBoardHistory(boardRef!, signal),
	});

export const useKanbanBoardHistoryOverview = () =>
	useQuery({
		queryKey: ["kanbanBoardHistoryOverview"],
		queryFn: ({ signal }) => kanbanBoardGetHistoryOverview(signal),
	});

export const kanbanBoardGetBoardTasks = (boardRef: string, signal?: AbortSignal) =>
	apiClient<KanbanBoardTaskRecord[]>({
		url: `/kanban-board/boards/${boardRef}/tasks`,
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

export type { KanbanBoardColumnDto, KanbanBoardData, KanbanBoardTaskRecord };
