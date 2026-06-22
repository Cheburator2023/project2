import { v2JsonPointerToVarPath } from "./v2-logic-rule-builders.util";
import { readTypicalWorkSourceField } from "./v2-works-catalog-match.util";
export const V2_PARAM_DEPENDENCY_RULE_ID_PREFIX = "param-dep-";
function normalizePointer(pointer) {
    const t = pointer.trim();
    if (!t || t === "/")
        return "/";
    return t.startsWith("/") ? t : `/${t}`;
}
function ruleIdFor(targetParamCode, pointer) {
    const pointerSlug = pointer
        .replace(/^\//, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .slice(0, 48);
    return `${V2_PARAM_DEPENDENCY_RULE_ID_PREFIX}${targetParamCode}__${pointerSlug}`;
}
function itemsFieldInfo(pointer) {
    const parts = normalizePointer(pointer).split("/").filter(Boolean);
    const itemsIdx = parts.indexOf("items");
    if (itemsIdx < 0 || itemsIdx >= parts.length - 1)
        return null;
    return {
        arrayVar: parts.slice(0, itemsIdx).join("."),
        fieldKey: parts[parts.length - 1],
    };
}
export function isParamDependencyLogicRule(rule) {
    if (rule.id.startsWith(V2_PARAM_DEPENDENCY_RULE_ID_PREFIX))
        return true;
    const payload = rule.payload;
    return payload?.paramDependency === true;
}
export function parseParamDependencyGraphFromLogic(rules) {
    const byTarget = new Map();
    for (const rule of rules) {
        if (!isParamDependencyLogicRule(rule))
            continue;
        const payload = rule.payload;
        const targetParamCode = payload?.targetParamCode;
        const depRules = payload?.rules;
        if (typeof targetParamCode !== "string" || !Array.isArray(depRules))
            continue;
        if (byTarget.has(targetParamCode))
            continue;
        byTarget.set(targetParamCode, depRules);
    }
    return {
        targets: [...byTarget.entries()].map(([targetParamCode, depRules]) => ({
            targetParamCode,
            rules: depRules,
        })),
    };
}
function buildSingleCondition(condition, sourcePointers, targetPointer) {
    const op = condition.operator === "=" ? "==" : "!=";
    const value = condition.valueLabel.trim() || condition.valueCode;
    const sourcePointer = sourcePointers[0];
    if (!sourcePointer)
        return true;
    const targetItems = itemsFieldInfo(targetPointer);
    const sourceItems = itemsFieldInfo(sourcePointer);
    if (targetItems &&
        sourceItems &&
        targetItems.arrayVar === sourceItems.arrayVar) {
        return {
            some: [
                { var: targetItems.arrayVar },
                { [op]: [{ var: sourceItems.fieldKey }, value] },
            ],
        };
    }
    const varPath = v2JsonPointerToVarPath(sourcePointer).replace(/\.items\./g, ".0.");
    return { [op]: [{ var: varPath }, value] };
}
function buildAndCondition(rules, sourceBindings, targetPointer) {
    if (rules.length === 0)
        return true;
    if (rules.length === 1) {
        const rule = rules[0];
        const binding = sourceBindings.get(rule.sourceParamCode);
        return buildSingleCondition(rule, binding?.pointers ?? [], targetPointer);
    }
    return {
        and: rules.map((rule) => {
            const binding = sourceBindings.get(rule.sourceParamCode);
            return buildSingleCondition(rule, binding?.pointers ?? [], targetPointer);
        }),
    };
}
function bindingMap(bindings) {
    return new Map(bindings.map((b) => [b.paramCode, b]));
}
function describeDependencyRules(targetName, rules, bindings) {
    if (rules.length === 0)
        return `Параметр «${targetName}» всегда виден.`;
    const parts = rules.map((rule) => {
        const sourceName = bindings.get(rule.sourceParamCode)?.paramName ?? rule.sourceParamCode;
        const value = rule.valueLabel || rule.valueCode;
        return `«${sourceName}» ${rule.operator} «${value}»`;
    });
    return `Параметр «${targetName}» виден, когда ${parts.join(" и ")}.`;
}
export function buildParamDependencyVisibilityRules(graph, bindings) {
    const bindingByCode = bindingMap(bindings);
    const rules = [];
    for (const target of graph.targets) {
        if (target.rules.length === 0)
            continue;
        const targetBinding = bindingByCode.get(target.targetParamCode);
        const pointers = targetBinding?.pointers ?? [];
        const targetName = targetBinding?.paramName ?? target.targetParamCode;
        const description = describeDependencyRules(targetName, target.rules, bindingByCode);
        const dependencies = [
            ...new Set(target.rules.flatMap((rule) => {
                const source = bindingByCode.get(rule.sourceParamCode);
                return source?.pointers ?? [];
            })),
        ];
        if (pointers.length === 0) {
            rules.push({
                id: ruleIdFor(target.targetParamCode, "/"),
                kind: "visibility",
                targetPath: "/",
                dependencies,
                condition: buildAndCondition(target.rules, bindingByCode, "/"),
                description,
                payload: {
                    paramDependency: true,
                    targetParamCode: target.targetParamCode,
                    rules: target.rules,
                    unmapped: true,
                },
            });
            continue;
        }
        for (const pointer of pointers) {
            rules.push({
                id: ruleIdFor(target.targetParamCode, pointer),
                kind: "visibility",
                targetPath: normalizePointer(pointer),
                dependencies,
                condition: buildAndCondition(target.rules, bindingByCode, pointer),
                description,
                payload: {
                    paramDependency: true,
                    targetParamCode: target.targetParamCode,
                    rules: target.rules,
                },
            });
        }
    }
    return rules;
}
export function mergeParamDependencyRulesIntoLogic(rules, graph, bindings) {
    const preserved = rules.filter((rule) => !isParamDependencyLogicRule(rule));
    const generated = buildParamDependencyVisibilityRules(graph, bindings);
    return [...preserved, ...generated];
}
function compareDependencyValue(actual, expected, operator) {
    const actualStr = typeof actual === "boolean"
        ? actual
            ? "да"
            : "нет"
        : String(actual ?? "").trim();
    const matches = actualStr === expected ||
        slugParamCode(actualStr) === expected ||
        actualStr.toLowerCase() === expected.toLowerCase();
    return operator === "=" ? matches : !matches;
}
function slugParamCode(name) {
    return name
        .toLowerCase()
        .replace(/[^a-zа-я0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 80);
}
/** Видимость целевого параметра по правилам И в контексте одной строки/объекта. */
export function evaluateParamDependencyRulesForSource(rules, source, paramDefs) {
    if (rules.length === 0)
        return true;
    const nameByCode = new Map(paramDefs.map((p) => [p.code, p.name]));
    return rules.every((rule) => {
        const paramName = nameByCode.get(rule.sourceParamCode) ?? rule.sourceParamCode;
        const actual = readTypicalWorkSourceField(source, rule.sourceParamCode, paramName);
        const expected = rule.valueLabel.trim() || rule.valueCode;
        return compareDependencyValue(actual, expected, rule.operator);
    });
}
export function resolveHiddenParamCodesForSource(graph, source, paramDefs) {
    const hidden = new Set();
    for (const target of graph.targets) {
        if (target.rules.length === 0)
            continue;
        if (!evaluateParamDependencyRulesForSource(target.rules, source, paramDefs)) {
            hidden.add(target.targetParamCode);
        }
    }
    return hidden;
}
const PARAM_NAME_TO_SOURCE_FIELD = {
    "Сложность предметной области": "domainComplexity",
    "Объём запроса по сущностям": "entityVolume",
};
/** Ключи полей source-объекта, соответствующие скрытым paramCode. */
export function resolveHiddenSourceFieldKeys(hiddenParamCodes, paramDefs, source) {
    const keys = new Set();
    for (const code of hiddenParamCodes) {
        if (code in source)
            keys.add(code);
        const def = paramDefs.find((p) => p.code === code);
        if (!def)
            continue;
        const semantic = PARAM_NAME_TO_SOURCE_FIELD[def.name];
        if (semantic && semantic in source)
            keys.add(semantic);
        for (const key of Object.keys(source)) {
            if (key === code || key === slugParamCode(def.name))
                keys.add(key);
        }
    }
    return keys;
}
function extractWeightMapVarField(logic) {
    if (!logic || typeof logic !== "object" || Array.isArray(logic))
        return null;
    const ifCases = logic.if;
    if (!Array.isArray(ifCases))
        return null;
    for (const entry of ifCases) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
            continue;
        const eq = entry["=="];
        if (!Array.isArray(eq) || eq.length < 1)
            continue;
        const v = eq[0];
        if (v && typeof v === "object" && !Array.isArray(v) && "var" in v) {
            const name = v.var;
            if (typeof name === "string" && name.trim())
                return name.trim();
        }
    }
    return null;
}
/** Исключает множители скрытых полей из JsonLogic `*`-произведения (ФТ-024). */
export function filterCoefficientLogicForHiddenFields(logic, hiddenSourceFields) {
    if (!logic || typeof logic !== "object" || Array.isArray(logic))
        return logic;
    if ("*" in logic && Array.isArray(logic["*"])) {
        const factors = logic["*"];
        return {
            "*": factors.map((factor) => {
                const field = extractWeightMapVarField(factor);
                return field && hiddenSourceFields.has(field) ? 1 : factor;
            }),
        };
    }
    return logic;
}
/** Условие видимости поля внутри строки массива (для per-row preview). */
export function buildPerRowItemVisibilityCondition(rules, sourcePointers, targetPointer) {
    const targetItems = itemsFieldInfo(targetPointer);
    const sourcePointer = sourcePointers[0];
    const sourceItems = sourcePointer ? itemsFieldInfo(sourcePointer) : null;
    if (targetItems &&
        sourceItems &&
        targetItems.arrayVar === sourceItems.arrayVar &&
        rules.length === 1) {
        const rule = rules[0];
        const op = rule.operator === "=" ? "==" : "!=";
        const value = rule.valueLabel.trim() || rule.valueCode;
        return {
            some: [
                { var: targetItems.arrayVar },
                { [op]: [{ var: sourceItems.fieldKey }, value] },
            ],
        };
    }
    return buildAndCondition(rules, new Map(), targetPointer);
}
