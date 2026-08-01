import { type V2AnketaRequiredWorkflowTarget } from "./v2-anketa-workflow.util";
import { type V2StreamBlockExecutor } from "./v2-stream-block-executor.util";
import { type V2StreamBlockRoleCode } from "./v2-stream-block-role.util";
import type { V2ImplementationStreamCode } from "./v2-implementation-streams.util";
export declare const V2_ANKETA_LEAD_ROLE_CODES: readonly ["ds_lead", "de_lead", "modelops_lead"];
export type V2AnketaLeadRoleCode = (typeof V2_ANKETA_LEAD_ROLE_CODES)[number];
/**
 * Уровень B (§2): в чужих стримах скрывать оценки типовых/нетиповых работ.
 * Лиды + архитектор / аналитики / sarep.
 */
export declare const V2_ANKETA_MASK_FOREIGN_ESTIMATES_ROLE_CODES: readonly ["ds_lead", "de_lead", "modelops_lead", "architect", "mntranlst", "da", "sarep"];
/** Валидатор / руководитель валидации — без оценок работ вообще. */
export declare const V2_ANKETA_MASK_ALL_ESTIMATES_ROLE_CODES: readonly ["validator", "validator_lead"];
/**
 * Уровень A (§2): жёсткий фильтр **реестра** (анкеты своего стрима).
 * Вкладки в карточке не режутся — «полная детализация» (§2).
 * DS, DE, ModelOps, бизнес-партнёр стрима, аналитик качества данных стрима.
 */
export declare const V2_ANKETA_OWN_STREAM_BLOCK_FILTER_ROLE_CODES: readonly ["ds", "de", "modelops", "da_stream", "mipm_stream", "data_expert"];
/**
 * Уровни B+C (§2): все стрим-вкладки видны (как у лида).
 * B — с маскировкой чужих оценок; C — полная детализация.
 */
export declare const V2_ANKETA_SEE_ALL_STREAM_BLOCKS_ROLE_CODES: readonly ["ds_lead", "de_lead", "modelops_lead", "architect", "mntranlst", "da", "sarep", "validator", "validator_lead", "mipm", "appadmin", "auditor", "auditor_lead", "auditorib", "saprg", "sacfg"];
/** Роли доменных групп Keycloak, учитываемые в viewerAccess (кроме Permission). */
export declare const V2_ANKETA_VIEWER_ROLE_CODES: readonly ["ds_lead", "de_lead", "modelops_lead", "architect", "mntranlst", "da", "sarep", "validator", "validator_lead", "ds", "de", "modelops", "mipm", "mipm_stream", "da_stream", "data_expert", "saprg", "sacfg", "appadmin", "admin_it", "admin_it_lead", "business_customer", "auditor", "auditor_lead", "auditorib", "prjtoffice", "project_office"];
export type V2AnketaViewerAccessContext = {
    roles: readonly string[];
    streams: readonly V2StreamBlockExecutor[];
};
export type V2AnketaBlockAccessRestrictions = {
    streamExecutors: V2StreamBlockExecutor[];
    streamBlockRoles: V2StreamBlockRoleCode[];
};
export declare function blockHasV2AnketaAccessRestrictions(restrictions: V2AnketaBlockAccessRestrictions): boolean;
export declare function userHasV2AnketaStreamBlockFilteredRole(roles: readonly string[]): boolean;
export declare function userIsV2AnketaLead(roles: readonly string[]): boolean;
/** Уровни B/C / лиды: все стрим-блоки карточки, без жёсткого фильтра вкладок. */
export declare function userSeesAllAnketaStreamBlocks(roles: readonly string[]): boolean;
/** Уровень A: фильтровать вкладки по своему стриму/роли (и нет роли B/C). */
export declare function userIsRestrictedToOwnStreamBlocks(roles: readonly string[]): boolean;
export declare function userMasksAllWorkEstimates(roles: readonly string[]): boolean;
export declare function userMasksForeignWorkEstimates(roles: readonly string[]): boolean;
export declare function rolesIntersectViewerAndBlock(viewerRoles: readonly string[], blockRoles: readonly V2StreamBlockRoleCode[]): boolean;
export declare function streamsIntersectViewerAndBlock(viewerStreams: readonly string[], blockStreams: readonly V2StreamBlockExecutor[]): boolean;
/** Ограничения доступа для стрим-блока / typicalWork / atypicalWork по dot-пути. */
export declare function resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema: unknown, outputPath: string): V2AnketaBlockAccessRestrictions;
/** Нужно ли проверять доступ на этом пути (корневой streamBlock или arch work). */
export declare function shouldApplyV2AnketaBlockAccessAtPath(uiSchema: unknown, outputPath: string): boolean;
/**
 * Блок «свой» для Level A (реестр / complete / правка секции).
 * Пересечение роли или стрима с ограничениями блока.
 */
export declare function isBlockInViewerOwnStreamScope(viewer: V2AnketaViewerAccessContext, restrictions: V2AnketaBlockAccessRestrictions): boolean;
/**
 * Видимость вкладки в карточке.
 * F-05 §2: Level A — жёсткий фильтр на **реестр/чужие анкеты**, а в доступной
 * карточке — «полная детализация» (все стрим-блоки видны). Маскировка оценок
 * для Level B — отдельно (`shouldMaskWorkEstimatesForUser`).
 */
export declare function isBlockVisibleForUser(viewer: V2AnketaViewerAccessContext, restrictions: V2AnketaBlockAccessRestrictions): boolean;
export declare function isV2AnketaBlockVisibleForViewer(viewer: V2AnketaViewerAccessContext | undefined, uiSchema: unknown, outputPath: string, options?: {
    applyAccessRules?: boolean;
}): boolean;
/**
 * Представитель стрима-не участника ЖЦМ (§F-05): чужие стрим-блоки видит, но
 * редактирует и подтверждает только свой стрим; анкету целиком не завершает.
 */
export declare const V2_ANKETA_EDIT_ONLY_OWN_STREAM_ROLE_CODES: readonly ["sarep"];
/**
 * Общие разделы: правит любая роль, но подтверждает только ответственный за анкету.
 * `detailInfo` помечен стрим-блоком модельных стримов, поэтому нужен явный список.
 */
export declare const V2_ANKETA_SHARED_SECTION_KEYS: readonly ["generalInfo", "detailInfo"];
export declare function userEditsOnlyOwnStreamBlocks(roles: readonly string[]): boolean;
/**
 * Стримы зрителя для правил доступа к блокам.
 *
 * `resolveV2UserImplementationStreamsFromGroups` отвечает на вопрос «резать ли
 * реестр по стриму» и для `sarep` возвращает пусто — реестр ему не режется.
 * Для правил блоков нужен сам стрим: без него свой стрим-блок выглядит чужим
 * (read-only, скрытые оценки, нет кнопки завершения раздела).
 */
export declare function resolveV2AnketaViewerStreamsFromGroups(groups: readonly string[]): V2ImplementationStreamCode[];
export declare function isSharedAnketaSectionPath(formPath: string): boolean;
/**
 * Можно ли редактировать путь формы. Ограничение действует только для ролей
 * «редактирую свой стрим»; блок без привязки к стриму считается общим.
 */
export declare function isV2AnketaPathEditableForViewer(viewer: V2AnketaViewerAccessContext | undefined, uiSchema: unknown, formPath: string, options?: {
    applyAccessRules?: boolean;
}): boolean;
/**
 * Можно ли нажать «Завершить заполнение …» на разделе.
 * Для представителя стрима — только раздел своего стрима: общие разделы и
 * разделы без привязки к стриму подтверждает ответственный за анкету.
 */
export declare function canViewerCompleteAnketaSection(viewer: V2AnketaViewerAccessContext | undefined, uiSchema: unknown, sectionPath: string, options?: {
    applyAccessRules?: boolean;
}): boolean;
/** Глобальное «Завершить заполнение анкеты» недоступно представителю стрима (§4). */
export declare function canViewerCompleteWholeAnketa(roles: readonly string[]): boolean;
export type V2AnketaForbiddenChange = {
    /** Путь в formData вида `workflow.<раздел>`. */
    path: string;
    reason: "foreign_stream" | "foreign_section_complete" | "global_complete";
};
/**
 * Переходы workflow, недопустимые для зрителя (§1–§4). Пустой список — нарушений нет.
 * Действует только для ролей «редактирую свой стрим»; остальным ничего не запрещает.
 */
export declare function collectForbiddenV2AnketaWorkflowChanges(viewer: V2AnketaViewerAccessContext | undefined, uiSchema: unknown, previous: unknown, next: unknown): V2AnketaForbiddenChange[];
/**
 * Обязательные цели для «Завершить заполнение анкеты» с учётом ролевой видимости:
 * скрытые стрим-блоки не блокируют кнопку.
 */
export declare function collectRequiredWorkflowTargetsForViewer(uiSchema: unknown, formData: Record<string, unknown> | null | undefined, viewer: V2AnketaViewerAccessContext | undefined, options?: {
    applyAccessRules?: boolean;
}): V2AnketaRequiredWorkflowTarget[];
/**
 * Маскировать оценки в блоке типовых/нетиповых работ (уровень B / валидатор).
 * Свой стрим — видно; чужой — скрыто. Без своего стрима все блоки со streamExecutor — «чужие».
 */
export declare function shouldMaskWorkEstimatesForUser(viewer: V2AnketaViewerAccessContext, blockStreamExecutors: readonly V2StreamBlockExecutor[]): boolean;
export declare function shouldMaskWorkEstimatesForViewerAtPath(viewer: V2AnketaViewerAccessContext | undefined, uiSchema: unknown, outputPath: string, options?: {
    applyAccessRules?: boolean;
}): boolean;
export declare function isV2AnketaFormPathVisibleForViewer(viewer: V2AnketaViewerAccessContext | undefined, uiSchema: unknown, formPath: string, options?: {
    applyAccessRules?: boolean;
}): boolean;
/** Маскировать значение поля формы при экспорте (лиды / скрытые блоки). */
export declare function maskV2AnketaExportFormValue(formPath: string, raw: unknown, viewer: V2AnketaViewerAccessContext | undefined, uiSchema: unknown, options?: {
    applyAccessRules?: boolean;
}): unknown;
