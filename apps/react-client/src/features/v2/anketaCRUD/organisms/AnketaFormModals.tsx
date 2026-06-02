import {
	DataSourceModal,
	type DataSourceFormValues,
} from "@react-client/features/playground/v2_playground/organisms/DataSourceModal";
import {
	ModelServiceModal,
	type ModelServiceFormValues,
} from "@react-client/features/playground/v2_playground/organisms/ModelServiceModal";
import {
	NonStandardTaskModal,
	type NonStandardTaskFormValues,
} from "@react-client/features/playground/v2_playground/organisms/NonStandardTaskModal";
import {
	TotalUncertaintyModal,
	type TotalUncertaintyFormValues,
} from "@react-client/features/playground/v2_playground/organisms/TotalUncertaintyModal";
import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from "react";
import { getArrayAtPath } from "../utils/anketaModalArrayTableConfig";
import {
	modalKindForArrayPath,
	type AnketaModalKind,
} from "../utils/anketaFormModalPaths";
import {
	appendAtFormPath,
	mapArrayItemToModalDefaults,
	mapModalValuesToArrayItem,
	removeAtFormPath,
	updateAtFormPath,
} from "../utils/anketaFormModalMappers";

const RISK_FIELD_TO_MODAL: Record<string, string> = {
	businessComplexity: "business_change",
	defectsInSolution: "solution_defects",
	adjacentProjectsImpact: "adjacent_projects",
	laborCostIncrease: "labor_growth",
	thirdPartyNegligence: "contractor_risk",
	staffShortage: "staff_shortage",
	sanctions: "sanctions",
	controlProceduresLack: "lack_of_controls",
	regulatoryChanges: "regulatory_changes",
	isNotUsedAfterProject: "post_project_usage",
	itArchitectureChanges: "target_architecture",
};

const RISK_FIELD_FROM_MODAL = Object.fromEntries(
	Object.entries(RISK_FIELD_TO_MODAL).map(([schemaKey, modalKey]) => [
		modalKey,
		schemaKey,
	]),
) as Record<string, string>;

const RISK_LEVEL_TO_MODAL: Record<string, string> = {
	Низкий: "low",
	Средний: "medium",
	Высокий: "high",
};

const RISK_LEVEL_FROM_MODAL: Record<string, string> = {
	low: "Низкий",
	medium: "Средний",
	high: "Высокий",
};

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function toText(value: unknown): string {
	if (value == null || value === "") return "";
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
				RISK_LEVEL_TO_MODAL[toText(riskGroup[schemaKey])] ?? "",
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
};

type Props = {
	formData: Record<string, unknown>;
	onFormDataChange: (
		updater: (prev: Record<string, unknown>) => Record<string, unknown>,
	) => void;
	controlsRef: MutableRefObject<AnketaFormModalControls>;
};

export function AnketaFormModals({
	formData,
	onFormDataChange,
	controlsRef,
}: Props) {
	const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

	const openArrayModal = useCallback((path: string, editIndex?: number) => {
		const kind = modalKindForArrayPath(path);
		if (!kind) return;
		setActiveModal({ kind, path, editIndex });
	}, []);

	const openUncertaintyModal = useCallback(() => {
		setActiveModal({ kind: "uncertainty" });
	}, []);

	const deleteArrayItem = useCallback(
		(path: string, index: number) => {
			onFormDataChange((prev) => removeAtFormPath(prev, path, index));
		},
		[onFormDataChange],
	);

	useEffect(() => {
		controlsRef.current = {
			openArrayModal,
			openUncertaintyModal,
			deleteArrayItem,
		};
	}, [controlsRef, openArrayModal, openUncertaintyModal, deleteArrayItem]);

	const closeModal = () => setActiveModal(null);

	const arrayModalDefaults = useMemo(() => {
		if (
			!activeModal ||
			activeModal.kind === "uncertainty" ||
			activeModal.editIndex == null
		) {
			return undefined;
		}
		const items = getArrayAtPath(formData, activeModal.path);
		const item = items[activeModal.editIndex];
		if (!item) return undefined;
		return mapArrayItemToModalDefaults(activeModal.path, item);
	}, [activeModal, formData]);

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

			return {
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
			};
		});
		closeModal();
	};

	const handleArrayModalSubmit = (
		path: string,
		editIndex: number | undefined,
		values:
			| DataSourceFormValues
			| ModelServiceFormValues
			| NonStandardTaskFormValues,
	) => {
		const item = mapModalValuesToArrayItem(path, values);
		onFormDataChange((prev) =>
			editIndex == null
				? appendAtFormPath(prev, path, item)
				: updateAtFormPath(prev, path, editIndex, item),
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
			<DataSourceModal
				open={activeModal?.kind === "dataSource"}
				onClose={closeModal}
				onSubmit={(values) => {
					if (activeModal?.kind !== "dataSource") return;
					handleArrayModalSubmit(
						activeModal.path,
						activeModal.editIndex,
						values,
					);
				}}
				defaultValues={
					activeModal?.kind === "dataSource"
						? (arrayModalDefaults as Partial<DataSourceFormValues>)
						: undefined
				}
			/>
			<ModelServiceModal
				open={activeModal?.kind === "modelService"}
				onClose={closeModal}
				onSubmit={(values) => {
					if (activeModal?.kind !== "modelService") return;
					handleArrayModalSubmit(
						activeModal.path,
						activeModal.editIndex,
						values,
					);
				}}
				defaultValues={
					activeModal?.kind === "modelService"
						? (arrayModalDefaults as Partial<ModelServiceFormValues>)
						: undefined
				}
			/>
			<NonStandardTaskModal
				open={activeModal?.kind === "nonStandardTask"}
				onClose={closeModal}
				onSubmit={(values) => {
					if (activeModal?.kind !== "nonStandardTask") return;
					handleArrayModalSubmit(
						activeModal.path,
						activeModal.editIndex,
						values,
					);
				}}
				defaultValues={
					activeModal?.kind === "nonStandardTask"
						? (arrayModalDefaults as Partial<NonStandardTaskFormValues>)
						: undefined
				}
			/>
		</>
	);
}
