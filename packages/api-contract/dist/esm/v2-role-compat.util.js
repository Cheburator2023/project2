/**
 * Совместимость ролевой модели с п-прод Keycloak:
 * - `/admin_it` (+ AD-лист sum_appadmin) как прикладной админ;
 * - nested lead-группы `/ds/ds_lead`, `/de/de_lead`, `/modelops/modelops_lead`.
 */
import { expandV2KeycloakTargetsWithAdAliases, V2_AD_NEST_PARENT_BY_TARGET, } from "./v2-ad-domain-groups.util";
import { normalizeV2UserGroups } from "./v2-user-stream-mapping.util";
export const V2_NESTED_LEAD_GROUP_PATHS = [
    "/ds/ds_lead",
    "/de/de_lead",
    "/modelops/modelops_lead",
];
export const V2_TOP_LEVEL_LEAD_GROUP_PATHS = [
    "/ds_lead",
    "/de_lead",
    "/modelops_lead",
];
/** Realm-permissions, которые обязан иметь lead по матрице F-05. */
export const V2_LEAD_IMPLIED_PERMISSIONS = {
    ds_lead: [
        "anketa_view_all_calculations",
        "anketa_create_calculation",
        "anketa_edit_calculation",
        "anketa_delete_calculation",
        "anketa_export_reports",
        "anketa_workflow_approve",
        "anketa_complete_anketa",
    ],
    de_lead: [
        "anketa_view_all_calculations",
        "anketa_edit_calculation",
        "anketa_export_reports",
        "anketa_workflow_approve",
        "anketa_complete_anketa",
    ],
    modelops_lead: [
        "anketa_view_all_calculations",
        "anketa_create_calculation",
        "anketa_edit_calculation",
        "anketa_delete_calculation",
        "anketa_export_reports",
        "anketa_workflow_approve",
        "anketa_complete_anketa",
    ],
};
export const V2_APPADMIN_F05_ROLES = [
    "anketa_view_all_calculations",
    "anketa_audit_view",
];
function isAdminItPath(raw) {
    const p = raw.replace(/^\//, "").toLowerCase();
    return p === "admin_it" || p.startsWith("admin_it/");
}
/**
 * Дополняет нормализованные groups: `/admin_it…` → ещё и `appadmin`.
 */
export function applyV2AdminItAsAppadminGroups(userGroups, normalized) {
    const out = [...normalized];
    const push = (v) => {
        if (v && !out.includes(v))
            out.push(v);
    };
    for (const group of userGroups) {
        if (typeof group !== "string")
            continue;
        if (isAdminItPath(group))
            push("appadmin");
    }
    if (normalized.includes("admin_it"))
        push("appadmin");
    return out;
}
export function normalizeV2UserGroupsWithCompat(userGroups, options) {
    const base = normalizeV2UserGroups(userGroups);
    if (options?.adminItAsAppadmin) {
        return applyV2AdminItAsAppadminGroups(userGroups, base);
    }
    return base;
}
/**
 * Nest-parents для lead AD: top-level всегда; при toggle — ещё `/ds`, `/de`, `/modelops`.
 */
export function resolveV2LeadNestParents(leadCanon, options) {
    const top = V2_AD_NEST_PARENT_BY_TARGET[leadCanon] ?? [leadCanon];
    if (!options?.allowNestedLeadGroups)
        return top;
    const executorParent = leadCanon === "/ds_lead"
        ? "/ds"
        : leadCanon === "/de_lead"
            ? "/de"
            : "/modelops";
    return [...new Set([...top, executorParent, leadCanon])];
}
/**
 * Расширяет F-05 target nested lead-path’ами с теми же ролями, что top-level.
 * При `adminItAsAppadmin` явно держит `/admin_it: []` (снять лишние anketa с parent)
 * и роли appadmin на delegated leaf.
 */
export function buildV2KeycloakGroupRoleTargetWithCompat(baseTarget, options) {
    const out = {};
    for (const [path, roles] of Object.entries(baseTarget)) {
        out[path] = [...roles];
    }
    if (options?.allowNestedLeadGroups) {
        for (const nested of V2_NESTED_LEAD_GROUP_PATHS) {
            const top = nested.replace(/^\/(ds|de|modelops)\//, "/");
            const roles = out[top] ?? out[`/${top.replace(/^\//, "")}`];
            if (roles?.length) {
                out[nested] = [...roles];
            }
        }
    }
    if (options?.adminItAsAppadmin) {
        /** Parent без anketa-ролей — как F-05; leaf под /admin_it получит роли через expand `/appadmin`. */
        out["/admin_it"] = [];
        if (!out["/appadmin"]?.length) {
            out["/appadmin"] = [...V2_APPADMIN_F05_ROLES];
        }
    }
    return out;
}
export function expandV2KeycloakTargetsWithCompat(baseTarget, standPrefixRaw, options) {
    const target = buildV2KeycloakGroupRoleTargetWithCompat(baseTarget, options);
    const expanded = expandV2KeycloakTargetsWithAdAliases(target, standPrefixRaw);
    if (!options?.allowNestedLeadGroups)
        return expanded;
    /** Nested lead-папки уже в target; AD-листы top-level копируем и под executor parent. */
    const out = {};
    for (const [path, roles] of Object.entries(expanded)) {
        out[path] = [...roles];
    }
    const add = (path, roles) => {
        const key = path.startsWith("/") ? path : `/${path}`;
        out[key] = [...new Set([...(out[key] ?? []), ...roles])].sort();
    };
    for (const lead of V2_TOP_LEVEL_LEAD_GROUP_PATHS) {
        const roles = target[lead];
        if (!roles?.length)
            continue;
        const executor = lead === "/ds_lead" ? "/ds" : lead === "/de_lead" ? "/de" : "/modelops";
        add(`${executor}${lead}`, roles);
        for (const [path, pathRoles] of Object.entries(expanded)) {
            if (!path.startsWith(`${lead}/`))
                continue;
            if (!/sum_l(ds|de|dmo)_/i.test(path))
                continue;
            const leaf = path.slice(lead.length + 1);
            add(`${executor}${lead}/${leaf}`, pathRoles);
        }
    }
    return out;
}
/**
 * Дополнительные realm-permissions по доменной lead-роли
 * (когда nested-группа в KK без approve/complete/delete).
 */
export function resolveV2ImpliedPermissionsFromGroups(userGroups, options) {
    if (!options?.allowNestedLeadGroups)
        return [];
    const normalized = normalizeV2UserGroupsWithCompat(userGroups, options);
    const out = [];
    for (const [role, perms] of Object.entries(V2_LEAD_IMPLIED_PERMISSIONS)) {
        if (!normalized.includes(role))
            continue;
        for (const p of perms) {
            if (!out.includes(p))
                out.push(p);
        }
    }
    return out;
}
export function mergeV2PermissionsWithImplied(permissions, userGroups, options) {
    const implied = resolveV2ImpliedPermissionsFromGroups(userGroups, options);
    if (!implied.length)
        return [...permissions];
    return [...new Set([...permissions, ...implied])];
}
