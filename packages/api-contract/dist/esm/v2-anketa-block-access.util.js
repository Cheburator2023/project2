import { resolveStreamBlockRolesForTypicalWorkOutputPath, resolveStreamExecutorForTypicalWorkOutputPath, resolveV2AnketaArchComponent, resolveV2AnketaStreamBlockOptions, collectRequiredWorkflowTargets, } from "./v2-anketa-section-ui.util";
import { normalizeStreamBlockExecutor, } from "./v2-stream-block-executor.util";
import { isV2StreamBlockRoleCode, normalizeStreamBlockRole, } from "./v2-stream-block-role.util";
export const V2_ANKETA_LEAD_ROLE_CODES = [
    "ds_lead",
    "de_lead",
    "modelops_lead",
];
/**
 * Уровень B (§2): в чужих стримах скрывать оценки типовых/нетиповых работ.
 * Лиды + архитектор / аналитики / sarep.
 */
export const V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES = [
    ...V2_ANKETA_LEAD_ROLE_CODES,
    "architect",
    "mntranlst",
    "da",
    "sarep",
];
/** Валидатор / руководитель валидации — без оценок работ вообще. */
export const V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES = [
    "validator",
    "validator_lead",
];
/**
 * Уровень A (§2): жёсткий фильтр **реестра** (анкеты своего стрима).
 * Вкладки в карточке не режутся — «полная детализация» (§2).
 * DS, DE, ModelOps, бизнес-партнёр стрима, аналитик качества данных стрима.
 */
export const V2_ANKETA_OWN_STREAM_BLOCK_FILTER_ROLE_CODES = [
    "ds",
    "de",
    "modelops",
    "da_stream",
    "mipm_stream",
    "data_expert",
];
/**
 * Уровни B+C (§2): все стрим-вкладки видны (как у лида).
 * B — с маскировкой чужих оценок; C — полная детализация.
 */
export const V2_ANKETA_SEE_ALL_STREAM_BLOCKS_ROLE_CODES = [
    ...V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES,
    ...V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES,
    "mipm",
    "appadmin",
    "auditor",
    "auditor_lead",
    "auditorib",
    "saprg",
    "sacfg",
];
/** Роли доменных групп Keycloak, учитываемые в viewerAccess (кроме Permission). */
export const V2_ANKETA_VIEWER_ROLE_CODES = [
    ...V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES,
    ...V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES,
    "ds",
    "de",
    "modelops",
    "mipm",
    "mipm_stream",
    "da_stream",
    "data_expert",
    "saprg",
    "sacfg",
    "appadmin",
    "admin_it",
    "admin_it_lead",
    "business_customer",
    "auditor",
    "auditor_lead",
    "auditorib",
    "prjtoffice",
    "project_office",
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
/** Уровни B/C / лиды: все стрим-блоки карточки, без жёсткого фильтра вкладок. */
export function userSeesAllAnketaStreamBlocks(roles) {
    return roles.some((role) => V2_ANKETA_SEE_ALL_STREAM_BLOCKS_ROLE_CODES.includes(role.trim()));
}
/** Уровень A: фильтровать вкладки по своему стриму/роли (и нет роли B/C). */
export function userIsRestrictedToOwnStreamBlocks(roles) {
    if (userSeesAllAnketaStreamBlocks(roles))
        return false;
    return roles.some((role) => V2_ANKETA_OWN_STREAM_BLOCK_FILTER_ROLE_CODES.includes(role.trim()));
}
export function userMasksAllWorkEstimates(roles) {
    return roles.some((role) => V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES.includes(role.trim()));
}
export function userMasksForeignWorkEstimates(roles) {
    return roles.some((role) => V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES.includes(role.trim()));
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
/**
 * Блок «свой» для Level A (реестр / complete / правка секции).
 * Пересечение роли или стрима с ограничениями блока.
 */
export function isBlockInViewerOwnStreamScope(viewer, restrictions) {
    if (!blockHasV2AnketaAccessRestrictions(restrictions))
        return true;
    if (userSeesAllAnketaStreamBlocks(viewer.roles))
        return true;
    if (!userIsRestrictedToOwnStreamBlocks(viewer.roles))
        return true;
    return (rolesIntersectViewerAndBlock(viewer.roles, restrictions.streamBlockRoles) ||
        streamsIntersectViewerAndBlock(viewer.streams, restrictions.streamExecutors));
}
/**
 * Видимость вкладки в карточке.
 * F-05 §2: Level A — жёсткий фильтр на **реестр/чужие анкеты**, а в доступной
 * карточке — «полная детализация» (все стрим-блоки видны). Маскировка оценок
 * для Level B — отдельно (`shouldMaskWorkEstimatesForUser`).
 */
export function isBlockVisibleForUser(viewer, restrictions) {
    if (!blockHasV2AnketaAccessRestrictions(restrictions))
        return true;
    if (userSeesAllAnketaStreamBlocks(viewer.roles))
        return true;
    /** Level A: вкладки не режем — только реестр фильтрует анкеты. */
    if (userIsRestrictedToOwnStreamBlocks(viewer.roles))
        return true;
    return isBlockInViewerOwnStreamScope(viewer, restrictions);
}
export function isV2AnketaBlockVisibleForViewer(viewer, uiSchema, outputPath, options) {
    if (options?.applyAccessRules === false || !viewer)
        return true;
    if (!shouldApplyV2AnketaBlockAccessAtPath(uiSchema, outputPath))
        return true;
    const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, outputPath);
    return isBlockVisibleForUser(viewer, restrictions);
}
/**
 * Обязательные цели для «Завершить заполнение анкеты» с учётом ролевой видимости:
 * скрытые стрим-блоки не блокируют кнопку.
 */
export function collectRequiredWorkflowTargetsForViewer(uiSchema, formData, viewer, options) {
    const targets = collectRequiredWorkflowTargets(uiSchema, formData);
    if (options?.applyAccessRules === false || !viewer)
        return targets;
    return targets.filter((target) => {
        const path = target.kind === "main" ? target.sectionId : target.pathKey;
        if (options?.applyAccessRules === false)
            return true;
        if (!shouldApplyV2AnketaBlockAccessAtPath(uiSchema, path))
            return true;
        const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, path);
        /** Complete: Level A обязан только по «своим» блокам, даже если вкладки видны. */
        return isBlockInViewerOwnStreamScope(viewer, restrictions);
    });
}
/**
 * Маскировать оценки в блоке типовых/нетиповых работ (уровень B / валидатор).
 * Свой стрим — видно; чужой — скрыто. Без своего стрима все блоки со streamExecutor — «чужие».
 */
export function shouldMaskWorkEstimatesForUser(viewer, blockStreamExecutors) {
    if (userMasksAllWorkEstimates(viewer.roles))
        return true;
    if (!userMasksForeignWorkEstimates(viewer.roles))
        return false;
    if (blockStreamExecutors.length === 0)
        return false;
    if (viewer.streams.length === 0)
        return true;
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
