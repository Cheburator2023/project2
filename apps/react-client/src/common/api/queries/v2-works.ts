import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	CreateV2TypicalWorkRequestDto,
	CreateV2TypicalWorkParameterRequestDto,
	CreateV2TypicalWorkParameterValueRequestDto,
	PatchV2TypicalWorkRequestDto,
	UpdateV2TypicalWorkParameterRequestDto,
	UpdateV2TypicalWorkParameterValueRequestDto,
	V2ParameterDependencyListResponseDto,
	V2TypicalWorkCardDto,
	V2TypicalWorkListResponseDto,
	V2TypicalWorkParameterDto,
	V2TypicalWorkParameterListResponseDto,
	V2TypicalWorkParameterValueDto,
	V2TypicalWorkPreviewRequestDto,
	V2TypicalWorkPreviewResponseDto,
	V2TypicalWorkCatalogListResponseDto,
	V2TypicalWorkAssignmentListResponseDto,
	CreateV2TypicalWorkAssignmentRequestDto,
	CopyV2TypicalWorkRequestDto,
	V2TypicalWorkAssignmentDto,
} from "@smart-anketa/api-contract";
import { apiClient } from "../helpers/apiClient";

export const useV2TypicalWorksCatalog = (params?: {
	templateId?: string | null;
}) => {
	const scoped = params != null && "templateId" in params;
	const templateId = params?.templateId?.trim() ?? "";
	const qs = templateId ? `?templateId=${encodeURIComponent(templateId)}` : "";

	return useQuery<V2TypicalWorkCatalogListResponseDto>({
		queryKey: ["v2-works", "catalog", templateId],
		queryFn: () =>
			apiClient({
				url: `/v2/works/catalog${qs}`,
				method: "GET",
			}),
		enabled: scoped ? Boolean(templateId) : true,
	});
};

export const useV2TypicalWorkAssignments = (params?: {
	workId?: string;
	streamExecutor?: string;
	archComponentType?: string;
	templateVersionId?: string | null;
}) => {
	const search = new URLSearchParams();
	if (params?.workId) search.set("workId", params.workId);
	if (params?.streamExecutor)
		search.set("streamExecutor", params.streamExecutor);
	if (params?.archComponentType)
		search.set("archComponentType", params.archComponentType);
	if (params?.templateVersionId)
		search.set("templateVersionId", params.templateVersionId);
	const qs = search.toString();

	return useQuery<V2TypicalWorkAssignmentListResponseDto>({
		queryKey: [
			"v2-works",
			"assignments",
			params?.workId ?? "",
			params?.streamExecutor ?? "",
			params?.archComponentType ?? "",
			params?.templateVersionId ?? "",
		],
		queryFn: () =>
			apiClient({
				url: `/v2/works/assignments/list${qs ? `?${qs}` : ""}`,
				method: "GET",
			}),
	});
};

export const useCreateV2TypicalWorkAssignment = () => {
	const queryClient = useQueryClient();
	return useMutation<
		V2TypicalWorkAssignmentDto,
		Error,
		CreateV2TypicalWorkAssignmentRequestDto
	>({
		mutationFn: (dto) =>
			apiClient({
				url: "/v2/works/assignments",
				method: "POST",
				data: dto,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-works"] });
		},
	});
};

export const useV2TypicalWorksList = (params?: {
	archComponentType?: string;
	streamExecutor?: string;
	templateId?: string | null;
}) => {
	const scoped = params != null && "templateId" in params;
	const templateId = params?.templateId?.trim() ?? "";
	const search = new URLSearchParams();
	if (params?.archComponentType) {
		search.set("archComponentType", params.archComponentType);
	}
	if (params?.streamExecutor) {
		search.set("streamExecutor", params.streamExecutor);
	}
	if (templateId) {
		search.set("templateId", templateId);
	}
	const qs = search.toString();

	return useQuery<V2TypicalWorkListResponseDto>({
		queryKey: [
			"v2-works",
			params?.archComponentType ?? "",
			params?.streamExecutor ?? "",
			templateId,
		],
		queryFn: () =>
			apiClient<V2TypicalWorkListResponseDto>({
				url: `/v2/works${qs ? `?${qs}` : ""}`,
				method: "GET",
			}),
		enabled: scoped ? Boolean(templateId) : true,
	});
};

export const useV2TypicalWorkCard = (
	workId: string | null,
	streamExecutor: string | null,
	templateVersionId?: string | null,
) => {
	const search = new URLSearchParams();
	if (streamExecutor) search.set("streamExecutor", streamExecutor);
	if (templateVersionId) search.set("templateVersionId", templateVersionId);
	const qs = search.toString();

	return useQuery<V2TypicalWorkCardDto>({
		queryKey: [
			"v2-works",
			workId,
			streamExecutor ?? "",
			templateVersionId ?? "",
		],
		queryFn: () =>
			apiClient<V2TypicalWorkCardDto>({
				url: `/v2/works/${workId}${qs ? `?${qs}` : ""}`,
				method: "GET",
			}),
		enabled: Boolean(workId && streamExecutor),
	});
};

export const useV2WorkParametersCatalog = (options?: {
	includeInactive?: boolean;
}) =>
	useQuery<V2TypicalWorkParameterListResponseDto>({
		queryKey: ["v2-works", "parameters", options?.includeInactive === true],
		queryFn: () =>
			apiClient({
				url: `/v2/works/parameters/catalog${
					options?.includeInactive ? "?includeInactive=true" : ""
				}`,
				method: "GET",
			}),
		staleTime: 60_000,
	});

export const useV2ParameterDependencies = () =>
	useQuery<V2ParameterDependencyListResponseDto>({
		queryKey: ["v2-works", "dependencies"],
		queryFn: () =>
			apiClient({
				url: "/v2/works/parameters/dependencies",
				method: "GET",
			}),
		staleTime: 60_000,
	});

function invalidateV2WorkParameterCatalog(
	queryClient: ReturnType<typeof useQueryClient>,
) {
	queryClient.invalidateQueries({ queryKey: ["v2-works"] });
}

export const useCreateV2WorkParameter = () => {
	const queryClient = useQueryClient();
	return useMutation<
		V2TypicalWorkParameterDto,
		Error,
		CreateV2TypicalWorkParameterRequestDto
	>({
		mutationFn: (dto) =>
			apiClient({
				url: "/v2/works/parameters",
				method: "POST",
				data: dto,
			}),
		onSuccess: () => invalidateV2WorkParameterCatalog(queryClient),
	});
};

export const useUpdateV2WorkParameter = () => {
	const queryClient = useQueryClient();
	return useMutation<
		V2TypicalWorkParameterDto,
		Error,
		{ code: string; dto: UpdateV2TypicalWorkParameterRequestDto }
	>({
		mutationFn: ({ code, dto }) =>
			apiClient({
				url: `/v2/works/parameters/${encodeURIComponent(code)}`,
				method: "PATCH",
				data: dto,
			}),
		onSuccess: () => invalidateV2WorkParameterCatalog(queryClient),
	});
};

export const useDeleteV2WorkParameter = () => {
	const queryClient = useQueryClient();
	return useMutation<void, Error, string>({
		mutationFn: (code) =>
			apiClient({
				url: `/v2/works/parameters/${encodeURIComponent(code)}`,
				method: "DELETE",
			}),
		onSuccess: () => invalidateV2WorkParameterCatalog(queryClient),
	});
};

export const useCreateV2WorkParameterValue = () => {
	const queryClient = useQueryClient();
	return useMutation<
		V2TypicalWorkParameterValueDto,
		Error,
		{ paramCode: string; dto: CreateV2TypicalWorkParameterValueRequestDto }
	>({
		mutationFn: ({ paramCode, dto }) =>
			apiClient({
				url: `/v2/works/parameters/${encodeURIComponent(paramCode)}/values`,
				method: "POST",
				data: dto,
			}),
		onSuccess: () => invalidateV2WorkParameterCatalog(queryClient),
	});
};

export const useUpdateV2WorkParameterValue = () => {
	const queryClient = useQueryClient();
	return useMutation<
		V2TypicalWorkParameterValueDto,
		Error,
		{
			paramCode: string;
			valueCode: string;
			dto: UpdateV2TypicalWorkParameterValueRequestDto;
		}
	>({
		mutationFn: ({ paramCode, valueCode, dto }) =>
			apiClient({
				url: `/v2/works/parameters/${encodeURIComponent(
					paramCode,
				)}/values/${encodeURIComponent(valueCode)}`,
				method: "PATCH",
				data: dto,
			}),
		onSuccess: () => invalidateV2WorkParameterCatalog(queryClient),
	});
};

export const useDeleteV2WorkParameterValue = () => {
	const queryClient = useQueryClient();
	return useMutation<void, Error, { paramCode: string; valueCode: string }>({
		mutationFn: ({ paramCode, valueCode }) =>
			apiClient({
				url: `/v2/works/parameters/${encodeURIComponent(
					paramCode,
				)}/values/${encodeURIComponent(valueCode)}`,
				method: "DELETE",
			}),
		onSuccess: () => invalidateV2WorkParameterCatalog(queryClient),
	});
};

export const usePatchV2TypicalWork = () => {
	const queryClient = useQueryClient();
	return useMutation<
		V2TypicalWorkCardDto,
		Error,
		{ workId: string; dto: PatchV2TypicalWorkRequestDto }
	>({
		mutationFn: ({ workId, dto }) =>
			apiClient({
				url: `/v2/works/${workId}`,
				method: "PATCH",
				data: dto,
			}),
		onSuccess: (card, variables) => {
			queryClient.invalidateQueries({ queryKey: ["v2-works"] });
			queryClient.setQueryData(
				[
					"v2-works",
					card.id,
					card.streamExecutor,
					variables.dto.templateVersionId ?? "",
				],
				card,
			);
		},
	});
};

export const useSyncV2TypicalWorksSchemaField = () => {
	return useMutation<
		import("@smart-anketa/api-contract").V2TypicalWorkSchemaFieldSyncImpactDto,
		Error,
		import("@smart-anketa/api-contract").V2TypicalWorkSchemaFieldSyncRequestDto
	>({
		mutationFn: (dto) =>
			apiClient({
				url: "/v2/works/schema-field-sync",
				method: "POST",
				data: dto,
			}),
	});
};

export const useBulkSyncV2TypicalWorksSchemaFields = () => {
	return useMutation<
		import("@smart-anketa/api-contract").V2TypicalWorkSchemaBulkSyncResponseDto,
		Error,
		{ templateVersionId: string; mode?: "dryRun" | "apply" }
	>({
		mutationFn: (dto) =>
			apiClient({
				url: "/v2/works/schema-field-sync/bulk",
				method: "POST",
				data: dto,
			}),
	});
};

export const usePreviewV2TypicalWork = () =>
	useMutation<
		V2TypicalWorkPreviewResponseDto,
		Error,
		{ workId: string; dto: V2TypicalWorkPreviewRequestDto }
	>({
		mutationFn: ({ workId, dto }) =>
			apiClient({
				url: `/v2/works/${workId}/preview`,
				method: "POST",
				data: dto,
			}),
	});

export const useCopyV2TypicalWork = () => {
	const queryClient = useQueryClient();
	return useMutation<
		V2TypicalWorkCardDto,
		Error,
		{ workId: string; dto: CopyV2TypicalWorkRequestDto }
	>({
		mutationFn: ({ workId, dto }) =>
			apiClient({
				url: `/v2/works/${workId}/copy`,
				method: "POST",
				data: dto,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-works"] });
		},
	});
};

export const useCreateV2TypicalWork = () => {
	const queryClient = useQueryClient();
	return useMutation<
		V2TypicalWorkCardDto,
		Error,
		CreateV2TypicalWorkRequestDto
	>({
		mutationFn: (dto) =>
			apiClient({
				url: "/v2/works",
				method: "POST",
				data: dto,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-works"] });
		},
	});
};

export type DeleteV2TypicalWorkVariables = {
	workId: string;
	confirm?: boolean;
};

export const useDeleteV2TypicalWork = () => {
	const queryClient = useQueryClient();
	return useMutation<void, Error, DeleteV2TypicalWorkVariables>({
		mutationFn: ({ workId, confirm }) => {
			const qs = confirm === true ? "?confirm=true" : "";
			return apiClient({
				url: `/v2/works/${workId}${qs}`,
				method: "DELETE",
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-works"] });
		},
	});
};

export const useBackfillV2TypicalWorkCalculationLogic = () => {
	const queryClient = useQueryClient();
	return useMutation<{ updated: number; skipped: number }, Error, void>({
		mutationFn: () =>
			apiClient({
				url: "/v2/works/calculation-logic/backfill",
				method: "POST",
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["v2-works"] });
		},
	});
};
