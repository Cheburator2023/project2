/** Стрим-исполнитель по типу системы-источника в анкете. */
export const STREAM_BY_SOURCE_TYPE: Record<string, string> = {
	Внутренний: "ИД. Внутренний",
	Внешний: "ИД. Внешний",
};

export const CONTROL_MODELS_STREAM = "Контроль моделей";

export type TypicalWorkRuleLike = {
	paramCode: string;
	paramName: string | null;
	operator: string;
	valueCode: string | null;
	valueLabel: string | null;
	values?: Array<{ code: string; label: string | null }>;
};

export function resolveStreamFromSourceType(
	source: Record<string, unknown>,
): string | null {
	const sourceType = String(source.type ?? "").trim();
	return STREAM_BY_SOURCE_TYPE[sourceType] ?? null;
}

/** Стримы, представленные в `streamDataSources.sourceSystems`. */
export function resolveStreamsFromSourceSystems(
	data: Record<string, unknown>,
): string[] {
	const systems = readDotPath(data, "streamDataSources.sourceSystems");
	if (!Array.isArray(systems) || systems.length === 0) {
		return [STREAM_BY_SOURCE_TYPE.Внутренний];
	}
	const streams = new Set<string>();
	for (const row of systems) {
		if (!row || typeof row !== "object" || Array.isArray(row)) continue;
		const stream = resolveStreamFromSourceType(row as Record<string, unknown>);
		if (stream) streams.add(stream);
	}
	return streams.size > 0 ? [...streams] : [STREAM_BY_SOURCE_TYPE.Внутренний];
}

function readDotPath(data: Record<string, unknown>, path: string): unknown {
	return path.split(".").reduce<unknown>((cur, key) => {
		if (!cur || typeof cur !== "object" || Array.isArray(cur)) return undefined;
		return (cur as Record<string, unknown>)[key];
	}, data);
}

function slugParamCode(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-zа-я0-9]+/gi, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 80);
}

/** Читает значение параметра из контекста строки/объекта анкеты. */
export function readTypicalWorkSourceField(
	source: Record<string, unknown>,
	paramCode: string,
	paramName: string | null,
): unknown {
	if (paramCode in source) return source[paramCode];
	if (paramName) {
		const slug = slugParamCode(paramName);
		if (slug in source) return source[slug];
	}
	if (
		source.type !== undefined &&
		(paramCode === "type" || paramName?.toLowerCase().includes("тип источника"))
	) {
		return source.type;
	}
	if (source.controlType !== undefined) return source.controlType;
	if (source.value !== undefined) return source.value;
	return undefined;
}

function readSourceField(
	source: Record<string, unknown>,
	paramCode: string,
	paramName: string | null,
): unknown {
	return readTypicalWorkSourceField(source, paramCode, paramName);
}

function extractControlCode(label: string): string | null {
	const bracket = label.match(/\[([A-ZА-Я0-9]+)\]/i);
	if (bracket?.[1]) return bracket[1].toUpperCase();
	const param = label.match(/Вид контроля:\s*([A-ZА-Я0-9]+)/i);
	return param?.[1]?.toUpperCase() ?? null;
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

function compareRuleValuesSet(
	actual: unknown,
	expectedCodes: string[],
	expectedLabels: string[],
	operator: string,
): boolean {
	const actualStr = String(actual ?? "");
	const matches = expectedCodes.some(
		(code, index) =>
			actualStr === code ||
			actualStr === (expectedLabels[index] ?? "") ||
			actualStr === String(expectedLabels[index] ?? ""),
	);
	return operator === "not_in" ? !matches : matches;
}

/** Все условия работы (логическое И) против контекста строки/объекта анкеты. */
export function typicalWorkRulesMatchSource(
	rules: TypicalWorkRuleLike[],
	source: Record<string, unknown>,
): boolean {
	if (rules.length === 0) return false;

	return rules.every((rule) => {
		const paramName = rule.paramName ?? rule.paramCode;
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
			return actual !== undefined && actual !== null && actual !== "";
		}
		return compareRuleValue(actual, rule.valueLabel ?? rule.valueCode, rule.operator);
	});
}

export function resolveLaborCoefficient(
	source: Record<string, unknown>,
	paramCode: string,
	valueCode: string | null,
	valueLabel: string | null,
): boolean {
	const actual = readSourceField(source, paramCode, null);
	if (valueLabel != null) {
		if (String(actual) === valueLabel) return true;
		if (typeof actual === "boolean") {
			const norm = valueLabel.trim().toLowerCase();
			if (norm === "да" && actual === true) return true;
			if (norm === "нет" && actual === false) return true;
		}
	}
	if (valueCode != null && String(actual) === valueCode) return true;
	return false;
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
): number {
	const actual = readSourceField(source, paramCode, null);
	const actualStr = String(actual ?? "");
	const matches = anyOf.valueCodes.some(
		(code, index) =>
			actualStr === code ||
			actualStr === (anyOf.valueLabels[index] ?? "") ||
			actualStr === String(anyOf.valueLabels[index] ?? ""),
	);
	return matches ? anyOf.coeffOn : anyOf.coeffOff;
}
