"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ANKETA_SHARED_SECTION_KEYS = exports.V2_ANKETA_EDIT_ONLY_OWN_STREAM_ROLE_CODES = exports.V2_ANKETA_VIEWER_ROLE_CODES = exports.V2_ANKETA_SEE_ALL_STREAM_BLOCKS_ROLE_CODES = exports.V2_ANKETA_OWN_STREAM_BLOCK_FILTER_ROLE_CODES = exports.V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES = exports.V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES = exports.V2_ANKETA_LEAD_ROLE_CODES = void 0;
exports.blockHasV2AnketaAccessRestrictions = blockHasV2AnketaAccessRestrictions;
exports.userHasV2AnketaStreamBlockFilteredRole = userHasV2AnketaStreamBlockFilteredRole;
exports.userIsV2AnketaLead = userIsV2AnketaLead;
exports.userSeesAllAnketaStreamBlocks = userSeesAllAnketaStreamBlocks;
exports.userIsRestrictedToOwnStreamBlocks = userIsRestrictedToOwnStreamBlocks;
exports.userMasksAllWorkEstimates = userMasksAllWorkEstimates;
exports.userMasksForeignWorkEstimates = userMasksForeignWorkEstimates;
exports.rolesIntersectViewerAndBlock = rolesIntersectViewerAndBlock;
exports.streamsIntersectViewerAndBlock = streamsIntersectViewerAndBlock;
exports.resolveV2AnketaBlockAccessRestrictionsForOutputPath = resolveV2AnketaBlockAccessRestrictionsForOutputPath;
exports.shouldApplyV2AnketaBlockAccessAtPath = shouldApplyV2AnketaBlockAccessAtPath;
exports.isBlockInViewerOwnStreamScope = isBlockInViewerOwnStreamScope;
exports.isBlockVisibleForUser = isBlockVisibleForUser;
exports.isV2AnketaBlockVisibleForViewer = isV2AnketaBlockVisibleForViewer;
exports.userEditsOnlyOwnStreamBlocks = userEditsOnlyOwnStreamBlocks;
exports.resolveV2AnketaViewerStreamsFromGroups = resolveV2AnketaViewerStreamsFromGroups;
exports.isSharedAnketaSectionPath = isSharedAnketaSectionPath;
exports.isV2AnketaPathEditableForViewer = isV2AnketaPathEditableForViewer;
exports.canViewerCompleteAnketaSection = canViewerCompleteAnketaSection;
exports.canViewerCompleteWholeAnketa = canViewerCompleteWholeAnketa;
exports.collectForbiddenV2AnketaWorkflowChanges = collectForbiddenV2AnketaWorkflowChanges;
exports.collectRequiredWorkflowTargetsForViewer = collectRequiredWorkflowTargetsForViewer;
exports.shouldMaskWorkEstimatesForUser = shouldMaskWorkEstimatesForUser;
exports.shouldMaskWorkEstimatesForViewerAtPath = shouldMaskWorkEstimatesForViewerAtPath;
exports.isV2AnketaFormPathVisibleForViewer = isV2AnketaFormPathVisibleForViewer;
exports.maskV2AnketaExportFormValue = maskV2AnketaExportFormValue;
const v2_anketa_section_ui_util_1 = require("./v2-anketa-section-ui.util");
const v2_anketa_workflow_util_1 = require("./v2-anketa-workflow.util");
const v2_stream_block_executor_util_1 = require("./v2-stream-block-executor.util");
const v2_stream_block_role_util_1 = require("./v2-stream-block-role.util");
const v2_user_stream_mapping_util_1 = require("./v2-user-stream-mapping.util");
exports.V2_ANKETA_LEAD_ROLE_CODES = [
    "ds_lead",
    "de_lead",
    "modelops_lead",
];
/**
 * Уровень B (§2): в чужих стримах скрывать оценки типовых/нетиповых работ.
 * Лиды + архитектор / аналитики / sarep.
 */
exports.V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES = [
    ...exports.V2_ANKETA_LEAD_ROLE_CODES,
    "architect",
    "mntranlst",
    "da",
    "sarep",
];
/** Валидатор / руководитель валидации — без оценок работ вообще. */
exports.V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES = [
    "validator",
    "validator_lead",
];
/**
 * Уровень A (§2): жёсткий фильтр **реестра** (анкеты своего стрима).
 * Вкладки в карточке не режутся — «полная детализация» (§2).
 * DS, DE, ModelOps, бизнес-партнёр стрима, аналитик качества данных стрима.
 */
exports.V2_ANKETA_OWN_STREAM_BLOCK_FILTER_ROLE_CODES = [
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
exports.V2_ANKETA_SEE_ALL_STREAM_BLOCKS_ROLE_CODES = [
    ...exports.V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES,
    ...exports.V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES,
    "mipm",
    "appadmin",
    "auditor",
    "auditor_lead",
    "auditorib",
    "saprg",
    "sacfg",
];
/** Роли доменных групп Keycloak, учитываемые в viewerAccess (кроме Permission). */
exports.V2_ANKETA_VIEWER_ROLE_CODES = [
    ...exports.V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES,
    ...exports.V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES,
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
function blockHasV2AnketaAccessRestrictions(restrictions) {
    return (restrictions.streamExecutors.length > 0 ||
        restrictions.streamBlockRoles.length > 0);
}
function userHasV2AnketaStreamBlockFilteredRole(roles) {
    return roles.some((role) => {
        const code = (0, v2_stream_block_role_util_1.normalizeStreamBlockRole)(role);
        return code != null && (0, v2_stream_block_role_util_1.isV2StreamBlockRoleCode)(code);
    });
}
function userIsV2AnketaLead(roles) {
    return roles.some((role) => exports.V2_ANKETA_LEAD_ROLE_CODES.includes(role.trim()));
}
/** Уровни B/C / лиды: все стрим-блоки карточки, без жёсткого фильтра вкладок. */
function userSeesAllAnketaStreamBlocks(roles) {
    return roles.some((role) => exports.V2_ANKETA_SEE_ALL_STREAM_BLOCKS_ROLE_CODES.includes(role.trim()));
}
/** Уровень A: фильтровать вкладки по своему стриму/роли (и нет роли B/C). */
function userIsRestrictedToOwnStreamBlocks(roles) {
    if (userSeesAllAnketaStreamBlocks(roles))
        return false;
    return roles.some((role) => exports.V2_ANKETA_OWN_STREAM_BLOCK_FILTER_ROLE_CODES.includes(role.trim()));
}
function userMasksAllWorkEstimates(roles) {
    return roles.some((role) => exports.V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES.includes(role.trim()));
}
function userMasksForeignWorkEstimates(roles) {
    return roles.some((role) => exports.V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES.includes(role.trim()));
}
function rolesIntersectViewerAndBlock(viewerRoles, blockRoles) {
    if (blockRoles.length === 0)
        return false;
    const viewerCodes = new Set(viewerRoles
        .map((role) => (0, v2_stream_block_role_util_1.normalizeStreamBlockRole)(role))
        .filter((code) => code != null));
    return blockRoles.some((code) => viewerCodes.has(code));
}
function streamsIntersectViewerAndBlock(viewerStreams, blockStreams) {
    if (blockStreams.length === 0)
        return false;
    const viewerCodes = new Set(viewerStreams
        .map((stream) => (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutor)(stream))
        .filter((code) => code != null));
    return blockStreams.some((code) => viewerCodes.has(code));
}
/** Ограничения доступа для стрим-блока / typicalWork / atypicalWork по dot-пути. */
function resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, outputPath) {
    const trimmed = outputPath.trim();
    if (!trimmed) {
        return { streamExecutors: [], streamBlockRoles: [] };
    }
    const leaf = readUiBranchAtDotPath(uiSchema, trimmed);
    const arch = (0, v2_anketa_section_ui_util_1.resolveV2AnketaArchComponent)(leaf);
    if (arch === "typicalWork" || arch === "atypicalWork") {
        return {
            streamExecutors: (0, v2_anketa_section_ui_util_1.resolveStreamExecutorForTypicalWorkOutputPath)(uiSchema, trimmed),
            streamBlockRoles: (0, v2_anketa_section_ui_util_1.resolveStreamBlockRolesForTypicalWorkOutputPath)(uiSchema, trimmed),
        };
    }
    const rootKey = trimmed.split(".")[0]?.trim() ?? "";
    const streamOptions = (0, v2_anketa_section_ui_util_1.resolveV2AnketaStreamBlockOptions)(leaf, rootKey);
    return {
        streamExecutors: streamOptions.streamExecutors,
        streamBlockRoles: streamOptions.streamBlockRoles,
    };
}
/** Нужно ли проверять доступ на этом пути (корневой streamBlock или arch work). */
function shouldApplyV2AnketaBlockAccessAtPath(uiSchema, outputPath) {
    const trimmed = outputPath.trim();
    if (!trimmed)
        return false;
    const leaf = readUiBranchAtDotPath(uiSchema, trimmed);
    const arch = (0, v2_anketa_section_ui_util_1.resolveV2AnketaArchComponent)(leaf);
    if (arch === "typicalWork" || arch === "atypicalWork")
        return true;
    const rootKey = trimmed.split(".")[0]?.trim() ?? "";
    const segments = trimmed.split(".").filter(Boolean);
    if (segments.length !== 1)
        return false;
    return (0, v2_anketa_section_ui_util_1.resolveV2AnketaStreamBlockOptions)(leaf, rootKey).streamBlock;
}
/**
 * Блок «свой» для Level A (реестр / complete / правка секции).
 * Пересечение роли или стрима с ограничениями блока.
 */
function isBlockInViewerOwnStreamScope(viewer, restrictions) {
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
function isBlockVisibleForUser(viewer, restrictions) {
    if (!blockHasV2AnketaAccessRestrictions(restrictions))
        return true;
    if (userSeesAllAnketaStreamBlocks(viewer.roles))
        return true;
    /** Level A: вкладки не режем — только реестр фильтрует анкеты. */
    if (userIsRestrictedToOwnStreamBlocks(viewer.roles))
        return true;
    return isBlockInViewerOwnStreamScope(viewer, restrictions);
}
function isV2AnketaBlockVisibleForViewer(viewer, uiSchema, outputPath, options) {
    if (options?.applyAccessRules === false || !viewer)
        return true;
    if (!shouldApplyV2AnketaBlockAccessAtPath(uiSchema, outputPath))
        return true;
    const restrictions = resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, outputPath);
    return isBlockVisibleForUser(viewer, restrictions);
}
/**
 * Представитель стрима-не участника ЖЦМ (§F-05): чужие стрим-блоки видит, но
 * редактирует и подтверждает только свой стрим; анкету целиком не завершает.
 */
exports.V2_ANKETA_EDIT_ONLY_OWN_STREAM_ROLE_CODES = ["sarep"];
/**
 * Общие разделы: правит любая роль, но подтверждает только ответственный за анкету.
 * `detailInfo` помечен стрим-блоком модельных стримов, поэтому нужен явный список.
 */
exports.V2_ANKETA_SHARED_SECTION_KEYS = [
    "generalInfo",
    "detailInfo",
];
function userEditsOnlyOwnStreamBlocks(roles) {
    return roles.some((role) => exports.V2_ANKETA_EDIT_ONLY_OWN_STREAM_ROLE_CODES.includes(role.trim()));
}
/**
 * Стримы зрителя для правил доступа к блокам.
 *
 * `resolveV2UserImplementationStreamsFromGroups` отвечает на вопрос «резать ли
 * реестр по стриму» и для `sarep` возвращает пусто — реестр ему не режется.
 * Для правил блоков нужен сам стрим: без него свой стрим-блок выглядит чужим
 * (read-only, скрытые оценки, нет кнопки завершения раздела).
 */
function resolveV2AnketaViewerStreamsFromGroups(groups) {
    const filtered = (0, v2_user_stream_mapping_util_1.resolveV2UserImplementationStreamsFromGroups)(groups);
    if (filtered.length > 0)
        return filtered;
    const roles = (0, v2_user_stream_mapping_util_1.normalizeV2UserGroups)(groups).map((group) => (0, v2_stream_block_role_util_1.normalizeStreamBlockRole)(group) ?? group.trim());
    if (!userEditsOnlyOwnStreamBlocks(roles))
        return filtered;
    return (0, v2_user_stream_mapping_util_1.resolveV2UserScopedStreamsFromGroups)(groups);
}
function isSharedAnketaSectionPath(formPath) {
    const root = formPath.trim().split(".")[0]?.trim() ?? "";
    return exports.V2_ANKETA_SHARED_SECTION_KEYS.includes(root);
}
/** Ограничения корневого стрим-блока, которому принадлежит путь формы. */
function resolveRootStreamBlockRestrictions(uiSchema, formPath) {
    const root = formPath.trim().split(".")[0]?.trim() ?? "";
    if (!root)
        return null;
    if (!shouldApplyV2AnketaBlockAccessAtPath(uiSchema, root))
        return null;
    return resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, root);
}
/**
 * Можно ли редактировать путь формы. Ограничение действует только для ролей
 * «редактирую свой стрим»; блок без привязки к стриму считается общим.
 */
function isV2AnketaPathEditableForViewer(viewer, uiSchema, formPath, options) {
    if (options?.applyAccessRules === false || !viewer)
        return true;
    if (!userEditsOnlyOwnStreamBlocks(viewer.roles))
        return true;
    if (isSharedAnketaSectionPath(formPath))
        return true;
    const restrictions = resolveRootStreamBlockRestrictions(uiSchema, formPath);
    if (!restrictions || restrictions.streamExecutors.length === 0)
        return true;
    return streamsIntersectViewerAndBlock(viewer.streams, restrictions.streamExecutors);
}
/**
 * Можно ли нажать «Завершить заполнение …» на разделе.
 * Для представителя стрима — только раздел своего стрима: общие разделы и
 * разделы без привязки к стриму подтверждает ответственный за анкету.
 */
function canViewerCompleteAnketaSection(viewer, uiSchema, sectionPath, options) {
    if (options?.applyAccessRules === false || !viewer)
        return true;
    if (!userEditsOnlyOwnStreamBlocks(viewer.roles))
        return true;
    if (isSharedAnketaSectionPath(sectionPath))
        return false;
    const restrictions = resolveRootStreamBlockRestrictions(uiSchema, sectionPath);
    if (!restrictions || restrictions.streamExecutors.length === 0)
        return false;
    return streamsIntersectViewerAndBlock(viewer.streams, restrictions.streamExecutors);
}
/** Глобальное «Завершить заполнение анкеты» недоступно представителю стрима (§4). */
function canViewerCompleteWholeAnketa(roles) {
    return !userEditsOnlyOwnStreamBlocks(roles);
}
function readSectionStatus(workflow, path) {
    return (workflow.sections[path] ??
        workflow.panelSections?.[path] ??
        "Создано");
}
/**
 * Переходы workflow, недопустимые для зрителя (§1–§4). Пустой список — нарушений нет.
 * Действует только для ролей «редактирую свой стрим»; остальным ничего не запрещает.
 */
function collectForbiddenV2AnketaWorkflowChanges(viewer, uiSchema, previous, next) {
    if (!viewer || !userEditsOnlyOwnStreamBlocks(viewer.roles))
        return [];
    const before = (0, v2_anketa_workflow_util_1.normalizeV2AnketaWorkflow)(previous);
    const after = (0, v2_anketa_workflow_util_1.normalizeV2AnketaWorkflow)(next);
    const changes = [];
    if (before.globalStatus !== after.globalStatus &&
        !canViewerCompleteWholeAnketa(viewer.roles)) {
        changes.push({ path: "workflow.globalStatus", reason: "global_complete" });
    }
    const sectionPaths = new Set([
        ...Object.keys(before.sections),
        ...Object.keys(after.sections),
        ...Object.keys(before.panelSections ?? {}),
        ...Object.keys(after.panelSections ?? {}),
    ]);
    for (const path of sectionPaths) {
        const nextStatus = readSectionStatus(after, path);
        if (readSectionStatus(before, path) === nextStatus)
            continue;
        // «В работе» ставится автоматически при первой правке — сверяем с правом на правку.
        const allowed = nextStatus === "Заполнено"
            ? canViewerCompleteAnketaSection(viewer, uiSchema, path, {
                applyAccessRules: true,
            })
            : isV2AnketaPathEditableForViewer(viewer, uiSchema, path, {
                applyAccessRules: true,
            });
        if (allowed)
            continue;
        changes.push({
            path: `workflow.${path}`,
            reason: nextStatus === "Заполнено"
                ? "foreign_section_complete"
                : "foreign_stream",
        });
    }
    return changes;
}
/**
 * Обязательные цели для «Завершить заполнение анкеты» с учётом ролевой видимости:
 * скрытые стрим-блоки не блокируют кнопку.
 */
function collectRequiredWorkflowTargetsForViewer(uiSchema, formData, viewer, options) {
    const targets = (0, v2_anketa_section_ui_util_1.collectRequiredWorkflowTargets)(uiSchema, formData);
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
function shouldMaskWorkEstimatesForUser(viewer, blockStreamExecutors) {
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
function shouldMaskWorkEstimatesForViewerAtPath(viewer, uiSchema, outputPath, options) {
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
function isV2AnketaFormPathVisibleForViewer(viewer, uiSchema, formPath, options) {
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
function maskV2AnketaExportFormValue(formPath, raw, viewer, uiSchema, options) {
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
