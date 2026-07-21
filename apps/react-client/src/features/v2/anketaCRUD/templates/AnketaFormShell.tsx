import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import Alert from "@mui/material/Alert";
import {
	Box,
	Button,
	CircularProgress,
	IconButton,
	Typography,
} from "@mui/material";
import type { V2SchemaBindingDto } from "@smart-anketa/api-contract";
import {
	schemaHasUncertaintyModalWidget,
	V2_ANKETA_GLOBAL_COMPLETE_LABEL,
} from "@smart-anketa/api-contract";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import {
	AnketaGlobalCompleteDialog,
	type AnketaGlobalCompleteDialogPhase,
} from "../organisms/AnketaGlobalCompleteDialog";
import { AnketaCalcNameDialog } from "../organisms/AnketaCalcNameDialog";
import { FinalScoreCard } from "../organisms/FinalScoreCard";
import { V2AnketaFormWithModals } from "../organisms/V2AnketaFormWithModals";
import { AnketaCommentsSection } from "../organisms/AnketaCommentsSection";
import { V2CalculationDebugDialog } from "../organisms/V2CalculationDebugDialog";
import {
	useV2AnketaSchemaEngine,
	type V2AnketaSchemaEngine,
	type V2AnketaSchemaEngineSource,
} from "../hooks/useV2AnketaSchemaEngine";
import { AnketaSectionStatusChip } from "../molecules/AnketaSectionStatusChip";
import { useAnketaWorkflow } from "../hooks/useAnketaWorkflow";
import { useSchemaBindingToast } from "../hooks/useSchemaBindingToast";
import type { AnketaFormContextValue } from "../utils/anketaFormContext";
import { useAnketaViewerAccess } from "../utils/anketaViewerAccess";
import { AnketaFormPageLayout } from "./AnketaFormPageLayout";
import { useCreateV2QuestionnaireVersion } from "@react-client/common/api/queries/v2-questionnaires";
import { useNavigate } from "react-router";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { usePermissions } from "@react-client/hooks/usePermissions";
import { IS_DEV } from "@react-client/common/constants/dev";
import { buildQuestionnaireCopyCalcName, stripQuestionnaireCalcNameFromFormData } from "../utils/anketaQuestionnaireMeta.util";

type Engine = V2AnketaSchemaEngine;

type Props = {
	source: V2AnketaSchemaEngineSource | null;
	engine?: Engine;
	schemaBinding?: V2SchemaBindingDto | null;
	readOnly?: boolean;
	onSave?: () => void;
	saveDisabled?: boolean;
	savePending?: boolean;
	headerExtra?: ReactNode;
	questionnaireId?: string;
	questionnaireCalcName?: string;
	onRenameQuestionnaire?: (calcName: string) => void;
	renamePending?: boolean;
	/** Внешняя загрузка (например, form-package с сервера). */
	loading?: boolean;
	errorMessage?: string | null;
	/** Превью шаблона в админке — debounce ввода и отложенная логика. */
	debouncePreviewInputs?: boolean;
	"data-test-id"?: string;
};

/** Общая оболочка анкеты: layout по макету + RJSF + итоговая оценка. */
export function AnketaFormShell({
	source,
	engine: engineProp,
	schemaBinding,
	readOnly,
	onSave,
	saveDisabled,
	savePending,
	headerExtra,
	questionnaireId,
	questionnaireCalcName,
	onRenameQuestionnaire,
	renamePending = false,
	loading: externalLoading = false,
	errorMessage = null,
	debouncePreviewInputs = false,
	"data-test-id": dataTestId = "anketa-form-shell",
}: Props) {
	const navigate = useNavigate();
	const { canCreateCalculation, canEditCalculation, canWorkflowApprove } =
		usePermissions();

	const createCopy = useCreateV2QuestionnaireVersion();
	const internalEngine = useV2AnketaSchemaEngine(engineProp ? null : source);
	const engine = engineProp ?? internalEngine;
	const setFormData = (next: Record<string, unknown>) =>
		engine.setFormData(next);
	const {
		workflow,
		globallyLocked,
		allSectionsCompleted,
		completeMainSection,
		touchMainSection,
		completeGlobalFill,
		isSectionLocked,
	} = useAnketaWorkflow(engine.formData, setFormData);
	const effectiveReadOnly = readOnly || globallyLocked;
	const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
	const [calculationDebugOpen, setCalculationDebugOpen] = useState(false);
	const [completeDialogPhase, setCompleteDialogPhase] =
		useState<AnketaGlobalCompleteDialogPhase>("confirm");
	const [copyNameDialogOpen, setCopyNameDialogOpen] = useState(false);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const saveAfterCompleteRef = useRef(false);
	const openCompleteDialog = useCallback(() => {
		setCompleteDialogPhase("confirm");
		setCompleteDialogOpen(true);
	}, []);

	const closeCompleteDialog = useCallback(() => {
		setCompleteDialogOpen(false);
		setCompleteDialogPhase("confirm");
		saveAfterCompleteRef.current = false;
	}, []);

	const handleCreateCopy = useCallback(
		(calcName: string) => {
			if (!questionnaireId) return;
			createCopy.mutate(
				{
					id: questionnaireId,
					body: {
						calcName,
						formData: stripQuestionnaireCalcNameFromFormData(
							engine.displayFormData,
						),
					},
				},
				{
					onSuccess: (created) => {
						toast.success("Создана копия анкеты");
						setCopyNameDialogOpen(false);
						closeCompleteDialog();
						navigate(
							`/v2/${v2Routes.calculationPreview.rootPath.replace(":id", created.id)}`,
						);
					},
					onError: (err) =>
						toast.error("Не удалось создать копию", {
							description: apiErrorMessage(err),
						}),
				},
			);
		},
		[
			closeCompleteDialog,
			createCopy,
			engine.displayFormData,
			navigate,
			questionnaireId,
		],
	);

	const openCopyNameDialog = useCallback(() => {
		setCopyNameDialogOpen(true);
	}, []);

	const suggestedCopyName = useMemo(
		() =>
			buildQuestionnaireCopyCalcName(questionnaireCalcName ?? "Анкета"),
		[questionnaireCalcName],
	);

	/** Переименование доступно на любой стадии (в т.ч. «Заполнено» / read-only). */
	const canRenameQuestionnaire = Boolean(onRenameQuestionnaire);

	const finalizeComplete = useCallback(
		(withSave: boolean) => {
			saveAfterCompleteRef.current = withSave;
			completeGlobalFill();
		},
		[completeGlobalFill],
	);

	useEffect(() => {
		if (!completeDialogOpen || completeDialogPhase !== "confirm") return;
		if (workflow.globalStatus !== "Заполнено") return;

		setCompleteDialogPhase("next");
		if (saveAfterCompleteRef.current) {
			saveAfterCompleteRef.current = false;
			onSave?.();
		}
	}, [completeDialogOpen, completeDialogPhase, onSave, workflow.globalStatus]);

	const viewerAccess = useAnketaViewerAccess(!debouncePreviewInputs);

	const anketaFormContext = useMemo((): AnketaFormContextValue => {
		// Только page-level overrides; formData/schema/ui берёт V2AnketaFormWithModals из engine.
		return {
			workflow,
			onCompleteMainSection: completeMainSection,
			onTouchMainSection: touchMainSection,
			isMainSectionLocked: isSectionLocked,
			anketaReadOnly: effectiveReadOnly,
			schemaEditorPreview: false,
			debouncePreviewInputs,
			viewerAccess,
		};
	}, [
		effectiveReadOnly,
		workflow,
		completeMainSection,
		touchMainSection,
		isSectionLocked,
		debouncePreviewInputs,
		viewerAccess,
	]);

	const isEditingQuestionnaire = Boolean(questionnaireId);
	const canSaveQuestionnaire = isEditingQuestionnaire
		? canEditCalculation
		: canCreateCalculation;

	const headerLeadingAccessory = useMemo(
		() =>
			canRenameQuestionnaire ? (
				<IconButton
					size="small"
					title="Переименовать анкету"
					aria-label="Переименовать анкету"
					disabled={renamePending}
					onClick={() => setRenameDialogOpen(true)}
					data-test-id={`${dataTestId}--rename`}
				>
					<EditOutlinedIcon fontSize="small" />
				</IconButton>
			) : null,
		[canRenameQuestionnaire, dataTestId, renamePending],
	);

	const headerActions = useMemo(
		() => (
			<>
				<AnketaSectionStatusChip kind="global" status={workflow.globalStatus} />
				{(!globallyLocked && canWorkflowApprove )? (
					<Button
						variant="contained"
						size="small"
						disabled={!allSectionsCompleted || effectiveReadOnly}
						title={
							allSectionsCompleted
								? undefined
								: "Сначала завершите заполнение всех основных разделов"
						}
						onClick={openCompleteDialog}
						sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
					>
						{V2_ANKETA_GLOBAL_COMPLETE_LABEL}
					</Button>
				) : null}
				{headerExtra}
				{IS_DEV && (
					<Button
						variant="outlined"
						size="small"
						startIcon={<BugReportOutlinedIcon />}
						onClick={() => setCalculationDebugOpen(true)}
						title="Показать поля, коэффициенты, правила и результаты расчёта"
						sx={{ whiteSpace: "nowrap" }}
					>
						Диагностика расчёта
					</Button>
				)}
				{workflow.globalStatus === "Заполнено" && questionnaireId ? (
					<Button
						variant="outlined"
						size="small"
						disabled={createCopy.isPending}
						title="Создать копию анкеты в статусе «Черновик»"
						onClick={openCopyNameDialog}
						sx={{ textTransform: "none", whiteSpace: "nowrap" }}
					>
						Создать копию
					</Button>
				) : null}
				{onSave && canSaveQuestionnaire ? (
					<Button
						variant="contained"
						size="small"
						onClick={onSave}
						disabled={saveDisabled || savePending || effectiveReadOnly}
						startIcon={
							savePending ? (
								<CircularProgress size={16} color="inherit" />
							) : undefined
						}
						sx={{ fontWeight: 600, textTransform: "none", whiteSpace: "nowrap" }}
					>
						{isEditingQuestionnaire ? "Сохранить" : "Создать"}
					</Button>
				) : null}
			</>
		),
		[
			canSaveQuestionnaire,
			canWorkflowApprove,
			headerExtra,
			isEditingQuestionnaire,
			onSave,
			openCopyNameDialog,
			saveDisabled,
			savePending,
			effectiveReadOnly,
			workflow.globalStatus,
			globallyLocked,
			allSectionsCompleted,
			openCompleteDialog,
			questionnaireId,
			createCopy.isPending,
		],
	);

	const isPageLoading =
		!errorMessage && (externalLoading || engine.versionLoading);

	useSchemaBindingToast(
		schemaBinding,
		questionnaireId,
		Boolean(schemaBinding) && !isPageLoading && !errorMessage,
	);

	const hasUncertaintyModalWidget = useMemo(
		() =>
			schemaHasUncertaintyModalWidget(
				engine.previewUiSchema as Record<string, unknown>,
			),
		[engine.previewUiSchema],
	);

	return (
		<>
			<AnketaFormPageLayout
				data-test-id={dataTestId}
				title={questionnaireCalcName?.trim() || undefined}
				leadingAccessory={headerLeadingAccessory}
				headerActions={headerActions}
				loading={isPageLoading}
				main={
					errorMessage ? (
						<Typography color="error.main" variant="body1">
							{errorMessage}
						</Typography>
					) : (
						<>
							{engine.dictionaryEnumsLoading ? (
								<Alert severity="info" sx={{ mb: 2 }}>
									Загрузка справочников…
								</Alert>
							) : null}
							<V2AnketaFormWithModals
								engine={engine}
								readOnly={effectiveReadOnly}
								anketaFormContext={anketaFormContext}
								showUncertaintySlot={!hasUncertaintyModalWidget}
							/>
						</>
					)
				}
				footer={
					!errorMessage && questionnaireId ? (
						<>
							<Spacer space={24} />
							<AnketaCommentsSection questionnaireId={questionnaireId} />
						</>
					) : null
				}
				sidebar={
					errorMessage ? (
						<Box />
					) : (
						<FinalScoreCard
							summary={engine.summary}
							formData={engine.displayFormData}
							calculationError={engine.calculationError}
							isLoading={engine.calculationLoading}
							calculationItems={engine.calculationItems}
							taskTriggerItems={engine.taskTriggerItems}
							uiSchema={engine.previewUiSchema as Record<string, unknown>}
							liveFormData={engine.calculationLiveFormData}
						/>
					)
				}
			/>
			<AnketaGlobalCompleteDialog
				open={completeDialogOpen}
				phase={completeDialogPhase}
				onClose={closeCompleteDialog}
				canSave={
					Boolean(onSave) && canSaveQuestionnaire && !saveDisabled
				}
				savePending={savePending}
				hasQuestionnaireId={Boolean(questionnaireId)}
				createCopyPending={createCopy.isPending}
				onConfirmComplete={() => finalizeComplete(false)}
				onConfirmCompleteAndSave={() => finalizeComplete(true)}
				onSave={() => onSave?.()}
				onCreateCopy={openCopyNameDialog}
				onNewVersion={() => {
					if (!questionnaireId) return;
					closeCompleteDialog();
					navigate(
						`/v2/${v2Routes.calculationNewVersion.rootPath.replace(":id", questionnaireId)}`,
					);
				}}
				onGoToRegistry={() => {
					closeCompleteDialog();
					navigate("/v2");
				}}
			/>
			<V2CalculationDebugDialog
				open={calculationDebugOpen}
				onClose={() => setCalculationDebugOpen(false)}
				engine={engine}
			/>
			<AnketaCalcNameDialog
				open={copyNameDialogOpen}
				title="Создать копию анкеты"
				confirmLabel="Создать копию"
				initialCalcName={suggestedCopyName}
				pending={createCopy.isPending}
				onCancel={() => setCopyNameDialogOpen(false)}
				onConfirm={handleCreateCopy}
				data-test-id={`${dataTestId}--copy-name-dialog`}
			/>
			<AnketaCalcNameDialog
				open={renameDialogOpen}
				title="Переименовать анкету"
				confirmLabel="Сохранить"
				initialCalcName={questionnaireCalcName ?? ""}
				pending={renamePending}
				onCancel={() => setRenameDialogOpen(false)}
				onConfirm={(calcName) => {
					onRenameQuestionnaire?.(calcName);
					setRenameDialogOpen(false);
				}}
				data-test-id={`${dataTestId}--rename-dialog`}
			/>
		</>
	);
}

export function useAnketaFormEngine(source: V2AnketaSchemaEngineSource | null) {
	return useV2AnketaSchemaEngine(source);
}
