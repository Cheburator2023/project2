import SaveIcon from "@mui/icons-material/Save";
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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
	AnketaGlobalCompleteDialog,
	type AnketaGlobalCompleteDialogPhase,
} from "../organisms/AnketaGlobalCompleteDialog";
import { FinalScoreCard } from "../organisms/FinalScoreCard";
import { V2AnketaFormWithModals } from "../organisms/V2AnketaFormWithModals";
import {
	useV2AnketaSchemaEngine,
	type V2AnketaSchemaEngine,
	type V2AnketaSchemaEngineSource,
} from "../hooks/useV2AnketaSchemaEngine";
import { AnketaSectionStatusChip } from "../molecules/AnketaSectionStatusChip";
import { useAnketaWorkflow } from "../hooks/useAnketaWorkflow";
import { useSchemaBindingToast } from "../hooks/useSchemaBindingToast";
import type { AnketaFormContextValue } from "../utils/anketaFormContext";
import { AnketaFormPageLayout } from "./AnketaFormPageLayout";
import { useCreateV2QuestionnaireVersion } from "@react-client/common/api/queries/v2-questionnaires";
import { useNavigate } from "react-router";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";
import {usePermissions} from "@react-client/hooks/usePermissions";

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
	/** Внешняя загрузка (например, form-package с сервера). */
	loading?: boolean;
	errorMessage?: string | null;
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
	loading: externalLoading = false,
	errorMessage = null,
	"data-test-id": dataTestId = "anketa-form-shell",
}: Props) {
	const navigate = useNavigate();
	const { canEditCalculation, canCreateCalculation } = usePermissions();

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
	const [completeDialogPhase, setCompleteDialogPhase] =
		useState<AnketaGlobalCompleteDialogPhase>("confirm");
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

	const handleCreateCopy = useCallback(() => {
		if (!questionnaireId) return;
		createCopy.mutate(
			{ id: questionnaireId, body: { formData: engine.formData } },
			{
				onSuccess: (created) => {
					toast.success("Создана копия анкеты");
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
	}, [
		closeCompleteDialog,
		createCopy,
		engine.formData,
		navigate,
		questionnaireId,
	]);

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
	}, [
		completeDialogOpen,
		completeDialogPhase,
		onSave,
		workflow.globalStatus,
	]);

	const anketaFormContext = useMemo((): AnketaFormContextValue => {
		return {
			formData: engine.formData,
			previewSchema: engine.previewSchema,
			previewUiSchema: engine.previewUiSchema,
			workflow,
			onCompleteMainSection: completeMainSection,
			onTouchMainSection: touchMainSection,
			isMainSectionLocked: isSectionLocked,
			anketaReadOnly: effectiveReadOnly,
			schemaEditorPreview: false,
		};
	}, [
		engine.formData,
		engine.previewSchema,
		engine.previewUiSchema,
		effectiveReadOnly,
		workflow,
		completeMainSection,
		touchMainSection,
		isSectionLocked,
	]);

	const headerActions = useMemo(
		() => (
			<>
				<AnketaSectionStatusChip kind="global" status={workflow.globalStatus} />
				{!globallyLocked ? (
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
				{workflow.globalStatus === "Заполнено" && questionnaireId ? (
					<Button
						variant="outlined"
						size="small"
						disabled={createCopy.isPending}
						title="Создать копию анкеты в статусе «Черновик»"
						onClick={handleCreateCopy}
						sx={{ textTransform: "none", whiteSpace: "nowrap" }}
					>
						Создать копию
					</Button>
				) : null}
				{(onSave && canCreateCalculation) ? (
					<IconButton
						onClick={onSave}
						disabled={saveDisabled || savePending || effectiveReadOnly}
						title="Сохранить"
					>
						{savePending ? <CircularProgress size={20} /> : <SaveIcon />}
					</IconButton>
				) : null}
			</>
		),
		[
			canCreateCalculation,
			headerExtra,
			onSave,
			saveDisabled,
			savePending,
			effectiveReadOnly,
			workflow.globalStatus,
			globallyLocked,
			allSectionsCompleted,
			openCompleteDialog,
			questionnaireId,
			createCopy.isPending,
			handleCreateCopy,
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
				sidebar={
					errorMessage ? (
						<Box />
					) : (
						<FinalScoreCard
							summary={engine.summary}
							isLoading={engine.calculationLoading}
						/>
					)
				}
			/>
			<AnketaGlobalCompleteDialog
				open={completeDialogOpen}
				phase={completeDialogPhase}
				onClose={closeCompleteDialog}
				canSave={Boolean(onSave) && !saveDisabled}
				savePending={savePending}
				hasQuestionnaireId={Boolean(questionnaireId)}
				createCopyPending={createCopy.isPending}
				onConfirmComplete={() => finalizeComplete(false)}
				onConfirmCompleteAndSave={() => finalizeComplete(true)}
				onSave={() => onSave?.()}
				onCreateCopy={handleCreateCopy}
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
		</>
	);
}

export function useAnketaFormEngine(source: V2AnketaSchemaEngineSource | null) {
	return useV2AnketaSchemaEngine(source);
}
