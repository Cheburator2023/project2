import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	CreateV2TypicalWorkRequestDto,
	PatchV2TypicalWorkRequestDto,
	V2ParameterDependencyListResponseDto,
	V2TypicalWorkCardDto,
	V2TypicalWorkListResponseDto,
	V2TypicalWorkParameterListResponseDto,
	V2TypicalWorkPreviewRequestDto,
	V2TypicalWorkPreviewResponseDto,
} from "@smart-anketa/api-contract";
import { apiClient } from "../helpers/apiClient";

export const useV2TypicalWorksList = (params?: {
	archComponentType?: string;
	streamExecutor?: string;
}) => {
	const search = new URLSearchParams();
	if (params?.archComponentType) {
		search.set("archComponentType", params.archComponentType);
	}
	if (params?.streamExecutor) {
		search.set("streamExecutor", params.streamExecutor);
	}
	const qs = search.toString();

	return useQuery<V2TypicalWorkListResponseDto>({
		queryKey: ["v2-works", params?.archComponentType ?? "", params?.streamExecutor ?? ""],
		queryFn: () =>
			apiClient<V2TypicalWorkListResponseDto>({
				url: `/v2/works${qs ? `?${qs}` : ""}`,
				method: "GET",
			}),
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

export const useV2WorkParametersCatalog = () =>
	useQuery<V2TypicalWorkParameterListResponseDto>({
		queryKey: ["v2-works", "parameters"],
		queryFn: () =>
			apiClient({
				url: "/v2/works/parameters/catalog",
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
		onSuccess: (card) => {
			queryClient.invalidateQueries({ queryKey: ["v2-works"] });
			queryClient.setQueryData(
				["v2-works", card.id, card.streamExecutor, ""],
				card,
			);
		},
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

export const useCreateV2TypicalWork = () => {
	const queryClient = useQueryClient();
	return useMutation<V2TypicalWorkCardDto, Error, CreateV2TypicalWorkRequestDto>({
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
			const qs =
				confirm === true ? "?confirm=true" : "";
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
