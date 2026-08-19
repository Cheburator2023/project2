import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	CreateV2QuestionnaireRequestDto,
	CreateV2QuestionnaireVersionRequestDto,
	CreateV2QuestionnaireCommentRequestDto,
	BulkDeleteV2QuestionnairesResultDto,
	PaginatedV2QuestionnaireResponseDto,
	SeedV2TestQuestionnairesResultDto,
	UpdateV2QuestionnaireRequestDto,
	AcquireV2QuestionnaireEditLockRequestDto,
	V2QuestionnaireCommentDto,
	V2QuestionnaireDto,
	V2QuestionnaireEditLockDto,
	V2QuestionnaireEditLocksListDto,
	V2QuestionnaireFormPackageDto,
	V2QuestionnaireListQuery,
	V2QuestionnaireRegistryConfigDto,
	V2QuestionnaireExportJobCreateDto,
	V2QuestionnaireExportJobStatusDto,
} from "@smart-anketa/api-contract";
import {
	V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE,
} from "@smart-anketa/api-contract";
import {
	apiClient,
	API_ENTITY_CREATE_TIMEOUT_MS,
	API_REGISTRY_EXPORT_TIMEOUT_MS,
} from "../helpers/apiClient";
import {
	invalidateV2QuestionnaireRegistry,
	V2_QUESTIONNAIRES_LIST_KEY,
	V2_QUESTIONNAIRES_REGISTRY_CONFIG_KEY,
	V2_QUESTIONNAIRES_ROOT_KEY,
} from "./v2-questionnaire-registry-cache";
import { useQuestionnaireEditLocksStore } from "@react-client/features/v2/anketaCRUD/stores/questionnaireEditLocksStore";
import { waitForV2ExportJob } from "@react-client/features/v2/anketaCRUD/utils/v2EditLockSocket";

export { invalidateV2QuestionnaireRegistry } from "./v2-questionnaire-registry-cache";

const ROOT_KEY = V2_QUESTIONNAIRES_ROOT_KEY;
const LIST_KEY = V2_QUESTIONNAIRES_LIST_KEY;
const REGISTRY_CONFIG_KEY = V2_QUESTIONNAIRES_REGISTRY_CONFIG_KEY;

export const useV2Questionnaires = (query: V2QuestionnaireListQuery = {}) => {
	const page = query.page ?? 1;
	const limit = query.limit ?? V2_QUESTIONNAIRE_REGISTRY_PAGE_SIZE;
	const search = query.search?.trim() || undefined;
	const versionMode = query.versionMode;

	return useQuery<PaginatedV2QuestionnaireResponseDto>({
		queryKey: [...LIST_KEY, { page, limit, search, versionMode }],
		queryFn: () =>
			apiClient<PaginatedV2QuestionnaireResponseDto>({
				url: "/v2/questionnaires",
				method: "GET",
				params: {
					page,
					limit,
					...(search ? { search } : {}),
					...(versionMode ? { versionMode } : {}),
				},
			}),
		placeholderData: keepPreviousData,
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	});
};

export const useV2QuestionnaireRegistryConfig = () =>
	useQuery<V2QuestionnaireRegistryConfigDto>({
		queryKey: REGISTRY_CONFIG_KEY,
		queryFn: () =>
			apiClient<V2QuestionnaireRegistryConfigDto>({
				url: "/v2/questionnaires/registry-config",
				method: "GET",
			}),
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
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
		onSuccess: () => invalidateV2QuestionnaireRegistry(qc),
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
		onSuccess: (data, vars) => {
			// Soft-update: без invalidate form-package, чтобы не флешило форму.
			qc.setQueryData<V2QuestionnaireDto>([...ROOT_KEY, vars.id], data);
			qc.setQueryData<V2QuestionnaireFormPackageDto>(
				[...ROOT_KEY, vars.id, "form-package"],
				(prev) => {
					if (!prev) return prev;
					return {
						...prev,
						questionnaire: {
							...prev.questionnaire,
							...data,
							formData: vars.body.formData ?? prev.questionnaire.formData,
						},
					};
				},
			);
			void invalidateV2QuestionnaireRegistry(qc, { includeConfig: false });
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
		onSuccess: () => invalidateV2QuestionnaireRegistry(qc),
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
			invalidateV2QuestionnaireRegistry(qc, { includeConfig: false });
			qc.invalidateQueries({ queryKey: [...ROOT_KEY, id] });
			qc.invalidateQueries({
				queryKey: [...ROOT_KEY, id, "form-package"],
			});
		},
	});
};

export const useBulkHoldV2Questionnaires = () => {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (body: { ids: string[] }) =>
			apiClient<{
				heldIds: string[];
				failed: Array<{ id: string; reason: string; message: string }>;
			}>({
				url: "/v2/questionnaires/bulk-hold",
				method: "POST",
				data: body,
			}),
		onSuccess: () =>
			invalidateV2QuestionnaireRegistry(qc, { includeConfig: false }),
	});
};

export const useCreateV2QuestionnaireCopy = () => {
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
				url: `/v2/questionnaires/${id}/copy`,
				method: "POST",
				data: body,
				timeout: API_ENTITY_CREATE_TIMEOUT_MS,
			}),
		onSuccess: () => invalidateV2QuestionnaireRegistry(qc),
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
		onSuccess: () => invalidateV2QuestionnaireRegistry(qc),
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
		onSuccess: () => invalidateV2QuestionnaireRegistry(qc),
	});
};

export const useV2QuestionnaireExportLock = (enabled = true) => {
	const busy = useQuestionnaireEditLocksStore((s) => s.exportBusy);
	return { data: { busy: Boolean(enabled && busy) } };
};

export const v2QuestionnairesStartExportJob = (
	options?: { ids?: string[]; signal?: AbortSignal },
) => {
	const ids = options?.ids?.filter(Boolean);
	return apiClient<V2QuestionnaireExportJobCreateDto>({
		url: "/v2/questionnaires/export/xlsx",
		method: "POST",
		data: ids && ids.length > 0 ? { ids } : {},
		signal: options?.signal,
	});
};

export const v2QuestionnairesExportJobStatus = (
	jobId: string,
	signal?: AbortSignal,
) =>
	apiClient<V2QuestionnaireExportJobStatusDto>({
		url: `/v2/questionnaires/export/${jobId}/status`,
		method: "GET",
		signal,
	});

export const v2QuestionnairesExportJobDownload = (
	jobId: string,
	signal?: AbortSignal,
) =>
	apiClient<Blob>({
		url: `/v2/questionnaires/export/${jobId}/download`,
		method: "GET",
		signal,
		responseType: "blob",
		timeout: API_REGISTRY_EXPORT_TIMEOUT_MS,
	});

/** @deprecated используйте start + status + download; оставлено для одиночных выгрузок */
export const v2QuestionnairesExportXlsx = async (
	options?: { ids?: string[]; signal?: AbortSignal },
) => {
	const started = await v2QuestionnairesStartExportJob(options);
	const status = await waitForV2ExportJob(started.jobId, {
		signal: options?.signal,
		timeoutMs: API_REGISTRY_EXPORT_TIMEOUT_MS,
	});
	if (status.status === "failed") {
		throw new Error(status.error || "Экспорт завершился с ошибкой");
	}
	return v2QuestionnairesExportJobDownload(started.jobId, options?.signal);
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

export const useV2QuestionnaireEditLocks = (enabled = true) =>
	useQuery<V2QuestionnaireEditLocksListDto>({
		queryKey: [...ROOT_KEY, "edit-locks"],
		queryFn: () =>
			apiClient<V2QuestionnaireEditLocksListDto>({
				url: "/v2/questionnaires/edit-locks",
				method: "GET",
			}),
		enabled,
		refetchOnWindowFocus: true,
	});

export const useAcquireV2QuestionnaireEditLock = () =>
	useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string;
			body: AcquireV2QuestionnaireEditLockRequestDto;
		}) =>
			apiClient<V2QuestionnaireEditLockDto>({
				url: `/v2/questionnaires/${id}/edit-lock`,
				method: "POST",
				data: body,
			}),
	});

export const useRenewV2QuestionnaireEditLock = () =>
	useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string;
			body: AcquireV2QuestionnaireEditLockRequestDto;
		}) =>
			apiClient<V2QuestionnaireEditLockDto>({
				url: `/v2/questionnaires/${id}/edit-lock`,
				method: "PUT",
				data: body,
			}),
	});

export const useReleaseV2QuestionnaireEditLock = () =>
	useMutation({
		mutationFn: ({
			id,
			body,
		}: {
			id: string;
			body: AcquireV2QuestionnaireEditLockRequestDto;
		}) =>
			apiClient<void>({
				url: `/v2/questionnaires/${id}/edit-lock`,
				method: "DELETE",
				data: body,
			}),
	});
