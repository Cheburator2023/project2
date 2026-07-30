import {
	useUpdateV2Questionnaire,
	useV2QuestionnaireFormPackage,
} from "@react-client/common/api/queries/v2-questionnaires";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { AnketaFormShell } from "@react-client/features/v2/anketaCRUD/templates/AnketaFormShell";
import { useV2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
import { useDebouncedQuestionnaireSave } from "@react-client/features/v2/anketaCRUD/hooks/useDebouncedQuestionnaireSave";
import { useQuestionnaireEditLock } from "@react-client/features/v2/anketaCRUD/hooks/useQuestionnaireEditLock";
import { stripQuestionnaireCalcNameFromFormData } from "@react-client/features/v2/anketaCRUD/utils/anketaQuestionnaireMeta.util";
import { useMemo } from "react";
import { useParams } from "react-router";

export const AnketaPreviewPageV2 = () => {
	const { id } = useParams<{ id: string }>();
	const { data: formPackage, isLoading, error } = useV2QuestionnaireFormPackage(
		id ?? "",
	);
	const updateMutation = useUpdateV2Questionnaire();
	const editLock = useQuestionnaireEditLock({
		questionnaireId: id,
		enabled: Boolean(formPackage && !formPackage.readOnly),
	});

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
	const formDataForSave = useMemo(
		() => stripQuestionnaireCalcNameFromFormData(engine.displayFormData),
		[engine.displayFormData],
	);

	const effectiveReadOnly =
		Boolean(formPackage?.readOnly) || editLock.readOnlyByLock;

	const autosave = useDebouncedQuestionnaireSave({
		questionnaireId: id,
		calcName: formPackage?.questionnaire.calcName,
		formData: formDataForSave,
		enabled: Boolean(formPackage && !error && !effectiveReadOnly),
	});

	const onSave = () => {
		if (!id || !formPackage || effectiveReadOnly) return;
		autosave.saveNow();
	};

	const onRenameQuestionnaire = (calcName: string) => {
		if (!id || effectiveReadOnly) return;
		updateMutation.mutate(
			{ id, body: { calcName } },
			{
				onSuccess: () => toast.success("Название анкеты обновлено"),
				onError: (err) =>
					toast.error("Не удалось переименовать", {
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
			data-test-id="anketa-preview-page"
			source={source}
			engine={engine}
			loading={isLoading}
			errorMessage={errorMessage}
			questionnaireId={id}
			questionnaireCalcName={formPackage?.questionnaire.calcName}
			questionnaireStatus={formPackage?.questionnaire.status}
			onRenameQuestionnaire={
				formPackage && !errorMessage && !effectiveReadOnly
					? onRenameQuestionnaire
					: undefined
			}
			renamePending={updateMutation.isPending}
			schemaBinding={formPackage?.questionnaire.schemaBinding}
			readOnly={effectiveReadOnly}
			lockMessage={
				editLock.readOnlyByLock
					? "Анкета сейчас редактируется другим пользователем"
					: null
			}
			onSave={formPackage && !errorMessage && !effectiveReadOnly ? onSave : undefined}
			savePending={autosave.isSaving}
			saveStatus={autosave.status}
			saveErrorMessage={autosave.errorMessage}
		/>
	);
};
