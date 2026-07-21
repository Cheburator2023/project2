import { useV2Templates } from "@react-client/common/api/queries/v2-templates";
import { useCreateV2Questionnaire } from "@react-client/common/api/queries/v2-questionnaires";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { AnketaFormShell } from "@react-client/features/v2/anketaCRUD/templates/AnketaFormShell";
import { useV2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
import { AnketaCreateMetaDialog } from "@react-client/features/v2/anketaCRUD/organisms/AnketaCreateMetaDialog";
import { stripQuestionnaireCalcNameFromFormData } from "@react-client/features/v2/anketaCRUD/utils/anketaQuestionnaireMeta.util";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";

export const AnketaCreatePageV2 = () => {
	const navigate = useNavigate();
	const { data: templates, isLoading: templatesLoading } = useV2Templates();
	const createMutation = useCreateV2Questionnaire();
	const [calcName, setCalcName] = useState<string | null>(null);

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

	const engine = useV2AnketaSchemaEngine(calcName ? source : null);

	const onSave = () => {
		if (!calcName?.trim()) {
			toast.error("Укажите название анкеты");
			return;
		}
		if (!activeTemplate?.currentVersionId) {
			toast.error("Нет опубликованной актуальной схемы для создания анкеты");
			return;
		}
		createMutation.mutate(
			{
				templateId: activeTemplate.id,
				calcName: calcName.trim(),
				formData: stripQuestionnaireCalcNameFromFormData(
					engine.displayFormData,
				),
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
		<>
			<AnketaCreateMetaDialog
				open={calcName == null}
				onCancel={() => navigate(`/v2/${v2Routes.home.rootPath}`)}
				onConfirm={setCalcName}
			/>
			{calcName ? (
				<AnketaFormShell
					data-test-id="anketa-create-page"
					source={source}
					engine={engine}
					loading={templatesLoading}
					questionnaireCalcName={calcName}
					onRenameQuestionnaire={setCalcName}
					onSave={onSave}
					savePending={createMutation.isPending}
					saveDisabled={!activeTemplate?.currentVersionId}
				/>
			) : null}
		</>
	);
};
