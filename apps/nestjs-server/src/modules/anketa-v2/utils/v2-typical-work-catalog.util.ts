import {
	V2_SOURCE_STREAM,
	V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE,
	isAlwaysShownTriggerParam,
	normalizeLegacySchemaParamLabel,
	normalizeParamLabel,
	normalizeWorkRoundingStep,
} from "@smart-anketa/api-contract";
import {
	dictionaryByName,
	V2_FACTORY_TYPICAL_WORKS_SNAPSHOT,
	type V2FactoryTypicalWork,
} from "../constants/v2-factory-typical-works-catalog";
import { inferMissingCatalogComponent } from "./v2-catalog-component-inference";

/** Legacy-стримы источников (разделение внутр/внеш убрано). */
const LEGACY_SOURCE_STREAMS = new Set(["ИД. Внутренний", "ИД. Внешний"]);

/** Каталожный стрим → канонический: источники схлопнуты в единый стрим. */
export function canonicalizeWorkStream(stream: string): string {
	const trimmed = stream.trim();
	return LEGACY_SOURCE_STREAMS.has(trimmed) ? V2_SOURCE_STREAM : trimmed;
}

/**
 * Стримы, на которые нужно применить настройки каталожной строки.
 *
 * Методология часто описывает работу один раз (например, «Модельный стрим»),
 * а registry разворачивает её на mother + children. Триггеры / labor / archCount
 * должны попасть на все назначения реестра, иначе list/card на дочернем стриме
 * показывают «без условий появления».
 */
export function resolveCatalogApplyStreams(
	catalogStream: string,
	registryStreams?: readonly string[],
): string[] {
	const catalog = canonicalizeWorkStream(catalogStream);
	const fromRegistry = [
		...new Set(
			(registryStreams ?? [])
				.map((stream) => canonicalizeWorkStream(stream.trim()))
				.filter(Boolean),
		),
	];
	if (fromRegistry.length === 0) return catalog ? [catalog] : [];
	return fromRegistry;
}

export function slugParamCode(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-zа-я0-9]+/gi, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 80);
}

export function normalizeArchComponentType(raw: string): string {
	const value = raw.trim();
	if (value.includes("Витрина") || value.includes("Объект")) {
		return "Объект / Витрина данных";
	}
	if (value.includes("Процесс")) {
		return "Процесс обработки данных";
	}
	if (value.includes("Система")) {
		return "Система-источник";
	}
	if (value.includes("Модельный")) {
		return "Модельный сервис";
	}
	if (value === "Модель") {
		return "Модель";
	}
	return value;
}

export function resolveCatalogWorkComponent(
	row: Pick<V2FactoryTypicalWork, "component" | "stream" | "stage">,
): string {
	return inferMissingCatalogComponent(row.component, row.stream, row.stage);
}

export function extractWorkStage(name: string): string | null {
	const trimmed = name.trim();
	const legacy = trimmed.match(/^Этап[\s_]+(\d+)(?:\.|\s|$)/iu);
	if (legacy?.[1]) return `Этап ${legacy[1]}`;

	const e2e = trimmed.match(/^(\d+[ABab])\.\s+/u);
	if (e2e?.[1]) return e2e[1].toUpperCase();

	const e2eNumeric = trimmed.match(/^(\d+)\.\s+/u);
	if (e2eNumeric?.[1]) return e2eNumeric[1];

	if (/^AutoML:\s*/iu.test(trimmed)) return "AutoML";

	return null;
}

export function findCatalogLaborParamGroup(
	row: Pick<V2FactoryTypicalWork, "laborCoefficients">,
	paramName: string,
): NonNullable<V2FactoryTypicalWork["laborCoefficients"]>[number] | undefined {
	const trimmed = paramName.trim();
	if (!trimmed) return undefined;
	const norm = normalizeParamLabel(trimmed);
	const legacyNorm = normalizeParamLabel(
		normalizeLegacySchemaParamLabel(trimmed),
	);
	for (const group of row.laborCoefficients ?? []) {
		const groupNorm = normalizeParamLabel(group.paramName);
		const groupLegacyNorm = normalizeParamLabel(
			normalizeLegacySchemaParamLabel(group.paramName),
		);
		if (
			groupNorm === norm ||
			groupNorm === legacyNorm ||
			groupLegacyNorm === norm ||
			groupLegacyNorm === legacyNorm ||
			groupNorm.startsWith(norm) ||
			norm.startsWith(groupNorm)
		) {
			return group;
		}
	}
	return undefined;
}

export function resolveCatalogTriggerParamCode(
	row: Pick<
		V2FactoryTypicalWork,
		"laborCoefficients" | "triggerRules"
	>,
	triggerParamName: string,
): string {
	const trimmed = triggerParamName.trim();
	if (isAlwaysShownTriggerParam("", trimmed) || isAlwaysShownTriggerParam(trimmed, trimmed)) {
		return V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE;
	}
	const norm = normalizeParamLabel(trimmed);
	const triggerRule = row.triggerRules?.find((rule) => {
		const ruleNorm = normalizeParamLabel(rule.paramName);
		return (
			ruleNorm === norm ||
			ruleNorm.startsWith(norm) ||
			norm.startsWith(ruleNorm)
		);
	});
	if (
		triggerRule &&
		isAlwaysShownTriggerParam(
			triggerRule.paramCode ?? "",
			triggerRule.paramName,
		)
	) {
		return V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE;
	}
	if (triggerRule?.paramCode?.trim()) {
		return triggerRule.paramCode.trim();
	}
	const coefficientGroup = findCatalogLaborParamGroup(row, trimmed);
	return coefficientGroup?.paramCode?.trim() || slugParamCode(trimmed);
}

export function buildCatalogWorkKey(
	component: string,
	stage: string,
	name: string,
): string {
	return `${normalizeArchComponentType(component)}|${stage.trim()}|${name.trim()}`;
}

/** «Этап 217. Составление ТР» → «Составление ТР» для сопоставления с CSV-каталогом. */
export function stripWorkStagePrefix(name: string): string {
	let rest = name.trim();
	rest = rest.replace(/^Этап[\s_]+\d+\.\s*/u, "");
	const stagePrefix = rest.match(/^(\d+[ABАВаб]?)\.\s*/iu);
	if (stagePrefix) {
		rest = rest.slice(stagePrefix[0].length);
	} else {
		rest = rest.replace(/^AutoML:\s*/iu, "");
	}
	return rest.trim().replace(/\.\s*$/u, "");
}

export function findCatalogRowsForRegistryWork(
	entry: Pick<V2FactoryTypicalWork, "name"> & {
		archComponentType: string;
	},
	catalogGroups: Map<string, V2FactoryTypicalWork[]>,
): V2FactoryTypicalWork[] {
	const stage = extractWorkStage(entry.name);
	if (stage) {
		const key = buildCatalogWorkKey(
			entry.archComponentType,
			stage,
			stripWorkStagePrefix(entry.name),
		);
		const byStage = catalogGroups.get(key);
		if (byStage?.length) return byStage;
	}

	/** ПиРМ и др. работы без «01.» / «Этап N.» в названии — матч по компоненту + имени. */
	const component = normalizeArchComponentType(entry.archComponentType);
	const name = entry.name.trim();
	const matches: V2FactoryTypicalWork[] = [];
	for (const rows of catalogGroups.values()) {
		for (const row of rows) {
			if (normalizeArchComponentType(resolveCatalogWorkComponent(row)) !== component) {
				continue;
			}
			if (row.name.trim() === name) matches.push(row);
		}
	}
	return matches;
}

export function groupCatalogWorks(): Map<string, V2FactoryTypicalWork[]> {
	const groups = new Map<string, V2FactoryTypicalWork[]>();
	for (const row of V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks) {
		const key = buildCatalogWorkKey(
			resolveCatalogWorkComponent(row),
			row.stage,
			row.name,
		);
		const list = groups.get(key) ?? [];
		list.push(row);
		groups.set(key, list);
	}
	return groups;
}

export function inferTriggerValueLabel(
	paramName: string,
	stream: string,
): string | null {
	const lower = paramName.toLowerCase();
	if (lower.includes("тип источника")) {
		if (stream.includes("Внутренний")) return "Внутренний";
		if (stream.includes("Внешний")) return "Внешний";
	}
	const control = paramName.match(/Вид контроля:\s*([A-ZА-Я0-9]+)/i);
	if (control?.[1]) return control[1].toUpperCase();
	return null;
}

export function dictionaryValuesForParam(paramName: string) {
	const dict = dictionaryByName(paramName);
	return dict?.values ?? [];
}

export type CatalogFormulaSeedConfig = {
	formulaText: string;
	roundingMode: "CEIL" | "FLOOR" | "ROUND" | "NONE";
	roundingStep: number | null;
};

export function findCatalogFormulaForStream(
	catalogRows: V2FactoryTypicalWork[],
	streamExecutor: string,
	registryStreams?: readonly string[],
): CatalogFormulaSeedConfig | null {
	const stream = canonicalizeWorkStream(streamExecutor.trim());
	const pick = (
		row: V2FactoryTypicalWork,
	): CatalogFormulaSeedConfig | null => {
		const formulaText = row.formulaText?.trim();
		if (!formulaText) return null;
		return {
			formulaText,
			roundingMode: row.roundingMode ?? "CEIL",
			roundingStep: normalizeWorkRoundingStep(row.roundingStep ?? 0.1),
		};
	};

	for (const row of catalogRows) {
		if (canonicalizeWorkStream(row.stream) !== stream) continue;
		const found = pick(row);
		if (found) return found;
	}

	/** Fan-out: mother catalog stream → all registry assignments (как triggers/labor). */
	if (!registryStreams?.length) return null;
	for (const row of catalogRows) {
		const apply = resolveCatalogApplyStreams(row.stream, registryStreams);
		if (!apply.includes(stream)) continue;
		const found = pick(row);
		if (found) return found;
	}
	return null;
}

export const DEFAULT_NORM_VALID_FROM = "2025-01-01";
