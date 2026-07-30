import {
	formatParamNameWithSourceKeys,
	parseParamNameSourceKeys,
	stripParamNameSourceKeys,
} from "./v2-work-param-source-keys.util";
import { resolveCatalogTriggerStoredValue } from "./v2-param-slug.util";
import {
	archCountTriggerMatches,
	isTriggerArchCountConfigured,
	type V2WorkArchCountCoeffStep,
	type V2WorkFormulaArchCountKind,
} from "./v2-work-arch-count-coeff.util";
import { buildTypicalWorkTriggerLookupSource } from "./v2-typical-works.util";
import type { TypicalWorkTriggerMatchContext } from "./v2-typical-works.util";
import type { V2TypicalWorkTriggerArchCountCombinator } from "./v2-typical-work.types";

export {
	formatParamNameWithSourceKeys,
	parseParamNameSourceKeys,
	stripParamNameSourceKeys,
};

/** Единый стрим-исполнитель для типовых работ систем-источников. */
export const V2_SOURCE_STREAM = "Источники данных";

/**
 * Legacy-маппинг «тип источника → стрим». Больше НЕ используется для
 * маршрутизации (разделение внутр/внеш убрано): все источники идут в
 * единый стрим `V2_SOURCE_STREAM`. Оставлен только для чтения старых меток.
 */
export const STREAM_BY_SOURCE_TYPE: Record<string, string> = {
	Внутренний: "ИД. Внутренний",
	Внешний: "ИД. Внешний",
};

const SOURCE_TYPE_CODE_ALIASES: Record<
	string,
	keyof typeof STREAM_BY_SOURCE_TYPE
> = {
	internal: "Внутренний",
	внутренний: "Внутренний",
	external: "Внешний",
	внешний: "Внешний",
};

/** Нормализует код/метку типа источника к канонической русской метке. */
export function normalizeSourceTypeLabel(
	raw: unknown,
): keyof typeof STREAM_BY_SOURCE_TYPE | null {
	const value = String(raw ?? "").trim();
	if (!value) return null;
	if (value in STREAM_BY_SOURCE_TYPE) {
		return value as keyof typeof STREAM_BY_SOURCE_TYPE;
	}
	const alias = SOURCE_TYPE_CODE_ALIASES[value.toLowerCase()];
	return alias ?? null;
}

export const CONTROL_MODELS_STREAM = "Контроль моделей";

export type TypicalWorkRuleLike = {
	paramCode: string;
	paramName: string | null;
	operator: string;
	valueCode: string | null;
	valueLabel: string | null;
	values?: Array<{ code: string; label: string | null }>;
};

/** Вход для normalize: factory snapshot может хранить values как string[]. */
export type TypicalWorkTriggerRuleMatchInput = Omit<
	TypicalWorkRuleLike,
	"values"
> & {
	values?: Array<{ code: string; label: string | null } | string>;
};

function coerceTypicalWorkTriggerRuleValues(
	values: Array<{ code: string; label: string | null } | string>,
): Array<{ code: string; label: string | null }> {
	return values.map((entry) => {
		if (typeof entry === "string") {
			const stored = resolveCatalogTriggerStoredValue(entry);
			return { code: stored.valueCode, label: stored.valueLabel };
		}
		if (entry.code?.trim() || entry.label?.trim()) {
			return entry;
		}
		const stored = resolveCatalogTriggerStoredValue(entry.label ?? entry.code ?? "");
		return { code: stored.valueCode, label: stored.valueLabel };
	});
}

/** Приводит legacy/snapshot-правила к виду, пригодному для сопоставления с ответами анкеты. */
export function normalizeTypicalWorkTriggerRuleForMatch(
	rule: TypicalWorkTriggerRuleMatchInput,
): TypicalWorkRuleLike {
	const base: TypicalWorkRuleLike = {
		paramCode: rule.paramCode,
		paramName: rule.paramName,
		operator: rule.operator ?? "=",
		valueCode: rule.valueCode,
		valueLabel: rule.valueLabel,
	};

	if (rule.operator === "in" || rule.operator === "not_in") {
		return {
			...base,
			values: rule.values?.length
				? coerceTypicalWorkTriggerRuleValues(rule.values)
				: undefined,
		};
	}

	const hasScalar =
		(rule.valueCode != null && String(rule.valueCode).trim() !== "") ||
		(rule.valueLabel != null && String(rule.valueLabel).trim() !== "");
	if (hasScalar) {
		if (rule.valueCode?.trim()) return base;
		if (rule.valueLabel?.trim()) {
			const stored = resolveCatalogTriggerStoredValue(rule.valueLabel);
			return {
				...base,
				valueCode: stored.valueCode || rule.valueCode,
				valueLabel: stored.valueLabel || rule.valueLabel,
			};
		}
		return base;
	}

	if (rule.values?.length) {
		const normalizedValues = coerceTypicalWorkTriggerRuleValues(rule.values);
		const first = normalizedValues[0];
		if (!first) return base;
		return {
			...base,
			valueCode: first.code || rule.valueCode,
			valueLabel: first.label ?? rule.valueLabel,
			values: normalizedValues,
		};
	}

	return base;
}

export function normalizeTypicalWorkTriggerRulesForMatch(
	rules: TypicalWorkTriggerRuleMatchInput[],
): TypicalWorkRuleLike[] {
	return rules.map(normalizeTypicalWorkTriggerRuleForMatch);
}

export type TypicalWorkTriggerArchCountLike = {
	kind?: V2WorkFormulaArchCountKind | null;
	steps?: V2WorkArchCountCoeffStep[] | null;
	combinator?: V2TypicalWorkTriggerArchCountCombinator;
};

/**
 * Стрим-исполнитель строки-источника. Разделение внутр/внеш убрано —
 * любой источник маршрутизируется в единый стрим `V2_SOURCE_STREAM`.
 * Тип источника (`type`) остаётся обычным триггером работы.
 */
export function resolveStreamFromSourceType(
	_source: Record<string, unknown>,
): string {
	return V2_SOURCE_STREAM;
}

/** Стрим(ы) типовых работ для систем-источников анкеты — всегда единый. */
export function resolveStreamsFromSourceSystems(
	_data: Record<string, unknown>,
): string[] {
	return [V2_SOURCE_STREAM];
}

function slugParamCode(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-zа-я0-9]+/gi, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 80);
}

/**
 * Ответ параметра трудоёмкости: только явные поля анкеты (paramCode / sourceKeys / slug).
 * Без fallback на `value`/`controlType` строки — иначе отсутствующий чекбокс
 * ошибочно наследует чужое значение и получает coeffOn вместо coeffOff.
 */
export function readLaborParamAnswer(
	source: Record<string, unknown>,
	paramCode: string,
	paramName: string | null,
): unknown {
	if (paramCode in source) return source[paramCode];

	const { displayName, sourceKeys } = parseParamNameSourceKeys(paramName);
	for (const key of sourceKeys) {
		if (key in source) return source[key];
	}

	if (displayName) {
		const slug = slugParamCode(displayName);
		if (slug in source) return source[slug];
	}
	if (paramName) {
		const slug = slugParamCode(stripParamNameSourceKeys(paramName));
		if (slug in source) return source[slug];
	}
	if (
		source.type !== undefined &&
		(paramCode === "type" || isSourceTypeTriggerParam(paramCode, paramName))
	) {
		return source.type;
	}
	return undefined;
}

/** Читает значение параметра из контекста строки/объекта анкеты (триггеры, JsonLogic). */
export function readTypicalWorkSourceField(
	source: Record<string, unknown>,
	paramCode: string,
	paramName: string | null,
): unknown {
	const direct = readLaborParamAnswer(source, paramCode, paramName);
	if (direct !== undefined) return direct;

	if (isControlTypeTriggerParam(paramCode, paramName)) {
		if (source.controlType !== undefined) return source.controlType;
		if (source.value !== undefined) return source.value;
	}
	return undefined;
}

function readSourceField(
	source: Record<string, unknown>,
	paramCode: string,
	paramName: string | null,
): unknown {
	return readTypicalWorkSourceField(source, paramCode, paramName);
}

export function extractControlCode(label: string): string | null {
	const bracket = label.match(/\[([A-ZА-Я0-9]+)\]/i);
	if (bracket?.[1]) return bracket[1].toUpperCase();
	const param = label.match(/Вид контроля:\s*([A-ZА-Я0-9]+)/i);
	return param?.[1]?.toUpperCase() ?? null;
}

export type TriggerStatusCatalogParamLike = {
	code: string;
	values: Array<{
		code: string;
		label: string;
		validFrom?: string | null;
		validTo?: string | null;
	}>;
};

/** Сентинел: работа выводится всегда, без проверки полей анкеты. */
export const V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE = "__always__";

export const V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME =
	"Нет — работа выводится всегда";

const ALWAYS_TRIGGER_NAME_RE =
	/нет\s*[—–-]\s*работа\s+выводится\s+всегда/iu;

export function isAlwaysShownTriggerParam(
	paramCode: string,
	paramName: string | null | undefined,
): boolean {
	const code = paramCode.trim().toLowerCase();
	if (
		code === V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_CODE ||
		code === "нет_работа_выводится_всегда"
	) {
		return true;
	}
	const name = (paramName ?? "").trim();
	if (ALWAYS_TRIGGER_NAME_RE.test(name)) return true;
	return ALWAYS_TRIGGER_NAME_RE.test(code.replace(/_/g, " "));
}

export function isSourceTypeTriggerParam(
	paramCode: string,
	paramName: string | null | undefined,
): boolean {
	const name = paramName?.toLowerCase() ?? "";
	const code = paramCode.toLowerCase();
	if (code === "type") return true;
	if (/тип[_\s-]*(системы[_\s-]*)?источник/i.test(name)) return true;
	if (/тип[_\s-]*(системы[_\s-]*)?источник/i.test(code)) return true;
	return name.includes("тип источника") || code.includes("тип_источника");
}

export function isControlTypeTriggerParam(
	paramCode: string,
	paramName: string | null | undefined,
): boolean {
	const label = paramName ?? paramCode;
	return /вид контроля/i.test(label);
}

export function isPresenceOnlyTriggerRule(rule: {
	valueCode: string | null;
	valueLabel: string | null;
	values?: Array<{ code: string; label: string | null }>;
}): boolean {
	return (
		rule.valueCode == null &&
		rule.valueLabel == null &&
		(!rule.values || rule.values.length === 0)
	);
}

/** Битые/пустые ссылки из legacy CSV — не проверяем против схемы. */
export function isBrokenTypicalWorkTriggerRef(rule: {
	paramCode: string;
	paramName?: string | null;
}): boolean {
	if (rule.paramCode.trim()) return false;
	const name = rule.paramName?.trim();
	return !name || name === "?";
}

/**
 * Методологические presence-триггеры (пилот, мониторинг и т.п.) не привязаны к полям схемы.
 * Legacy CSV иногда режет «Пилот (первичный, повторный)» на отдельные paramCode.
 */
export function isMethodologyPresenceTriggerRule(rule: {
	paramCode: string;
	paramName?: string | null;
	valueCode: string | null;
	valueLabel: string | null;
	values?: Array<{ code: string; label: string | null }>;
}): boolean {
	if (!isPresenceOnlyTriggerRule(rule)) return false;
	if (isAlwaysShownTriggerParam(rule.paramCode, rule.paramName)) return false;
	if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName)) return false;
	if (isControlTypeTriggerParam(rule.paramCode, rule.paramName)) return false;

	const code = rule.paramCode.trim().toLowerCase();
	const name = stripParamNameSourceKeys(rule.paramName ?? "")
		.trim()
		.toLowerCase();

	if (code === "повторный" || name.endsWith("повторный)")) return true;
	if (/^пилот(?:[_\s(]|$)/.test(code)) return true;
	if (/^[?]\s*пилот/.test(name) || /пилот\s*\(/.test(name)) return true;
	if (/^мониторинг(?:[_\s]|$)/.test(code) || /^мониторинг/.test(name)) {
		return true;
	}

	return false;
}

/** Сопоставляет правило триггера с параметром глобального справочника (алиасы CSV → каталог). */
export function resolveTriggerStatusCatalogParam(
	rule: { paramCode: string; paramName?: string | null },
	catalog: TriggerStatusCatalogParamLike[],
): TriggerStatusCatalogParamLike | undefined {
	const direct = catalog.find((item) => item.code === rule.paramCode);
	if (direct) return direct;

	const paramName = rule.paramName?.trim();
	if (paramName) {
		const bySlug = catalog.find(
			(item) => item.code === slugParamCode(paramName),
		);
		if (bySlug) return bySlug;
	}

	if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName)) {
		return (
			catalog.find((item) => item.code === "type") ??
			catalog.find(
				(item) => item.code === slugParamCode("Тип системы-источника"),
			) ??
			catalog.find(
				(item) => item.code === slugParamCode("Тип источника данных"),
			) ??
			catalog.find((item) =>
				item.values.some(
					(value) => value.label === "Внутренний" || value.label === "Внешний",
				),
			)
		);
	}

	if (isControlTypeTriggerParam(rule.paramCode, rule.paramName)) {
		return catalog.find((item) => item.code === slugParamCode("Вид контроля"));
	}

	return undefined;
}

/** Канонический ключ группы триггеров при проверке по каталогу (legacy alias → `type`). */
export function triggerRuleCatalogGroupKey(
	rule: { paramCode: string; paramName?: string | null },
	catalog: TriggerStatusCatalogParamLike[],
): string {
	const resolved = resolveTriggerStatusCatalogParam(rule, catalog);
	if (resolved) return resolved.code;
	if (isSourceTypeTriggerParam(rule.paramCode, rule.paramName)) return "type";
	return rule.paramCode;
}

export function catalogValueMatchesTriggerRule(
	catalogValue: { code: string; label: string },
	rule: {
		paramCode: string;
		paramName?: string | null;
		valueCode: string | null;
		valueLabel: string | null;
	},
): boolean {
	if (rule.valueCode && catalogValue.code === rule.valueCode) return true;
	if (
		rule.valueCode &&
		catalogValue.code.toLowerCase() === rule.valueCode.toLowerCase()
	) {
		return true;
	}
	if (rule.valueLabel && catalogValue.label === rule.valueLabel) return true;
	if (
		rule.valueLabel &&
		catalogValue.label.toLowerCase() === rule.valueLabel.toLowerCase()
	) {
		return true;
	}
	if (rule.valueLabel) {
		const labelUpper = catalogValue.label.toUpperCase();
		const ruleUpper = rule.valueLabel.toUpperCase();
		if (
			labelUpper.startsWith(`${ruleUpper} —`) ||
			labelUpper.startsWith(`${ruleUpper} -`)
		) {
			return true;
		}
	}

	const controlCode = extractControlCode(rule.paramName ?? rule.paramCode);
	if (controlCode) {
		const labelUpper = catalogValue.label.toUpperCase();
		return (
			labelUpper.startsWith(`${controlCode} —`) ||
			labelUpper.startsWith(`${controlCode} -`) ||
			labelUpper.startsWith(controlCode)
		);
	}

	return false;
}

function compareRuleValue(
	actual: unknown,
	expected: string | null,
	operator: string,
): boolean {
	if (expected == null) return false;
	const actualStr = String(actual ?? "");
	const expectedStr = String(expected);

	switch (operator) {
		case "!=":
			return actualStr !== expectedStr;
		case ">=":
			return Number(actual) >= Number(expected);
		case "<=":
			return Number(actual) <= Number(expected);
		case ">":
			return Number(actual) > Number(expected);
		case "<":
			return Number(actual) < Number(expected);
		default:
			return actualStr === expectedStr;
	}
}

function scalarRuleValueMatches(
	actual: unknown,
	rule: Pick<TypicalWorkRuleLike, "valueCode" | "valueLabel" | "operator">,
): boolean {
	if ([">=", "<=", ">", "<"].includes(rule.operator)) {
		return compareRuleValue(
			actual,
			rule.valueCode ?? rule.valueLabel,
			rule.operator,
		);
	}

	const hasValue =
		(rule.valueCode != null && String(rule.valueCode).trim() !== "") ||
		(rule.valueLabel != null && String(rule.valueLabel).trim() !== "");
	if (!hasValue) return false;

	const matches = laborValueMatches(actual, rule.valueCode, rule.valueLabel);
	if (rule.operator === "!=") return !matches;
	return matches;
}

/** Сопоставление значения поля анкеты с кодом/меткой из справочника или схемы. */
export function coerceNumericLaborActual(actual: unknown): unknown {
	if (Array.isArray(actual)) {
		return actual.map((item) => coerceNumericLaborActual(item));
	}
	if (typeof actual === "string") {
		const trimmed = actual.trim();
		if (!trimmed) return actual;
		if (trimmed.toLowerCase() === "не требуется") return trimmed;
		const num = Number(trimmed.replace(",", "."));
		if (Number.isFinite(num)) return num;
	}
	return actual;
}

/** Читает значение по schemaPointer (`/generalInfo/field`, `/detailInfo/dataMart/items/field`). */
export function readValueAtSchemaPointer(
	root: Record<string, unknown>,
	pointer: string,
): unknown {
	if (!pointer.startsWith("/")) return undefined;
	const segments = pointer.split("/").filter(Boolean);
	let cur: unknown = root;
	for (const segment of segments) {
		if (segment === "items") {
			if (Array.isArray(cur)) cur = cur[0];
			continue;
		}
		if (cur == null || typeof cur !== "object") return undefined;
		if (Array.isArray(cur)) cur = cur[0];
		if (cur == null || typeof cur !== "object") return undefined;
		cur = (cur as Record<string, unknown>)[segment];
	}
	return cur;
}

function isPresentLaborLookupValue(value: unknown): boolean {
	return value !== undefined && value !== null && value !== "";
}

function toLaborLookupItems(value: unknown): unknown[] {
	if (!isPresentLaborLookupValue(value)) return [];
	if (Array.isArray(value)) {
		return value.flatMap((item) => toLaborLookupItems(item));
	}
	return [value];
}

function laborLookupItemKey(value: unknown): string {
	if (typeof value === "string") return `s:${value}`;
	if (typeof value === "number") return `n:${value}`;
	if (typeof value === "boolean") return `b:${value ? "1" : "0"}`;
	return `j:${JSON.stringify(value)}`;
}

function mergeLaborLookupValue(existing: unknown, next: unknown): unknown {
	const merged = [...toLaborLookupItems(existing), ...toLaborLookupItems(next)];
	if (merged.length === 0) return undefined;
	const seen = new Set<string>();
	const deduped: unknown[] = [];
	for (const item of merged) {
		const key = laborLookupItemKey(item);
		if (seen.has(key)) continue;
		seen.add(key);
		deduped.push(item);
	}
	return deduped.length === 1 ? deduped[0] : deduped;
}

function isOwnTriggerSourceValue(value: unknown): boolean {
	return isPresentLaborLookupValue(value) || typeof value === "boolean";
}

/**
 * Поля триггера с другого арх. компонента (напр. readyPromReports на моделях
 * при fan-out по системам-источникам): flatten last-write даёт значение
 * последней модели и ломает «хотя бы одна модель = Нет».
 * Если поля нет на текущем source — подставляем все значения из formData
 * (laborValueMatches по массиву = any).
 */
export function overlayCrossComponentTriggerLookup(
	lookup: Record<string, unknown>,
	source: Record<string, unknown>,
	formData: Record<string, unknown> | undefined,
	paramCodes: readonly string[],
): Record<string, unknown> {
	if (!formData || paramCodes.length === 0) return lookup;
	const next: Record<string, unknown> = { ...lookup };
	for (const code of paramCodes) {
		const trimmed = code.trim();
		if (!trimmed) continue;
		if (isOwnTriggerSourceValue(source[trimmed])) continue;
		const values = findFieldValuesWithSourceLabels(formData, trimmed).map(
			(row) => row.value,
		);
		const meaningful = values.filter((value) => isOwnTriggerSourceValue(value));
		if (meaningful.length === 0) continue;
		const seen = new Set<string>();
		const deduped: unknown[] = [];
		for (const item of meaningful) {
			const key = laborLookupItemKey(item);
			if (seen.has(key)) continue;
			seen.add(key);
			deduped.push(item);
		}
		next[trimmed] = deduped.length === 1 ? deduped[0] : deduped;
	}
	return next;
}

/**
 * Разворачивает значение sourceContextPaths в плоский объект полей.
 * UI хранит dataProcess/dataMart/modelService как массив записей — берём первую.
 */
export function flattenSourceContextValue(
	value: unknown,
): Record<string, unknown> {
	if (!value || typeof value !== "object") return {};
	if (Array.isArray(value)) {
		for (const item of value) {
			if (item && typeof item === "object" && !Array.isArray(item)) {
				return { ...(item as Record<string, unknown>) };
			}
		}
		return {};
	}
	return { ...(value as Record<string, unknown>) };
}

export type LaborFieldValueWithSource = {
	value: unknown;
	sourceLabel: string | null;
};

function readArchComponentSourceLabel(
	record: Record<string, unknown>,
	fallbackIndex: number | null,
): string | null {
	for (const key of ["name", "title", "label", "modelName"]) {
		const raw = record[key];
		if (typeof raw === "string" && raw.trim()) return raw.trim();
	}
	if (fallbackIndex != null && fallbackIndex >= 0) {
		return `Компонент ${fallbackIndex + 1}`;
	}
	return null;
}

/** Ищет все вхождения поля по коду с подписью арх-компонента (name и т.п.). */
export function findFieldValuesWithSourceLabels(
	formData: Record<string, unknown>,
	fieldCode: string,
): LaborFieldValueWithSource[] {
	const code = fieldCode.trim();
	if (!code) return [];

	const results: LaborFieldValueWithSource[] = [];
	const seen = new Set<string>();

	const push = (value: unknown, sourceLabel: string | null) => {
		for (const item of toLaborLookupItems(value)) {
			const key = `${sourceLabel ?? ""}|${laborLookupItemKey(item)}`;
			if (seen.has(key)) continue;
			seen.add(key);
			results.push({ value: item, sourceLabel });
		}
	};

	const visit = (
		node: unknown,
		parentLabel: string | null,
		arrayIndex: number | null,
	): void => {
		if (node == null || typeof node !== "object") return;
		if (Array.isArray(node)) {
			node.forEach((item, index) => visit(item, parentLabel, index));
			return;
		}
		const record = node as Record<string, unknown>;
		const ownLabel =
			readArchComponentSourceLabel(record, arrayIndex) ?? parentLabel;
		if (Object.hasOwn(record, code)) {
			push(record[code], ownLabel);
		}
		for (const child of Object.values(record)) {
			visit(child, ownLabel, null);
		}
	};

	visit(formData, null, null);
	return results;
}

/** Ищет значение поля по коду в глубине formData (массивы арх. блоков и т.п.). */
export function findFieldValueInFormData(
	formData: Record<string, unknown>,
	fieldCode: string,
): unknown {
	const values = findFieldValuesWithSourceLabels(formData, fieldCode).map(
		(row) => row.value,
	);
	if (values.length === 0) return undefined;
	return values.length === 1 ? values[0] : values;
}

/** Контекст для коэффициентов: строка arch-компонента + поля formData вне строки (generalInfo и т.д.). */
export function buildLaborCoefficientLookupSource(
	source: Record<string, unknown>,
	formData: Record<string, unknown>,
	schemaParams: ReadonlyArray<{
		code: string;
		name?: string | null;
		schemaPointer?: string | null;
	}>,
	paramCodes: readonly string[],
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...source };
	const codes = new Set(paramCodes);

	const isPresent = (value: unknown) => isPresentLaborLookupValue(value);

	for (const param of schemaParams) {
		if (!codes.has(param.code)) continue;
		if (isPresent(merged[param.code])) continue;
		const pointer = param.schemaPointer?.trim();
		if (!pointer) continue;
		const fromForm = readValueAtSchemaPointer(formData, pointer);
		if (isPresent(fromForm) || typeof fromForm === "boolean") {
			merged[param.code] = mergeLaborLookupValue(merged[param.code], fromForm);
		}
	}

	// Одинаковые названия полей на разных арх. компонентах (напр. «Сложность реализации»
	// на системе-источнике и на процессе): если целевой код пуст, берём значение
	// одноимённого поля уже лежащее в source/merged.
	for (const param of schemaParams) {
		if (!codes.has(param.code)) continue;
		if (isPresent(merged[param.code]) || typeof merged[param.code] === "boolean") {
			continue;
		}
		const name = stripParamNameSourceKeys(param.name)
			.trim()
			.toLowerCase();
		if (!name) continue;
		for (const alias of schemaParams) {
			if (alias.code === param.code) continue;
			const aliasName = stripParamNameSourceKeys(alias.name)
				.trim()
				.toLowerCase();
			if (aliasName !== name) continue;
			const aliasValue = merged[alias.code];
			if (isPresent(aliasValue) || typeof aliasValue === "boolean") {
				merged[param.code] = mergeLaborLookupValue(
					merged[param.code],
					aliasValue,
				);
				break;
			}
		}
	}

	// Fallback: поле лежит в массиве арх. блока, а schemaPointer/schemaParams недоступны.
	for (const code of codes) {
		if (isPresent(merged[code]) || typeof merged[code] === "boolean") {
			continue;
		}
		const fromDeep = findFieldValueInFormData(formData, code);
		if (isPresent(fromDeep) || typeof fromDeep === "boolean") {
			merged[code] = mergeLaborLookupValue(merged[code], fromDeep);
		}
	}

	// Legacy labor code (`workType`) vs factory field (`field_yJ51GkCR`) с тем же
	// названием «Тип работ»: подтянуть значение с текущей строки экземпляра.
	for (const code of codes) {
		if (isPresent(merged[code]) || typeof merged[code] === "boolean") {
			continue;
		}
		const targetName = stripParamNameSourceKeys(
			schemaParams.find((param) => param.code === code)?.name ?? "",
		)
			.trim()
			.toLowerCase();
		if (targetName) {
			for (const alias of schemaParams) {
				if (alias.code === code) continue;
				if (
					stripParamNameSourceKeys(alias.name).trim().toLowerCase() !==
					targetName
				) {
					continue;
				}
				const aliasValue = merged[alias.code] ?? source[alias.code];
				if (isPresent(aliasValue) || typeof aliasValue === "boolean") {
					merged[code] = mergeLaborLookupValue(merged[code], aliasValue);
					break;
				}
			}
		}
		if (isPresent(merged[code]) || typeof merged[code] === "boolean") {
			continue;
		}
		// labor code отсутствует в schemaParams: сопоставить по имени ключа в source.
		for (const [key, raw] of Object.entries(source)) {
			if (key === code) continue;
			const sp = schemaParams.find((param) => param.code === key);
			if (!sp) continue;
			const spName = stripParamNameSourceKeys(sp.name).trim().toLowerCase();
			if (!spName) continue;
			const codeAsName = code.replace(/_/g, " ").toLowerCase();
			const slugName = slugParamCode(sp.name ?? "");
			const isWorkTypeAlias =
				spName === "тип работ" &&
				(code === "workType" || code === "work_type");
			if (
				slugName === code ||
				spName === codeAsName ||
				isWorkTypeAlias
			) {
				if (isPresent(raw) || typeof raw === "boolean") {
					merged[code] = mergeLaborLookupValue(merged[code], raw);
					break;
				}
			}
		}
	}

	return merged;
}

/** Сопоставление значения поля анкеты с кодом/меткой из справочника или схемы. */
export function laborValueMatches(
	actual: unknown,
	valueCode: string | null | undefined,
	valueLabel: string | null | undefined,
): boolean {
	if (Array.isArray(actual)) {
		return actual.some((item) => laborValueMatches(item, valueCode, valueLabel));
	}
	const normalizedActual = coerceNumericLaborActual(actual);
	const actualStr = String(normalizedActual).trim();

	if (valueLabel != null && String(valueLabel).trim() !== "") {
		const label = String(valueLabel).trim();
		if (actualStr === label) return true;
		if (matchesEnumPrefixLaborValue(actualStr, label)) return true;
		if (typeof normalizedActual === "number" && Number.isFinite(normalizedActual)) {
			const range = label.toLowerCase().replace(/\s+/g, " ");
			const upTo = range.match(/^до\s*(\d+(?:[.,]\d+)?)/u);
			if (upTo?.[1] && normalizedActual <= Number(upTo[1].replace(",", "."))) {
				return true;
			}
			const interval = range.match(
				/^(\d+(?:[.,]\d+)?)\s*[–—-]\s*(\d+(?:[.,]\d+)?)/u,
			);
			if (interval?.[1] && interval[2]) {
				const min = Number(interval[1].replace(",", "."));
				const max = Number(interval[2].replace(",", "."));
				if (normalizedActual > min && normalizedActual <= max) return true;
			}
			const over = range.match(/^(?:>|более\s+)(\d+(?:[.,]\d+)?)/u);
			if (over?.[1] && normalizedActual > Number(over[1].replace(",", "."))) {
				return true;
			}
		}
		if (matchesBooleanLaborLabel(normalizedActual, label)) {
			return true;
		}
	}
	if (valueCode != null && String(valueCode).trim() !== "") {
		const code = String(valueCode).trim();
		if (actualStr === code) return true;
		if (matchesEnumPrefixLaborValue(actualStr, code)) return true;
		if (matchesBooleanLaborLabel(normalizedActual, code)) {
			return true;
		}
	}
	return false;
}

/**
 * Enum схемы «4 — …» / «ОК — …» ↔ короткий код/метка трудоёмкости «4» / «ОК».
 * Как у catalogValueMatchesTriggerRule.
 */
function matchesEnumPrefixLaborValue(
	actualStr: string,
	expectedShort: string,
): boolean {
	const short = expectedShort.trim();
	if (!short) return false;
	return (
		actualStr.startsWith(`${short} —`) ||
		actualStr.startsWith(`${short} -`) ||
		actualStr.startsWith(`${short} –`)
	);
}

function matchesBooleanLaborLabel(actual: unknown, expected: string): boolean {
	const norm = expected.trim().toLowerCase();
	const truthy = norm === "да" || norm === "true";
	const falsy = norm === "нет" || norm === "false";
	if (!truthy && !falsy) return false;
	if (typeof actual === "boolean") {
		return truthy ? actual === true : actual === false;
	}
	if (typeof actual === "string") {
		const a = actual.trim().toLowerCase();
		if (truthy) return a === "да" || a === "true";
		return a === "нет" || a === "false";
	}
	return false;
}

function compareRuleValuesSet(
	actual: unknown,
	expectedCodes: string[],
	expectedLabels: string[],
	operator: string,
): boolean {
	const matches = expectedCodes.some((code, index) =>
		laborValueMatches(actual, code, expectedLabels[index] ?? null),
	);
	return operator === "not_in" ? !matches : matches;
}

export function matchSingleTypicalWorkRuleForTriggerFormula(
	rule: TypicalWorkRuleLike,
	source: Record<string, unknown>,
): boolean {
	return matchSingleTypicalWorkRule(rule, source);
}

function matchSingleTypicalWorkRule(
	rule: TypicalWorkRuleLike,
	source: Record<string, unknown>,
): boolean {
	if (isAlwaysShownTriggerParam(rule.paramCode, rule.paramName)) {
		return true;
	}
	const paramName = stripParamNameSourceKeys(rule.paramName) || rule.paramCode;
	const controlCode = extractControlCode(paramName);
	if (controlCode) {
		const rowText = String(
			source.value ?? source.controlType ?? source.name ?? "",
		);
		const matches =
			rowText.includes(`[${controlCode}]`) ||
			rowText.toUpperCase() === controlCode ||
			rowText.includes(controlCode);
		return rule.operator === "!=" ? !matches : matches;
	}

	const actual = readSourceField(source, rule.paramCode, rule.paramName);
	if (rule.operator === "in" || rule.operator === "not_in") {
		const values = rule.values?.length
			? rule.values
			: rule.valueCode
				? [{ code: rule.valueCode, label: rule.valueLabel }]
				: [];
		if (values.length === 0) return false;
		return compareRuleValuesSet(
			actual,
			values.map((v) => v.code),
			values.map((v) => v.label ?? ""),
			rule.operator,
		);
	}
	if (rule.valueLabel == null && rule.valueCode == null) {
		if (rule.values?.length) {
			return compareRuleValuesSet(
				actual,
				rule.values.map((v) => v.code),
				rule.values.map((v) => v.label ?? ""),
				rule.operator === "!=" ? "not_in" : "in",
			);
		}
		return actual !== undefined && actual !== null && actual !== "";
	}
	return scalarRuleValueMatches(actual, rule);
}

function groupTypicalWorkRulesByParam(
	rules: TypicalWorkRuleLike[],
): Map<string, TypicalWorkRuleLike[]> {
	const groups = new Map<string, TypicalWorkRuleLike[]>();
	for (const rule of rules) {
		const key = rule.paramCode.trim() || "__empty__";
		const list = groups.get(key) ?? [];
		list.push(rule);
		groups.set(key, list);
	}
	return groups;
}

function matchTypicalWorkParamRules(
	rules: TypicalWorkRuleLike[],
	source: Record<string, unknown>,
): boolean {
	if (rules.length === 0) return false;
	const normalized = normalizeTypicalWorkTriggerRulesForMatch(rules);
	if (
		normalized.some((rule) =>
			isAlwaysShownTriggerParam(rule.paramCode, rule.paramName),
		)
	) {
		return true;
	}
	const groups = groupTypicalWorkRulesByParam(normalized);
	return [...groups.values()].every((groupRules) =>
		groupRules.every((rule) => matchSingleTypicalWorkRule(rule, source)),
	);
}

function hasTypicalWorkTriggerArchCount(
	triggerArchCount?: TypicalWorkTriggerArchCountLike | null,
): boolean {
	return isTriggerArchCountConfigured(triggerArchCount);
}

/** Все параметры-триггеры (И) и опционально глобальное условие по количеству компонентов. */
export function typicalWorkRulesMatchSource(
	rules: TypicalWorkRuleLike[],
	source: Record<string, unknown>,
	formData?: Record<string, unknown>,
	triggerArchCount?: TypicalWorkTriggerArchCountLike | null,
	matchContext?: TypicalWorkTriggerMatchContext,
): boolean {
	const hasArch = hasTypicalWorkTriggerArchCount(triggerArchCount);
	if (rules.length === 0 && !hasArch) return false;

	const archMatch = hasArch
		? formData
			? archCountTriggerMatches(
					formData,
					triggerArchCount!.kind!,
					triggerArchCount!.steps ?? [],
				)
			: false
		: false;

	/** Только arch-count (без ПТ) — как у модельного стрима «Модельный сервис >= 1». */
	if (rules.length === 0) return archMatch;

	const resolvedRules = remapTriggerRulesToSchemaParams(
		rules,
		matchContext?.schemaParams,
	);
	const lookupSource = buildTypicalWorkTriggerLookupSource(
		source,
		formData,
		matchContext?.referencePath,
		matchContext?.uiSchema,
	);
	const paramCodes = [
		...new Set(resolvedRules.map((rule) => rule.paramCode.trim()).filter(Boolean)),
	];
	const enrichedLookup =
		formData && matchContext?.schemaParams?.length
			? buildLaborCoefficientLookupSource(
					lookupSource,
					formData,
					matchContext.schemaParams,
					paramCodes,
				)
			: lookupSource;
	const triggerLookup = overlayCrossComponentTriggerLookup(
		enrichedLookup,
		source,
		formData,
		paramCodes,
	);
	const paramMatch = matchTypicalWorkParamRules(resolvedRules, triggerLookup);
	if (!hasArch) return paramMatch;

	const combinator = triggerArchCount?.combinator ?? "and";
	if (combinator === "or") return paramMatch || archMatch;
	return paramMatch && archMatch;
}

/**
 * Устаревший paramCode в триггере (после пересоздания поля в схеме):
 * перепривязка по имени параметра через schemaParams.
 */
export function remapTriggerRulesToSchemaParams(
	rules: TypicalWorkRuleLike[],
	schemaParams?: ReadonlyArray<{
		code: string;
		name?: string | null;
	}> | null,
): TypicalWorkRuleLike[] {
	if (!schemaParams?.length) return rules;
	const byCode = new Set(schemaParams.map((param) => param.code));
	return rules.map((rule) => {
		const code = rule.paramCode.trim();
		if (!code || byCode.has(code)) return rule;
		const ruleName = stripParamNameSourceKeys(rule.paramName)
			.trim()
			.toLowerCase();
		if (!ruleName) return rule;
		const byName = schemaParams.find(
			(param) =>
				stripParamNameSourceKeys(param.name).trim().toLowerCase() === ruleName,
		);
		if (!byName) return rule;
		return { ...rule, paramCode: byName.code };
	});
}

export function hasTypicalWorkTriggersConfiguredSimple(
	rules: TypicalWorkRuleLike[],
	triggerArchCount?: TypicalWorkTriggerArchCountLike | null,
): boolean {
	return rules.length > 0 || hasTypicalWorkTriggerArchCount(triggerArchCount);
}

export function resolveLaborCoefficient(
	source: Record<string, unknown>,
	paramCode: string,
	valueCode: string | null,
	valueLabel: string | null,
	paramName: string | null = null,
): boolean {
	const actual = readLaborParamAnswer(source, paramCode, paramName);
	return laborValueMatches(actual, valueCode, valueLabel);
}

export function resolveLaborAnyOfCoefficient(
	source: Record<string, unknown>,
	paramCode: string,
	anyOf: {
		valueCodes: string[];
		valueLabels: string[];
		coeffOn: number;
		coeffOff: number;
	},
	paramName: string | null = null,
): number {
	const actual = readLaborParamAnswer(source, paramCode, paramName);
	const matches = anyOf.valueCodes.some((code, index) =>
		laborValueMatches(actual, code, anyOf.valueLabels[index] ?? null),
	);
	return matches ? anyOf.coeffOn : anyOf.coeffOff;
}

export type ByValueLaborCoefficientRow = {
	paramCode: string;
	paramName?: string | null;
	valueCode: string | null;
	valueLabel: string | null;
	coefficient: number;
};

function expectedBooleanLaborValue(
	valueCode: string | null,
	valueLabel: string | null,
): boolean | null {
	for (const raw of [valueCode, valueLabel]) {
		const normalized = raw?.trim().toLowerCase();
		if (normalized === "true" || normalized === "да") return true;
		if (normalized === "false" || normalized === "нет") return false;
	}
	return null;
}

export type LaborCoefficientAnswerPart = {
	sourceLabel: string | null;
	answerLabel: string;
	coefficient: number;
};

export type LaborCoefficientResolvedDetail = {
	paramCode: string;
	value: number;
	aggregation: "single" | "max";
	/** Подстановка в разборе формулы: `0.5` или `max(0.5, 1)`. */
	formulaValueLabel: string;
	parts: LaborCoefficientAnswerPart[];
};

function formatLaborAnswerLabel(actual: unknown): string {
	if (actual === true) return "Да";
	if (actual === false) return "Нет";
	if (actual == null) return "—";
	const text = String(actual).trim();
	return text || "—";
}

function formatLaborCoeffNumber(value: number): string {
	if (!Number.isFinite(value)) return "?";
	const rounded = Math.round(value * 10000) / 10000;
	if (Number.isInteger(rounded)) return String(rounded);
	return String(rounded)
		.replace(/(\.\d*?)0+$/, "$1")
		.replace(/\.$/, "");
}

function matchLaborCoefficientRow(
	actual: unknown,
	paramRows: readonly ByValueLaborCoefficientRow[],
): ByValueLaborCoefficientRow | null {
	for (const row of paramRows) {
		if (laborValueMatches(actual, row.valueCode, row.valueLabel)) {
			return row;
		}
	}
	return null;
}

function coerceBooleanLaborDefault(
	actual: unknown,
	paramRows: readonly ByValueLaborCoefficientRow[],
): unknown {
	if (actual !== undefined) return actual;
	const booleanValues = new Set(
		paramRows.map((row) =>
			expectedBooleanLaborValue(row.valueCode, row.valueLabel),
		),
	);
	if (booleanValues.has(true) && booleanValues.has(false)) {
		return false;
	}
	return actual;
}

/**
 * Детальный разбор коэффициента «по значениям» для одного source-контекста
 * (per-instance: скаляр текущего экземпляра).
 */
export function resolveByValueLaborParamCoefficientDetails(
	source: Record<string, unknown>,
	rows: readonly ByValueLaborCoefficientRow[],
	_formData?: Record<string, unknown> | null,
): Record<string, LaborCoefficientResolvedDetail> {
	const details: Record<string, LaborCoefficientResolvedDetail> = {};
	const coeffs = resolveByValueLaborParamCoefficients(source, rows);
	const rowsByParam = new Map<string, ByValueLaborCoefficientRow[]>();
	for (const row of rows) {
		const paramRows = rowsByParam.get(row.paramCode) ?? [];
		paramRows.push(row);
		rowsByParam.set(row.paramCode, paramRows);
	}

	for (const [paramCode, value] of Object.entries(coeffs)) {
		const paramRows = rowsByParam.get(paramCode) ?? [];
		const paramName = paramRows[0]?.paramName ?? null;
		const actual = coerceBooleanLaborDefault(
			readLaborParamAnswer(source, paramCode, paramName),
			paramRows,
		);
		const matched = matchLaborCoefficientRow(
			Array.isArray(actual) ? actual[0] : actual,
			paramRows,
		);
		details[paramCode] = {
			paramCode,
			value,
			aggregation: "single",
			formulaValueLabel: formatLaborCoeffNumber(value),
			parts: matched
				? [
						{
							sourceLabel: null,
							answerLabel:
								matched.valueLabel?.trim() ||
								matched.valueCode?.trim() ||
								formatLaborAnswerLabel(
									Array.isArray(actual) ? actual[0] : actual,
								),
							coefficient: value,
						},
					]
				: [],
		};
	}
	return details;
}

/** Коэффициенты режима «По значениям» по фактическому ответу в анкете. */
export function resolveByValueLaborParamCoefficients(
	source: Record<string, unknown>,
	rows: readonly ByValueLaborCoefficientRow[],
	_formData?: Record<string, unknown> | null,
): Record<string, number> {
	const paramCoefficients: Record<string, number> = {};
	const rowsByParam = new Map<string, ByValueLaborCoefficientRow[]>();
	for (const row of rows) {
		const paramRows = rowsByParam.get(row.paramCode) ?? [];
		paramRows.push(row);
		rowsByParam.set(row.paramCode, paramRows);
	}

	for (const [paramCode, paramRows] of rowsByParam) {
		const paramName = paramRows[0]?.paramName ?? null;
		let actual = coerceBooleanLaborDefault(
			readLaborParamAnswer(source, paramCode, paramName),
			paramRows,
		);
		if (Array.isArray(actual)) {
			actual = actual[0];
		}
		const matched = matchLaborCoefficientRow(actual, paramRows);
		if (matched) {
			paramCoefficients[paramCode] = matched.coefficient;
		}
	}
	return paramCoefficients;
}

export type TypicalWorkAnyOfLaborParamLike = {
	paramCode: string;
	paramName?: string | null;
	anyOf: {
		valueCodes: string[];
		valueLabels: string[];
		coeffOn: number;
		coeffOff: number;
	};
};

/**
 * Резолвер коэффициента фактора формулы: сначала рассчитанные значения,
 * затем any_of по фактическому ответу (в т.ч. «выкл» при отсутствии/снятом чекбоксе).
 */
export function buildTypicalWorkFactorCoeffResolver(params: {
	paramCoefficients: Record<string, number>;
	anyOfParams: readonly TypicalWorkAnyOfLaborParamLike[];
	source: Record<string, unknown>;
}): (paramCode: string) => number {
	return (paramCode: string) => {
		if (Object.hasOwn(params.paramCoefficients, paramCode)) {
			return params.paramCoefficients[paramCode]!;
		}
		const header = params.anyOfParams.find(
			(row) => row.paramCode === paramCode,
		);
		if (header) {
			return resolveLaborAnyOfCoefficient(
				params.source,
				header.paramCode,
				header.anyOf,
				header.paramName ?? null,
			);
		}
		return 1;
	};
}
