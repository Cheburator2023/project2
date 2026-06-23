import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	CreateV2QuestionnaireRequestDto,
	CreateV2QuestionnaireVersionRequestDto,
	BulkDeleteV2QuestionnairesResultDto,
	SeedV2TestQuestionnairesResultDto,
	UpdateV2QuestionnaireRequestDto,
	V2QuestionnaireDto,
	V2QuestionnaireFormPackageDto,
} from "@smart-anketa/api-contract";
import { apiClient } from "../helpers/apiClient";

const ROOT_KEY = ["v2-questionnaires"] as const;

export const useV2Questionnaires = () =>
	useQuery<V2QuestionnaireDto[]>({
		queryKey: ROOT_KEY,
		queryFn: () =>
			apiClient<V2QuestionnaireDto[]>({
				url: "/v2/questionnaires",
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
			}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ROOT_KEY }),
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
			}),
		onSuccess: () => qc.invalidateQueries({ queryKey: ROOT_KEY }),
	});
};
