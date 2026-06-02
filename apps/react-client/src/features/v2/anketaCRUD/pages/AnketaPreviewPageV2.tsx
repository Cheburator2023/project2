import {
	useUpdateV2Questionnaire,
	useV2QuestionnaireFormPackage,
} from "@react-client/common/api/queries/v2-questionnaires";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { AnketaFormShell } from "@react-client/features/v2/anketaCRUD/templates/AnketaFormShell";
import { useV2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
import { getV2QuestionnaireFormTitle } from "@react-client/features/v2/anketaCRUD/utils/v2QuestionnaireFormTitle";
import { useMemo } from "react";
import { useParams } from "react-router";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { Flex } from "@react-client/common/primitives/Flex";

export const AnketaPreviewPageV2 = () => {
	const { id } = useParams<{ id: string }>();
	const { data: formPackage, isLoading, error } = useV2QuestionnaireFormPackage(
		id ?? "",
	);
	const updateMutation = useUpdateV2Questionnaire();

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
		updateMutation.mutate(
			{
				id,
				body: {
					calcName: getV2QuestionnaireFormTitle(
						engine.formData,
						formPackage?.questionnaire.calcName,
					),
					formData: engine.formData,
					finalCoefficient: null,
				},
			},
			{
				onSuccess: () => toast.success("Анкета сохранена"),
				onError: (err) =>
					toast.error("Не удалось сохранить", {
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
			data-test-id="anketa-preview-page"
			source={source}
			engine={engine}
			schemaBinding={formPackage.questionnaire.schemaBinding}
			readOnly={formPackage.readOnly}
			onSave={onSave}
			savePending={updateMutation.isPending}
		/>
	);
};
