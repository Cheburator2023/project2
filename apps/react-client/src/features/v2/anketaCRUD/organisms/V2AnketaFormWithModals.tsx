import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMemo, useRef, type ReactNode } from "react";
import type { V2AnketaSchemaEngine } from "../hooks/useV2AnketaSchemaEngine";
import type { AnketaFormContextValue } from "../utils/anketaFormContext";
import {
	ANKETA_COMPACT_ARRAY_TABLE_PATH_SET,
	ANKETA_MODAL_ARRAY_PATH_SET,
	ANKETA_MODAL_OBJECT_PATH_SET,
} from "../utils/anketaFormModalPaths";
import {
	AnketaFormModals,
	type AnketaFormModalControls,
	uncertaintySummaryText,
} from "./AnketaFormModals";
import { V2AnketaSchemaForm } from "./V2AnketaSchemaForm";
import { Flex } from "@react-client/common/primitives/Flex";

type Props = {
	engine: V2AnketaSchemaEngine;
	readOnly?: boolean;
	hiddenTopLevelFields?: string[];
	anketaFormContext?: AnketaFormContextValue;
	/** Слот «Рассчитать общую неопределённость» в generalInfo (режим анкеты). */
	showUncertaintySlot?: boolean;
	"data-test-id"?: string;
};

/** RJSF-форма анкеты + модалки; один вход для страницы анкеты и превью в админке. */
export function V2AnketaFormWithModals({
	engine,
	readOnly = false,
	hiddenTopLevelFields = [],
	anketaFormContext: anketaFormContextProp,
	showUncertaintySlot = false,
	"data-test-id": dataTestId = "v2-anketa-form-with-modals",
}: Props) {
	const effectiveReadOnly = readOnly || engine.readOnly;
	const modalControlsRef = useRef<AnketaFormModalControls>({
		openArrayModal: () => {},
		openUncertaintyModal: () => {},
		deleteArrayItem: () => {},
		deleteObject: () => {},
	});

	const anketaFormContext = useMemo((): AnketaFormContextValue => {
		const controls = modalControlsRef.current;
		const uncertaintySlot: ReactNode | undefined = showUncertaintySlot ? (
			<Flex gap={1.5} alignItems="center" justifyContent="space-between">
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
			</Flex>
		) : undefined;

		return {
			...anketaFormContextProp,
			formData: anketaFormContextProp?.formData ?? engine.formData,
			objectFieldSlots: {
				...anketaFormContextProp?.objectFieldSlots,
				...(uncertaintySlot ? { generalInfo: uncertaintySlot } : {}),
			},
			openAnketaModal:
				anketaFormContextProp?.openAnketaModal ??
				((path, editIndex) => controls.openArrayModal(path, editIndex)),
			openUncertaintyModal:
				anketaFormContextProp?.openUncertaintyModal ??
				(() => controls.openUncertaintyModal()),
			deleteAnketaArrayItem:
				anketaFormContextProp?.deleteAnketaArrayItem ??
				((path, index) => controls.deleteArrayItem(path, index)),
			deleteAnketaObject:
				anketaFormContextProp?.deleteAnketaObject ??
				((path) => controls.deleteObject(path)),
			anketaModalArrayPaths:
				anketaFormContextProp?.anketaModalArrayPaths ??
				ANKETA_MODAL_ARRAY_PATH_SET,
			anketaCompactArrayTablePaths:
				anketaFormContextProp?.anketaCompactArrayTablePaths ??
				ANKETA_COMPACT_ARRAY_TABLE_PATH_SET,
			anketaModalObjectPaths:
				anketaFormContextProp?.anketaModalObjectPaths ??
				ANKETA_MODAL_OBJECT_PATH_SET,
			anketaReadOnly:
				anketaFormContextProp?.anketaReadOnly ?? effectiveReadOnly,
		};
	}, [
		anketaFormContextProp,
		engine.formData,
		effectiveReadOnly,
		showUncertaintySlot,
	]);

	return (
		<>
			<V2AnketaSchemaForm
				engine={engine}
				readOnly={effectiveReadOnly}
				hiddenTopLevelFields={hiddenTopLevelFields}
				anketaFormContext={anketaFormContext}
				data-test-id={dataTestId}
			/>
			<AnketaFormModals
				formData={engine.formData}
				previewSchema={engine.previewSchema}
				previewUiSchema={engine.previewUiSchema}
				onFormDataChange={engine.setFormData}
				controlsRef={modalControlsRef}
			/>
		</>
	);
}
