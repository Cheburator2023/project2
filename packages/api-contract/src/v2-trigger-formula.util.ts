import type { V2JsonLogicValue } from "./v2-template.types";
import type {
	V2TriggerFormulaLogicOp,
	V2TriggerFormulaToken,
	V2TypicalWorkRuleValueDto,
	V2TypicalWorkTriggerFormulaDto,
	V2TypicalWorkTriggerMode,
	V2WorkRuleOperator,
} from "./v2-typical-work.types";
import { archCountTriggerMatches, isTriggerArchCountConfigured, formatTriggerArchCountConditionLabel } from "./v2-work-arch-count-coeff.util";
import type {
	TypicalWorkRuleLike,
	TypicalWorkTriggerArchCountLike,
} from "./v2-works-catalog-match.util";
import {
	matchSingleTypicalWorkRuleForTriggerFormula,
	normalizeTypicalWorkTriggerRuleForMatch,
	typicalWorkRulesMatchSource,
} from "./v2-works-catalog-match.util";
import { stripParamNameSourceKeys } from "./v2-work-param-source-keys.util";
import type { TypicalWorkTriggerMatchContext } from "./v2-typical-works.util";

const LOGIC_LABEL: Record<V2TriggerFormulaLogicOp, string> = {
	and: "И",
	or: "ИЛИ",
};

export function triggerParamTokenToRule(
	token: Extract<V2TriggerFormulaToken, { kind: "param" }>,
): TypicalWorkRuleLike {
	return {
		paramCode: token.paramCode,
		paramName: token.paramName ?? null,
		operator: token.operator,
		valueCode: token.valueCode ?? null,
		valueLabel: token.valueLabel ?? null,
		values: token.values,
	};
}

export function describeTriggerFormulaToken(token: V2TriggerFormulaToken): string {
	switch (token.kind) {
		case "param":
			return token.paramName?.trim() || token.paramCode;
		case "arch_count":
			return `кол-во:${token.archComponentKind}`;
		case "logic":
			return LOGIC_LABEL[token.op];
		case "paren_open":
			return "(";
		case "paren_close":
			return ")";
		default:
			return "?";
	}
}

export function triggerFormulaTokensToText(
	tokens: readonly V2TriggerFormulaToken[],
): string {
	return tokens.map(describeTriggerFormulaToken).join(" ");
}

function describeTriggerRuleOperator(operator: string): string {
	switch (operator) {
		case "!=":
			return "≠";
		case "in":
			return "∈";
		case "not_in":
			return "∉";
		default:
			return operator;
	}
}

/** Человекочитаемое описание одного param-условия (simple mode). */
export function describeTypicalWorkSimpleTriggerRule(
	rule: TypicalWorkRuleLike,
): string {
	const normalized = normalizeTypicalWorkTriggerRuleForMatch(rule);
	const label =
		stripParamNameSourceKeys(normalized.paramName ?? "") || normalized.paramCode;
	const op = normalized.operator || "=";

	if (op === "in" || op === "not_in") {
		const values = normalized.values?.length
			? normalized.values
			: normalized.valueCode
				? [{ code: normalized.valueCode, label: normalized.valueLabel }]
				: [];
		const rendered = values
			.map((value) => value.label ?? value.code)
			.filter(Boolean)
			.join(", ");
		return rendered
			? `${label} ${describeTriggerRuleOperator(op)} {${rendered}}`
			: label;
	}

	if (
		normalized.valueCode == null &&
		normalized.valueLabel == null &&
		!normalized.values?.length
	) {
		return `${label} ≠ пусто`;
	}

	const value = normalized.valueLabel ?? normalized.valueCode ?? "";
	return value ? `${label} ${describeTriggerRuleOperator(op)} ${value}` : label;
}

/** Формула условий появления работы для UI (simple или formula mode). */
export function describeTypicalWorkTriggerConditions(input: {
	mode?: V2TypicalWorkTriggerMode;
	rules: TypicalWorkRuleLike[];
	triggerFormula?: V2TypicalWorkTriggerFormulaDto | null;
	triggerArchCount?: TypicalWorkTriggerArchCountLike | null;
}): string | null {
	if (input.mode === "formula") {
		const text =
			input.triggerFormula?.text?.trim() ||
			triggerFormulaTokensToText(input.triggerFormula?.tokens ?? []);
		return text || null;
	}

	const paramParts = input.rules.map(describeTypicalWorkSimpleTriggerRule);
	if (paramParts.length === 0 && !isTriggerArchCountConfigured(input.triggerArchCount)) {
		return null;
	}

	const paramExpr =
		paramParts.length > 1 ? paramParts.map((part) => `(${part})`).join(" И ") : paramParts[0];

	if (!isTriggerArchCountConfigured(input.triggerArchCount) || !input.triggerArchCount?.kind) {
		return paramExpr ?? null;
	}

	const archExpr = formatTriggerArchCountConditionLabel(
		input.triggerArchCount.kind,
		input.triggerArchCount.steps ?? [],
	);
	if (!paramExpr) return archExpr;
	const combinator = input.triggerArchCount.combinator === "or" ? " ИЛИ " : " И ";
	return `${paramExpr}${combinator}${archExpr}`;
}

export function validateTriggerFormulaTokens(
	tokens: readonly V2TriggerFormulaToken[],
): string | null {
	if (tokens.length === 0) return null;

	let balance = 0;
	let expectOperand = true;

	for (let idx = 0; idx < tokens.length; idx++) {
		const token = tokens[idx];
		if (!token) continue;

		if (token.kind === "paren_open") {
			if (!expectOperand) {
				return "Перед «(» ожидался логический оператор И/ИЛИ";
			}
			balance++;
			expectOperand = true;
			continue;
		}
		if (token.kind === "paren_close") {
			if (expectOperand) return "Проверьте скобки в формуле триггеров";
			balance--;
			if (balance < 0) return "Проверьте скобки в формуле триггеров";
			expectOperand = false;
			continue;
		}
		if (token.kind === "logic") {
			if (expectOperand) return "Лишний логический оператор — ожидался операнд";
			expectOperand = true;
			continue;
		}

		if (!expectOperand) {
			return "Между операндами нужен оператор И или ИЛИ";
		}
		if (token.kind === "arch_count" && token.steps.length === 0) {
			return "Укажите пороги для условия по количеству компонентов";
		}
		expectOperand = false;
	}

	if (balance !== 0) return "Проверьте скобки в формуле триггеров";
	if (expectOperand) return "Формула не может заканчиваться оператором";
	return null;
}

function compileTriggerParamToJsonLogic(
	token: Extract<V2TriggerFormulaToken, { kind: "param" }>,
): V2JsonLogicValue {
	const rule = triggerParamTokenToRule(token);
	const field: V2JsonLogicValue = {
		typicalWorkField: [rule.paramCode, rule.paramName ?? ""],
	};
	if (rule.operator === "in" || rule.operator === "not_in") {
		const values = rule.values?.length
			? rule.values
			: rule.valueCode
				? [{ code: rule.valueCode, label: rule.valueLabel }]
				: [];
		const matches = values.map((value) => ({
			"==": [field, value.label ?? value.code ?? ""],
		}));
		const combined =
			matches.length === 0
				? false
				: matches.length === 1
					? (matches[0] ?? false)
					: { or: matches };
		return rule.operator === "not_in" ? { "!": combined } : combined;
	}
	const expected = rule.valueLabel ?? rule.valueCode ?? "";
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

function compileTriggerOperandToJsonLogic(
	token: V2TriggerFormulaToken,
): V2JsonLogicValue | null {
	if (token.kind === "param") return compileTriggerParamToJsonLogic(token);
	if (token.kind === "arch_count") {
		return {
			archCountTrigger: [token.archComponentKind, token.steps],
		};
	}
	return null;
}

/** Компилирует формулу триггеров в JsonLogic (И/ИЛИ, скобки). */
export function compileTriggerFormulaTokensToJsonLogic(
	tokens: readonly V2TriggerFormulaToken[],
): V2JsonLogicValue {
	if (tokens.length === 0) return false;

	const values: V2JsonLogicValue[] = [];
	const opStack: Array<{ prec: number; op: V2TriggerFormulaLogicOp }> = [];

	const prec = (op: V2TriggerFormulaLogicOp) => (op === "and" ? 2 : 1);

	const applyTop = (): boolean => {
		const op = opStack.pop();
		if (!op) return false;
		const right = values.pop();
		const left = values.pop();
		if (left === undefined || right === undefined) return false;
		values.push(op.op === "and" ? { and: [left, right] } : { or: [left, right] });
		return true;
	};

	for (const token of tokens) {
		if (token.kind === "param" || token.kind === "arch_count") {
			const leaf = compileTriggerOperandToJsonLogic(token);
			if (leaf == null) return false;
			values.push(leaf);
			continue;
		}
		if (token.kind === "paren_open") {
			opStack.push({ prec: -1, op: "and" });
			continue;
		}
		if (token.kind === "paren_close") {
			while (opStack.length > 0 && opStack[opStack.length - 1]?.prec !== -1) {
				if (!applyTop()) return false;
			}
			if (opStack.length === 0) return false;
			opStack.pop();
			continue;
		}
		if (token.kind === "logic") {
			const p = prec(token.op);
			while (
				opStack.length > 0 &&
				opStack[opStack.length - 1]?.prec !== -1 &&
				(opStack[opStack.length - 1]?.prec ?? 0) >= p
			) {
				if (!applyTop()) return false;
			}
			opStack.push({ prec: p, op: token.op });
		}
	}

	while (opStack.length > 0) {
		if (opStack[opStack.length - 1]?.prec === -1) return false;
		if (!applyTop()) return false;
	}

	return values.length === 1 ? (values[0] ?? false) : false;
}

export type TriggerFormulaEvalContext = {
	source: Record<string, unknown>;
	formData?: Record<string, unknown>;
};

function evaluateTriggerParamToken(
	token: Extract<V2TriggerFormulaToken, { kind: "param" }>,
	ctx: TriggerFormulaEvalContext,
): boolean {
	return matchSingleTypicalWorkRuleForTriggerFormula(
		triggerParamTokenToRule(token),
		ctx.source,
	);
}

function evaluateTriggerOperand(
	token: V2TriggerFormulaToken,
	ctx: TriggerFormulaEvalContext,
): boolean {
	if (token.kind === "param") return evaluateTriggerParamToken(token, ctx);
	if (token.kind === "arch_count") {
		const formData = ctx.formData ?? ctx.source;
		return archCountTriggerMatches(
			formData,
			token.archComponentKind,
			token.steps,
		);
	}
	return false;
}

/** Вычисляет формулу триггеров (И/ИЛИ, скобки). Пустая → false. */
export function evaluateTriggerFormula(
	tokens: readonly V2TriggerFormulaToken[],
	ctx: TriggerFormulaEvalContext,
): boolean {
	if (tokens.length === 0) return false;

	let pos = 0;

	const parseOr = (): boolean => {
		let left = parseAnd();
		while (true) {
			const token = tokens[pos];
			if (token?.kind !== "logic" || token.op !== "or") break;
			pos++;
			left = left || parseAnd();
		}
		return left;
	};

	const parseAnd = (): boolean => {
		let left = parsePrimary();
		while (true) {
			const token = tokens[pos];
			if (token?.kind !== "logic" || token.op !== "and") break;
			pos++;
			left = left && parsePrimary();
		}
		return left;
	};

	const parsePrimary = (): boolean => {
		const token = tokens[pos];
		if (token?.kind === "paren_open") {
			pos++;
			const inner = parseOr();
			if (tokens[pos]?.kind !== "paren_close") return false;
			pos++;
			return inner;
		}
		if (!token || token.kind === "logic" || token.kind === "paren_close") {
			return false;
		}
		pos++;
		return evaluateTriggerOperand(token, ctx);
	};

	const result = parseOr();
	return pos === tokens.length ? result : false;
}

export function isTriggerFormulaConfigured(
	formula: V2TypicalWorkTriggerFormulaDto | null | undefined,
): boolean {
	return Boolean(
		formula?.tokens.some(
			(token) =>
				token.kind === "param" ||
				token.kind === "arch_count",
		),
	);
}

export function createDefaultTriggerParamToken(input: {
	paramCode: string;
	paramName: string;
	schemaFieldUid?: string | null;
	operator?: V2WorkRuleOperator;
	valueCode?: string | null;
	valueLabel?: string | null;
	values?: V2TypicalWorkRuleValueDto[];
}): V2TriggerFormulaToken {
	return {
		kind: "param",
		paramCode: input.paramCode,
		paramName: input.paramName,
		schemaFieldUid: input.schemaFieldUid ?? null,
		operator: input.operator ?? "=",
		valueCode: input.valueCode ?? null,
		valueLabel: input.valueLabel ?? null,
		values: input.values,
	};
}

export type TypicalWorkTriggerMatchInput = {
	mode?: V2TypicalWorkTriggerMode;
	rules: TypicalWorkRuleLike[];
	triggerArchCount?: TypicalWorkTriggerArchCountLike | null;
	triggerFormula?: V2TypicalWorkTriggerFormulaDto | null;
};

export function matchTypicalWorkTriggers(
	input: TypicalWorkTriggerMatchInput,
	source: Record<string, unknown>,
	formData?: Record<string, unknown>,
	matchContext?: TypicalWorkTriggerMatchContext,
): boolean {
	if (input.mode === "formula") {
		return evaluateTriggerFormula(input.triggerFormula?.tokens ?? [], {
			source,
			formData: formData ?? source,
		});
	}
	return typicalWorkRulesMatchSource(
		input.rules,
		source,
		formData,
		input.triggerArchCount,
		matchContext,
	);
}

export function hasTypicalWorkTriggersConfigured(
	input: TypicalWorkTriggerMatchInput,
): boolean {
	if (input.mode === "formula") {
		return isTriggerFormulaConfigured(input.triggerFormula);
	}
	return (
		input.rules.length > 0 || isTriggerArchCountConfigured(input.triggerArchCount)
	);
}
