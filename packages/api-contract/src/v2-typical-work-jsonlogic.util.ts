import type { V2JsonLogicValue } from "./v2-template.types";
import type { TypicalWorkRuleLike } from "./v2-works-catalog-match.util";
import {
	readTypicalWorkSourceField,
	typicalWorkRulesMatchSource,
} from "./v2-works-catalog-match.util";
import type {
	V2TypicalWorkFormulaDto,
	V2TypicalWorkRoundingDto,
	V2TypicalWorkStoredCalculationLogicDto,
	V2WorkFormulaToken,
} from "./v2-typical-work.types";
import {
	applyWorkRounding,
	previewWorkFormula,
	tokensToText,
	validateWorkFormulaTokens,
} from "./v2-work-formula.util";

/** Скомпилированная расчётная логика типовой работы (F-03 → JsonLogic). */
export type V2TypicalWorkCalculationLogicDto = {
	/** v1 — схема компиляции */
	version: 1;
	/** Условия появления (логическое И). Вычисляется по `source`. */
	include: V2JsonLogicValue;
	/** Формула итога (норма, коэффициенты, округление). */
	result: V2JsonLogicValue;
};

export type TypicalWorkJsonLogicEvalContext = {
	norm: number;
	paramCoefficients: Record<string, number>;
	source?: Record<string, unknown>;
};

export type TypicalWorkCalculationEvalInput = {
	logic: V2TypicalWorkCalculationLogicDto;
	rules: TypicalWorkRuleLike[];
	source: Record<string, unknown>;
	norm: number;
	paramCoefficients: Record<string, number>;
	rounding: V2TypicalWorkRoundingDto;
};

export type TypicalWorkCalculationEvalResult = {
	included: boolean;
	symbolic: string;
	expanded: string;
	value: number | null;
	error: string | null;
};

const OP_SYMBOL: Record<string, string> = {
	"+": "+",
	"-": "−",
	"*": "×",
	"/": "÷",
};

function tokenToJsonLogicLeaf(token: V2WorkFormulaToken): V2JsonLogicValue | null {
	switch (token.kind) {
		case "norm":
			return { var: "norm" };
		case "number":
			return token.value;
		case "param_coeff":
			if (token.invalid) return null;
			return { var: `coeff.${token.paramCode}` };
		default:
			return null;
	}
}

/** Компилирует token-формулу в JsonLogic-выражение (+, −, ×, ÷, var). */
export function compileWorkFormulaTokensToJsonLogic(
	tokens: V2WorkFormulaToken[],
): V2JsonLogicValue | null {
	const validation = validateWorkFormulaTokens(tokens, { allowInvalidParamRefs: true });
	if (validation) return null;

	type Node = V2JsonLogicValue;
	const values: Node[] = [];
	const opStack: Array<{ prec: number; op: "+" | "-" | "*" | "/" }> = [];

	const prec = (op: string) => (op === "+" || op === "-" ? 1 : 2);

	const applyTop = (): boolean => {
		const op = opStack.pop();
		const b = values.pop();
		const a = values.pop();
		if (!op || a === undefined || b === undefined) return false;
		values.push({ [op.op]: [a, b] });
		return true;
	};

	for (const token of tokens) {
		if (token.kind === "norm" || token.kind === "number" || token.kind === "param_coeff") {
			const leaf = tokenToJsonLogicLeaf(token);
			if (leaf == null) return null;
			values.push(leaf);
			continue;
		}
		if (token.kind === "paren_open") {
			opStack.push({ prec: -1, op: "+" });
			continue;
		}
		if (token.kind === "paren_close") {
			while (opStack.length > 0 && opStack[opStack.length - 1]?.prec !== -1) {
				if (!applyTop()) return null;
			}
			if (opStack.length === 0) return null;
			opStack.pop();
			continue;
		}
		if (token.kind === "operator") {
			const p = prec(token.op);
			while (
				opStack.length > 0 &&
				opStack[opStack.length - 1]?.prec !== -1 &&
				(opStack[opStack.length - 1]?.prec ?? 0) >= p
			) {
				if (!applyTop()) return null;
			}
			opStack.push({ prec: p, op: token.op });
		}
	}

	while (opStack.length > 0) {
		if (opStack[opStack.length - 1]?.prec === -1) return null;
		if (!applyTop()) return null;
	}

	return values.length === 1 ? (values[0] ?? null) : null;
}

function compileRuleToJsonLogic(rule: TypicalWorkRuleLike): V2JsonLogicValue {
	const expected = rule.valueLabel ?? rule.valueCode ?? "";
	const field: V2JsonLogicValue = {
		typicalWorkField: [rule.paramCode, rule.paramName ?? ""],
	};
	switch (rule.operator) {
		case "!=":
			return { "!=": [field, expected] };
		case ">=":
			return { ">=": [field, expected] };
		case "<=":
			return { "<=": [field, expected] };
		case ">":
			return { ">": [field, expected] };
		case "<":
			return { "<": [field, expected] };
		default:
			return { "==": [field, expected] };
	}
}

/** Компилирует триггеры работы в JsonLogic (логическое И). Пустой список → false. */
export function compileTypicalWorkTriggerRulesToJsonLogic(
	rules: TypicalWorkRuleLike[],
): V2JsonLogicValue {
	if (rules.length === 0) return false;
	if (rules.length === 1) {
		const only = rules[0];
		return only ? compileRuleToJsonLogic(only) : false;
	}
	return { and: rules.map(compileRuleToJsonLogic) };
}

/** Оборачивает выражение округлением (custom op roundStep). */
export function compileTypicalWorkRoundingJsonLogic(
	inner: V2JsonLogicValue,
	rounding: V2TypicalWorkRoundingDto,
): V2JsonLogicValue {
	if (rounding.mode === "NONE") return inner;
	return {
		roundStep: [inner, rounding.mode, rounding.step ?? 0.1],
	};
}

export function compileTypicalWorkCalculationLogic(input: {
	formula: V2TypicalWorkFormulaDto;
	rounding: V2TypicalWorkRoundingDto;
	rules: TypicalWorkRuleLike[];
}): V2TypicalWorkCalculationLogicDto | null {
	const inner = compileWorkFormulaTokensToJsonLogic(input.formula.tokens);
	if (inner == null) return null;
	return {
		version: 1,
		include: compileTypicalWorkTriggerRulesToJsonLogic(input.rules),
		result: compileTypicalWorkRoundingJsonLogic(inner, input.rounding),
	};
}

/** Компилирует только result для сохранения в version_config (без include). */
export function compileStoredTypicalWorkResultLogic(
	formula: V2TypicalWorkFormulaDto,
	rounding: V2TypicalWorkRoundingDto,
): V2TypicalWorkStoredCalculationLogicDto | null {
	const inner = compileWorkFormulaTokensToJsonLogic(formula.tokens);
	if (inner == null) return null;
	return {
		version: 1,
		result: compileTypicalWorkRoundingJsonLogic(inner, rounding),
	};
}

function readVarPath(data: Record<string, unknown>, path: string): unknown {
	const parts = path.split(".").filter(Boolean);
	let cur: unknown = data;
	for (const part of parts) {
		if (cur == null || typeof cur !== "object" || Array.isArray(cur)) return undefined;
		cur = (cur as Record<string, unknown>)[part];
	}
	return cur;
}

function toNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number(value.replace(",", "."));
		return Number.isFinite(n) ? n : null;
	}
	return null;
}

function compareValues(actual: unknown, expected: unknown, op: string): boolean {
	const a = toNumber(actual);
	const e = toNumber(expected);
	if (a != null && e != null) {
		switch (op) {
			case "==":
				return a === e;
			case "!=":
				return a !== e;
			case ">=":
				return a >= e;
			case "<=":
				return a <= e;
			case ">":
				return a > e;
			case "<":
				return a < e;
		}
	}
	const actualStr = String(actual ?? "");
	const expectedStr = String(expected ?? "");
	switch (op) {
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

function resolveTypicalWorkField(
	data: Record<string, unknown>,
	args: unknown[],
): unknown {
	const paramCode = String(args[0] ?? "");
	const paramName = String(args[1] ?? "") || null;
	const source = (data.source as Record<string, unknown> | undefined) ?? data;
	return readTypicalWorkSourceField(source, paramCode, paramName);
}

function applyRoundStep(value: unknown, mode: unknown, step: unknown): number | null {
	const num = toNumber(value);
	if (num == null) return null;
	return applyWorkRounding(num, {
		mode: String(mode) as V2TypicalWorkRoundingDto["mode"],
		step: toNumber(step),
	});
}

/** Вычисляет подмножество JsonLogic для result/include (без внешнего движка). */
export function evaluateTypicalWorkJsonLogicValue(
	rule: V2JsonLogicValue,
	data: Record<string, unknown>,
): unknown {
	if (rule === null || typeof rule === "boolean" || typeof rule === "number") {
		return rule;
	}
	if (typeof rule === "string") return rule;
	if (Array.isArray(rule)) {
		return rule.map((item) => evaluateTypicalWorkJsonLogicValue(item, data));
	}

	const keys = Object.keys(rule);
	if (keys.length !== 1) return null;
	const op = keys[0] ?? "";
	const rawArgs = rule[op];
	const args = Array.isArray(rawArgs) ? rawArgs : [rawArgs];

	if (op === "var") {
		const path = Array.isArray(rawArgs)
			? String(rawArgs[0] ?? "")
			: String(rawArgs ?? "");
		return readVarPath(data, path);
	}

	if (op === "typicalWorkField") {
		return resolveTypicalWorkField(data, args);
	}

	if (op === "roundStep") {
		const [inner, mode, step] = args;
		const value = evaluateTypicalWorkJsonLogicValue(inner as V2JsonLogicValue, data);
		return applyRoundStep(value, mode, step);
	}

	if (op === "and") {
		return args.every((arg) =>
			Boolean(evaluateTypicalWorkJsonLogicValue(arg as V2JsonLogicValue, data)),
		);
	}

	const evaluated = args.map((arg) =>
		evaluateTypicalWorkJsonLogicValue(arg as V2JsonLogicValue, data),
	);

	if (op === "==") return compareValues(evaluated[0], evaluated[1], "==");
	if (op === "!=") return compareValues(evaluated[0], evaluated[1], "!=");
	if (op === ">=") return compareValues(evaluated[0], evaluated[1], ">=");
	if (op === "<=") return compareValues(evaluated[0], evaluated[1], "<=");
	if (op === ">") return compareValues(evaluated[0], evaluated[1], ">");
	if (op === "<") return compareValues(evaluated[0], evaluated[1], "<");

	if (op === "+" || op === "-" || op === "*" || op === "/") {
		const left = toNumber(evaluated[0]);
		const right = toNumber(evaluated[1]);
		if (left == null || right == null) return null;
		switch (op) {
			case "+":
				return left + right;
			case "-":
				return left - right;
			case "*":
				return left * right;
			case "/":
				return right === 0 ? null : left / right;
		}
	}

	return null;
}

function buildJsonLogicData(ctx: TypicalWorkJsonLogicEvalContext): Record<string, unknown> {
	return {
		norm: ctx.norm,
		coeff: ctx.paramCoefficients,
		source: ctx.source ?? {},
	};
}

function expandedLabelFromJsonLogic(
	rule: V2JsonLogicValue,
	data: Record<string, unknown>,
): string {
	if (rule === null || typeof rule === "boolean" || typeof rule === "number") {
		return String(rule);
	}
	if (typeof rule === "string") return rule;
	if (Array.isArray(rule)) {
		return rule.map((r) => expandedLabelFromJsonLogic(r, data)).join(", ");
	}

	const keys = Object.keys(rule);
	if (keys.length !== 1) return "?";
	const op = keys[0] ?? "";
	const rawArgs = rule[op];
	const args = Array.isArray(rawArgs) ? rawArgs : [rawArgs];

	if (op === "var") {
		const path = Array.isArray(rawArgs) ? String(rawArgs[0] ?? "") : String(rawArgs ?? "");
		return String(readVarPath(data, path) ?? path);
	}
	if (op === "roundStep") {
		const inner = args[0] as V2JsonLogicValue;
		const rounded = evaluateTypicalWorkJsonLogicValue(rule, data);
		return `${expandedLabelFromJsonLogic(inner, data)} → ${rounded ?? "?"}`;
	}
	if (op === "+" || op === "-" || op === "*" || op === "/") {
		const sym = OP_SYMBOL[op] ?? op;
		const parts = args.map((a) => expandedLabelFromJsonLogic(a as V2JsonLogicValue, data));
		return `(${parts.join(` ${sym} `)})`;
	}
	return String(evaluateTypicalWorkJsonLogicValue(rule, data) ?? "?");
}

/** Вычисляет только result-часть (превью формулы в карточке). */
export function evaluateTypicalWorkResultJsonLogic(
	logic: Pick<V2TypicalWorkCalculationLogicDto, "result">,
	ctx: TypicalWorkJsonLogicEvalContext,
	formulaText: string,
): Omit<TypicalWorkCalculationEvalResult, "included"> {
	const data = buildJsonLogicData(ctx);
	const raw = evaluateTypicalWorkJsonLogicValue(logic.result, data);
	const value = toNumber(raw);
	if (value == null) {
		return {
			symbolic: formulaText,
			expanded: expandedLabelFromJsonLogic(logic.result, data),
			value: null,
			error: "Не удалось вычислить формулу",
		};
	}
	return {
		symbolic: formulaText,
		expanded: expandedLabelFromJsonLogic(logic.result, data),
		value,
		error: null,
	};
}

/** Полный расчёт для runtime: триггеры + формула. */
export function evaluateTypicalWorkCalculation(
	input: TypicalWorkCalculationEvalInput,
): TypicalWorkCalculationEvalResult {
	const { logic, rules, source, norm, paramCoefficients } = input;
	const data = buildJsonLogicData({ norm, paramCoefficients, source });

	if (rules.length === 0) {
		return {
			included: false,
			symbolic: "",
			expanded: "",
			value: null,
			error: null,
		};
	}

	const includedByRules = typicalWorkRulesMatchSource(rules, source);
	const includedByLogic = Boolean(
		evaluateTypicalWorkJsonLogicValue(logic.include, data),
	);
	if (!includedByRules || !includedByLogic) {
		return {
			included: false,
			symbolic: "",
			expanded: "",
			value: null,
			error: null,
		};
	}

	const result = evaluateTypicalWorkResultJsonLogic(
		logic,
		{ norm, paramCoefficients, source },
		"",
	);
	return {
		included: true,
		...result,
	};
}

/** Превью: JsonLogic если есть, иначе token-движок. */
export function previewTypicalWorkCalculation(
	logic: V2TypicalWorkStoredCalculationLogicDto | null | undefined,
	fallback: {
		formula: V2TypicalWorkFormulaDto;
		rounding: V2TypicalWorkRoundingDto;
	},
	ctx: TypicalWorkJsonLogicEvalContext,
): Omit<TypicalWorkCalculationEvalResult, "included"> {
	const formulaText = fallback.formula.text || tokensToText(fallback.formula.tokens);
	if (logic) {
		return evaluateTypicalWorkResultJsonLogic(logic, ctx, formulaText);
	}

	const legacy = previewWorkFormula(fallback.formula, fallback.rounding, ctx);
	return {
		symbolic: legacy.symbolic,
		expanded: legacy.expanded,
		value: legacy.value,
		error: legacy.error,
	};
}

/** Собирает полную логику из сохранённого result и актуальных триггеров. */
export function assembleTypicalWorkCalculationLogic(
	stored: Pick<V2TypicalWorkCalculationLogicDto, "result"> | null | undefined,
	rules: TypicalWorkRuleLike[],
	fallback?: {
		formula: V2TypicalWorkFormulaDto;
		rounding: V2TypicalWorkRoundingDto;
	},
): V2TypicalWorkCalculationLogicDto | null {
	if (stored?.result != null) {
		return {
			version: 1,
			include: compileTypicalWorkTriggerRulesToJsonLogic(rules),
			result: stored.result,
		};
	}
	if (!fallback) return null;
	return compileTypicalWorkCalculationLogic({
		formula: fallback.formula,
		rounding: fallback.rounding,
		rules,
	});
}

export function parseStoredTypicalWorkCalculationLogic(
	raw: unknown,
): V2TypicalWorkStoredCalculationLogicDto | null {
	if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
	const record = raw as Record<string, unknown>;
	if (record.version !== 1 || record.result == null) return null;
	return {
		version: 1,
		result: record.result as V2JsonLogicValue,
	};
}
