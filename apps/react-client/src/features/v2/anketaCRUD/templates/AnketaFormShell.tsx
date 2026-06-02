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
import type { AnketaFormContextValue } from "../utils/anketaFormContext";
import { ANKETA_MODAL_ARRAY_PATH_SET } from "../utils/anketaFormModalPaths";
import { AnketaFormPageLayout } from "./AnketaFormPageLayout";

type Engine = ReturnType<typeof useV2AnketaSchemaEngine>;

const HIDDEN_TOP_LEVEL_FIELDS = ["uncertaintyCalculation"];

type Props = {
	source: V2AnketaSchemaEngineSource | null;
	engine?: Engine;
	schemaBinding?: V2SchemaBindingDto | null;
	readOnly?: boolean;
	onSave?: () => void;
	saveDisabled?: boolean;
	savePending?: boolean;
	headerExtra?: ReactNode;
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
	"data-test-id": dataTestId = "anketa-form-shell",
}: Props) {
	const internalEngine = useV2AnketaSchemaEngine(engineProp ? null : source);
	const engine = engineProp ?? internalEngine;
	const modalControlsRef = useRef<AnketaFormModalControls>({
		openArrayModal: () => {},
		openUncertaintyModal: () => {},
		deleteArrayItem: () => {},
	});

	const anketaFormContext = useMemo((): AnketaFormContextValue => {
		const controls = modalControlsRef.current;
		return {
			formData: engine.displayFormData,
			objectFieldSlots: {
				generalInfo: (
					<Stack spacing={1.5} sx={{ pt: 1 }}>
						<Typography variant="body2" color="text.secondary">
							Общая неопределенность:{" "}
							{uncertaintySummaryText(engine.displayFormData)}
						</Typography>
						<Box>
							<Button
								variant="contained"
								size="small"
								startIcon={<CalculateOutlinedIcon />}
								disabled={readOnly}
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
			anketaReadOnly: readOnly,
		};
	}, [engine.displayFormData, readOnly]);

	const headerActions = useMemo(
		() => (
			<>
				{headerExtra}
				{onSave ? (
					<IconButton
						onClick={onSave}
						disabled={saveDisabled || savePending}
						title="Сохранить"
					>
						{savePending ? <CircularProgress size={20} /> : <SaveIcon />}
					</IconButton>
				) : null}
			</>
		),
		[headerExtra, onSave, saveDisabled, savePending],
	);

	return (
		<>
			<AnketaFormPageLayout
				data-test-id={dataTestId}
				headerActions={headerActions}
				main={
					<V2AnketaSchemaForm
						source={source}
						engine={engine}
						schemaBinding={schemaBinding}
						readOnly={readOnly}
						hiddenTopLevelFields={HIDDEN_TOP_LEVEL_FIELDS}
						anketaFormContext={anketaFormContext}
					/>
				}
				sidebar={
					<FinalScoreCard
						summary={engine.summary}
						isLoading={engine.calculationLoading}
					/>
				}
			/>
			<AnketaFormModals
				formData={engine.formData}
				onFormDataChange={engine.setFormData}
				controlsRef={modalControlsRef}
			/>
		</>
	);
}

export function useAnketaFormEngine(source: V2AnketaSchemaEngineSource | null) {
	return useV2AnketaSchemaEngine(source);
}
