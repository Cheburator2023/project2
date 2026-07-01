"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTermId = createTermId;
exports.defaultBaseNormTerm = defaultBaseNormTerm;
exports.defaultTermsFormula = defaultTermsFormula;
exports.isTermsFormulaPayload = isTermsFormulaPayload;
exports.tokensToTermsFormula = tokensToTermsFormula;
exports.normalizeStoredFormula = normalizeStoredFormula;
exports.formatTermsSummary = formatTermsSummary;
exports.validateTermsFormula = validateTermsFormula;
exports.detectTransitiveCycle = detectTransitiveCycle;
exports.computeFormulaBadge = computeFormulaBadge;
exports.evaluateTermsFormula = evaluateTermsFormula;
exports.termsToTokenFormula = termsToTokenFormula;
exports.syncTermsFromTokenFormula = syncTermsFromTokenFormula;
exports.computeFormulaBadgeFromTokens = computeFormulaBadgeFromTokens;
exports.buildTransitiveEdges = buildTransitiveEdges;
const v2_work_formula_util_1 = require("./v2-work-formula.util");
function createTermId(prefix = "term") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function defaultBaseNormTerm() {
    return {
        id: createTermId("base"),
        kind: "base_norm",
        title: "Базовый норматив работы",
        order: 0,
        factors: [],
    };
}
function defaultTermsFormula() {
    const terms = [defaultBaseNormTerm()];
    return {
        version: 2,
        terms,
        text: formatTermsSummary(terms),
    };
}
function isTermsFormulaPayload(formula) {
    return (typeof formula === "object" &&
        formula !== null &&
        formula.version === 2 &&
        Array.isArray(formula.terms));
}
function tokensToTermsFormula(formula) {
    const terms = [defaultBaseNormTerm()];
    let order = 1;
    for (const token of formula.tokens) {
        if (token.kind === "param_coeff") {
            const factor = {
                id: createTermId("factor"),
                paramCode: token.paramCode,
                paramName: token.paramName ?? null,
                order: 0,
            };
            terms.push({
                id: createTermId("mult"),
                kind: "multiplier",
                title: token.paramName ?? token.paramCode,
                order: order++,
                baseValue: 1,
                factors: [factor],
            });
        }
    }
    return {
        version: 2,
        terms,
        text: formatTermsSummary(terms),
    };
}
function normalizeStoredFormula(raw, fallbackText) {
    if (isTermsFormulaPayload(raw)) {
        return {
            version: 2,
            terms: sortTerms(raw.terms),
            text: raw.text || formatTermsSummary(raw.terms),
        };
    }
    if (Array.isArray(raw)) {
        return tokensToTermsFormula({
            tokens: raw,
            text: fallbackText ?? "H",
        });
    }
    return defaultTermsFormula();
}
function sortTerms(terms) {
    return [...terms].sort((a, b) => a.order - b.order);
}
function formatTermsSummary(terms) {
    const sorted = sortTerms(terms);
    if (sorted.length === 0)
        return "H";
    const parts = [];
    for (const term of sorted) {
        if (term.kind === "base_norm") {
            parts.push("H");
            continue;
        }
        if (term.kind === "transitive") {
            return term.sourceWorkName
                ? `→ ${term.sourceWorkName}`
                : "→ (транзитивная ссылка)";
        }
        const factorLabels = term.factors.map((f) => f.paramName ?? f.paramCode);
        const base = term.baseValue ?? 1;
        if (term.factors.length === 0) {
            parts.push(term.kind === "additive" ? `+ ${base}` : `× ${base}`);
        }
        else {
            const factorPart = factorLabels.map((f) => `P[${f}]`).join(" × ");
            parts.push(term.kind === "additive"
                ? `+ ${base} × ${factorPart}`
                : `× ${base} × ${factorPart}`);
        }
    }
    const hasTransitive = sorted.some((t) => t.kind === "transitive");
    if (hasTransitive)
        return parts.join(" ");
    const mult = parts.filter((p) => p.startsWith("×") || p === "H");
    const add = parts.filter((p) => p.startsWith("+"));
    if (mult.length === 0 && add.length === 0)
        return "H";
    if (add.length === 0)
        return mult.join(" ");
    return `${mult.join(" ")} ${add.join(" ")}`.trim();
}
function validateTermsFormula(terms) {
    const sorted = sortTerms(terms);
    const transitive = sorted.filter((t) => t.kind === "transitive");
    if (transitive.length === 1 && sorted.length === 1) {
        const term = transitive[0];
        if (!term?.sourceAssignmentId && !term?.sourceWorkId) {
            return "Укажите работу-источник для транзитивной ссылки";
        }
        return null;
    }
    const baseCount = sorted.filter((t) => t.kind === "base_norm").length;
    if (baseCount !== 1) {
        return "В формуле должен быть ровно один член «Базовый норматив работы»";
    }
    const others = sorted.filter((t) => t.kind !== "transitive" && t.kind !== "base_norm");
    if (transitive.length > 0 && others.length > 0) {
        return "Транзитивная ссылка не сочетается с другими членами формулы";
    }
    if (transitive.length > 1) {
        return "Допускается только одна транзитивная ссылка";
    }
    for (const term of transitive) {
        if (!term.sourceAssignmentId && !term.sourceWorkId) {
            return "Укажите работу-источник для транзитивной ссылки";
        }
    }
    for (const term of sorted) {
        if (term.kind === "multiplier" || term.kind === "additive") {
            if (!term.title?.trim()) {
                return "Заполните название члена формулы";
            }
            if (term.baseValue != null && term.baseValue < 0) {
                return "Базовое значение члена должно быть неотрицательным";
            }
            const seen = new Set();
            for (const factor of term.factors) {
                if (seen.has(factor.paramCode)) {
                    return "Параметр уже используется как фактор этого члена";
                }
                seen.add(factor.paramCode);
            }
        }
    }
    return null;
}
function detectTransitiveCycle(assignmentId, targetAssignmentId, edges) {
    if (!targetAssignmentId)
        return null;
    if (assignmentId === targetAssignmentId) {
        return [assignmentId];
    }
    const visited = new Set();
    let current = targetAssignmentId;
    const path = [];
    while (current) {
        if (current === assignmentId) {
            return [...path, assignmentId];
        }
        if (visited.has(current))
            break;
        visited.add(current);
        path.push(current);
        current = edges.get(current);
    }
    return null;
}
function computeFormulaBadge(terms) {
    const extra = terms.filter((t) => t.kind !== "base_norm");
    if (extra.length === 0)
        return "none";
    if (extra.some((t) => t.kind === "transitive"))
        return "transitive";
    const hasMult = extra.some((t) => t.kind === "multiplier");
    const hasAdd = extra.some((t) => t.kind === "additive");
    if (hasMult && hasAdd)
        return "mixed";
    if (hasAdd)
        return "additive";
    return "multiplier";
}
function evaluateTermsFormula(params) {
    const error = validateTermsFormula(params.terms);
    if (error)
        return null;
    const sorted = sortTerms(params.terms);
    const transitive = sorted.find((t) => t.kind === "transitive");
    if (transitive?.sourceAssignmentId && params.resolveTransitive) {
        return params.resolveTransitive(transitive.sourceAssignmentId);
    }
    let product = 1;
    let sum = 0;
    let hasMult = false;
    for (const term of sorted) {
        if (term.kind === "base_norm") {
            const coeff = term.factors.reduce((acc, f) => acc * params.resolveFactorCoeff(f.paramCode), 1);
            product *= params.baseNorm * coeff;
            hasMult = true;
            continue;
        }
        if (term.kind === "multiplier") {
            const base = term.baseValue ?? 1;
            const coeff = term.factors.reduce((acc, f) => acc * params.resolveFactorCoeff(f.paramCode), 1);
            product *= base * coeff;
            hasMult = true;
        }
        if (term.kind === "additive") {
            const base = term.baseValue ?? 1;
            const coeff = term.factors.reduce((acc, f) => acc * params.resolveFactorCoeff(f.paramCode), 1);
            sum += base * coeff;
        }
    }
    if (!hasMult)
        return null;
    return product + sum;
}
/** Конвертация terms → token-формула для JsonLogic. */
function termsToTokenFormula(termsDto) {
    const sorted = sortTerms(termsDto.terms);
    const transitive = sorted.find((t) => t.kind === "transitive");
    if (transitive?.sourceAssignmentId) {
        return {
            tokens: [
                {
                    kind: "work_ref",
                    assignmentId: transitive.sourceAssignmentId,
                    workName: transitive.sourceWorkName ?? undefined,
                },
            ],
            text: termsDto.text || formatTermsSummary(sorted),
        };
    }
    const tokens = [{ kind: "norm" }];
    const multParts = [];
    const addParts = [];
    for (const term of sorted) {
        if (term.kind === "multiplier" || term.kind === "base_norm") {
            multParts.push(term);
        }
        else if (term.kind === "additive") {
            addParts.push(term);
        }
    }
    const appendTermFactors = (term, prefixOp) => {
        if (prefixOp && tokens.length > 0) {
            tokens.push({ kind: "operator", op: prefixOp });
        }
        const base = term.baseValue ?? 1;
        if (term.kind !== "base_norm" && base !== 1) {
            if (tokens.length > 1)
                tokens.push({ kind: "operator", op: "*" });
            tokens.push({ kind: "number", value: base });
        }
        for (const [index, factor] of term.factors.entries()) {
            if (index > 0 || (term.kind !== "base_norm" && base !== 1)) {
                tokens.push({ kind: "operator", op: "*" });
            }
            else if (tokens.length > 1 && term.kind === "base_norm") {
                tokens.push({ kind: "operator", op: "*" });
            }
            tokens.push({
                kind: "param_coeff",
                paramCode: factor.paramCode,
                paramName: factor.paramName ?? undefined,
            });
        }
    };
    for (const term of multParts) {
        if (term.kind === "base_norm") {
            appendTermFactors(term);
            continue;
        }
        appendTermFactors(term, tokens.length > 1 ? "*" : undefined);
    }
    for (const [index, term] of addParts.entries()) {
        appendTermFactors(term, index === 0 && tokens.length === 1 ? "+" : "+");
    }
    return {
        tokens: tokens.length ? tokens : [{ kind: "norm" }],
        text: termsDto.text || formatTermsSummary(sorted),
    };
}
/** Синхронизация formulaTerms из token-формулы (для автосохранения). */
function syncTermsFromTokenFormula(formula) {
    if ((0, v2_work_formula_util_1.isTransitiveOnlyFormula)(formula.tokens)) {
        const ref = formula.tokens[0];
        if (ref?.kind === "work_ref") {
            const terms = [
                {
                    id: createTermId("trans"),
                    kind: "transitive",
                    title: "Транзитивная ссылка",
                    order: 0,
                    factors: [],
                    sourceAssignmentId: ref.assignmentId,
                    sourceWorkName: ref.workName ?? null,
                    sourceWorkId: null,
                },
            ];
            return {
                version: 2,
                terms,
                text: formula.text || formatTermsSummary(terms),
            };
        }
    }
    return {
        version: 2,
        terms: [defaultBaseNormTerm()],
        text: formula.text || (0, v2_work_formula_util_1.tokensToText)(formula.tokens),
    };
}
function computeFormulaBadgeFromTokens(tokens) {
    if ((0, v2_work_formula_util_1.isTransitiveOnlyFormula)(tokens))
        return "transitive";
    return computeFormulaBadge(syncTermsFromTokenFormula({ tokens, text: "" }).terms);
}
function buildTransitiveEdges(assignments) {
    const edges = new Map();
    for (const assignment of assignments) {
        const transitive = assignment.terms?.find((t) => t.kind === "transitive");
        edges.set(assignment.id, transitive?.sourceAssignmentId ?? null);
    }
    return edges;
}
