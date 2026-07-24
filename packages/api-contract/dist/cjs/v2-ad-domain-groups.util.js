"use strict";
/**
 * AD → канонические коды ролей Смарт-Анкеты.
 *
 * Спека: llm/feature_roles_fresh/Доменные группы (AD).csv
 *
 * Имя AD-группы:
 * - без стенда: `sum_appadmin`
 * - со стендом: `prod_sum_appadmin` / `test_sum_appadmin` / `dev_sum_appadmin`
 *
 * При метчинге снимаем только stand-prefix (`dev_|test_|prod_`).
 * Префикс `sum_` — часть имени, его нельзя игнорировать:
 * `prod_appadmin` ≠ `prod_sum_appadmin` → не матчится.
 *
 * Примеры:
 * - sum_appadmin / test_sum_appadmin / prod_sum_appadmin → appadmin
 * - sum_ds_kmbkcb / prod_sum_ds_rb → ds
 * - sum_Lds_kmbkcb → ds_lead (+ ds)
 * - sum_mo_* → modelops (в AD «mo», в KK — modelops)
 * - sum_da → da; sum_da_kmbkcb → da_stream
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_AD_NEST_PARENT_BY_TARGET = exports.V2_KEYCLOAK_PATH_TO_AD_GROUPS = exports.V2_AD_SAREP_STREAM_SUFFIXES = exports.V2_AD_MODEL_STREAM_SUFFIXES = exports.V2_AD_STAND_PREFIX_RE = void 0;
exports.stripV2AdStandPrefix = stripV2AdStandPrefix;
exports.mapV2AdGroupLeafToRoleCodes = mapV2AdGroupLeafToRoleCodes;
exports.normalizeV2AdStandPrefix = normalizeV2AdStandPrefix;
exports.expandV2KeycloakTargetsWithAdAliases = expandV2KeycloakTargetsWithAdAliases;
exports.v2KeycloakGroupLeaf = v2KeycloakGroupLeaf;
exports.resolveV2KeycloakGroupPath = resolveV2KeycloakGroupPath;
/** Префиксы стенда в AD/Keycloak (единственное, что игнорим при метчинге). */
exports.V2_AD_STAND_PREFIX_RE = /^(dev|test|prod)_/i;
exports.V2_AD_MODEL_STREAM_SUFFIXES = [
    "kmbkcb",
    "ptitpc",
    "rnd",
    "rb",
    "finmdl",
];
exports.V2_AD_SAREP_STREAM_SUFFIXES = [
    "idsrc",
    "mdlctl",
    "pirm",
    "strdat",
    "digagt",
    "dadm",
];
/** Канонические KK path-коды (без AD sum_). */
const V2_CANONICAL_ROLE_CODES = new Set([
    "appadmin",
    "sacfg",
    "saprg",
    "sarep",
    "auditor",
    "auditorib",
    "auditor_lead",
    "validator",
    "validator_lead",
    "mntranlst",
    "da",
    "da_stream",
    "mipm",
    "ds",
    "de",
    "modelops",
    "ds_lead",
    "de_lead",
    "modelops_lead",
    "architect",
    "prjtoffice",
    "project_office",
    "business_customer",
    "admin_it",
    "admin_it_lead",
]);
/** Снять leading slash и stand-prefix (dev_|test_|prod_). `sum_` не трогаем. */
function stripV2AdStandPrefix(raw) {
    return raw.replace(/^\//, "").replace(exports.V2_AD_STAND_PREFIX_RE, "");
}
/** `sum_<rest>` → канонические role codes. */
function mapV2SumRestToRoleCodes(restRaw) {
    const rest = restRaw.toLowerCase();
    if (!rest)
        return [];
    /** Lead: sum_Lds_* / sum_Lde_* / sum_Ldmo_* / sum_Ldvalidator */
    if (rest.startsWith("lds_") || rest === "lds") {
        return ["ds_lead", "ds"];
    }
    if (rest.startsWith("lde_") || rest === "lde") {
        return ["de_lead", "de"];
    }
    if (rest.startsWith("ldmo_") || rest === "ldmo") {
        return ["modelops_lead", "modelops"];
    }
    if (rest === "ldvalidator" || rest.startsWith("ldvalidator_")) {
        return ["validator_lead", "validator"];
    }
    /** Stream-scoped executors */
    if (rest.startsWith("ds_"))
        return ["ds"];
    if (rest.startsWith("de_"))
        return ["de"];
    /** AD: sum_mo_* (не modelops) */
    if (rest.startsWith("mo_") || rest === "mo")
        return ["modelops"];
    if (rest.startsWith("arch_"))
        return ["architect"];
    if (rest.startsWith("mipm_"))
        return ["mipm"];
    if (rest.startsWith("sarep_"))
        return ["sarep"];
    if (rest.startsWith("bc_"))
        return ["business_customer"];
    /** da vs da_<stream> */
    if (rest === "da")
        return ["da"];
    if (rest.startsWith("da_"))
        return ["da_stream"];
    const exact = {
        appadmin: "appadmin",
        sacfg: "sacfg",
        saprg: "saprg",
        sarep: "sarep",
        validator: "validator",
        auditor: "auditor",
        auditorib: "auditorib",
        mntranlst: "mntranlst",
        mipm: "mipm",
        prjtoffice: "prjtoffice",
        project_office: "project_office",
    };
    if (exact[rest])
        return [exact[rest]];
    return [];
}
/**
 * Лист AD/Keycloak-группы → канонические коды ролей (без path).
 *
 * - `sum_appadmin` / `prod_sum_appadmin` → appadmin
 * - `appadmin` (KK path без AD) → appadmin
 * - `prod_appadmin` (стенд без sum_) → [] — sum_ обязателен в AD-имени
 */
function mapV2AdGroupLeafToRoleCodes(rawLeaf) {
    const raw = rawLeaf.replace(/^\//, "").toLowerCase();
    if (!raw)
        return [];
    const withoutStand = raw.replace(exports.V2_AD_STAND_PREFIX_RE, "");
    const hadStandPrefix = withoutStand !== raw;
    /** AD: после stand-prefix обязательно `sum_…`. */
    if (withoutStand.startsWith("sum_")) {
        return mapV2SumRestToRoleCodes(withoutStand.slice("sum_".length));
    }
    /**
     * Без stand и без sum_ — только канон KK (`/appadmin` → appadmin).
     * Со stand, но без sum_ (`test_appadmin`) — не AD-группа.
     */
    if (!hadStandPrefix && V2_CANONICAL_ROLE_CODES.has(withoutStand)) {
        return [withoutStand];
    }
    return [];
}
/**
 * Канон KK path → AD-имена без stand-prefix (из CSV).
 * Для sync: `/appadmin` + prefix `test_` → `/test_sum_appadmin`.
 */
exports.V2_KEYCLOAK_PATH_TO_AD_GROUPS = {
    "/ds": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_ds_${s}`),
    "/ds/ds_lead": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_Lds_${s}`),
    "/de": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_de_${s}`),
    "/de/de_lead": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_Lde_${s}`),
    "/modelops": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_mo_${s}`),
    "/modelops/modelops_lead": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_Ldmo_${s}`),
    "/architect": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_arch_${s}`),
    "/mipm": [
        "sum_mipm",
        ...exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_mipm_${s}`),
    ],
    "/validator": ["sum_validator"],
    "/validator/validator_lead": ["sum_Ldvalidator"],
    "/mntranlst": ["sum_mntranlst"],
    "/da": ["sum_da"],
    "/da_stream": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_da_${s}`),
    "/appadmin": ["sum_appadmin"],
    "/auditorib": ["sum_auditorib"],
    "/auditor": ["sum_auditor"],
    "/saprg": ["sum_saprg"],
    "/sacfg": ["sum_sacfg"],
    "/sarep": exports.V2_AD_SAREP_STREAM_SUFFIXES.map((s) => `sum_sarep_${s}`),
    "/prjtoffice": ["sum_prjtoffice"],
    "/project_office": ["sum_prjtoffice"],
};
/**
 * Target-path → родитель(и) в KK, под которыми лежит AD-лист (не top-level).
 * SUMD: sarep/sacfg/saprg/project_office; appadmin → `/admin_it/{stand}sum_appadmin`.
 */
exports.V2_AD_NEST_PARENT_BY_TARGET = {
    "/sarep": ["/sarep"],
    "/sacfg": ["/sacfg"],
    "/saprg": ["/saprg"],
    "/prjtoffice": ["/prjtoffice", "/project_office"],
    "/project_office": ["/project_office", "/prjtoffice"],
    "/appadmin": ["/admin_it"],
};
/** Нормализовать ввод UI: `test` / `test_` / `TEST_` → `test_`. */
function normalizeV2AdStandPrefix(raw) {
    const t = (raw ?? "").trim().toLowerCase().replace(/_+$/, "");
    if (!t)
        return "";
    if (!/^(dev|test|prod)$/.test(t) && !/^[a-z0-9]+$/.test(t)) {
        /** свободный префикс — оставляем как есть с trailing _ */
        return t.endsWith("_") ? t : `${t}_`;
    }
    return `${t}_`;
}
/**
 * Развернуть TARGET: канон + AD-alias.
 *
 * - nested (см. V2_AD_NEST_PARENT_BY_TARGET): только `/{parent}/{stand}sum_*`
 * - остальные: top-level `/{stand}sum_*` + опционально под каноном
 */
function expandV2KeycloakTargetsWithAdAliases(target, standPrefixRaw) {
    const standPrefix = normalizeV2AdStandPrefix(standPrefixRaw);
    const out = {};
    const add = (path, roles) => {
        const key = path.startsWith("/") ? path : `/${path}`;
        const prev = out[key] ?? [];
        out[key] = [...new Set([...prev, ...roles])].sort();
    };
    for (const [path, roles] of Object.entries(target)) {
        add(path, roles);
        const adNames = exports.V2_KEYCLOAK_PATH_TO_AD_GROUPS[path];
        if (!adNames?.length)
            continue;
        const canon = path.startsWith("/") ? path : `/${path}`;
        const nestParents = exports.V2_AD_NEST_PARENT_BY_TARGET[canon];
        for (const ad of adNames) {
            const leaf = `${standPrefix}${ad}`;
            if (nestParents?.length) {
                for (const parent of nestParents) {
                    add(`${parent}/${leaf}`, roles);
                }
            }
            else {
                add(`/${leaf}`, roles);
                add(`${canon}/${leaf}`, roles);
            }
        }
    }
    return out;
}
/** Последний сегмент path: `/sarep/dev_sum_sarep_dadm` → `dev_sum_sarep_dadm`. */
function v2KeycloakGroupLeaf(path) {
    return path.replace(/^\//, "").split("/").filter(Boolean).pop() ?? "";
}
/**
 * Найти группу: точный path, иначе любой path с тем же leaf
 * (не создавать `/dev_sum_sarep_dadm`, если уже есть `/sarep/dev_sum_sarep_dadm`).
 */
function resolveV2KeycloakGroupPath(wantedPath, existingPaths) {
    const wanted = wantedPath.startsWith("/") ? wantedPath : `/${wantedPath}`;
    if (existingPaths.includes(wanted))
        return wanted;
    const leaf = v2KeycloakGroupLeaf(wanted);
    if (!leaf)
        return null;
    const matches = existingPaths.filter((p) => v2KeycloakGroupLeaf(p).toLowerCase() === leaf.toLowerCase());
    if (!matches.length)
        return null;
    /** Предпочитаем более вложенный path (реальный AD под каноном). */
    matches.sort((a, b) => b.split("/").filter(Boolean).length -
        a.split("/").filter(Boolean).length || a.localeCompare(b));
    return matches[0] ?? null;
}
