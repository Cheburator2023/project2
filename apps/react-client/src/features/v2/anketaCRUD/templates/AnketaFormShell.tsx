import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import SaveIcon from "@mui/icons-material/Save";
import {
	Box,
	Button,
	CircularProgress,
	IconButton,
	Stack,
	Typography,
} from "@mui/material";
import type { V2SchemaBindingDto } from "@smart-anketa/api-contract";
import { V2_ANKETA_GLOBAL_COMPLETE_LABEL } from "@smart-anketa/api-contract";
import { useMemo, useRef, type ReactNode } from "react";
import {
	AnketaFormModals,
	type AnketaFormModalControls,
	uncertaintySummaryText,
} from "../organisms/AnketaFormModals";
import { FinalScoreCard } from "../organisms/FinalScoreCard";
import { V2AnketaSchemaForm } from "../organisms/V2AnketaSchemaForm";
import {
	useV2AnketaSchemaEngine,
	type V2AnketaSchemaEngineSource,
} from "../hooks/useV2AnketaSchemaEngine";
import { AnketaSectionStatusChip } from "../molecules/AnketaSectionStatusChip";
import { useAnketaWorkflow } from "../hooks/useAnketaWorkflow";
import type { AnketaFormContextValue } from "../utils/anketaFormContext";
import { ANKETA_MODAL_ARRAY_PATH_SET } from "../utils/anketaFormModalPaths";
import { AnketaFormPageLayout } from "./AnketaFormPageLayout";
import { useCreateV2QuestionnaireVersion } from "@react-client/common/api/queries/v2-questionnaires";
import { useNavigate } from "react-router";
import { v2Routes } from "@react-client/routing/version/v2/routes";
import { toast } from "@react-client/common/toasts";
import { apiErrorMessage } from "@react-client/common/api/helpers/apiErrorMessage";

type Engine = ReturnType<typeof useV2AnketaSchemaEngine>;

const HIDDEN_TOP_LEVEL_FIELDS = ["workflow", "uncertaintyCalculation"];

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
	const createCopy = useCreateV2QuestionnaireVersion();
	const internalEngine = useV2AnketaSchemaEngine(engineProp ? null : source);
	const engine = engineProp ?? internalEngine;
	const setFormData = (next: Record<string, unknown>) => engine.setFormData(next);
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
	const modalControlsRef = useRef<AnketaFormModalControls>({
		openArrayModal: () => {},
		openUncertaintyModal: () => {},
		deleteArrayItem: () => {},
	});

	const anketaFormContext = useMemo((): AnketaFormContextValue => {
		const controls = modalControlsRef.current;
		return {
			formData: engine.displayFormData,
			workflow,
			onCompleteMainSection: completeMainSection,
			onTouchMainSection: touchMainSection,
			isMainSectionLocked: isSectionLocked,
			objectFieldSlots: {
				generalInfo: (
					<Stack spacing={1.5} sx={{ pt: 1 }}>
						<Typography variant="body2" color="text.secondary">
							Общая неопределенность:{" "}
							{uncertaintySummaryText(engine.displayFormData)}
						</Typography>
						<Box>
							<Button
								variant="outlined"
								size="small"
								startIcon={<CalculateOutlinedIcon />}
								disabled={effectiveReadOnly}
								onClick={() => controls.openUncertaintyModal()}
								sx={{ textTransform: "uppercase", fontWeight: 600 }}
							>
								Рассчитать общую неопределенность
							</Button>
						</Box>
					</Stack>
				),
			},
			openAnketaModal: (path, editIndex) =>
				controls.openArrayModal(path, editIndex),
			openUncertaintyModal: () => controls.openUncertaintyModal(),
			deleteAnketaArrayItem: (path, index) =>
				controls.deleteArrayItem(path, index),
			anketaModalArrayPaths: ANKETA_MODAL_ARRAY_PATH_SET,
			anketaReadOnly: effectiveReadOnly,
		};
	}, [
		engine.displayFormData,
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
						onClick={completeGlobalFill}
						sx={{ textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}
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
						onClick={() =>
							createCopy.mutate(
								{ id: questionnaireId, body: { formData: engine.formData } },
								{
									onSuccess: (created) => {
										toast.success("Создана копия анкеты");
										navigate(
											`/v2/${v2Routes.calculationPreview.rootPath.replace(":id", created.id)}`,
										);
									},
									onError: (err) =>
										toast.error("Не удалось создать копию", {
											description: apiErrorMessage(err),
										}),
								},
							)
						}
						sx={{ textTransform: "none", whiteSpace: "nowrap" }}
					>
						Создать копию
					</Button>
				) : null}
				{onSave ? (
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
			headerExtra,
			onSave,
			saveDisabled,
			savePending,
			effectiveReadOnly,
			workflow.globalStatus,
			globallyLocked,
			allSectionsCompleted,
			completeGlobalFill,
			questionnaireId,
			createCopy,
			engine.formData,
			navigate,
		],
	);

	const isPageLoading =
		!errorMessage &&
		(externalLoading ||
			engine.versionLoading ||
			engine.dictionaryEnumsLoading);

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
						<V2AnketaSchemaForm
							source={source}
							engine={engine}
							schemaBinding={schemaBinding}
							readOnly={effectiveReadOnly}
							hiddenTopLevelFields={HIDDEN_TOP_LEVEL_FIELDS}
							anketaFormContext={anketaFormContext}
						/>
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
			{errorMessage ? null : (
				<AnketaFormModals
					formData={engine.formData}
					onFormDataChange={engine.setFormData}
					controlsRef={modalControlsRef}
				/>
			)}
		</>
	);
}

export function useAnketaFormEngine(source: V2AnketaSchemaEngineSource | null) {
	return useV2AnketaSchemaEngine(source);
}
