import { resolveStreamBlockRolesForTypicalWorkOutputPath, resolveStreamExecutorForTypicalWorkOutputPath, resolveV2AnketaArchComponent, resolveV2AnketaStreamBlockOptions, } from "./v2-anketa-section-ui.util";
import { normalizeStreamBlockExecutor, } from "./v2-stream-block-executor.util";
import { isV2StreamBlockRoleCode, normalizeStreamBlockRole, } from "./v2-stream-block-role.util";
export const V2_ANKETA_LEAD_ROLE_CODES = [
    "ds_lead",
    "de_lead",
    "modelops_lead",
];
function readRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : undefined;
}
function readUiBranchAtDotPath(uiSchema, outputPath) {
    const segments = outputPath.split(".").filter(Boolean);
    let current = uiSchema;
    for (const segment of segments) {
        const obj = readRecord(current);
        if (!obj)
            return undefined;
        current = obj[segment];
    }
    return readRecord(current);
}
export function blockHasV2AnketaAccessRestrictions(restrictions) {
    return (restrictions.streamExecutors.length > 0 ||
        restrictions.streamBlockRoles.length > 0);
}
export function userHasV2AnketaStreamBlockFilteredRole(roles) {
    return roles.some((role) => {
        const code = normalizeStreamBlockRole(role);
        return code != null && isV2StreamBlockRoleCode(code);
    });
}
export function userIsV2AnketaLead(roles) {
    return roles.some((role) => V2_ANKETA_LEAD_ROLE_CODES.includes(role.trim()));
}
export function rolesIntersectViewerAndBlock(viewerRoles, blockRoles) {
    if (blockRoles.length === 0)
        return false;
    const viewerCodes = new Set(viewerRoles
        .map((role) => normalizeStreamBlockRole(role))
        .filter((code) => code != null));
    return blockRoles.some((code) => viewerCodes.has(code));
}
export function streamsIntersectViewerAndBlock(viewerStreams, blockStreams) {
    if (blockStreams.length === 0)
        return false;
    const viewerCodes = new Set(viewerStreams
        .map((stream) => normalizeStreamBlockExecutor(stream))
        .filter((code) => code != null));
    return blockStreams.some((code) => viewerCodes.has(code));
}
/** Ограничения доступа для стрим-блока / typicalWork / atypicalWork по dot-пути. */
export function resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, outputPath) {
    const trimmed = outputPath.trim();
    if (!trimmed) {
        return { streamExecutors: [], streamBlockRoles: [] };
    }
    const leaf = readUiBranchAtDotPath(uiSchema, trimmed);
    const arch = resolveV2AnketaArchComponent(leaf);
    if (arch === "typicalWork" || arch === "atypicalWork") {
        return {
            streamExecutors: resolveStreamExecutorForTypicalWorkOutputPath(uiSchema, trimmed),
            streamBlockRoles: resolveStreamBlockRolesForTypicalWorkOutputPath(uiSchema, trimmed),
        };
    }
    const rootKey = trimmed.split(".")[0]?.trim() ?? "";
    const streamOptions = resolveV2AnketaStreamBlockOptions(leaf, rootKey);
    return {
        streamExecutors: streamOptions.streamExecutors,
        streamBlockRoles: streamOptions.streamBlockRoles,
    };
}
/** Нужно ли проверять доступ на этом пути (корневой streamBlock или arch work). */
export function shouldApplyV2AnketaBlockAccessAtPath(uiSchema, outputPath) {
    const trimmed = outputPath.trim();
    if (!trimmed)
        return false;
    const leaf = readUiBranchAtDotPath(uiSchema, trimmed);
    const arch = resolveV2AnketaArchComponent(leaf);
    if (arch === "typicalWork" || arch === "atypicalWork")
        return true;
    const rootKey = trimmed.split(".")[0]?.trim() ?? "";
    const segments = trimmed.split(".").filter(Boolean);
    if (segments.length !== 1)
        return false;
    return resolveV2AnketaStreamBlockOptions(leaf, rootKey).streamBlock;
}
export function isBlockVisibleForUser(viewer, restrictions) {
    if (!blockHasV2AnketaAccessRestrictions(restrictions))
        return true;
    if (!userHasV2AnketaStreamBlockFilteredRole(viewer.roles))
        return true;
    if (userIsV2AnketaLead(viewer.roles))
        return true;
    return (rolesIntersectViewerAndBlock(viewer.roles, restrictions.streamBlockRoles) ||
        streamsIntersectViewerAndBlock(viewer.streams, restrictions.streamExecutors));
}
export function isV2AnketaBlockVisibleForViewer(viewer, uiSchema, outputPath, options) {
    if (options?.applyAccessRules === false || !viewer)
        return true;
    if (!shouldApplyV2AnketaBlockAccessAtPath(uiSchema, outputPath))
        return true;
    const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, outputPath);
    return isBlockVisibleForUser(viewer, restrictions);
}
/** Маскировать оценки в блоке типовых/нетиповых работ для лида (чужие стримы). */
export function shouldMaskWorkEstimatesForUser(viewer, blockStreamExecutors) {
    if (!userIsV2AnketaLead(viewer.roles))
        return false;
    if (blockStreamExecutors.length === 0)
        return false;
    return !blockStreamExecutors.every((code) => streamsIntersectViewerAndBlock(viewer.streams, [code]));
}
export function shouldMaskWorkEstimatesForViewerAtPath(viewer, uiSchema, outputPath, options) {
    if (options?.applyAccessRules === false || !viewer)
        return false;
    const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, outputPath);
    return shouldMaskWorkEstimatesForUser(viewer, restrictions.streamExecutors);
}
const ESTIMATE_FIELD_SUFFIXES = [
    ".estimateHoursPerDay",
    ".coefficient",
    ".total",
];
export function isV2AnketaFormPathVisibleForViewer(viewer, uiSchema, formPath, options) {
    if (options?.applyAccessRules === false || !viewer)
        return true;
    const dotPath = formPath.replace(/\[(\d+)\]/g, ".$1");
    const segments = dotPath.split(".").filter(Boolean);
    for (let len = segments.length; len > 0; len -= 1) {
        const candidate = segments.slice(0, len).join(".");
        if (shouldApplyV2AnketaBlockAccessAtPath(uiSchema, candidate)) {
            return isV2AnketaBlockVisibleForViewer(viewer, uiSchema, candidate, options);
        }
    }
    return true;
}
/** Маскировать значение поля формы при экспорте (лиды / скрытые блоки). */
export function maskV2AnketaExportFormValue(formPath, raw, viewer, uiSchema, options) {
    if (options?.applyAccessRules === false || !viewer)
        return raw;
    const dotPath = formPath.replace(/\[(\d+)\]/g, ".$1");
    const segments = dotPath.split(".").filter(Boolean);
    if (segments.length === 0)
        return raw;
    let accessPath = dotPath;
    for (let len = segments.length; len > 0; len -= 1) {
        const candidate = segments.slice(0, len).join(".");
        if (shouldApplyV2AnketaBlockAccessAtPath(uiSchema, candidate)) {
            accessPath = candidate;
            break;
        }
    }
    if (!isV2AnketaBlockVisibleForViewer(viewer, uiSchema, accessPath, options)) {
        return "";
    }
    const isEstimateField = ESTIMATE_FIELD_SUFFIXES.some((suffix) => dotPath.endsWith(suffix));
    if (isEstimateField &&
        shouldMaskWorkEstimatesForViewerAtPath(viewer, uiSchema, accessPath, options)) {
        return "";
    }
    return raw;
}
