import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
	buildV2AnketaSystemScaffold,
	schemaHasUncertaintyModalWidget,
	type V2OverallUncertaintyConfig,
} from "@smart-anketa/api-contract";
import {
	UNCERTAINTY_MODAL_UI_BRANCH,
	makeUncertaintyModalField,
} from "../../fieldTypePresets";

export const OVERALL_UNCERTAINTY_MODAL_KEY = "overallUncertaintyModal";
export const UNCERTAINTY_CALCULATION_KEY = "uncertaintyCalculation";
export const GENERAL_INFO_KEY = "generalInfo";

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function asSchema(value: unknown): RJSFSchema | null {
	return asRecord(value) as RJSFSchema | null;
}

function ensureUiOrder(
	branch: Record<string, unknown>,
	key: string,
	preferredBefore?: string,
): void {
	const order = Array.isArray(branch["ui:order"])
		? [...(branch["ui:order"] as string[])]
		: [];
	if (order.includes(key)) {
		branch["ui:order"] = order;
		return;
	}
	if (preferredBefore && order.includes(preferredBefore)) {
		const idx = order.indexOf(preferredBefore);
		order.splice(idx, 0, key);
	} else {
		order.push(key);
	}
	branch["ui:order"] = order;
}

function walkFindModalPointer(
	uiNode: unknown,
	prefix: string,
): string | null {
	const rec = asRecord(uiNode);
	if (!rec) return null;
	if (rec["ui:widget"] === "V2UncertaintyModalWidget") {
		return prefix || "/";
	}
	for (const [key, value] of Object.entries(rec)) {
		if (key.startsWith("ui:")) continue;
		const childPrefix = prefix === "/" ? `/${key}` : `${prefix}/${key}`;
		const found = walkFindModalPointer(value, childPrefix);
		if (found) return found;
	}
	return null;
}

/** JSON Pointer на поле-кнопку модалки неопределённости. */
export function findUncertaintyModalPointer(
	uiSchema: UiSchema | Record<string, unknown> | undefined,
): string | null {
	if (!uiSchema) return null;
	return walkFindModalPointer(uiSchema, "/");
}

export function schemaHasOverallUncertaintyModal(
	uiSchema: UiSchema | Record<string, unknown> | undefined,
): boolean {
	return schemaHasUncertaintyModalWidget(
		(uiSchema ?? {}) as Record<string, unknown>,
	);
}

/**
 * Гарантирует наличие `uncertaintyCalculation` (scaffold) и кнопку
 * `generalInfo.overallUncertaintyModal` с V2UncertaintyModalWidget.
 */
export function ensureOverallUncertaintySchemaComponents(
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema,
): {
	jsonSchema: RJSFSchema;
	uiSchema: UiSchema;
	modalPointer: string;
	createdModal: boolean;
	createdUncertaintyRoot: boolean;
} {
	const nextJson = structuredClone(jsonSchema) as RJSFSchema;
	const nextUi = structuredClone(uiSchema) as Record<string, unknown>;
	const rootProps = {
		...((nextJson.properties ?? {}) as Record<string, RJSFSchema>),
	};
	nextJson.type = "object";
	nextJson.properties = rootProps;

	const scaffold = buildV2AnketaSystemScaffold();
	const scaffoldUc = asSchema(
		(scaffold.jsonSchema.properties as Record<string, unknown> | undefined)?.[
			UNCERTAINTY_CALCULATION_KEY
		],
	);
	const scaffoldUcUi = asRecord(
		(scaffold.uiSchema as Record<string, unknown>)[UNCERTAINTY_CALCULATION_KEY],
	);

	let createdUncertaintyRoot = false;
	if (!rootProps[UNCERTAINTY_CALCULATION_KEY] && scaffoldUc) {
		rootProps[UNCERTAINTY_CALCULATION_KEY] = structuredClone(scaffoldUc);
		createdUncertaintyRoot = true;
	}
	if (!asRecord(nextUi[UNCERTAINTY_CALCULATION_KEY]) && scaffoldUcUi) {
		nextUi[UNCERTAINTY_CALCULATION_KEY] = structuredClone(scaffoldUcUi);
	}
	ensureUiOrder(nextUi, UNCERTAINTY_CALCULATION_KEY);

	const existingModal = findUncertaintyModalPointer(nextUi);
	if (existingModal) {
		return {
			jsonSchema: nextJson,
			uiSchema: nextUi as UiSchema,
			modalPointer: existingModal,
			createdModal: false,
			createdUncertaintyRoot,
		};
	}

	// Ensure generalInfo group for the modal trigger.
	if (!rootProps[GENERAL_INFO_KEY]) {
		rootProps[GENERAL_INFO_KEY] = {
			type: "object",
			title: "Общая информация",
			properties: {},
		};
	}
	const gi = asSchema(rootProps[GENERAL_INFO_KEY])!;
	gi.type = "object";
	gi.properties = {
		...((gi.properties ?? {}) as Record<string, RJSFSchema>),
	};
	if (!asRecord(nextUi[GENERAL_INFO_KEY])) {
		nextUi[GENERAL_INFO_KEY] = {
			"ui:options": {
				sectionRole: "main",
				defaultExpanded: true,
				workflowSectionId: "generalInfo",
			},
			"ui:order": [],
		};
	}
	ensureUiOrder(nextUi, GENERAL_INFO_KEY);

	const giProps = gi.properties as Record<string, RJSFSchema>;
	giProps[OVERALL_UNCERTAINTY_MODAL_KEY] = makeUncertaintyModalField();

	const giUi = asRecord(nextUi[GENERAL_INFO_KEY])!;
	giUi[OVERALL_UNCERTAINTY_MODAL_KEY] = structuredClone(UNCERTAINTY_MODAL_UI_BRANCH);
	ensureUiOrder(giUi, OVERALL_UNCERTAINTY_MODAL_KEY, "overallUncertainty");

	const modalPointer = `/${GENERAL_INFO_KEY}/${OVERALL_UNCERTAINTY_MODAL_KEY}`;
	return {
		jsonSchema: nextJson,
		uiSchema: nextUi as UiSchema,
		modalPointer,
		createdModal: true,
		createdUncertaintyRoot,
	};
}

function setStringEnumField(
	field: RJSFSchema,
	title: string,
	values: string[],
): void {
	field.type = "string";
	field.title = title;
	field.enum = values.length > 0 ? values : undefined;
	if (values.length > 0) {
		(field as { enumNames?: string[] }).enumNames = [...values];
	} else {
		delete (field as { enumNames?: string[] }).enumNames;
	}
}

/**
 * Прокидывает шкалы/риски из конфига вкладки в поля схемы
 * `uncertaintyCalculation` (enums, titles, riskGroup).
 */
export function applyOverallUncertaintyConfigToSchema(
	jsonSchema: RJSFSchema,
	uiSchema: UiSchema,
	config: V2OverallUncertaintyConfig,
): { jsonSchema: RJSFSchema; uiSchema: UiSchema } {
	const ensured = ensureOverallUncertaintySchemaComponents(jsonSchema, uiSchema);
	const nextJson = ensured.jsonSchema;
	const nextUi = structuredClone(ensured.uiSchema) as Record<string, unknown>;
	const rootProps = (nextJson.properties ?? {}) as Record<string, RJSFSchema>;

	const uc = asSchema(rootProps[UNCERTAINTY_CALCULATION_KEY]);
	if (!uc) {
		return { jsonSchema: nextJson, uiSchema: nextUi as UiSchema };
	}
	uc.type = "object";
	uc.title = uc.title ?? "Данные расчёта неопределённости";
	const ucProps = {
		...((uc.properties ?? {}) as Record<string, RJSFSchema>),
	};
	uc.properties = ucProps;

	const timelineValues = config.severityLevels.map((l) => l.timelineLabel);
	const costValues = config.severityLevels.map((l) => l.costLabel);
	const goalsValues = config.severityLevels.map((l) => l.goalsLabel);
	const probabilityValues = config.probabilityLevels.map((l) => l.label);

	if (!ucProps.initiativeTimeline) {
		ucProps.initiativeTimeline = { type: "string", title: "Сроки инициативы" };
	}
	if (!ucProps.initiativeCost) {
		ucProps.initiativeCost = { type: "string", title: "Стоимость инициативы" };
	}
	if (!ucProps.uncertaintyAdjustment) {
		ucProps.uncertaintyAdjustment = {
			type: "number",
			title: "Поправка на общую неопределённость",
			minimum: 0,
			maximum: 30,
		};
	}
	setStringEnumField(ucProps.initiativeTimeline, "Сроки инициативы", timelineValues);
	setStringEnumField(ucProps.initiativeCost, "Стоимость инициативы", costValues);

	const riskGroup: RJSFSchema = {
		type: "object",
		title: "Группа рисков",
		properties: {},
	};
	const riskProps = riskGroup.properties as Record<string, RJSFSchema>;
	for (const risk of config.risks) {
		riskProps[risk.id] = {
			type: "object",
			title: risk.name,
			properties: {
				probability: {
					type: "string",
					title: "Вероятность",
					enum: probabilityValues.length > 0 ? probabilityValues : undefined,
				},
				goals: {
					type: "string",
					title: "Влияние на Цели",
					enum: goalsValues.length > 0 ? goalsValues : undefined,
				},
			},
		};
	}
	ucProps.riskGroup = riskGroup;

	const ucUi = asRecord(nextUi[UNCERTAINTY_CALCULATION_KEY]) ?? {};
	nextUi[UNCERTAINTY_CALCULATION_KEY] = ucUi;
	ucUi["ui:options"] = {
		...(asRecord(ucUi["ui:options"]) ?? {}),
		hidden: true,
		system: true,
	};
	ucUi["ui:order"] = [
		"initiativeTimeline",
		"initiativeCost",
		"uncertaintyAdjustment",
		"riskGroup",
	];

	// Schema enums are source of truth after configurator sync.
	for (const key of ["initiativeTimeline", "initiativeCost"] as const) {
		const fieldUi = asRecord(ucUi[key]) ?? {};
		ucUi[key] = fieldUi;
		fieldUi["ui:widget"] = "select";
		const opts = asRecord(fieldUi["ui:options"]) ?? {};
		delete opts.dictionaryCode;
		fieldUi["ui:options"] = opts;
	}

	const riskGroupUi = asRecord(ucUi.riskGroup) ?? {};
	ucUi.riskGroup = riskGroupUi;
	riskGroupUi["ui:order"] = config.risks.map((r) => r.id);
	for (const risk of config.risks) {
		const riskUi = asRecord(riskGroupUi[risk.id]) ?? {};
		riskGroupUi[risk.id] = riskUi;
		riskUi["ui:order"] = ["probability", "goals"];
		for (const field of ["probability", "goals"] as const) {
			const fieldUi = asRecord(riskUi[field]) ?? {};
			riskUi[field] = fieldUi;
			fieldUi["ui:widget"] = "select";
			const opts = asRecord(fieldUi["ui:options"]) ?? {};
			delete opts.dictionaryCode;
			fieldUi["ui:options"] = opts;
		}
	}

	return { jsonSchema: nextJson, uiSchema: nextUi as UiSchema };
}

/**
 * Подтягивает подписи сроков/стоимости/рисков из схемы в конфиг
 * (если в logic ещё дефолт или поля расходятся).
 */
export function mergeSchemaLabelsIntoOverallUncertaintyConfig(
	config: V2OverallUncertaintyConfig,
	jsonSchema: RJSFSchema,
): V2OverallUncertaintyConfig {
	const rootProps = asRecord(jsonSchema.properties);
	const uc = asSchema(rootProps?.[UNCERTAINTY_CALCULATION_KEY]);
	if (!uc) return config;
	const ucProps = asRecord(uc.properties);
	if (!ucProps) return config;

	const timelineEnum = asSchema(ucProps.initiativeTimeline)?.enum;
	const costEnum = asSchema(ucProps.initiativeCost)?.enum;
	const timelineLabels = Array.isArray(timelineEnum)
		? timelineEnum.filter((v): v is string => typeof v === "string")
		: [];
	const costLabels = Array.isArray(costEnum)
		? costEnum.filter((v): v is string => typeof v === "string")
		: [];

	let severityLevels = config.severityLevels;
	const len = Math.max(
		severityLevels.length,
		timelineLabels.length,
		costLabels.length,
	);
	if (timelineLabels.length > 0 || costLabels.length > 0) {
		severityLevels = Array.from({ length: len }, (_, i) => {
			const prev = severityLevels[i] ?? {
				id: `sev_${i + 1}`,
				timelineLabel: `Уровень ${i + 1}`,
				costLabel: `Уровень ${i + 1}`,
				goalsLabel: `Уровень ${i + 1}`,
			};
			return {
				...prev,
				timelineLabel: timelineLabels[i] ?? prev.timelineLabel,
				costLabel: costLabels[i] ?? prev.costLabel,
			};
		});
	}

	const riskGroup = asSchema(ucProps.riskGroup);
	const riskProps = asRecord(riskGroup?.properties);
	let risks = config.risks;
	if (riskProps && Object.keys(riskProps).length > 0) {
		risks = Object.entries(riskProps).map(([id, def]) => {
			const title = asSchema(def)?.title;
			return {
				id,
				name: typeof title === "string" && title.trim() ? title : id,
			};
		});
	}

	return { ...config, severityLevels, risks };
}
