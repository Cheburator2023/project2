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
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { Flex } from "@react-client/common/primitives/Flex";
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
		if (!id) return;
		createVersion.mutate(
			{
				id,
				body: {
					calcName: getV2QuestionnaireFormTitle(
						engine.formData,
						formPackage?.questionnaire.calcName,
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

	if (isLoading) {
		return (
			<Flex justifyContent="center" alignItems="center" flexGrow={1}>
				<CircularProgress />
			</Flex>
		);
	}

	if (error || !formPackage) {
		return (
			<Alert severity="error" sx={{ m: 2 }}>
				{error ? apiErrorMessage(error) : "Анкета не найдена"}
			</Alert>
		);
	}

	return (
		<AnketaFormShell
			data-test-id="anketa-new-version-page"
			title={`Новая версия: ${formPackage.questionnaire.calcName}`}
			source={source}
			engine={engine}
			schemaBinding={formPackage.questionnaire.schemaBinding}
			onSave={onSave}
			savePending={createVersion.isPending}
		/>
	);
};
