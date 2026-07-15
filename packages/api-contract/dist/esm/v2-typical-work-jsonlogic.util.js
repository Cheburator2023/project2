import { readTypicalWorkSourceField, typicalWorkRulesMatchSource, } from "./v2-works-catalog-match.util";
import { defaultWorkRounding, } from "./v2-typical-work.types";
import { applyWorkRounding, previewWorkFormula, tokensToText, validateWorkFormulaTokens, } from "./v2-work-formula.util";
import { resolveArchCountCoeffFromToken, } from "./v2-work-arch-count-coeff.util";
import { evaluateTermsFormula, resolveVersionConfigTokenFormula, } from "./v2-work-terms-formula.util";
const OP_SYMBOL = {
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷",
};
function tokenToJsonLogicLeaf(token) {
    switch (token.kind) {
        case "norm":
            return { var: "norm" };
        case "number":
            return token.value;
        case "param_coeff":
            if (token.invalid)
                return null;
            return { var: `coeff.${token.paramCode}` };
        case "param_anyof":
            if (token.invalid)
                return null;
            return { var: `coeff.${token.paramCode}` };
        case "work_ref":
            return null;
        case "arch_count_coeff":
            return {
                archCountCoeff: [token.archComponentKind, token.steps],
            };
        default:
            return null;
    }
}
/** Компилирует token-формулу в JsonLogic-выражение (+, −, ×, ÷, var). */
export function compileWorkFormulaTokensToJsonLogic(tokens) {
    const validation = validateWorkFormulaTokens(tokens, { allowInvalidParamRefs: true });
    if (validation)
        return null;
    const values = [];
    const opStack = [];
    const prec = (op) => (op === "+" || op === "-" ? 1 : 2);
    const applyTop = () => {
        const op = opStack.pop();
        const b = values.pop();
        const a = values.pop();
        if (!op || a === undefined || b === undefined)
            return false;
        values.push({ [op.op]: [a, b] });
        return true;
    };
    for (const token of tokens) {
        if (token.kind === "norm" ||
            token.kind === "number" ||
            token.kind === "param_coeff" ||
            token.kind === "param_anyof" ||
            token.kind === "arch_count_coeff") {
            const leaf = tokenToJsonLogicLeaf(token);
            if (leaf == null)
                return null;
            values.push(leaf);
            continue;
        }
        if (token.kind === "paren_open") {
            opStack.push({ prec: -1, op: "+" });
            continue;
        }
        if (token.kind === "paren_close") {
            while (opStack.length > 0 && opStack[opStack.length - 1]?.prec !== -1) {
                if (!applyTop())
                    return null;
            }
            if (opStack.length === 0)
                return null;
            opStack.pop();
            continue;
        }
        if (token.kind === "operator") {
            const p = prec(token.op);
            while (opStack.length > 0 &&
                opStack[opStack.length - 1]?.prec !== -1 &&
                (opStack[opStack.length - 1]?.prec ?? 0) >= p) {
                if (!applyTop())
                    return null;
            }
            opStack.push({ prec: p, op: token.op });
        }
    }
    while (opStack.length > 0) {
        if (opStack[opStack.length - 1]?.prec === -1)
            return null;
        if (!applyTop())
            return null;
    }
    return values.length === 1 ? (values[0] ?? null) : null;
}
function compileRuleToJsonLogic(rule) {
    const expected = rule.valueLabel ?? rule.valueCode ?? "";
    const field = {
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
export function compileTypicalWorkTriggerRulesToJsonLogic(rules) {
    if (rules.length === 0)
        return false;
    if (rules.length === 1) {
        const only = rules[0];
        return only ? compileRuleToJsonLogic(only) : false;
    }
    return { and: rules.map(compileRuleToJsonLogic) };
}
/** Оборачивает выражение округлением (custom op roundStep). */
export function compileTypicalWorkRoundingJsonLogic(inner, rounding) {
    if (rounding.mode === "NONE")
        return inner;
    return {
        roundStep: [inner, rounding.mode, rounding.step ?? 0.1],
    };
}
export function compileTypicalWorkCalculationLogic(input) {
    const inner = compileWorkFormulaTokensToJsonLogic(input.formula.tokens);
    if (inner == null)
        return null;
    return {
        version: 1,
        include: compileTypicalWorkTriggerRulesToJsonLogic(input.rules),
        result: compileTypicalWorkRoundingJsonLogic(inner, input.rounding),
    };
}
/** Компилирует только result для сохранения в version_config (без include). */
export function compileStoredTypicalWorkResultLogic(formula, rounding) {
    const inner = compileWorkFormulaTokensToJsonLogic(formula.tokens);
    if (inner == null)
        return null;
    return {
        version: 1,
        result: compileTypicalWorkRoundingJsonLogic(inner, rounding),
    };
}
function readVarPath(data, path) {
    const parts = path.split(".").filter(Boolean);
    let cur = data;
    for (const part of parts) {
        if (cur == null || typeof cur !== "object" || Array.isArray(cur))
            return undefined;
        cur = cur[part];
    }
    return cur;
}
function toNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value.replace(",", "."));
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function compareValues(actual, expected, op) {
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
function resolveTypicalWorkField(data, args) {
    const paramCode = String(args[0] ?? "");
    const paramName = String(args[1] ?? "") || null;
    const source = data.source ?? data;
    return readTypicalWorkSourceField(source, paramCode, paramName);
}
function applyRoundStep(value, mode, step) {
    const num = toNumber(value);
    if (num == null)
        return null;
    return applyWorkRounding(num, {
        mode: String(mode),
        step: toNumber(step),
    });
}
/** Вычисляет подмножество JsonLogic для result/include (без внешнего движка). */
export function evaluateTypicalWorkJsonLogicValue(rule, data) {
    if (rule === null || typeof rule === "boolean" || typeof rule === "number") {
        return rule;
    }
    if (typeof rule === "string")
        return rule;
    if (Array.isArray(rule)) {
        return rule.map((item) => evaluateTypicalWorkJsonLogicValue(item, data));
    }
    const keys = Object.keys(rule);
    if (keys.length !== 1)
        return null;
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
    if (op === "archCountCoeff") {
        const kind = String(args[0] ?? "");
        const steps = (Array.isArray(args[1]) ? args[1] : []);
        const formData = data.formData ??
            data.source ??
            {};
        return resolveArchCountCoeffFromToken(formData, kind, steps);
    }
    if (op === "roundStep") {
        const [inner, mode, step] = args;
        const value = evaluateTypicalWorkJsonLogicValue(inner, data);
        return applyRoundStep(value, mode, step);
    }
    if (op === "and") {
        return args.every((arg) => Boolean(evaluateTypicalWorkJsonLogicValue(arg, data)));
    }
    const evaluated = args.map((arg) => evaluateTypicalWorkJsonLogicValue(arg, data));
    if (op === "==")
        return compareValues(evaluated[0], evaluated[1], "==");
    if (op === "!=")
        return compareValues(evaluated[0], evaluated[1], "!=");
    if (op === ">=")
        return compareValues(evaluated[0], evaluated[1], ">=");
    if (op === "<=")
        return compareValues(evaluated[0], evaluated[1], "<=");
    if (op === ">")
        return compareValues(evaluated[0], evaluated[1], ">");
    if (op === "<")
        return compareValues(evaluated[0], evaluated[1], "<");
    if (op === "+" || op === "-" || op === "*" || op === "/") {
        const left = toNumber(evaluated[0]);
        const right = toNumber(evaluated[1]);
        if (left == null || right == null)
            return null;
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
function buildJsonLogicData(ctx) {
    return {
        norm: ctx.norm,
        coeff: ctx.paramCoefficients,
        source: ctx.source ?? {},
        formData: ctx.formData ?? ctx.source ?? {},
    };
}
function expandedLabelFromJsonLogic(rule, data) {
    if (rule === null || typeof rule === "boolean" || typeof rule === "number") {
        return String(rule);
    }
    if (typeof rule === "string")
        return rule;
    if (Array.isArray(rule)) {
        return rule.map((r) => expandedLabelFromJsonLogic(r, data)).join(", ");
    }
    const keys = Object.keys(rule);
    if (keys.length !== 1)
        return "?";
    const op = keys[0] ?? "";
    const rawArgs = rule[op];
    const args = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
    if (op === "var") {
        const path = Array.isArray(rawArgs) ? String(rawArgs[0] ?? "") : String(rawArgs ?? "");
        return String(readVarPath(data, path) ?? path);
    }
    if (op === "roundStep") {
        const inner = args[0];
        const rounded = evaluateTypicalWorkJsonLogicValue(rule, data);
        return `${expandedLabelFromJsonLogic(inner, data)} → ${rounded ?? "?"}`;
    }
    if (op === "+" || op === "-" || op === "*" || op === "/") {
        const sym = OP_SYMBOL[op] ?? op;
        const parts = args.map((a) => expandedLabelFromJsonLogic(a, data));
        return `(${parts.join(` ${sym} `)})`;
    }
    return String(evaluateTypicalWorkJsonLogicValue(rule, data) ?? "?");
}
/** Вычисляет только result-часть (превью формулы в карточке). */
export function evaluateTypicalWorkResultJsonLogic(logic, ctx, formulaText) {
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
export function evaluateTypicalWorkCalculation(input) {
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
    const includedByLogic = Boolean(evaluateTypicalWorkJsonLogicValue(logic.include, data));
    if (!includedByRules || !includedByLogic) {
        return {
            included: false,
            symbolic: "",
            expanded: "",
            value: null,
            error: null,
        };
    }
    const result = evaluateTypicalWorkResultJsonLogic(logic, { norm, paramCoefficients, source }, "");
    return {
        included: true,
        ...result,
    };
}
/** Превью: JsonLogic если есть, иначе token-движок. */
export function previewTypicalWorkCalculation(logic, fallback, ctx) {
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
export function assembleTypicalWorkCalculationLogic(stored, rules, fallback) {
    if (stored?.result != null) {
        return {
            version: 1,
            include: compileTypicalWorkTriggerRulesToJsonLogic(rules),
            result: stored.result,
        };
    }
    if (!fallback)
        return null;
    return compileTypicalWorkCalculationLogic({
        formula: fallback.formula,
        rounding: fallback.rounding,
        rules,
    });
}
/** Собирает JsonLogic result из сохранённой формулы version_config. */
export function compileCalculationLogicFromVersionConfig(config) {
    const formula = resolveVersionConfigTokenFormula(config.formula, config.formulaText);
    const rounding = {
        mode: config.roundingMode ||
            defaultWorkRounding().mode,
        step: config.roundingStep == null || config.roundingStep === ""
            ? null
            : Number(config.roundingStep),
    };
    return compileStoredTypicalWorkResultLogic(formula, rounding);
}
export function needsCalculationLogicBackfill(raw) {
    return parseStoredTypicalWorkCalculationLogic(raw) === null;
}
export function parseStoredTypicalWorkCalculationLogic(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return null;
    const record = raw;
    if (record.version !== 1 || record.result == null)
        return null;
    return {
        version: 1,
        result: record.result,
    };
}
/** Итог по формуле: JsonLogic (из токенов) → token-движок → terms (упрощённая модель). */
export function computeTypicalWorkFormulaTotal(params) {
    if (params.terms.terms.some((t) => t.kind === "transitive")) {
        return evaluateTermsFormula({
            terms: params.terms.terms,
            baseNorm: params.norm,
            resolveFactorCoeff: params.resolveFactorCoeff,
        });
    }
    const tokenFormula = resolveVersionConfigTokenFormula(params.formula, params.formulaText);
    const ctx = {
        norm: params.norm,
        paramCoefficients: params.paramCoefficients,
        source: params.source,
        formData: params.formData ?? params.source,
    };
    const fallback = { formula: tokenFormula, rounding: params.rounding };
    // formulaText — источник истины для калькулятора; устаревший calculationLogic
    // (например norm-only backfill из terms v2) не должен перекрывать скобки и ±.
    const fromTokens = previewTypicalWorkCalculation(null, fallback, ctx);
    if (fromTokens.value != null)
        return fromTokens.value;
    if (params.calculationLogic) {
        const fromLogic = previewTypicalWorkCalculation(params.calculationLogic, fallback, ctx);
        if (fromLogic.value != null)
            return fromLogic.value;
    }
    return evaluateTermsFormula({
        terms: params.terms.terms,
        baseNorm: params.norm,
        resolveFactorCoeff: params.resolveFactorCoeff,
    });
}
