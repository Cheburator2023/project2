import CalculateOutlinedIcon from "@mui/icons-material/CalculateOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useMemo, useRef, type ReactNode } from "react";
import { useAnketaWorkflow } from "../hooks/useAnketaWorkflow";
import type { V2AnketaSchemaEngine } from "../hooks/useV2AnketaSchemaEngine";
import {
	mergeAnketaFormContext,
	type AnketaFormContextValue,
} from "../utils/anketaFormContext";
import { resolveAnketaFormModalBindingSets } from "../utils/anketaFormModalPaths";
import {
	AnketaFormModals,
	type AnketaFormModalControls,
	uncertaintySummaryText,
} from "./AnketaFormModals";
import { V2AnketaSchemaForm } from "./V2AnketaSchemaForm";
import { Flex } from "@react-client/common/primitives/Flex";
import { ANKETA_COLUMN_VIEWPORT_HEIGHT } from "../templates/AnketaFormPageLayout";

type Props = {
	engine: V2AnketaSchemaEngine;
	readOnly?: boolean;
	/** Доп. корневые ключи, скрываемые поверх uiSchema (редко). */
	hiddenTopLevelFields?: string[];
	anketaFormContext?: Partial<
		Omit<
			AnketaFormContextValue,
			"formData" | "previewSchema" | "previewUiSchema"
		>
	>;
	/** Слот «Рассчитать общую неопределённость» в generalInfo (режим анкеты). */
	showUncertaintySlot?: boolean;
	formRemountKey?: number;
	"data-test-id"?: string;
};

/** RJSF-форма анкеты + модалки; единый вход для превью конструктора и страниц анкеты. */
export function V2AnketaFormWithModals({
	engine,
	readOnly = false,
	hiddenTopLevelFields = [],
	anketaFormContext: anketaFormContextProp,
	showUncertaintySlot = false,
	formRemountKey,
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

		return mergeAnketaFormContext(anketaFormContextProp, {
			formData: engine.displayFormData,
			previewSchema: engine.previewSchema,
			previewUiSchema: engine.previewUiSchema,
			workflow,
			onCompleteMainSection: completeMainSection,
			onCompletePanelSection: completePanelSectionByPath,
			onTouchMainSection: touchMainSection,
			isMainSectionLocked: isSectionLocked,
			objectFieldSlots: uncertaintySlot
				? { generalInfo: uncertaintySlot }
				: undefined,
			openAnketaModal: (path, editIndex) =>
				modalControlsRef.current.openArrayModal(path, editIndex),
			openUncertaintyModal: () =>
				modalControlsRef.current.openUncertaintyModal(),
			deleteAnketaArrayItem: (path, index) =>
				modalControlsRef.current.deleteArrayItem(path, index),
			deleteAnketaObject: (path) => modalControlsRef.current.deleteObject(path),
			anketaModalArrayPaths: modalBindingSets.modalArrayPathSet,
			anketaCompactArrayTablePaths: modalBindingSets.compactArrayTablePathSet,
			anketaModalObjectPaths: modalBindingSets.modalObjectPathSet,
			anketaReadOnly: effectiveReadOnly,
			schemaEditorPreview: anketaFormContextProp?.schemaEditorPreview,
		});
	}, [
		anketaFormContextProp,
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
			<Flex
				flexDirection="column"
				width="100%"
				minWidth="0"
				height={ANKETA_COLUMN_VIEWPORT_HEIGHT}
				data-test-id={dataTestId}
				sx={{ overflow: "auto", borderRadius: "8px" }}
			>
				<V2AnketaSchemaForm
					engine={engine}
					readOnly={effectiveReadOnly}
					hiddenTopLevelFields={hiddenTopLevelFields}
					anketaFormContext={anketaFormContext}
					modalBindings={modalBindingSets}
					formRemountKey={formRemountKey}
				/>
			</Flex>
			<AnketaFormModals
				formData={engine.displayFormData}
				previewSchema={engine.previewSchema}
				previewUiSchema={engine.previewUiSchema}
				modalBindings={modalBindingSets.bindings}
				onFormDataChange={engine.setFormData}
				controlsRef={modalControlsRef}
				data-test-id={"anketa-form-modals"}
			/>
		</>
	);
}
