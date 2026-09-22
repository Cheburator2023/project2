import {
	useCreateV2QuestionnaireVersion,
	useV2QuestionnaireFormPackage,
} from "@react-client/common/api/queries/v2-questionnaires";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { toast } from "@react-client/common/toasts";
import { AnketaCalcNameDialog } from "@react-client/features/v2/anketaCRUD/organisms/AnketaCalcNameDialog";
import { AnketaSchemaCurrencyDialog } from "@react-client/features/v2/anketaCRUD/organisms/AnketaSchemaCurrencyDialog";
import {
	needsSchemaCurrencyChoice,
	toastFormDataProjectionReport,
} from "@react-client/features/v2/anketaCRUD/utils/anketaFormDataProjectionToast.util";
import {
	buildQuestionnaireVersionCalcName,
	stripQuestionnaireCalcNameFromFormData,
} from "@react-client/features/v2/anketaCRUD/utils/anketaQuestionnaireMeta.util";
import { Flex } from "@react-client/common/primitives/Flex";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

/**
 * Новая версия анкеты: (схема?) → имя → сразу POST → переход в редактирование.
 */
export const AnketaNewVersionPageV2 = () => {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const { data: formPackage, isLoading, error } = useV2QuestionnaireFormPackage(
		id ?? "",
	);
	const createVersion = useCreateV2QuestionnaireVersion();
	const [useCurrentSchema, setUseCurrentSchema] = useState<boolean | null>(
		null,
	);
	const [nameDialogOpen, setNameDialogOpen] = useState(false);

	const needsSchemaChoice = Boolean(
		formPackage &&
			needsSchemaCurrencyChoice(formPackage.questionnaire.schemaBinding),
	);

	const schemaDialogOpen =
		Boolean(formPackage) &&
		needsSchemaChoice &&
		useCurrentSchema === null &&
		!createVersion.isPending;

	const suggestedVersionCalcName = useMemo(() => {
		if (!formPackage) return "Анкета";
		return buildQuestionnaireVersionCalcName(
			formPackage.questionnaire.calcName,
		);
	}, [formPackage]);

	const errorMessage =
		!isLoading && (error || !formPackage)
			? error
				? apiErrorMessage(error)
				: "Анкета не найдена"
			: null;

	const resolveSchemaChoice = (useCurrent: boolean) => {
		setUseCurrentSchema(useCurrent);
		setNameDialogOpen(true);
	};

	/** Если схема актуальна — сразу имя. */
	const effectiveNameDialogOpen =
		nameDialogOpen ||
		(Boolean(formPackage) &&
			!needsSchemaChoice &&
			useCurrentSchema === null &&
			!createVersion.isPending &&
			!errorMessage);

	const createAndOpen = (calcName: string) => {
		const name = calcName.trim();
		if (!id || !formPackage || !name) return;
		setNameDialogOpen(false);
		createVersion.mutate(
			{
				id,
				body: {
					calcName: name,
					formData: stripQuestionnaireCalcNameFromFormData(
						formPackage.questionnaire.formData,
					),
					useCurrentSchema: useCurrentSchema === true,
				},
			},
			{
				onSuccess: (created) => {
					toast.success("Создана новая версия анкеты");
					toastFormDataProjectionReport(created.formDataProjection);
					navigate(
						`/v2/${v2Routes.calculationPreview.rootPath.replace(":id", created.id)}`,
						{ replace: true },
					);
				},
				onError: (err) => {
					setNameDialogOpen(true);
					toast.error("Не удалось создать версию", {
						description: apiErrorMessage(err),
					});
				},
			},
		);
	};

	const creating = createVersion.isPending;

	return (
		<>
			<AnketaSchemaCurrencyDialog
				open={schemaDialogOpen}
				pending={creating}
				onCancel={() => navigate(-1)}
				onUseCurrent={() => resolveSchemaChoice(true)}
				onKeepSource={() => resolveSchemaChoice(false)}
				data-test-id="anketa-new-version-schema-dialog"
			/>
			<AnketaCalcNameDialog
				open={
					effectiveNameDialogOpen &&
					!creating &&
					!errorMessage &&
					Boolean(formPackage)
				}
				title="Новая версия анкеты"
				confirmLabel="Создать"
				initialCalcName={suggestedVersionCalcName}
				helperText="Название отображается в реестре. Версия сохранится сразу после подтверждения."
				pending={creating}
				onCancel={() => navigate(-1)}
				onConfirm={createAndOpen}
				data-test-id="anketa-new-version-name-dialog"
			/>
			{(creating || isLoading) && !errorMessage ? (
				<Flex
					flexDirection="column"
					alignItems="center"
					justifyContent="center"
					gap={12}
					height="100%"
					minHeight="240px"
					data-test-id="anketa-new-version-page--saving"
				>
					<CircularProgress size={28} />
					<Typography variant="body2" color="text.secondary">
						{isLoading ? "Загрузка анкеты…" : "Создание версии…"}
					</Typography>
				</Flex>
			) : null}
			{errorMessage ? (
				<Flex
					alignItems="center"
					justifyContent="center"
					height="100%"
					minHeight="240px"
					padding="0 24px"
				>
					<Typography color="error.main" variant="body1">
						{errorMessage}
					</Typography>
				</Flex>
			) : null}
		</>
	);
};
