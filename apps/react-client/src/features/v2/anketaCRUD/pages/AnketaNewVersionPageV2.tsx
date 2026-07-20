import {
	useCreateV2QuestionnaireVersion,
	useV2QuestionnaireFormPackage,
} from "@react-client/common/api/queries/v2-questionnaires";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { AnketaFormShell } from "@react-client/features/v2/anketaCRUD/templates/AnketaFormShell";
import { useV2AnketaSchemaEngine } from "@react-client/features/v2/anketaCRUD/hooks/useV2AnketaSchemaEngine";
import { AnketaCalcNameDialog } from "@react-client/features/v2/anketaCRUD/organisms/AnketaCalcNameDialog";
import {
	buildQuestionnaireVersionCalcName,
	stripQuestionnaireCalcNameFromFormData,
} from "@react-client/features/v2/anketaCRUD/utils/anketaQuestionnaireMeta.util";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

export const AnketaNewVersionPageV2 = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: formPackage, isLoading, error } = useV2QuestionnaireFormPackage(
		id ?? "",
	);
	const createVersion = useCreateV2QuestionnaireVersion();
	const [calcName, setCalcName] = useState<string | null>(null);

	const suggestedVersionCalcName = useMemo(() => {
		if (!formPackage) return "Анкета";
		const currentVersion = Number.parseInt(formPackage.questionnaire.version, 10);
		const nextVersion = Number.isFinite(currentVersion) ? currentVersion + 1 : 1;
		return buildQuestionnaireVersionCalcName(
			formPackage.questionnaire.calcName,
			nextVersion,
		);
	}, [formPackage]);

	const source = useMemo(
		() =>
			formPackage && calcName
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
		[calcName, formPackage],
	);

	const engine = useV2AnketaSchemaEngine(source);

	const onSave = () => {
		if (!id || !formPackage || !calcName?.trim()) return;
		createVersion.mutate(
			{
				id,
				body: {
					calcName: calcName.trim(),
					formData: stripQuestionnaireCalcNameFromFormData(engine.formData),
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

	const showNameDialog =
		Boolean(formPackage) && !errorMessage && calcName == null;

	return (
		<>
			<AnketaCalcNameDialog
				open={showNameDialog}
				title="Новая версия анкеты"
				confirmLabel="Продолжить"
				initialCalcName={suggestedVersionCalcName}
				helperText="Название отображается в реестре. Версия в серии будет присвоена автоматически."
				onCancel={() => navigate(-1)}
				onConfirm={setCalcName}
				data-test-id="anketa-new-version-name-dialog"
			/>
			{calcName ? (
				<AnketaFormShell
					data-test-id="anketa-new-version-page"
					source={source}
					engine={engine}
					loading={isLoading}
					errorMessage={errorMessage}
					questionnaireCalcName={calcName}
					schemaBinding={formPackage?.questionnaire.schemaBinding}
					onSave={formPackage && !errorMessage ? onSave : undefined}
					savePending={createVersion.isPending}
				/>
			) : null}
		</>
	);
};
