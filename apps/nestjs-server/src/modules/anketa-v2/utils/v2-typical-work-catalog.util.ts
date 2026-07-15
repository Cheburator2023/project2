import { V2_SOURCE_STREAM } from "@smart-anketa/api-contract";
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

export function buildCatalogWorkKey(component: string, name: string): string {
	return `${normalizeArchComponentType(component)}|${name.trim()}`;
}

/** «Этап 217. Составление ТР» → «Составление ТР» для сопоставления с CSV-каталогом. */
export function stripWorkStagePrefix(name: string): string {
	return name.replace(/^Этап\s+\d+\.\s*/u, "").trim();
}

export function findCatalogRowsForRegistryWork(
	entry: Pick<V2FactoryTypicalWork, "name"> & {
		archComponentType: string;
	},
	catalogGroups: Map<string, V2FactoryTypicalWork[]>,
): V2FactoryTypicalWork[] {
	const key = buildCatalogWorkKey(
		entry.archComponentType,
		stripWorkStagePrefix(entry.name),
	);
	return catalogGroups.get(key) ?? [];
}

export function groupCatalogWorks(): Map<string, V2FactoryTypicalWork[]> {
	const groups = new Map<string, V2FactoryTypicalWork[]>();
	for (const row of V2_FACTORY_TYPICAL_WORKS_SNAPSHOT.typicalWorks) {
		const key = buildCatalogWorkKey(resolveCatalogWorkComponent(row), row.name);
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

export const DEFAULT_NORM_VALID_FROM = "2025-01-01";
