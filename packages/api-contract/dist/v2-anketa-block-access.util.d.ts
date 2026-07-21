import { type V2StreamBlockExecutor } from "./v2-stream-block-executor.util";
import { type V2StreamBlockRoleCode } from "./v2-stream-block-role.util";
export declare const V2_ANKETA_LEAD_ROLE_CODES: readonly ["ds_lead", "de_lead", "modelops_lead"];
export type V2AnketaLeadRoleCode = (typeof V2_ANKETA_LEAD_ROLE_CODES)[number];
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
export declare function rolesIntersectViewerAndBlock(viewerRoles: readonly string[], blockRoles: readonly V2StreamBlockRoleCode[]): boolean;
export declare function streamsIntersectViewerAndBlock(viewerStreams: readonly string[], blockStreams: readonly V2StreamBlockExecutor[]): boolean;
/** Ограничения доступа для стрим-блока / typicalWork / atypicalWork по dot-пути. */
export declare function resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema: unknown, outputPath: string): V2AnketaBlockAccessRestrictions;
/** Нужно ли проверять доступ на этом пути (корневой streamBlock или arch work). */
export declare function shouldApplyV2AnketaBlockAccessAtPath(uiSchema: unknown, outputPath: string): boolean;
export declare function isBlockVisibleForUser(viewer: V2AnketaViewerAccessContext, restrictions: V2AnketaBlockAccessRestrictions): boolean;
export declare function isV2AnketaBlockVisibleForViewer(viewer: V2AnketaViewerAccessContext | undefined, uiSchema: unknown, outputPath: string, options?: {
    applyAccessRules?: boolean;
}): boolean;
/** Маскировать оценки в блоке типовых/нетиповых работ для лида (чужие стримы). */
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
