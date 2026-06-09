import {
	TotalUncertaintyModal,
	type TotalUncertaintyFormValues,
} from "@react-client/features/playground/v2_playground/organisms/TotalUncertaintyModal";
import {
	useCallback,
	useLayoutEffect,
	useMemo,
	useState,
	type MutableRefObject,
} from "react";
import { getObjectAtPath } from "../utils/anketaArchObjectTableConfig";
import { getArrayAtPath } from "../utils/anketaModalArrayTableConfig";
import type { AnketaModalKind } from "../utils/anketaFormModalPaths";
import type { V2AnketaEditorBindings } from "@smart-anketa/api-contract";
import {
	appendAtFormPath,
	clearObjectAtFormPath,
	removeAtFormPath,
	setObjectAtFormPath,
	updateAtFormPath,
} from "../utils/anketaFormModalMappers";
import {
	getArrayItemSchemaSliceForModal,
	getObjectSchemaSliceForModal,
} from "../utils/anketaSchemaAtPath";
import { AnketaRjsfObjectModal } from "./AnketaRjsfObjectModal";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { touchSectionForPathInFormData, touchSectionInFormData } from "../hooks/useAnketaWorkflow";

const RISK_FIELD_TO_MODAL: Record<string, string> = {
	businessComplexity: "business_change",
	defectsInSolution: "solution_defects",
	adjacentProjectsImpact: "adjacent_projects",
	laborCostIncrease: "labor_growth",
	contractorMisconduct: "contractor_issues",
	staffShortage: "staff_shortage",
	sanctionsRisk: "sanctions",
	controlGaps: "control_gaps",
	regulatoryChanges: "regulatory",
	systemUnderutilization: "underutilization",
	itArchitectureChanges: "architecture",
};

const RISK_FIELD_FROM_MODAL = Object.fromEntries(
	Object.entries(RISK_FIELD_TO_MODAL).map(([schema, modal]) => [modal, schema]),
);

const RISK_LEVEL_FROM_MODAL: Record<string, string> = {
	low: "Реализация не чаще 1 раза в 10 лет",
	medium_low: "Реализация 1 раз в 3-10 лет",
	medium: "Реализация 1 раз в 1-3 года",
	medium_high: "Реализация 1 раз в год",
	high: "Реализация 1 раз в 6 мес. или чаще",
};

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function toText(value: unknown): string {
	if (value == null) return "";
	return String(value);
}

export function uncertaintyModalDefaults(
	formData: Record<string, unknown>,
): Partial<TotalUncertaintyFormValues> {
	const uncertainty = asRecord(formData.uncertaintyCalculation);
	const riskGroup = asRecord(uncertainty.riskGroup);

	return {
		initiativeTimeline: toText(uncertainty.initiativeTimeline),
		initiativeCost: toText(uncertainty.initiativeCost),
		totalUncertaintyAdjustment: toText(uncertainty.uncertaintyAdjustment),
		risks: Object.fromEntries(
			Object.entries(RISK_FIELD_TO_MODAL).map(([schemaKey, modalKey]) => [
				modalKey,
				toText(riskGroup[schemaKey]),
			]),
		),
	};
}

export function uncertaintySummaryText(formData: Record<string, unknown>): string {
	const generalInfo = asRecord(formData.generalInfo);
	if (generalInfo.overallUncertainty) {
		return toText(generalInfo.overallUncertainty);
	}
	const uncertainty = asRecord(formData.uncertaintyCalculation);
	const adjustment = uncertainty.uncertaintyAdjustment;
	if (adjustment == null || adjustment === "") return "не рассчитана";
	return String(adjustment);
}

type ActiveModal =
	| { kind: "uncertainty" }
	| { kind: AnketaModalKind; path: string; editIndex?: number };

export type AnketaFormModalControls = {
	openArrayModal: (path: string, editIndex?: number) => void;
	openUncertaintyModal: () => void;
	deleteArrayItem: (path: string, index: number) => void;
	deleteObject: (path: string) => void;
};

type Props = {
	formData: Record<string, unknown>;
	previewSchema: RJSFSchema;
	previewUiSchema: UiSchema;
	modalBindings: V2AnketaEditorBindings;
	onFormDataChange: (
		updater: (prev: Record<string, unknown>) => Record<string, unknown>,
	) => void;
	controlsRef: MutableRefObject<AnketaFormModalControls>;
};

export function AnketaFormModals({
	formData,
	previewSchema,
	previewUiSchema,
	modalBindings,
	onFormDataChange,
	controlsRef,
}: Props) {
	const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

	const modalArrayPathSet = useMemo(
		() => new Set(modalBindings.modalArrayPaths),
		[modalBindings.modalArrayPaths],
	);

	const openArrayModal = useCallback(
		(path: string, editIndex?: number) => {
			const kind = modalBindings.modalKindByPath[path];
			if (!kind) return;
			setActiveModal({ kind, path, editIndex });
		},
		[modalBindings.modalKindByPath],
	);

	const openUncertaintyModal = useCallback(() => {
		setActiveModal({ kind: "uncertainty" });
	}, []);

	const deleteArrayItem = useCallback(
		(path: string, index: number) => {
			onFormDataChange((prev) =>
				touchSectionForPathInFormData(removeAtFormPath(prev, path, index), path),
			);
		},
		[onFormDataChange],
	);

	const deleteObject = useCallback(
		(path: string) => {
			onFormDataChange((prev) =>
				touchSectionForPathInFormData(clearObjectAtFormPath(prev, path), path),
			);
		},
		[onFormDataChange],
	);

	useLayoutEffect(() => {
		controlsRef.current.openArrayModal = openArrayModal;
		controlsRef.current.openUncertaintyModal = openUncertaintyModal;
		controlsRef.current.deleteArrayItem = deleteArrayItem;
		controlsRef.current.deleteObject = deleteObject;
	}, [
		controlsRef,
		openArrayModal,
		openUncertaintyModal,
		deleteArrayItem,
		deleteObject,
	]);

	const closeModal = () => setActiveModal(null);

	const rjsfModalSlice = useMemo(() => {
		if (!activeModal || activeModal.kind !== "rjsfObject") return null;

		const isArrayModal = modalArrayPathSet.has(activeModal.path);

		if (isArrayModal) {
			const slice = getArrayItemSchemaSliceForModal(
				previewSchema,
				previewUiSchema,
				activeModal.path,
				{ omitTitle: true },
			);
			if (!slice) return null;
			const items = getArrayAtPath(formData, activeModal.path);
			const values =
				activeModal.editIndex != null
					? ((items[activeModal.editIndex] as Record<string, unknown>) ?? {})
					: {};
			const parentNode = resolveSchemaNodeTitle(
				previewSchema,
				activeModal.path,
			);
			return {
				...slice,
				values,
				title:
					typeof slice.schema.title === "string" && slice.schema.title.trim()
						? slice.schema.title
						: parentNode ?? "Элемент",
				isArrayModal: true,
			};
		}

		const slice = getObjectSchemaSliceForModal(
			previewSchema,
			previewUiSchema,
			activeModal.path,
			{ omitTitle: true },
		);
		if (!slice) return null;
		const parentNode = resolveSchemaNodeTitle(previewSchema, activeModal.path);
		return {
			...slice,
			values: getObjectAtPath(formData, activeModal.path),
			title: parentNode ?? activeModal.path,
			isArrayModal: false,
		};
	}, [
		activeModal,
		formData,
		modalArrayPathSet,
		previewSchema,
		previewUiSchema,
	]);

	const handleUncertaintySubmit = (values: TotalUncertaintyFormValues) => {
		onFormDataChange((prev) => {
			const currentUncertainty = asRecord(prev.uncertaintyCalculation);
			const currentRiskGroup = asRecord(currentUncertainty.riskGroup);
			const nextRiskGroup = { ...currentRiskGroup };

			for (const [modalKey, value] of Object.entries(values.risks)) {
				const schemaKey = RISK_FIELD_FROM_MODAL[modalKey];
				if (!schemaKey) continue;
				nextRiskGroup[schemaKey] = RISK_LEVEL_FROM_MODAL[value] ?? "";
			}

			const adjustment =
				values.totalUncertaintyAdjustment === ""
					? undefined
					: Number(values.totalUncertaintyAdjustment.replace(",", "."));

			return touchSectionInFormData(
				{
					...prev,
					generalInfo: {
						...asRecord(prev.generalInfo),
						overallUncertainty: values.totalUncertaintyAdjustment
							? `Средняя ×${values.totalUncertaintyAdjustment.replace("%", "")}`
							: asRecord(prev.generalInfo).overallUncertainty,
					},
					uncertaintyCalculation: {
						...currentUncertainty,
						initiativeTimeline: values.initiativeTimeline,
						initiativeCost:
							values.initiativeCost === ""
								? undefined
								: Number(values.initiativeCost.replace(",", ".")),
						uncertaintyAdjustment: adjustment,
						riskGroup: nextRiskGroup,
					},
				},
				"generalInfo",
			);
		});
		closeModal();
	};

	const handleRjsfArrayModalSubmit = (
		path: string,
		editIndex: number | undefined,
		values: Record<string, unknown>,
	) => {
		onFormDataChange((prev) => {
			const updated =
				editIndex == null
					? appendAtFormPath(prev, path, values)
					: updateAtFormPath(prev, path, editIndex, values);
			return touchSectionForPathInFormData(updated, path);
		});
		closeModal();
	};

	const handleObjectModalSubmit = (
		path: string,
		values: Record<string, unknown>,
	) => {
		onFormDataChange((prev) =>
			touchSectionForPathInFormData(
				setObjectAtFormPath(prev, path, values),
				path,
			),
		);
		closeModal();
	};

	return (
		<>
			<TotalUncertaintyModal
				open={activeModal?.kind === "uncertainty"}
				onClose={closeModal}
				onSubmit={handleUncertaintySubmit}
				defaultValues={uncertaintyModalDefaults(formData)}
			/>
			{rjsfModalSlice ? (
				<AnketaRjsfObjectModal
					open={activeModal?.kind === "rjsfObject"}
					title={rjsfModalSlice.title}
					schema={rjsfModalSlice.schema}
					uiSchema={rjsfModalSlice.uiSchema}
					defaultValues={rjsfModalSlice.values}
					onClose={closeModal}
					onSubmit={(values) => {
						if (activeModal?.kind !== "rjsfObject") return;
						if (rjsfModalSlice.isArrayModal) {
							handleRjsfArrayModalSubmit(
								activeModal.path,
								activeModal.editIndex,
								values,
							);
							return;
						}
						handleObjectModalSubmit(activeModal.path, values);
					}}
				/>
			) : null}
		</>
	);
}

function resolveSchemaNodeTitle(
	rootSchema: RJSFSchema,
	dotPath: string,
): string | undefined {
	const segments = dotPath.split(".").filter(Boolean);
	let cur: RJSFSchema | undefined = rootSchema;
	for (const seg of segments) {
		const fromProps = cur?.properties?.[seg] as RJSFSchema | undefined;
		if (fromProps) {
			cur = fromProps;
			continue;
		}
		if (seg === "items" && cur?.items && typeof cur.items === "object") {
			cur = cur.items as RJSFSchema;
			continue;
		}
		return undefined;
	}
	return typeof cur?.title === "string" ? cur.title : undefined;
}
