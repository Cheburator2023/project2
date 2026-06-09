import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useMemo, useRef, type ReactNode } from "react";
import { useAnketaWorkflow } from "../hooks/useAnketaWorkflow";
import type { V2AnketaSchemaEngine } from "../hooks/useV2AnketaSchemaEngine";
import type { AnketaFormContextValue } from "../utils/anketaFormContext";
import { resolveAnketaFormModalBindingSets } from "../utils/anketaFormModalPaths";
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
	/** Доп. корневые ключи, скрываемые поверх uiSchema (редко). */
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

	const {
		workflow,
		completeMainSection,
		completePanelSectionByPath,
		touchMainSection,
		isSectionLocked,
	} = useAnketaWorkflow(engine.formData, engine.setFormData);

	const modalBindingSets = useMemo(
		() =>
			resolveAnketaFormModalBindingSets(
				engine.previewSchema as Record<string, unknown>,
				engine.previewUiSchema as Record<string, unknown>,
			),
		[engine.previewSchema, engine.previewUiSchema],
	);

	const modalControlsRef = useRef<AnketaFormModalControls>({
		openArrayModal: () => {},
		openUncertaintyModal: () => {},
		deleteArrayItem: () => {},
		deleteObject: () => {},
	});

	const anketaFormContext = useMemo((): AnketaFormContextValue => {
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
						onClick={() => modalControlsRef.current.openUncertaintyModal()}
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
			previewSchema:
				anketaFormContextProp?.previewSchema ?? engine.previewSchema,
			previewUiSchema:
				anketaFormContextProp?.previewUiSchema ?? engine.previewUiSchema,
			workflow: anketaFormContextProp?.workflow ?? workflow,
			onCompleteMainSection:
				anketaFormContextProp?.onCompleteMainSection ?? completeMainSection,
			onCompletePanelSection:
				anketaFormContextProp?.onCompletePanelSection ??
				completePanelSectionByPath,
			onTouchMainSection:
				anketaFormContextProp?.onTouchMainSection ?? touchMainSection,
			isMainSectionLocked:
				anketaFormContextProp?.isMainSectionLocked ?? isSectionLocked,
			objectFieldSlots: {
				...anketaFormContextProp?.objectFieldSlots,
				...(uncertaintySlot ? { generalInfo: uncertaintySlot } : {}),
			},
			openAnketaModal:
				anketaFormContextProp?.openAnketaModal ??
				((path, editIndex) =>
					modalControlsRef.current.openArrayModal(path, editIndex)),
			openUncertaintyModal:
				anketaFormContextProp?.openUncertaintyModal ??
				(() => modalControlsRef.current.openUncertaintyModal()),
			deleteAnketaArrayItem:
				anketaFormContextProp?.deleteAnketaArrayItem ??
				((path, index) =>
					modalControlsRef.current.deleteArrayItem(path, index)),
			deleteAnketaObject:
				anketaFormContextProp?.deleteAnketaObject ??
				((path) => modalControlsRef.current.deleteObject(path)),
			anketaModalArrayPaths:
				anketaFormContextProp?.anketaModalArrayPaths ??
				modalBindingSets.modalArrayPathSet,
			anketaCompactArrayTablePaths:
				anketaFormContextProp?.anketaCompactArrayTablePaths ??
				modalBindingSets.compactArrayTablePathSet,
			anketaModalObjectPaths:
				anketaFormContextProp?.anketaModalObjectPaths ??
				modalBindingSets.modalObjectPathSet,
			anketaReadOnly:
				anketaFormContextProp?.anketaReadOnly ?? effectiveReadOnly,
			schemaEditorPreview: anketaFormContextProp?.schemaEditorPreview ?? false,
		};
	}, [
		anketaFormContextProp,
		engine.formData,
		engine.displayFormData,
		effectiveReadOnly,
		showUncertaintySlot,
		modalBindingSets,
		workflow,
		completeMainSection,
		completePanelSectionByPath,
		touchMainSection,
		isSectionLocked,
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
				modalBindings={modalBindingSets.bindings}
				onFormDataChange={engine.setFormData}
				controlsRef={modalControlsRef}
			/>
		</>
	);
}
