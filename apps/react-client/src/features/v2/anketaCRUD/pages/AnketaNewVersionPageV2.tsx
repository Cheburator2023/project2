import {
	useCreateV2QuestionnaireVersion,
	useV2QuestionnaireFormPackage,
} from "@react-client/common/api/queries/v2-questionnaires";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { AnketaFormShell } from "@react-client/features/v2/anketaCRUD/templates/AnketaFormShell";
import { useV2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
import { getV2QuestionnaireFormTitle } from "@react-client/features/v2/anketaCRUD/utils/v2QuestionnaireFormTitle";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";

export const AnketaNewVersionPageV2 = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: formPackage, isLoading, error } = useV2QuestionnaireFormPackage(
		id ?? "",
	);
	const createVersion = useCreateV2QuestionnaireVersion();

	const source = useMemo(
		() =>
			formPackage
				? {
						templateId: formPackage.questionnaire.templateId,
						versionId: formPackage.questionnaire.boundTemplateVersionId,
						instanceId: formPackage.questionnaire.id,
						initialFormData: formPackage.questionnaire.formData,
						initialJsonSchema: formPackage.jsonSchema,
						initialUiSchema: formPackage.uiSchema,
						initialLogic: formPackage.logic,
					}
				: null,
		[formPackage],
	);

	const engine = useV2AnketaSchemaEngine(source);

	const onSave = () => {
		if (!id || !formPackage) return;
		createVersion.mutate(
			{
				id,
				body: {
					calcName: getV2QuestionnaireFormTitle(
						engine.formData,
						formPackage.questionnaire.calcName,
					),
					formData: engine.formData,
				},
			},
			{
				onSuccess: (created) => {
					toast.success("Создана новая версия анкеты");
					navigate(
						`/v2/${v2Routes.calculationPreview.rootPath.replace(":id", created.id)}`,
					);
				},
				onError: (err) =>
					toast.error("Не удалось создать версию", {
						description: apiErrorMessage(err),
					}),
			},
		);
	};

	const errorMessage =
		!isLoading && (error || !formPackage)
			? error
				? apiErrorMessage(error)
				: "Анкета не найдена"
			: null;

	return (
		<AnketaFormShell
			data-test-id="anketa-new-version-page"
			source={source}
			engine={engine}
			loading={isLoading}
			errorMessage={errorMessage}
			schemaBinding={formPackage?.questionnaire.schemaBinding}
			onSave={formPackage && !errorMessage ? onSave : undefined}
			savePending={createVersion.isPending}
		/>
	);
};
