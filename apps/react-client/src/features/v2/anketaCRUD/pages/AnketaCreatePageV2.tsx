import { useV2Templates } from "@react-client/common/api/queries/v2-templates";
import { useCreateV2Questionnaire } from "@react-client/common/api/queries/v2-questionnaires";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { AnketaFormShell } from "@react-client/features/v2/anketaCRUD/templates/AnketaFormShell";
import { useV2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
import { getV2QuestionnaireFormTitle } from "@react-client/features/v2/anketaCRUD/utils/v2QuestionnaireFormTitle";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { useMemo } from "react";
import { useNavigate } from "react-router";

export const AnketaCreatePageV2 = () => {
	const navigate = useNavigate();
	const { data: templates, isLoading: templatesLoading } = useV2Templates();
	const createMutation = useCreateV2Questionnaire();

	const activeTemplate = useMemo(
		() => templates?.find((t) => t.currentVersionId) ?? templates?.[0],
		[templates],
	);

	const source = useMemo(
		() =>
			activeTemplate
				? {
						templateId: activeTemplate.id,
						versionId: activeTemplate.currentVersionId,
					}
				: null,
		[activeTemplate],
	);

	const engine = useV2AnketaSchemaEngine(source);

	const onSave = () => {
		if (!activeTemplate?.currentVersionId) {
			toast.error("Нет опубликованной актуальной схемы для создания анкеты");
			return;
		}
		createMutation.mutate(
			{
				templateId: activeTemplate.id,
				calcName: getV2QuestionnaireFormTitle(engine.formData),
				formData: engine.formData,
			},
			{
				onSuccess: (created) => {
					toast.success("Анкета создана");
					navigate(
						`/v2/${v2Routes.calculationPreview.rootPath.replace(":id", created.id)}`,
					);
				},
				onError: (err) => {
					toast.error("Не удалось создать анкету", {
						description: apiErrorMessage(err),
					});
				},
			},
		);
	};

	return (
		<AnketaFormShell
			data-test-id="anketa-create-page"
			source={source}
			engine={engine}
			loading={templatesLoading}
			onSave={onSave}
			savePending={createMutation.isPending}
			saveDisabled={!activeTemplate?.currentVersionId}
		/>
	);
};
