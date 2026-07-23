import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	CreateV2QuestionnaireRequestDto,
	CreateV2QuestionnaireVersionRequestDto,
	CreateV2QuestionnaireCommentRequestDto,
	BulkDeleteV2QuestionnairesResultDto,
	SeedV2TestQuestionnairesResultDto,
	UpdateV2QuestionnaireRequestDto,
	V2QuestionnaireCommentDto,
	V2QuestionnaireDto,
	V2QuestionnaireFormPackageDto,
	V2QuestionnaireRegistryConfigDto,
} from "@smart-anketa/api-contract";
import { apiClient, API_ENTITY_CREATE_TIMEOUT_MS } from "../helpers/apiClient";

const ROOT_KEY = ["v2-questionnaires"] as const;
const REGISTRY_CONFIG_KEY = [...ROOT_KEY, "registry-config"] as const;

export const useV2Questionnaires = () =>
	useQuery<V2QuestionnaireDto[]>({
		queryKey: ROOT_KEY,
		queryFn: () =>
			apiClient<V2QuestionnaireDto[]>({
				url: "/v2/questionnaires",
				method: "GET",
			}),
	});

export const useV2QuestionnaireRegistryConfig = () =>
	useQuery<V2QuestionnaireRegistryConfigDto>({
		queryKey: REGISTRY_CONFIG_KEY,
		queryFn: () =>
			apiClient<V2QuestionnaireRegistryConfigDto>({
				url: "/v2/questionnaires/registry-config",
				method: "GET",
			}),
	});

export const useV2Questionnaire = (id: string) =>
	useQuery<V2QuestionnaireDto>({
		queryKey: [...ROOT_KEY, id],
		queryFn: () =>
			apiClient<V2QuestionnaireDto>({
				url: `/v2/questionnaires/${id}`,
				method: "GET",
			}),
		enabled: !!id,
	});

export const useV2QuestionnaireFormPackage = (id: string) =>
	useQuery<V2QuestionnaireFormPackageDto>({
		queryKey: [...ROOT_KEY, id, "form-package"],
		queryFn: () =>
			apiClient<V2QuestionnaireFormPackageDto>({
				url: `/v2/questionnaires/${id}/form-package`,
				method: "GET",
			}),
		enabled: !!id,
		// Снепшот гидрируется из form-package; рефетч по фокусу окна давал бы новую
		// ссылку и затирал бы правки/открытую модалку в анкете.
		refetchOnWindowFocus: false,
	});

export const useCreateV2Questionnaire = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: CreateV2QuestionnaireRequestDto) =>
			apiClient<V2QuestionnaireDto>({
				url: "/v2/questionnaires",
				method: "POST",
				data: body,
				timeout: API_ENTITY_CREATE_TIMEOUT_MS,
			}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ROOT_KEY }),
	});
};

export const useUpdateV2Questionnaire = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string;
			body: UpdateV2QuestionnaireRequestDto;
		}) =>
			apiClient<V2QuestionnaireDto>({
				url: `/v2/questionnaires/${id}`,
				method: "PATCH",
				data: body,
			}),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ROOT_KEY });
			qc.invalidateQueries({ queryKey: [...ROOT_KEY, vars.id] });
			qc.invalidateQueries({
				queryKey: [...ROOT_KEY, vars.id, "form-package"],
			});
		},
	});
};

export const useCreateV2QuestionnaireVersion = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string;
			body: CreateV2QuestionnaireVersionRequestDto;
		}) =>
			apiClient<V2QuestionnaireDto>({
				url: `/v2/questionnaires/${id}/new-version`,
				method: "POST",
				data: body,
				timeout: API_ENTITY_CREATE_TIMEOUT_MS,
			}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ROOT_KEY }),
	});
};

export const useHoldV2Questionnaire = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			apiClient<V2QuestionnaireDto>({
				url: `/v2/questionnaires/${id}/hold`,
				method: "POST",
			}),
		onSuccess: (_data, id) => {
			qc.invalidateQueries({ queryKey: ROOT_KEY });
			qc.invalidateQueries({ queryKey: [...ROOT_KEY, id] });
			qc.invalidateQueries({
				queryKey: [...ROOT_KEY, id, "form-package"],
			});
		},
	});
};

export const useBulkDeleteV2Questionnaires = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: { ids: string[] }) =>
			apiClient<BulkDeleteV2QuestionnairesResultDto>({
				url: "/v2/questionnaires/bulk-delete",
				method: "POST",
				data: body,
			}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ROOT_KEY }),
	});
};

export const useSeedV2TestQuestionnaires = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: { templateId?: string } = {}) =>
			apiClient<SeedV2TestQuestionnairesResultDto>({
				url: "/v2/questionnaires/seed-test",
				method: "POST",
				data: body,
				timeout: API_ENTITY_CREATE_TIMEOUT_MS,
			}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ROOT_KEY }),
	});
};

export const v2QuestionnairesExportXlsx = (
	options?: { ids?: string[]; signal?: AbortSignal },
) => {
	const ids = options?.ids?.filter(Boolean);
	if (ids && ids.length > 0) {
		return apiClient<Blob>({
			url: "/v2/questionnaires/export/xlsx",
			method: "POST",
			data: { ids },
			signal: options?.signal,
			responseType: "blob",
		});
	}
	return apiClient<Blob>({
		url: "/v2/questionnaires/export/xlsx",
		method: "GET",
		signal: options?.signal,
		responseType: "blob",
	});
};

const commentsKey = (questionnaireId: string) =>
	[...ROOT_KEY, questionnaireId, "comments"] as const;

export const useV2QuestionnaireComments = (questionnaireId: string | undefined) =>
	useQuery<V2QuestionnaireCommentDto[]>({
		queryKey: commentsKey(questionnaireId ?? ""),
		queryFn: () =>
			apiClient<V2QuestionnaireCommentDto[]>({
				url: `/v2/questionnaires/${questionnaireId}/comments`,
				method: "GET",
			}),
		enabled: Boolean(questionnaireId),
	});

export const useCreateV2QuestionnaireComment = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			questionnaireId,
			data,
		}: {
			questionnaireId: string;
			data: CreateV2QuestionnaireCommentRequestDto;
		}) =>
			apiClient<V2QuestionnaireCommentDto>({
				url: `/v2/questionnaires/${questionnaireId}/comments`,
				method: "POST",
				data,
			}),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: commentsKey(vars.questionnaireId) });
		},
	});
};

export const useDeleteV2QuestionnaireComment = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			questionnaireId,
			commentId,
		}: {
			questionnaireId: string;
			commentId: string;
		}) =>
			apiClient<void>({
				url: `/v2/questionnaires/${questionnaireId}/comments/${commentId}`,
				method: "DELETE",
			}),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: commentsKey(vars.questionnaireId) });
		},
	});
};
