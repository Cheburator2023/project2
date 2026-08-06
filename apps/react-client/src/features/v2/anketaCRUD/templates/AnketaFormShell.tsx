import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import SaveIcon from "@mui/icons-material/Save";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import Alert from "@mui/material/Alert";
import {
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	IconButton,
	Typography,
	keyframes,
} from "@mui/material";
import type { V2SchemaBindingDto } from "@smart-anketa/api-contract";
import {
	canUserDeleteV2Questionnaire,
	canViewerCompleteWholeAnketa,
	resolveV2QuestionnaireDeleteAction,
	schemaHasUncertaintyModalWidget,
	userMasksAllWorkEstimates,
	V2_ANKETA_GLOBAL_COMPLETE_LABEL,
	V2_ANKETA_HOLD_LABEL,
} from "@smart-anketa/api-contract";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import type { QuestionnaireSaveStatus } from "../hooks/useDebouncedQuestionnaireSave";
import {
	AnketaGlobalCompleteDialog,
	type AnketaGlobalCompleteDialogPhase,
} from "../organisms/AnketaGlobalCompleteDialog";
import { AnketaCalcNameDialog } from "../organisms/AnketaCalcNameDialog";
import { AnketaSchemaInfoDialog } from "../organisms/AnketaSchemaInfoDialog";
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
import {
	useBulkDeleteV2Questionnaires,
	useCreateV2QuestionnaireVersion,
	useHoldV2Questionnaire,
	v2QuestionnairesExportXlsx,
} from "@react-client/common/api/queries/v2-questionnaires";
import { downloadBlob } from "@react-client/common/api/queries/kanban-board";
import { useNavigate } from "react-router";
import { Spacer } from "@react-client/common/primitives/Spacer";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import { usePermissions } from "@react-client/hooks/usePermissions";
import { useUserStore } from "@react-client/common/store/userStore";
import { IS_DEV } from "@react-client/common/constants/dev";
import {
	buildQuestionnaireCopyCalcName,
	stripQuestionnaireCalcNameFromFormData,
} from "../utils/anketaQuestionnaireMeta.util";

type Engine = V2AnketaSchemaEngine;

type Props = {
	source: V2AnketaSchemaEngineSource | null;
	engine?: Engine;
	schemaBinding?: V2SchemaBindingDto | null;
	readOnly?: boolean;
	onSave?: () => void;
	saveDisabled?: boolean;
	savePending?: boolean;
	/** Статус автосохранения (дискетка + индикатор). */
	saveStatus?: QuestionnaireSaveStatus;
	saveErrorMessage?: string | null;
	/** Сообщение о блокировке редактирования другим пользователем. */
	lockMessage?: string | null;
	headerExtra?: ReactNode;
	questionnaireId?: string;
	questionnaireCalcName?: string;
	/** Название схемы (шаблона), по которой создана анкета. */
	templateName?: string | null;
	/** Статус записи анкеты (active / inactive / archived). */
	questionnaireStatus?: "active" | "archived" | "inactive";
	onRenameQuestionnaire?: (calcName: string) => void;
	renamePending?: boolean;
	/** Внешняя загрузка (например, form-package с сервера). */
	loading?: boolean;
	errorMessage?: string | null;
	/** Превью шаблона в админке — debounce ввода и отложенная логика. */
	debouncePreviewInputs?: boolean;
	"data-test-id"?: string;
};

const saveLedPulse = keyframes`
	0%, 100% { opacity: 1; }
	50% { opacity: 0.35; }
`;

function saveStatusLedColor(status: QuestionnaireSaveStatus): string {
	switch (status) {
		case "saved":
			return "success.main";
		case "error":
			return "error.main";
		case "dirty":
		case "saving":
			return "warning.main";
		default:
			return "action.disabled";
	}
}

function saveStatusLabel(
	status: QuestionnaireSaveStatus,
	errorMessage?: string | null,
): string {
	switch (status) {
		case "saving":
			return "Сохранение…";
		case "saved":
			return "Сохранено";
		case "dirty":
			return "Есть несохранённые изменения";
		case "error":
			return errorMessage?.trim() || "Ошибка сохранения";
		default:
			return "Автосохранение";
	}
}

/** Общая оболочка анкеты: layout по макету + RJSF + итоговая оценка. */
export function AnketaFormShell({
	source,
	engine: engineProp,
	schemaBinding,
	readOnly,
	onSave,
	saveDisabled,
	savePending,
	saveStatus = "idle",
	saveErrorMessage = null,
	lockMessage = null,
	headerExtra,
	questionnaireId,
	questionnaireCalcName,
	templateName = null,
	questionnaireStatus = "active",
	onRenameQuestionnaire,
	renamePending = false,
	loading: externalLoading = false,
	errorMessage = null,
	debouncePreviewInputs = false,
	"data-test-id": dataTestId = "anketa-form-shell",
}: Props) {
	const navigate = useNavigate();
	const groups = useUserStore((s) => s.groups);
	const {
		canCreateCalculation,
		canDeleteCalculation,
		canEditCalculation,
		canExportReports,
		canWorkflowApprove,
		canCompleteAnketa,
		canHoldCalculation,
	} = usePermissions();

	const createCopy = useCreateV2QuestionnaireVersion();
	const holdMutation = useHoldV2Questionnaire();
	const bulkDelete = useBulkDeleteV2Questionnaires();
	const [holdDialogOpen, setHoldDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const internalEngine = useV2AnketaSchemaEngine(engineProp ? null : source);
	const engine = engineProp ?? internalEngine;
	const setFormData = (next: Record<string, unknown>) =>
		engine.setFormData(next);
	/** Ролевая видимость блоков: скрытые секции не входят в allSectionsCompleted. */
	const viewerAccess = useAnketaViewerAccess(!debouncePreviewInputs);
	const {
		workflow,
		globallyLocked,
		allSectionsCompleted,
		completeMainSection,
		touchMainSection,
		completeGlobalFill,
		isSectionLocked,
	} = useAnketaWorkflow(
		engine.formData,
		setFormData,
		engine.previewUiSchema,
		viewerAccess,
	);
	/** Без create/edit поля только для чтения (матрица F-05: saprg и т.п.). */
	const permissionReadOnly = questionnaireId
		? !canEditCalculation
		: !canCreateCalculation;
	const effectiveReadOnly = readOnly || globallyLocked || permissionReadOnly;
	const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
	const [calculationDebugOpen, setCalculationDebugOpen] = useState(false);
	const [completeDialogPhase, setCompleteDialogPhase] =
		useState<AnketaGlobalCompleteDialogPhase>("confirm");
	const [copyNameDialogOpen, setCopyNameDialogOpen] = useState(false);
	const [renameDialogOpen, setRenameDialogOpen] = useState(false);
	const [schemaInfoOpen, setSchemaInfoOpen] = useState(false);
	const canShowSchemaInfo = Boolean(
		templateName?.trim() ||
			schemaBinding?.boundTemplateVersionId ||
			schemaBinding?.boundTemplateVersionNumber != null,
	);
	const saveAfterCompleteRef = useRef(false);
	const openCompleteDialog = useCallback(() => {
		setCompleteDialogPhase("confirm");
		setCompleteDialogOpen(true);
	}, []);

	const deleteAccess = useMemo(
		() => canUserDeleteV2Questionnaire(groups, engine.formData),
		[groups, engine.formData],
	);
	const deleteResolved = useMemo(
		() =>
			resolveV2QuestionnaireDeleteAction(
				workflow.globalStatus,
				questionnaireStatus,
			),
		[workflow.globalStatus, questionnaireStatus],
	);
	const canShowDelete =
		Boolean(questionnaireId) &&
		canDeleteCalculation &&
		deleteAccess.ok &&
		deleteResolved.action !== "deny";
	const deleteIsHard = deleteResolved.action === "hard_delete";

	const confirmDelete = useCallback(() => {
		if (!questionnaireId) return;
		bulkDelete.mutate(
			{ ids: [questionnaireId] },
			{
				onSuccess: (result) => {
					setDeleteDialogOpen(false);
					const failed = result.failed[0];
					if (failed) {
						toast.error(failed.message || "Не удалось удалить анкету");
						return;
					}
					if (result.deactivatedIds.includes(questionnaireId)) {
						toast.success("Анкета переведена в статус «Неактивная»");
					} else {
						toast.success("Анкета удалена");
					}
					navigate("/v2");
				},
				onError: (err) =>
					toast.error("Ошибка удаления", {
						description: apiErrorMessage(err),
					}),
			},
		);
	}, [bulkDelete, navigate, questionnaireId]);

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
		() => buildQuestionnaireCopyCalcName(questionnaireCalcName ?? "Анкета"),
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

	const hideWorkEstimates = userMasksAllWorkEstimates(viewerAccess.roles);
	/**
	 * §4: у представителя стрима глобальная кнопка недоступна всегда.
	 * Гард на фронте дублирует Keycloak-матрицу: до пересинка право может остаться в токене.
	 */
	const mayCompleteWholeAnketa =
		canCompleteAnketa &&
		(!viewerAccess.applyAccessRules ||
			canViewerCompleteWholeAnketa(viewerAccess.roles));

	const confirmHold = useCallback(() => {
		if (!questionnaireId) return;
		holdMutation.mutate(questionnaireId, {
			onSuccess: () => {
				toast.success("Срез анкеты зафиксирован");
				setHoldDialogOpen(false);
			},
			onError: (err) =>
				toast.error("Не удалось зафиксировать срез", {
					description: apiErrorMessage(err),
				}),
		});
	}, [holdMutation, questionnaireId]);

	const anketaFormContext = useMemo((): AnketaFormContextValue => {
		// Только page-level overrides; formData/schema/ui берёт V2AnketaFormWithModals из engine.
		return {
			workflow,
			// Approve блока (ФТ-6) — только роли с anketa_workflow_approve.
			onCompleteMainSection: canWorkflowApprove
				? completeMainSection
				: undefined,
			onTouchMainSection: touchMainSection,
			isMainSectionLocked: isSectionLocked,
			anketaReadOnly: effectiveReadOnly,
			schemaEditorPreview: false,
			debouncePreviewInputs,
			viewerAccess,
		};
	}, [
		canWorkflowApprove,
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

	/** Экспорт текущей анкеты в XLSX: только сохранённая анкета + право export. */
	const onExportExcel = useMemo(() => {
		if (!questionnaireId || !canExportReports) return undefined;
		return async () => {
			try {
				const blob = await v2QuestionnairesExportXlsx({
					ids: [questionnaireId],
				});
				const date = new Date().toISOString().slice(0, 10);
				downloadBlob(blob, `v2-questionnaire-${date}.xlsx`);
				toast.success("Анкета экспортирована");
			} catch (error) {
				toast.error("Не удалось экспортировать анкету", {
					description: apiErrorMessage(error),
				});
			}
		};
	}, [questionnaireId, canExportReports]);

	const headerLeadingAccessory = useMemo(
		() => (
			<Box
				sx={{
					display: "inline-flex",
					alignItems: "center",
					gap: 1,
					ml: 0.5,
					flexShrink: 0,
				}}
				data-test-id={`${dataTestId}--leading`}
			>
				{canShowSchemaInfo ? (
					<IconButton
						size="small"
						title="Схема анкеты"
						aria-label="Схема анкеты"
						onClick={() => setSchemaInfoOpen(true)}
						data-test-id={`${dataTestId}--schema-info`}
					>
						<InfoOutlinedIcon fontSize="small" />
					</IconButton>
				) : null}
				{canRenameQuestionnaire ? (
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
				) : null}
				{onSave && canSaveQuestionnaire ? (
					<Box
						component="span"
						title={saveStatusLabel(saveStatus, saveErrorMessage)}
						aria-label={saveStatusLabel(saveStatus, saveErrorMessage)}
						data-test-id={`${dataTestId}--save-led`}
						sx={{
							width: 8,
							height: 8,
							borderRadius: "50%",
							bgcolor: saveStatusLedColor(saveStatus),
							flexShrink: 0,
							display: "block",
							mx: 0.5,
							animation:
								saveStatus === "saving" || saveStatus === "dirty"
									? `${saveLedPulse} 1.1s ease-in-out infinite`
									: "none",
						}}
					/>
				) : null}
				<AnketaSectionStatusChip kind="global" status={workflow.globalStatus} />
			</Box>
		),
		[
			canRenameQuestionnaire,
			canSaveQuestionnaire,
			canShowSchemaInfo,
			dataTestId,
			onSave,
			renamePending,
			saveErrorMessage,
			saveStatus,
			workflow.globalStatus,
		],
	);

	const headerActions = useMemo(
		() => (
			<>
				{!globallyLocked && mayCompleteWholeAnketa ? (
					<IconButton
						color="primary"
						disabled={!allSectionsCompleted || effectiveReadOnly}
						title={
							allSectionsCompleted
								? V2_ANKETA_GLOBAL_COMPLETE_LABEL
								: "Сначала завершите заполнение всех основных разделов"
						}
						aria-label={V2_ANKETA_GLOBAL_COMPLETE_LABEL}
						onClick={openCompleteDialog}
						data-test-id={`${dataTestId}--complete`}
					>
						<TaskAltIcon />
					</IconButton>
				) : null}
				{headerExtra}
				{/* {IS_DEV && (
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
				)} */}
				{workflow.globalStatus === "Заполнено" &&
				canHoldCalculation &&
				questionnaireId ? (
					<Button
						variant="contained"
						color="primary"
						size="small"
						disabled={holdMutation.isPending}
						title="Зафиксировать срез: статус «Утверждена», анкета станет неизменяемой"
						onClick={() => setHoldDialogOpen(true)}
						sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
					>
						{V2_ANKETA_HOLD_LABEL}
					</Button>
				) : null}
				{(workflow.globalStatus === "Заполнено" ||
					workflow.globalStatus === "Утверждена") &&
				questionnaireId &&
				canCreateCalculation ? (
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
				{canShowDelete ? (
					<IconButton
						size="small"
						color="error"
						title={
							deleteIsHard ? "Удалить анкету" : "Сделать анкету неактивной"
						}
						aria-label={
							deleteIsHard ? "Удалить анкету" : "Сделать анкету неактивной"
						}
						disabled={bulkDelete.isPending}
						onClick={() => setDeleteDialogOpen(true)}
						data-test-id={`${dataTestId}--delete`}
					>
						<DeleteOutlineIcon fontSize="small" />
					</IconButton>
				) : null}
				{onSave && canSaveQuestionnaire ? (
					<IconButton
						onClick={onSave}
						disabled={saveDisabled || savePending || effectiveReadOnly}
						title="Сохранить"
						aria-label="Сохранить"
						data-test-id={`${dataTestId}--save`}
					>
						{savePending ? (
							<CircularProgress size={22} color="inherit" />
						) : (
							<SaveIcon />
						)}
					</IconButton>
				) : null}
			</>
		),
		[
			canSaveQuestionnaire,
			canWorkflowApprove,
			mayCompleteWholeAnketa,
			canHoldCalculation,
			canCreateCalculation,
			canDeleteCalculation,
			canShowDelete,
			deleteIsHard,
			headerExtra,
			isEditingQuestionnaire,
			onSave,
			saveDisabled,
			savePending,
			dataTestId,
			openCopyNameDialog,
			effectiveReadOnly,
			workflow.globalStatus,
			globallyLocked,
			allSectionsCompleted,
			openCompleteDialog,
			questionnaireId,
			createCopy.isPending,
			holdMutation.isPending,
			bulkDelete.isPending,
			dataTestId,
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
							{lockMessage ? (
								<Alert severity="warning" sx={{ mb: 2 }}>
									{lockMessage}
								</Alert>
							) : null}
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
							onExportExcel={onExportExcel}
							hideWorkEstimates={hideWorkEstimates}
							viewerAccess={viewerAccess}
						/>
					)
				}
			/>
			<AnketaGlobalCompleteDialog
				open={completeDialogOpen}
				phase={completeDialogPhase}
				onClose={closeCompleteDialog}
				canSave={Boolean(onSave) && canSaveQuestionnaire && !saveDisabled}
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
			<Dialog
				open={holdDialogOpen}
				onClose={() =>
					holdMutation.isPending ? undefined : setHoldDialogOpen(false)
				}
			>
				<DialogTitle>{V2_ANKETA_HOLD_LABEL}</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Анкета перейдёт в статус «Утверждена» и станет неизменяемой
						историческим срезом. Для следующего периода создайте копию.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setHoldDialogOpen(false)}
						disabled={holdMutation.isPending}
					>
						Отмена
					</Button>
					<Button
						variant="contained"
						onClick={confirmHold}
						disabled={holdMutation.isPending}
					>
						{holdMutation.isPending ? (
							<CircularProgress size={18} color="inherit" />
						) : (
							"Зафиксировать"
						)}
					</Button>
				</DialogActions>
			</Dialog>
			<Dialog
				open={deleteDialogOpen}
				onClose={() =>
					bulkDelete.isPending ? undefined : setDeleteDialogOpen(false)
				}
			>
				<DialogTitle>
					{deleteIsHard ? "Удалить анкету?" : "Сделать анкету неактивной?"}
				</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{deleteIsHard
							? "Анкета будет полностью удалена из реестра. Действие необратимо."
							: "Анкета останется в реестре со статусом записи «Неактивная»."}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => setDeleteDialogOpen(false)}
						disabled={bulkDelete.isPending}
					>
						Отмена
					</Button>
					<Button
						color="error"
						variant="contained"
						onClick={confirmDelete}
						disabled={bulkDelete.isPending}
					>
						{bulkDelete.isPending ? (
							<CircularProgress size={18} color="inherit" />
						) : deleteIsHard ? (
							"Удалить"
						) : (
							"Сделать неактивной"
						)}
					</Button>
				</DialogActions>
			</Dialog>

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
			<AnketaSchemaInfoDialog
				open={schemaInfoOpen}
				onClose={() => setSchemaInfoOpen(false)}
				templateName={templateName}
				schemaBinding={schemaBinding}
				data-test-id={`${dataTestId}--schema-info-dialog`}
			/>
		</>
	);
}

export function useAnketaFormEngine(source: V2AnketaSchemaEngineSource | null) {
	return useV2AnketaSchemaEngine(source);
}
