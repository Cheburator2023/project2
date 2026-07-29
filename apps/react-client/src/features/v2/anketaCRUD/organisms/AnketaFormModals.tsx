import {
	TotalUncertaintyModal,
	type TotalUncertaintyFormValues,
	type UncertaintyRiskSelection,
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
	canAppendArchObjectListItem,
	isAnketaArchObjectListPath,
	readArchObjectListAtPath,
	removeArchObjectListItem,
	updateArchObjectListItem,
} from "../utils/anketaArchObjectListPaths";
import { getArrayAtPath } from "../utils/anketaModalArrayTableConfig";
import { getObjectUiSlice } from "../utils/anketaSchemaAtPath";
import type { AnketaModalKind } from "../utils/anketaFormModalPaths";
import {
	createDefaultOverallUncertaintyConfig,
	parseOverallUncertaintyConfigFromLogic,
	parseUncertaintyRiskFormEntry,
	resolveV2AnketaArchComponent,
	resolveV2QuestionnaireUncertaintyCoefficient,
	syncAtypicalWorkCoefficientsInFormData,
	withComputedAtypicalWorkRowTotal,
	type V2AnketaEditorBindings,
	type V2LogicRuleDto,
	type V2OverallUncertaintyConfig,
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
import {
	touchSectionForPathInFormData,
	touchSectionInFormData,
} from "../hooks/useAnketaWorkflow";
import {
	UNCERTAINTY_MODAL_RISK_ID_TO_SCHEMA_KEY,
	UNCERTAINTY_SCHEMA_KEY_TO_MODAL_RISK_ID,
	buildUncertaintyModalRiskGroups,
} from "../utils/v2UncertaintyModalConfig";

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function toText(value: unknown): string {
	if (value == null) return "";
	return String(value);
}

function readStringEnum(field: unknown): string[] {
	const rec = asRecord(field);
	if (!Array.isArray(rec.enum)) return [];
	return rec.enum.map((value) => String(value));
}

function emptyRiskSelection(): UncertaintyRiskSelection {
	return { probability: "", goals: "" };
}

function readUncertaintyField(
	uncertainty: Record<string, unknown>,
	canonicalKey: string,
	legacyKey: string,
): unknown {
	if (canonicalKey in uncertainty) return uncertainty[canonicalKey];
	return uncertainty[legacyKey];
}

function formatUncertaintyAdjustment(value: unknown): string {
	if (value == null || value === "") return "";
	const parsed = Number(
		String(value).replace(",", ".").replace("%", "").trim(),
	);
	if (!Number.isFinite(parsed)) return toText(value);
	return String(parsed);
}

function resolveUncertaintyConfig(
	logicRules?: readonly V2LogicRuleDto[],
	config?: V2OverallUncertaintyConfig,
): V2OverallUncertaintyConfig {
	if (config) return config;
	if (logicRules) return parseOverallUncertaintyConfigFromLogic(logicRules);
	return createDefaultOverallUncertaintyConfig();
}

function buildOverallUncertaintyLabel(
	formData: Record<string, unknown>,
	config: V2OverallUncertaintyConfig,
): string | undefined {
	const { calculated, coefficient } =
		resolveV2QuestionnaireUncertaintyCoefficient(formData, { config });
	if (!calculated) return undefined;
	return `Средняя ×${coefficient.toFixed(2)}`;
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
			Object.entries(UNCERTAINTY_SCHEMA_KEY_TO_MODAL_RISK_ID).map(
				([schemaKey, modalKey]) => {
					const parsed = parseUncertaintyRiskFormEntry(riskGroup[schemaKey]);
					if (parsed && typeof parsed === "object") {
						return [
							modalKey,
							{
								probability: parsed.probability ?? "",
								goals: parsed.goals ?? "",
							},
						];
					}
					if (typeof parsed === "string") {
						const looksLikeGroup = [
							"Низкий",
							"Средний",
							"Высокий",
							"Очень высокий",
						].includes(parsed);
						return [
							modalKey,
							looksLikeGroup
								? emptyRiskSelection()
								: { probability: "", goals: parsed },
						];
					}
					return [modalKey, emptyRiskSelection()];
				},
			),
		),
	};
}

export function uncertaintySummaryText(
	formData: Record<string, unknown>,
	options?: {
		logicRules?: readonly V2LogicRuleDto[];
		config?: V2OverallUncertaintyConfig;
	},
): string {
	const generalInfo = asRecord(formData.generalInfo);
	if (generalInfo.overallUncertainty) {
		return toText(generalInfo.overallUncertainty);
	}
	const config = resolveUncertaintyConfig(options?.logicRules, options?.config);
	const { calculated, coefficient } =
		resolveV2QuestionnaireUncertaintyCoefficient(formData, { config });
	if (!calculated) return "не рассчитана";
	return `Средняя ×${coefficient.toFixed(2)}`;
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
	logicRules?: readonly V2LogicRuleDto[];
	uncertaintyConfig?: V2OverallUncertaintyConfig;
	"data-test-id"?: string;
};

export function AnketaFormModals({
	formData,
	previewSchema,
	previewUiSchema,
	modalBindings,
	onFormDataChange,
	onAtypicalCoefficientsUpdated,
	controlsRef,
	logicRules,
	uncertaintyConfig,
}: Props) {
	const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);
	const config = useMemo(
		() => resolveUncertaintyConfig(logicRules, uncertaintyConfig),
		[logicRules, uncertaintyConfig],
	);

	const scaleOptions = useMemo(() => {
		const uc = asRecord(
			asRecord(previewSchema.properties).uncertaintyCalculation,
		);
		const ucProps = asRecord(uc.properties);
		const riskGroupProps = asRecord(asRecord(ucProps.riskGroup).properties);
		const firstRisk = Object.values(riskGroupProps)[0];
		const firstRiskProps = asRecord(asRecord(firstRisk).properties);
		return {
			timeline:
				readStringEnum(ucProps.initiativeTimeline).length > 0
					? readStringEnum(ucProps.initiativeTimeline)
					: config.severityLevels.map((level) => level.timelineLabel),
			cost:
				readStringEnum(ucProps.initiativeCost).length > 0
					? readStringEnum(ucProps.initiativeCost)
					: config.severityLevels.map((level) => level.costLabel),
			probability:
				readStringEnum(firstRiskProps.probability).length > 0
					? readStringEnum(firstRiskProps.probability)
					: config.probabilityLevels.map((level) => level.label),
			goals:
				readStringEnum(firstRiskProps.goals).length > 0
					? readStringEnum(firstRiskProps.goals)
					: config.severityLevels.map((level) => level.goalsLabel),
		};
	}, [config, previewSchema]);

	const riskGroups = useMemo(() => {
		if (config.risks.length === 0) return buildUncertaintyModalRiskGroups();
		const tooltips = buildUncertaintyModalRiskGroups();
		return config.risks.map((risk) => {
			const modalId =
				UNCERTAINTY_SCHEMA_KEY_TO_MODAL_RISK_ID[risk.id] ?? risk.id;
			const tip = tooltips.find((item) => item.id === modalId)?.tooltip;
			return { id: modalId, label: risk.name, tooltip: tip };
		});
	}, [config.risks]);

	const modalArrayPathSet = useMemo(
		() => new Set(modalBindings.modalArrayPaths),
		[modalBindings.modalArrayPaths],
	);

	const openArrayModal = useCallback(
		(path: string, editIndex?: number) => {
			const kind = modalBindings.modalKindByPath[path];
			if (!kind) return;
			if (
				editIndex == null &&
				isAnketaArchObjectListPath(path) &&
				!canAppendArchObjectListItem(formData, path)
			) {
				return;
			}
			setActiveModal({ kind, path, editIndex });
		},
		[formData, modalBindings.modalKindByPath],
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
				activeModal.editIndex == null
					? newArrayRowDefaults(
							formData,
							previewUiSchema,
							activeModal.path,
							config,
						)
					: ((items?.[activeModal.editIndex] as
							| Record<string, unknown>
							| undefined) ?? {});
			const values =
				resolveV2AnketaArchComponent(
					getObjectUiSlice(previewUiSchema, activeModal.path),
				) === "atypicalWork"
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
						: (parentNode ?? "Элемент"),
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
		config,
		formData,
		modalArrayPathSet,
		previewSchema,
		previewUiSchema,
	]);

	const applyAtypicalCoefficientSync = (
		data: Record<string, unknown>,
		highlight = false,
	): Record<string, unknown> => {
		const { coefficient } = resolveV2QuestionnaireUncertaintyCoefficient(data, {
			config,
		});
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

			for (const [modalKey, selection] of Object.entries(values.risks)) {
				const schemaKey =
					UNCERTAINTY_MODAL_RISK_ID_TO_SCHEMA_KEY[modalKey] ?? modalKey;
				const probability = selection?.probability?.trim() ?? "";
				const goals = selection?.goals?.trim() ?? "";
				if (!probability && !goals) {
					nextRiskGroup[schemaKey] = "";
					continue;
				}
				nextRiskGroup[schemaKey] = { probability, goals };
			}

			const adjustment =
				values.totalUncertaintyAdjustment === ""
					? undefined
					: Number(values.totalUncertaintyAdjustment.replace(",", "."));

			const nextFormData = {
				...prev,
				generalInfo: { ...asRecord(prev.generalInfo) },
				uncertaintyCalculation: {
					...currentUncertainty,
					initiativeTimeline: values.initiativeTimeline || undefined,
					initiativeCost:
						values.initiativeCost === "" ? undefined : values.initiativeCost,
					uncertaintyAdjustment: adjustment,
					riskGroup: nextRiskGroup,
				},
			};

			const overallUncertainty = buildOverallUncertaintyLabel(
				nextFormData,
				config,
			);
			const nextGeneralInfo = { ...asRecord(nextFormData.generalInfo) };
			if (overallUncertainty) {
				nextGeneralInfo.overallUncertainty = overallUncertainty;
			} else {
				delete nextGeneralInfo.overallUncertainty;
			}

			return applyAtypicalCoefficientSync(
				touchSectionInFormData(
					{
						...nextFormData,
						generalInfo: nextGeneralInfo,
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
							coefficient: resolveV2QuestionnaireUncertaintyCoefficient(prev, {
								config,
							}).coefficient,
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
				timelineOptions={scaleOptions.timeline}
				costOptions={scaleOptions.cost}
				probabilityOptions={scaleOptions.probability}
				goalsOptions={scaleOptions.goals}
				riskGroups={riskGroups}
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

function newArrayRowDefaults(
	formData: Record<string, unknown>,
	previewUiSchema: UiSchema,
	path: string,
	config: V2OverallUncertaintyConfig,
): Record<string, unknown> {
	const arch = resolveV2AnketaArchComponent(
		getObjectUiSlice(previewUiSchema, path),
	);
	if (arch === "atypicalWork") {
		return {
			...ATYPICAL_WORK_NEW_ROW_DEFAULTS,
			coefficient: resolveV2QuestionnaireUncertaintyCoefficient(formData, {
				config,
			}).coefficient,
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
