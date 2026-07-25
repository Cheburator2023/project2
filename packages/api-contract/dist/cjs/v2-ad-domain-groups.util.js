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
exports.isV2AdDelegatedCanonPath = isV2AdDelegatedCanonPath;
exports.isV2AdNestParentPath = isV2AdNestParentPath;
exports.shouldEnsureV2KeycloakGroupPath = shouldEnsureV2KeycloakGroupPath;
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
const DS_LEAD_AD = exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_Lds_${s}`);
const DE_LEAD_AD = exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_Lde_${s}`);
const MODELOPS_LEAD_AD = exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_Ldmo_${s}`);
const MIPM_STREAM_AD = exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_mipm_${s}`);
exports.V2_KEYCLOAK_PATH_TO_AD_GROUPS = {
    "/ds": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_ds_${s}`),
    /** SUMD top-level + nested seed — одни и те же AD-листы lead. */
    "/ds_lead": DS_LEAD_AD,
    "/ds/ds_lead": DS_LEAD_AD,
    "/de": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_de_${s}`),
    "/de_lead": DE_LEAD_AD,
    "/de/de_lead": DE_LEAD_AD,
    "/modelops": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_mo_${s}`),
    "/modelops_lead": MODELOPS_LEAD_AD,
    "/modelops/modelops_lead": MODELOPS_LEAD_AD,
    "/architect": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_arch_${s}`),
    "/mipm": ["sum_mipm"],
    "/mipm_stream": MIPM_STREAM_AD,
    "/validator": ["sum_validator"],
    "/validator_lead": ["sum_Ldvalidator"],
    "/validator/validator_lead": ["sum_Ldvalidator"],
    "/mntranlst": ["sum_mntranlst"],
    "/da": ["sum_da"],
    "/da_stream": exports.V2_AD_MODEL_STREAM_SUFFIXES.map((s) => `sum_da_${s}`),
    "/appadmin": ["sum_appadmin"],
    /** AD sum_auditorib на SUMD: `/auditor/{stand}sum_auditorib`. */
    "/auditorib": ["sum_auditorib"],
    /**
     * AD sum_auditor на SUMD: `/controller/{stand}sum_auditor`.
     * Канон `/auditor` и `/controller` оба мапятся на тот же AD-лист.
     */
    "/auditor": ["sum_auditor"],
    "/controller": ["sum_auditor"],
    "/saprg": ["sum_saprg"],
    "/sacfg": ["sum_sacfg"],
    "/sarep": exports.V2_AD_SAREP_STREAM_SUFFIXES.map((s) => `sum_sarep_${s}`),
    "/prjtoffice": ["sum_prjtoffice"],
    "/project_office": ["sum_prjtoffice"],
};
/**
 * Target-path → родитель(и) в KK, под которыми лежит AD-лист (не top-level).
 *
 * SUMD (realm-export):
 * - executors `/de/{stand}sum_de_*`, leads top-level `/de_lead/{stand}sum_Lde_*`
 * - auditor → `/controller/{stand}sum_auditor`
 * - auditorib → `/auditor/{stand}sum_auditorib`
 * - mipm stream → `/mipm_stream/{stand}sum_mipm_*`
 * - appadmin → `/admin_it/{stand}sum_appadmin`
 *
 * Seed/nested: `/de/de_lead/{stand}sum_Lde_*` — тоже в списке nest, чтобы sync
 * покрывал оба shape.
 */
exports.V2_AD_NEST_PARENT_BY_TARGET = {
    "/ds": ["/ds"],
    "/ds_lead": ["/ds_lead"],
    "/ds/ds_lead": ["/ds/ds_lead", "/ds_lead"],
    "/de": ["/de"],
    "/de_lead": ["/de_lead"],
    "/de/de_lead": ["/de/de_lead", "/de_lead"],
    "/modelops": ["/modelops"],
    "/modelops_lead": ["/modelops_lead"],
    "/modelops/modelops_lead": ["/modelops/modelops_lead", "/modelops_lead"],
    "/mipm": ["/mipm"],
    "/mipm_stream": ["/mipm_stream"],
    "/validator": ["/validator"],
    "/validator_lead": ["/validator_lead"],
    "/validator/validator_lead": [
        "/validator/validator_lead",
        "/validator_lead",
    ],
    "/sarep": ["/sarep"],
    "/sacfg": ["/sacfg"],
    "/saprg": ["/saprg"],
    "/prjtoffice": ["/prjtoffice", "/project_office"],
    "/project_office": ["/project_office", "/prjtoffice"],
    "/appadmin": ["/admin_it"],
    "/auditorib": ["/auditor"],
    "/auditor": ["/controller"],
    "/controller": ["/controller"],
    "/architect": ["/architect"],
    "/da": ["/da"],
    "/da_stream": ["/da_stream"],
    "/mntranlst": ["/mntranlst"],
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
 * Канон, чьи AD-листы живут под другим parent
 * (например `/appadmin` → `/admin_it/{stand}sum_appadmin`).
 * Такой path не создаём в KK и не вешаем на него роли — только на AD-alias.
 */
function isV2AdDelegatedCanonPath(path) {
    const canon = path.startsWith("/") ? path : `/${path}`;
    const adNames = exports.V2_KEYCLOAK_PATH_TO_AD_GROUPS[canon];
    if (!adNames?.length)
        return false;
    const nests = exports.V2_AD_NEST_PARENT_BY_TARGET[canon];
    if (!nests?.length)
        return false;
    return !nests.includes(canon);
}
/** Path является nest-parent для чьих-то AD-листов (папка должна существовать). */
function isV2AdNestParentPath(path) {
    const canon = path.startsWith("/") ? path : `/${path}`;
    return Object.values(exports.V2_AD_NEST_PARENT_BY_TARGET).some((parents) => parents.includes(canon));
}
/**
 * Нужно ли create/ensure этот path в Keycloak.
 * Delegated-канон вроде `/appadmin` / `/auditorib` — нет (роли на AD-листе).
 * `/auditor` — да, как parent для `sum_auditorib`, даже если его AD ушёл в `/controller`.
 */
function shouldEnsureV2KeycloakGroupPath(path) {
    const canon = path.startsWith("/") ? path : `/${path}`;
    if (isV2AdDelegatedCanonPath(canon) && !isV2AdNestParentPath(canon)) {
        return false;
    }
    return true;
}
/**
 * Развернуть TARGET: канон + AD-alias.
 *
 * - nested (см. V2_AD_NEST_PARENT_BY_TARGET): только `/{parent}/{stand}sum_*`
 * - delegated-канон (`/appadmin` → `/admin_it/...`): роли только на AD-alias, не на каноне
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
        const canon = path.startsWith("/") ? path : `/${path}`;
        const adNames = exports.V2_KEYCLOAK_PATH_TO_AD_GROUPS[canon];
        const nestParents = exports.V2_AD_NEST_PARENT_BY_TARGET[canon];
        const delegated = isV2AdDelegatedCanonPath(canon);
        /** Канон с ролями — только если AD не «уехал» на другой parent. */
        if (!delegated) {
            add(canon, roles);
        }
        if (!adNames?.length)
            continue;
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
