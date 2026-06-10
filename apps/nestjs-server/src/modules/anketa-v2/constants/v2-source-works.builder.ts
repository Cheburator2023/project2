import type { V2JsonLogicValue } from "@smart-anketa/api-contract";
import {
	V2_DOC_CATALOG,
	dictionaryByName,
	type V2CatalogTypicalWork,
} from "./v2-doc-catalog";

/**
 * Каталог-управляемая сборка типовых работ и единого коэффициента (ФТ-024).
 *
 * Нормативы — из `работы.csv`, веса параметров — из `справочники.csv`
 * (через `v2-doc-catalog`). Результат — данные для `generated_rows`-правил и
 * JsonLogic коэффициентов групп; всё редактируется в админке и регенерируется
 * через `npm run build:doc-catalog`.
 */

export type GeneratedTask = {
	taskCode: string;
	name: string;
	/** Тип работ из каталога (колонка «Тип работ» в UI). */
	workType: string;
	reason: string;
	estimateHoursPerDay: number;
	coefficient: number;
	match: Record<string, unknown>;
};

function slug(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-zа-я0-9]+/gi, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 36);
}

function stageNumber(stage: string): string {
	return stage.replace(/\D+/g, "") || "x";
}

function componentTag(component: string): string {
	if (component.includes("Витрина") || component.includes("Объект")) return "OBJ";
	if (component.includes("Процесс")) return "PROC";
	if (component.includes("Система")) return "SRC";
	return "IND";
}

// --- Стрим «Источники данных» (IND): все работы с числовым нормативом --------

function indTasks(stream: string, matchType: string): GeneratedTask[] {
	return V2_DOC_CATALOG.typicalWorks
		.filter((w: V2CatalogTypicalWork) => w.stream === stream && w.norm !== null)
		.map((w, i) => ({
			taskCode: `IND_${stageNumber(w.stage)}_${componentTag(w.component)}_${slug(
				w.name,
			)}_${i}`,
			name: w.name,
			workType: w.workType?.trim() || "—",
			reason: `${w.stage || "IND"} · ${w.component || "Источник"} · ${w.workType}`.trim(),
			estimateHoursPerDay: w.norm as number,
			coefficient: 1,
			match: { type: matchType },
		}));
}

/** Все типовые работы стрима «Источники данных», триггер — тип источника. */
export const SOURCE_TYPICAL_TASKS: GeneratedTask[] = [
	...indTasks("ИД. Внутренний", "Внутренний"),
	...indTasks("ИД. Внешний", "Внешний"),
];

// --- Стрим «Контроль моделей» -----------------------------------------------

/**
 * Виды контроля (справочник №3). Нормативы (ч/д) задаются методологом в
 * справочнике «Нормативные трудозатраты контроля моделей» (№40, матрица по
 * классу модели) — здесь дефолт 0, редактируется через админку. Не выдумываем.
 */
export const CONTROL_TYPES: Array<{ code: string; name: string }> = [
	{ code: "КД", name: "Качество модельных данных [КД]" },
	{ code: "ТМ", name: "Технический контроль [ТМ]" },
	{ code: "ОК", name: "Оперативный контроль [ОК]" },
	{ code: "АК", name: "Аналитический контроль [АК]" },
	{ code: "КМЗ", name: "Контроль модельных значений [КМЗ]" },
	{ code: "ОВ", name: "Оценка влияния моделей [ОВ]" },
];

export const CONTROL_TYPICAL_TASKS: GeneratedTask[] = CONTROL_TYPES.map((c) => ({
	taskCode: `CTRL_${c.code}`,
	name: c.name,
	workType: "Контроль моделей",
	reason: `Контроль моделей · вид контроля ${c.code}`,
	estimateHoursPerDay: 0,
	coefficient: 1,
	match: { controlType: c.code },
}));

// --- Веса параметров (справочники) → JsonLogic ------------------------------

/** JsonLogic-карта «значение поля → весовой коэффициент» из справочника. */
export function weightMapLogic(
	field: string,
	dictName: string,
	fallback = 1,
): V2JsonLogicValue {
	const dict = dictionaryByName(dictName);
	const cases: V2JsonLogicValue[] = [];
	for (const v of dict?.values ?? []) {
		if (v.coeff === null) continue;
		cases.push({ "==": [{ var: field }, v.label] } as V2JsonLogicValue);
		cases.push(v.coeff as V2JsonLogicValue);
		const normalized = v.label.trim().toLowerCase();
		if (normalized === "да" || normalized === "требуется") {
			cases.push({ "==": [{ var: field }, true] } as V2JsonLogicValue);
			cases.push(v.coeff as V2JsonLogicValue);
		} else if (normalized === "нет" || normalized === "не требуется") {
			cases.push({ "==": [{ var: field }, false] } as V2JsonLogicValue);
			cases.push(v.coeff as V2JsonLogicValue);
		}
	}
	cases.push(fallback as V2JsonLogicValue);
	return { if: cases } as V2JsonLogicValue;
}

/** Перечень значений справочника (labels) — для enum в JSON Schema. */
export function dictionaryLabels(dictName: string): string[] {
	return (dictionaryByName(dictName)?.values ?? [])
		.map((v) => v.label)
		.filter(Boolean);
}

/**
 * ФТ-024: единый коэффициент группы параметров источника = произведение весов
 * (№27 «Сложность предметной области» × №28 «Объём запроса по сущностям»).
 */
export const SOURCE_GROUP_COEFFICIENT_LOGIC: V2JsonLogicValue = {
	"*": [
		weightMapLogic("domainComplexity", "Сложность предметной области"),
		weightMapLogic("entityVolume", "Объём запроса по сущностям"),
	],
} as V2JsonLogicValue;
