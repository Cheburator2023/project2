"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractFormulaRegistryLinks = extractFormulaRegistryLinks;
exports.assessFormulaRegistryLinks = assessFormulaRegistryLinks;
exports.formatFormulaRegistryParamLabel = formatFormulaRegistryParamLabel;
const v2_work_formula_util_1 = require("./v2-work-formula.util");
function extractFormulaRegistryLinks(tokens) {
    const paramRefs = [];
    const workRefs = [];
    const seenParams = new Set();
    const seenAssignments = new Set();
    let hasInvalidRefs = false;
    for (const token of tokens) {
        if (token.kind === "param_coeff" || token.kind === "param_anyof") {
            const key = `${token.kind}:${token.paramCode}`;
            if (seenParams.has(key))
                continue;
            seenParams.add(key);
            if (token.invalid)
                hasInvalidRefs = true;
            paramRefs.push({
                paramCode: token.paramCode,
                paramName: token.paramName ?? null,
                kind: token.kind,
                invalid: token.invalid,
            });
            continue;
        }
        if (token.kind === "work_ref") {
            if (seenAssignments.has(token.assignmentId))
                continue;
            seenAssignments.add(token.assignmentId);
            if (token.invalid)
                hasInvalidRefs = true;
            workRefs.push({
                assignmentId: token.assignmentId,
                workName: token.workName ?? null,
                invalid: token.invalid,
            });
        }
    }
    return { paramRefs, workRefs, hasInvalidRefs };
}
/** Оценивает ссылки формулы по фактическому наличию параметров/назначений, а не устаревшему token.invalid. */
function assessFormulaRegistryLinks(tokens, options = {}) {
    const { laborParams, knownAssignmentIds } = options;
    const paramRefs = [];
    const workRefs = [];
    const seenParams = new Set();
    const seenAssignments = new Set();
    let hasInvalidRefs = false;
    for (const token of tokens) {
        if (token.kind === "param_coeff" || token.kind === "param_anyof") {
            const key = `${token.kind}:${token.paramCode}`;
            if (seenParams.has(key))
                continue;
            seenParams.add(key);
            let invalid = token.invalid === true;
            if (laborParams !== undefined) {
                invalid =
                    laborParams.length > 0
                        ? !(0, v2_work_formula_util_1.isWorkFormulaLaborParamKnown)(token, laborParams)
                        : true;
            }
            if (invalid)
                hasInvalidRefs = true;
            paramRefs.push({
                paramCode: token.paramCode,
                paramName: token.paramName ?? null,
                kind: token.kind,
                ...(invalid ? { invalid: true } : {}),
            });
            continue;
        }
        if (token.kind === "work_ref") {
            if (seenAssignments.has(token.assignmentId))
                continue;
            seenAssignments.add(token.assignmentId);
            let invalid = token.invalid === true;
            if (knownAssignmentIds !== undefined) {
                invalid = !knownAssignmentIds.has(token.assignmentId);
            }
            if (invalid)
                hasInvalidRefs = true;
            workRefs.push({
                assignmentId: token.assignmentId,
                workName: token.workName ?? null,
                ...(invalid ? { invalid: true } : {}),
            });
        }
    }
    return { paramRefs, workRefs, hasInvalidRefs };
}
function formatFormulaRegistryParamLabel(paramCode, paramName) {
    const code = paramCode.trim();
    const name = paramName?.trim();
    if (name && name !== code)
        return `${name} (${code})`;
    return name || code;
}
