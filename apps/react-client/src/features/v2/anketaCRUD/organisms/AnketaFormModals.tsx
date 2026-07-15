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
import {
	appendArchObjectListItem,
	isAnketaArchObjectListPath,
	readArchObjectListAtPath,
	removeArchObjectListItem,
	updateArchObjectListItem,
} from "../utils/anketaArchObjectListPaths";
import { getArrayAtPath } from "../utils/anketaModalArrayTableConfig";
import { getObjectUiSlice } from "../utils/anketaSchemaAtPath";
import type { AnketaModalKind } from "../utils/anketaFormModalPaths";
import {
	resolveV2AnketaArchComponent,
	resolveV2QuestionnaireUncertaintyCoefficient,
	syncAtypicalWorkCoefficientsInFormData,
	withComputedAtypicalWorkRowTotal,
	type V2AnketaEditorBindings,
} from "@smart-anketa/api-contract";
import { ATYPICAL_WORK_NEW_ROW_DEFAULTS } from "@react-client/features/v2/admin_constructor/schemaEditor/archComponentPresets";
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
	thirdPartyNegligence: "contractor_risk",
	staffShortage: "staff_shortage",
	sanctions: "sanctions",
	controlProceduresLack: "lack_of_controls",
	regulatoryChanges: "regulatory_changes",
	isNotUsedAfterProject: "post_project_usage",
	itArchitectureChanges: "target_architecture",
};

const RISK_FIELD_FROM_MODAL = Object.fromEntries(
	Object.entries(RISK_FIELD_TO_MODAL).map(([schema, modal]) => [modal, schema]),
);

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

function readUncertaintyField(
	uncertainty: Record<string, unknown>,
	canonicalKey: string,
	legacyKey: string,
): unknown {
	if (uncertainty[canonicalKey] != null && uncertainty[canonicalKey] !== "") {
		return uncertainty[canonicalKey];
	}
	return uncertainty[legacyKey];
}

function formatUncertaintyAdjustment(value: unknown): string {
	if (value == null || value === "") return "";
	const parsed = Number(String(value).replace(",", ".").replace("%", ""));
	if (!Number.isFinite(parsed)) return toText(value);
	return String(parsed);
}

function buildOverallUncertaintyLabel(
	riskGroup: Record<string, unknown>,
	adjustmentPercent: number | undefined,
): string | undefined {
	const { calculated, coefficient } = resolveV2QuestionnaireUncertaintyCoefficient(
		{
			uncertaintyCalculation: {
				riskGroup,
				uncertaintyAdjustment: adjustmentPercent,
			},
		},
	);
	if (!calculated) return undefined;
	return `Средняя ×${coefficient.toFixed(2)}`;
}

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
		initiativeTimeline: toText(
			readUncertaintyField(
				uncertainty,
				"initiativeTimeline",
				"field_xGCMlbMP",
			),
		),
		initiativeCost: toText(
			readUncertaintyField(uncertainty, "initiativeCost", "field_bbTNlnC6"),
		),
		totalUncertaintyAdjustment: formatUncertaintyAdjustment(
			readUncertaintyField(
				uncertainty,
				"uncertaintyAdjustment",
				"field_QCwwo5c5",
			),
		),
		risks: Object.fromEntries(
			Object.entries(RISK_FIELD_TO_MODAL).map(([schemaKey, modalKey]) => {
				const stored = toText(riskGroup[schemaKey]);
				return [modalKey, RISK_LEVEL_TO_MODAL[stored] ?? ""];
			}),
		),
	};
}

export function uncertaintySummaryText(formData: Record<string, unknown>): string {
	const generalInfo = asRecord(formData.generalInfo);
	if (generalInfo.overallUncertainty) {
		return toText(generalInfo.overallUncertainty);
	}
	const uncertainty = asRecord(formData.uncertaintyCalculation);
	const adjustment = readUncertaintyField(
		uncertainty,
		"uncertaintyAdjustment",
		"field_QCwwo5c5",
	);
	const adjustmentNumber =
		adjustment == null || adjustment === "" ? undefined : Number(adjustment);
	const finiteAdjustment =
		adjustmentNumber != null && Number.isFinite(adjustmentNumber)
			? adjustmentNumber
			: undefined;
	const derived = buildOverallUncertaintyLabel(
		asRecord(uncertainty.riskGroup),
		finiteAdjustment,
	);
	return derived ?? "не рассчитана";
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
	onAtypicalCoefficientsUpdated?: (paths: string[]) => void;
	controlsRef: MutableRefObject<AnketaFormModalControls>;
};

export function AnketaFormModals({
	formData,
	previewSchema,
	previewUiSchema,
	modalBindings,
	onFormDataChange,
	onAtypicalCoefficientsUpdated,
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
			onFormDataChange((prev) => {
				const updated = isAnketaArchObjectListPath(path)
					? removeArchObjectListItem(prev, path, index)
					: removeAtFormPath(prev, path, index);
				return touchSectionForPathInFormData(updated, path);
			});
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

		const isArchObjectListModal = isAnketaArchObjectListPath(activeModal.path);
		const isArrayModal =
			modalArrayPathSet.has(activeModal.path) || isArchObjectListModal;

		if (isArrayModal) {
			const slice = isArchObjectListModal
				? getObjectSchemaSliceForModal(
						previewSchema,
						previewUiSchema,
						activeModal.path,
						{ omitTitle: true },
					)
				: getArrayItemSchemaSliceForModal(
						previewSchema,
						previewUiSchema,
						activeModal.path,
						{ omitTitle: true },
					);
			if (!slice) return null;
			const items = isArchObjectListModal
				? readArchObjectListAtPath(formData, activeModal.path)
				: getArrayAtPath(formData, activeModal.path);
			const rawValues =
				activeModal.editIndex != null
					? ((items[activeModal.editIndex] as Record<string, unknown>) ?? {})
					: newArrayRowDefaults(formData, previewUiSchema, activeModal.path);
			const arch = resolveV2AnketaArchComponent(
				getObjectUiSlice(previewUiSchema, activeModal.path),
			);
			const values =
				arch === "atypicalWork"
					? withComputedAtypicalWorkRowTotal(rawValues)
					: rawValues;
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

	const applyAtypicalCoefficientSync = (
		data: Record<string, unknown>,
		highlight = false,
	): Record<string, unknown> => {
		const { coefficient } = resolveV2QuestionnaireUncertaintyCoefficient(data);
		const synced = syncAtypicalWorkCoefficientsInFormData(
			data,
			previewUiSchema,
			coefficient,
		);
		if (highlight && synced.changed) {
			onAtypicalCoefficientsUpdated?.(synced.updatedPaths);
		}
		return synced.formData;
	};

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

			const overallUncertainty = buildOverallUncertaintyLabel(
				nextRiskGroup,
				adjustment,
			);

			const nextGeneralInfo = { ...asRecord(prev.generalInfo) };
			if (overallUncertainty) {
				nextGeneralInfo.overallUncertainty = overallUncertainty;
			} else {
				delete nextGeneralInfo.overallUncertainty;
			}

			return applyAtypicalCoefficientSync(
				touchSectionInFormData(
					{
						...prev,
						generalInfo: nextGeneralInfo,
						uncertaintyCalculation: {
							...currentUncertainty,
							initiativeTimeline: values.initiativeTimeline || undefined,
							initiativeCost:
								values.initiativeCost === "" ? undefined : values.initiativeCost,
							uncertaintyAdjustment: adjustment,
							riskGroup: nextRiskGroup,
						},
					},
					"generalInfo",
				),
				true,
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
			const arch = resolveV2AnketaArchComponent(
				getObjectUiSlice(previewUiSchema, path),
			);
			const rowValues =
				arch === "atypicalWork"
					? withComputedAtypicalWorkRowTotal({
							...values,
							coefficient: resolveV2QuestionnaireUncertaintyCoefficient(prev)
								.coefficient,
						})
					: values;
			const updated = isAnketaArchObjectListPath(path)
				? editIndex == null
					? appendArchObjectListItem(prev, path, rowValues)
					: updateArchObjectListItem(prev, path, editIndex, rowValues)
				: editIndex == null
					? appendAtFormPath(prev, path, rowValues)
					: updateAtFormPath(prev, path, editIndex, rowValues);
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

	const atypicalWorkModalTransform = useCallback(
		(data: Record<string, unknown>) => withComputedAtypicalWorkRowTotal(data),
		[],
	);

	const isAtypicalWorkModal =
		activeModal?.kind === "rjsfObject" &&
		resolveV2AnketaArchComponent(
			getObjectUiSlice(previewUiSchema, activeModal.path),
		) === "atypicalWork";

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
					transformFormData={
						isAtypicalWorkModal ? atypicalWorkModalTransform : undefined
					}
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

/**
 * Значения по умолчанию для НОВОЙ строки массива. Раньше их подставлял RJSF из
 * schema `default`, но это «портило» существующий снепшот, поэтому дефолты сняты
 * со схемы и применяются явно только при создании строки.
 */
function newArrayRowDefaults(
	formData: Record<string, unknown>,
	previewUiSchema: UiSchema,
	path: string,
): Record<string, unknown> {
	const arch = resolveV2AnketaArchComponent(
		getObjectUiSlice(previewUiSchema, path),
	);
	if (arch === "atypicalWork") {
		return {
			...ATYPICAL_WORK_NEW_ROW_DEFAULTS,
			coefficient: resolveV2QuestionnaireUncertaintyCoefficient(formData)
				.coefficient,
		};
	}
	return {};
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
