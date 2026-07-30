"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerParamTokenToRule = triggerParamTokenToRule;
exports.describeTriggerFormulaToken = describeTriggerFormulaToken;
exports.triggerFormulaTokensToText = triggerFormulaTokensToText;
exports.describeTypicalWorkSimpleTriggerRule = describeTypicalWorkSimpleTriggerRule;
exports.describeTypicalWorkTriggerConditions = describeTypicalWorkTriggerConditions;
exports.validateTriggerFormulaTokens = validateTriggerFormulaTokens;
exports.compileTriggerFormulaTokensToJsonLogic = compileTriggerFormulaTokensToJsonLogic;
exports.evaluateTriggerFormula = evaluateTriggerFormula;
exports.isTriggerFormulaConfigured = isTriggerFormulaConfigured;
exports.createDefaultTriggerParamToken = createDefaultTriggerParamToken;
exports.matchTypicalWorkTriggers = matchTypicalWorkTriggers;
exports.hasTypicalWorkTriggersConfigured = hasTypicalWorkTriggersConfigured;
const v2_work_arch_count_coeff_util_1 = require("./v2-work-arch-count-coeff.util");
const v2_works_catalog_match_util_1 = require("./v2-works-catalog-match.util");
const v2_work_param_source_keys_util_1 = require("./v2-work-param-source-keys.util");
const v2_typical_works_util_1 = require("./v2-typical-works.util");
const LOGIC_LABEL = {
    and: "И",
    or: "ИЛИ",
};
function triggerParamTokenToRule(token) {
    return {
        paramCode: token.paramCode,
        paramName: token.paramName ?? null,
        operator: token.operator,
        valueCode: token.valueCode ?? null,
        valueLabel: token.valueLabel ?? null,
        values: token.values,
    };
}
function describeTriggerFormulaToken(token) {
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
function triggerFormulaTokensToText(tokens) {
    return tokens.map(describeTriggerFormulaToken).join(" ");
}
function describeTriggerRuleOperator(operator) {
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
function describeTypicalWorkSimpleTriggerRule(rule) {
    const normalized = (0, v2_works_catalog_match_util_1.normalizeTypicalWorkTriggerRuleForMatch)(rule);
    if ((0, v2_works_catalog_match_util_1.isAlwaysShownTriggerParam)(normalized.paramCode, normalized.paramName)) {
        return v2_works_catalog_match_util_1.V2_TYPICAL_WORK_ALWAYS_TRIGGER_PARAM_NAME;
    }
    const label = (0, v2_work_param_source_keys_util_1.stripParamNameSourceKeys)(normalized.paramName ?? "") || normalized.paramCode;
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
    if (normalized.valueCode == null &&
        normalized.valueLabel == null &&
        !normalized.values?.length) {
        return `${label} ≠ пусто`;
    }
    const value = normalized.valueLabel ?? normalized.valueCode ?? "";
    return value ? `${label} ${describeTriggerRuleOperator(op)} ${value}` : label;
}
/** Формула условий появления работы для UI (simple или formula mode). */
function describeTypicalWorkTriggerConditions(input) {
    if (input.mode === "formula") {
        const text = input.triggerFormula?.text?.trim() ||
            triggerFormulaTokensToText(input.triggerFormula?.tokens ?? []);
        return text || null;
    }
    const paramParts = input.rules.map(describeTypicalWorkSimpleTriggerRule);
    if (paramParts.length === 0 && !(0, v2_work_arch_count_coeff_util_1.isTriggerArchCountConfigured)(input.triggerArchCount)) {
        return null;
    }
    const paramExpr = paramParts.length > 1 ? paramParts.map((part) => `(${part})`).join(" И ") : paramParts[0];
    if (!(0, v2_work_arch_count_coeff_util_1.isTriggerArchCountConfigured)(input.triggerArchCount) || !input.triggerArchCount?.kind) {
        return paramExpr ?? null;
    }
    const archExpr = (0, v2_work_arch_count_coeff_util_1.formatTriggerArchCountConditionLabel)(input.triggerArchCount.kind, input.triggerArchCount.steps ?? []);
    if (!paramExpr)
        return archExpr;
    const combinator = input.triggerArchCount.combinator === "or" ? " ИЛИ " : " И ";
    return `${paramExpr}${combinator}${archExpr}`;
}
function validateTriggerFormulaTokens(tokens) {
    if (tokens.length === 0)
        return null;
    let balance = 0;
    let expectOperand = true;
    for (let idx = 0; idx < tokens.length; idx++) {
        const token = tokens[idx];
        if (!token)
            continue;
        if (token.kind === "paren_open") {
            if (!expectOperand) {
                return "Перед «(» ожидался логический оператор И/ИЛИ";
            }
            balance++;
            expectOperand = true;
            continue;
        }
        if (token.kind === "paren_close") {
            if (expectOperand)
                return "Проверьте скобки в формуле триггеров";
            balance--;
            if (balance < 0)
                return "Проверьте скобки в формуле триггеров";
            expectOperand = false;
            continue;
        }
        if (token.kind === "logic") {
            if (expectOperand)
                return "Лишний логический оператор — ожидался операнд";
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
    if (balance !== 0)
        return "Проверьте скобки в формуле триггеров";
    if (expectOperand)
        return "Формула не может заканчиваться оператором";
    return null;
}
function compileTriggerParamToJsonLogic(token) {
    const rule = triggerParamTokenToRule(token);
    const field = {
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
        const combined = matches.length === 0
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
function compileTriggerOperandToJsonLogic(token) {
    if (token.kind === "param")
        return compileTriggerParamToJsonLogic(token);
    if (token.kind === "arch_count") {
        return {
            archCountTrigger: [token.archComponentKind, token.steps],
        };
    }
    return null;
}
/** Компилирует формулу триггеров в JsonLogic (И/ИЛИ, скобки). */
function compileTriggerFormulaTokensToJsonLogic(tokens) {
    if (tokens.length === 0)
        return false;
    const values = [];
    const opStack = [];
    const prec = (op) => (op === "and" ? 2 : 1);
    const applyTop = () => {
        const op = opStack.pop();
        if (!op)
            return false;
        const right = values.pop();
        const left = values.pop();
        if (left === undefined || right === undefined)
            return false;
        values.push(op.op === "and" ? { and: [left, right] } : { or: [left, right] });
        return true;
    };
    for (const token of tokens) {
        if (token.kind === "param" || token.kind === "arch_count") {
            const leaf = compileTriggerOperandToJsonLogic(token);
            if (leaf == null)
                return false;
            values.push(leaf);
            continue;
        }
        if (token.kind === "paren_open") {
            opStack.push({ prec: -1, op: "and" });
            continue;
        }
        if (token.kind === "paren_close") {
            while (opStack.length > 0 && opStack[opStack.length - 1]?.prec !== -1) {
                if (!applyTop())
                    return false;
            }
            if (opStack.length === 0)
                return false;
            opStack.pop();
            continue;
        }
        if (token.kind === "logic") {
            const p = prec(token.op);
            while (opStack.length > 0 &&
                opStack[opStack.length - 1]?.prec !== -1 &&
                (opStack[opStack.length - 1]?.prec ?? 0) >= p) {
                if (!applyTop())
                    return false;
            }
            opStack.push({ prec: p, op: token.op });
        }
    }
    while (opStack.length > 0) {
        if (opStack[opStack.length - 1]?.prec === -1)
            return false;
        if (!applyTop())
            return false;
    }
    return values.length === 1 ? (values[0] ?? false) : false;
}
function evaluateTriggerParamToken(token, ctx) {
    const rule = triggerParamTokenToRule(token);
    const lookup = (0, v2_typical_works_util_1.buildTypicalWorkTriggerLookupSource)(ctx.source, ctx.formData);
    const enriched = (0, v2_works_catalog_match_util_1.overlayCrossComponentTriggerLookup)(lookup, ctx.source, ctx.formData, [rule.paramCode]);
    return (0, v2_works_catalog_match_util_1.matchSingleTypicalWorkRuleForTriggerFormula)(rule, enriched);
}
function evaluateTriggerOperand(token, ctx) {
    if (token.kind === "param")
        return evaluateTriggerParamToken(token, ctx);
    if (token.kind === "arch_count") {
        const formData = ctx.formData ?? ctx.source;
        return (0, v2_work_arch_count_coeff_util_1.archCountTriggerMatches)(formData, token.archComponentKind, token.steps);
    }
    return false;
}
/** Вычисляет формулу триггеров (И/ИЛИ, скобки). Пустая → false. */
function evaluateTriggerFormula(tokens, ctx) {
    if (tokens.length === 0)
        return false;
    let pos = 0;
    const parseOr = () => {
        let left = parseAnd();
        while (true) {
            const token = tokens[pos];
            if (token?.kind !== "logic" || token.op !== "or")
                break;
            pos++;
            // Всегда парсим правый операнд: short-circuit `||` сдвигает pos
            // и ломает скобки (пример: (Да OR тип) при true слева → false).
            const right = parseAnd();
            left = left || right;
        }
        return left;
    };
    const parseAnd = () => {
        let left = parsePrimary();
        while (true) {
            const token = tokens[pos];
            if (token?.kind !== "logic" || token.op !== "and")
                break;
            pos++;
            const right = parsePrimary();
            left = left && right;
        }
        return left;
    };
    const parsePrimary = () => {
        const token = tokens[pos];
        if (token?.kind === "paren_open") {
            pos++;
            const inner = parseOr();
            if (tokens[pos]?.kind !== "paren_close")
                return false;
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
function isTriggerFormulaConfigured(formula) {
    return Boolean(formula?.tokens.some((token) => token.kind === "param" ||
        token.kind === "arch_count"));
}
function createDefaultTriggerParamToken(input) {
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
function matchTypicalWorkTriggers(input, source, formData, matchContext) {
    if (input.mode === "formula") {
        return evaluateTriggerFormula(input.triggerFormula?.tokens ?? [], {
            source,
            formData: formData ?? source,
        });
    }
    return (0, v2_works_catalog_match_util_1.typicalWorkRulesMatchSource)(input.rules, source, formData, input.triggerArchCount, matchContext);
}
function hasTypicalWorkTriggersConfigured(input) {
    if (input.mode === "formula") {
        return isTriggerFormulaConfigured(input.triggerFormula);
    }
    return (input.rules.length > 0 || (0, v2_work_arch_count_coeff_util_1.isTriggerArchCountConfigured)(input.triggerArchCount));
}
