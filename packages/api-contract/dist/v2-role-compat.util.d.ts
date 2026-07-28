/**
 * Совместимость ролевой модели с п-прод Keycloak:
 * - `/admin_it` (+ AD-лист sum_appadmin) как прикладной админ;
 * - nested lead-группы `/ds/ds_lead`, `/de/de_lead`, `/modelops/modelops_lead`.
 */
export type V2RoleCompatOptions = {
    /**
     * Учитывать `/admin_it` и детей как источник доменной роли `appadmin`
     * (как на п-прод: leaf `/admin_it/{stand}sum_appadmin`).
     */
    adminItAsAppadmin?: boolean;
    /**
     * Также смотреть nested lead-path (`/de/de_lead`, …) при sync/etalon
     * и подразумевать realm-permissions лида по доменной роли.
     */
    allowNestedLeadGroups?: boolean;
};
export declare const V2_NESTED_LEAD_GROUP_PATHS: readonly ["/ds/ds_lead", "/de/de_lead", "/modelops/modelops_lead"];
export declare const V2_TOP_LEVEL_LEAD_GROUP_PATHS: readonly ["/ds_lead", "/de_lead", "/modelops_lead"];
/** Realm-permissions, которые обязан иметь lead по матрице F-05. */
export declare const V2_LEAD_IMPLIED_PERMISSIONS: Record<string, readonly string[]>;
export declare const V2_APPADMIN_F05_ROLES: readonly ["anketa_view_all_calculations", "anketa_audit_view"];
/**
 * Дополняет нормализованные groups: `/admin_it…` → ещё и `appadmin`.
 */
export declare function applyV2AdminItAsAppadminGroups(userGroups: readonly string[], normalized: readonly string[]): string[];
export declare function normalizeV2UserGroupsWithCompat(userGroups: readonly string[], options?: V2RoleCompatOptions): string[];
/**
 * Nest-parents для lead AD: top-level всегда; при toggle — ещё `/ds`, `/de`, `/modelops`.
 */
export declare function resolveV2LeadNestParents(leadCanon: "/ds_lead" | "/de_lead" | "/modelops_lead", options?: V2RoleCompatOptions): readonly string[];
/**
 * Расширяет F-05 target nested lead-path’ами с теми же ролями, что top-level.
 * При `adminItAsAppadmin` явно держит `/admin_it: []` (снять лишние anketa с parent)
 * и роли appadmin на delegated leaf.
 */
export declare function buildV2KeycloakGroupRoleTargetWithCompat(baseTarget: Record<string, readonly string[]>, options?: V2RoleCompatOptions): Record<string, readonly string[]>;
export declare function expandV2KeycloakTargetsWithCompat(baseTarget: Record<string, readonly string[]>, standPrefixRaw?: string | null, options?: V2RoleCompatOptions): Record<string, readonly string[]>;
/**
 * Дополнительные realm-permissions по доменной lead-роли
 * (когда nested-группа в KK без approve/complete/delete).
 */
export declare function resolveV2ImpliedPermissionsFromGroups(userGroups: readonly string[], options?: V2RoleCompatOptions): string[];
export declare function mergeV2PermissionsWithImplied(permissions: readonly string[], userGroups: readonly string[], options?: V2RoleCompatOptions): string[];
