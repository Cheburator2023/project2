"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_USER_CONDITIONAL_STREAM_FILTER_ROLE_CODES = exports.V2_USER_STREAM_VIEW_ALL_ROLE_CODE = exports.V2_USER_DE_MODELOPS_VIEW_ALL_ROLE_CODES = exports.V2_USER_STREAM_FILTER_EXEMPT_LEAD_CODES = exports.V2_USER_STREAM_FILTERED_ROLE_CODES = void 0;
exports.normalizeV2UserGroups = normalizeV2UserGroups;
exports.extractV2UserRoleCodes = extractV2UserRoleCodes;
exports.isV2UserStreamFilterExemptLead = isV2UserStreamFilterExemptLead;
exports.isV2UserStreamViewAll = isV2UserStreamViewAll;
exports.isV2UserDeModelopsViewAllFamily = isV2UserDeModelopsViewAllFamily;
exports.isV2UserStreamFilteredByGroups = isV2UserStreamFilteredByGroups;
exports.resolveV2UserScopedStreamsFromGroups = resolveV2UserScopedStreamsFromGroups;
exports.resolveV2UserImplementationStreamsFromGroups = resolveV2UserImplementationStreamsFromGroups;
exports.resolveV2UserAllowedStreamFilterValues = resolveV2UserAllowedStreamFilterValues;
exports.filterV2QuestionnairesByUserStreamGroups = filterV2QuestionnairesByUserStreamGroups;
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
const v2_ad_domain_groups_util_1 = require("./v2-ad-domain-groups.util");
/** Роли Keycloak, для которых стрим берётся из департамента / groups (как на бекенде). */
exports.V2_USER_STREAM_FILTERED_ROLE_CODES = [
    "ds",
    "de",
    "data_expert",
    "mipm_stream",
    "modelops",
    /** Аналитик качества модельных данных стрима (sum_da_<стрим>). */
    "da_stream",
];
/**
 * Lead-роли (F-05 уровень B): реестр без жёсткого фильтра по стриму.
 * Синхронно с Nest `STREAM_FILTER_EXEMPT_LEAD_ROLES`.
 */
exports.V2_USER_STREAM_FILTER_EXEMPT_LEAD_CODES = [
    "ds_lead",
    "de_lead",
    "modelops_lead",
];
/**
 * DE / DE lead / ModelOps / ModelOps lead — при `DE_MODELOPS_VIEW_ALL_STREAMS`
 * (default ON) видят все стримы без разделения.
 */
exports.V2_USER_DE_MODELOPS_VIEW_ALL_ROLE_CODES = [
    "de",
    "de_lead",
    "modelops",
    "modelops_lead",
];
/**
 * Доменная/Keycloak-группа: при наличии отключает разделение реестра по стримам
 * (для любой роли). Path: `/stream_view_all`, AD: `sum_stream_view_all`.
 */
exports.V2_USER_STREAM_VIEW_ALL_ROLE_CODE = "stream_view_all";
/** `/mipm` без департамента = Бизнес-партнёр (все стримы); с департаментом = Бизнес-партнёр стрима. */
exports.V2_USER_CONDITIONAL_STREAM_FILTER_ROLE_CODES = ["mipm"];
/** Суффиксы стримов в AD/Keycloak path (как в groups-department mapper). */
const V2_STREAM_SUFFIX_RE = /(?:^|_)(kmbkcb|ptitpc|rnd|rb|finmdl|idsrc|mdlctl|pirm|strdat|digagt|dadm)$/i;
const V2_DEPARTMENT_GROUPS = {
    KIB_SMB: "Управление моделирования КИБ и СМБ",
    PARTNERSHIPS_IT: "Управление моделирования партнерств и ИТ-процессов",
    RB: "Управление моделирования РБ",
    ML_ALGORITHMS: "Управление перспективных алгоритмов машинного обучения",
    PROCESS_FINANCIAL: "Управление процессных и финансовых моделей",
};
const V2_LEGACY_STREAM_GROUPS = {
    KIB_SMB: "Разработка моделей для КМБ и КСБ",
    PARTNERSHIPS_IT_IT: "Модели партнерств и платформы больших данных",
    PARTNERSHIPS_IT_RND: "Моделирование RnD",
    RB: "Моделирование РБ",
    ML_ALGORITHMS: "Моделирование RnD",
    PROCESS_FINANCIAL: "Финансовое моделирование",
};
/**
 * Департамент Keycloak / код стрима → allow-list v2 implementationStream.
 * `_rnd` / RnD → ещё и «AI-модели партнерств» (`ptitpc`).
 */
const DEPARTMENT_TO_V2_STREAM_CODES = {
    [V2_DEPARTMENT_GROUPS.KIB_SMB]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB],
    [V2_DEPARTMENT_GROUPS.PARTNERSHIPS_IT]: [
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
    ],
    [V2_DEPARTMENT_GROUPS.RB]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB],
    [V2_DEPARTMENT_GROUPS.ML_ALGORITHMS]: [
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND,
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
    ],
    [V2_DEPARTMENT_GROUPS.PROCESS_FINANCIAL]: [
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL,
    ],
    /** Legacy/v1 label «Моделирование RnD» (и ML_ALGORITHMS, и PARTNERSHIPS_IT_RND). */
    [V2_LEGACY_STREAM_GROUPS.ML_ALGORITHMS]: [
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND,
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
    ],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND]: [
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND,
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
    ],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.STRDAT]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.STRDAT],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT],
};
const V2_IMPLEMENTATION_STREAM_LABEL_VALUES = Object.values(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS);
function pushUnique(acc, value) {
    if (value && !acc.includes(value))
        acc.push(value);
}
/**
 * Нормализация groups из токена:
 * - `/ds/ds_lead` → `ds`, `ds_lead`
 * - AD `sum_appadmin` / `test_sum_appadmin` / `prod_sum_appadmin` → ещё и `appadmin`
 * - stand-prefix `dev_|test_|prod_` снимается; `sum_` — часть AD-имени, обязателен
 */
function normalizeV2UserGroups(userGroups) {
    const result = [];
    for (const group of userGroups) {
        if (typeof group !== "string")
            continue;
        const normalized = group.replace(/^\//, "");
        const leaves = [];
        if (normalized.includes("/")) {
            const parts = normalized.split("/");
            if (parts[0] === "departament") {
                leaves.push(parts.slice(1).join("/"));
            }
            else {
                leaves.push(...parts.filter(Boolean));
            }
        }
        else if (normalized) {
            leaves.push(normalized);
        }
        for (const leaf of leaves) {
            pushUnique(result, leaf);
            for (const code of (0, v2_ad_domain_groups_util_1.mapV2AdGroupLeafToRoleCodes)(leaf)) {
                pushUnique(result, code);
            }
        }
    }
    return result;
}
function extractV2UserRoleCodes(userGroups) {
    const normalized = normalizeV2UserGroups(userGroups);
    return normalized.filter((group) => exports.V2_USER_STREAM_FILTERED_ROLE_CODES.includes(group));
}
function isV2UserStreamFilterExemptLead(userGroups) {
    const normalized = normalizeV2UserGroups(userGroups);
    return exports.V2_USER_STREAM_FILTER_EXEMPT_LEAD_CODES.some((role) => normalized.includes(role));
}
/** Роль `/stream_view_all` — видеть все стримы независимо от DE/ModelOps env. */
function isV2UserStreamViewAll(userGroups) {
    return normalizeV2UserGroups(userGroups).includes(exports.V2_USER_STREAM_VIEW_ALL_ROLE_CODE);
}
function isV2UserDeModelopsViewAllFamily(userGroups) {
    const normalized = normalizeV2UserGroups(userGroups);
    return exports.V2_USER_DE_MODELOPS_VIEW_ALL_ROLE_CODES.some((role) => normalized.includes(role));
}
function isV2UserStreamFilteredByGroups(userGroups, options) {
    if (isV2UserStreamViewAll(userGroups))
        return false;
    const deModelopsViewAll = options?.deModelopsViewAllStreams !== false;
    if (deModelopsViewAll && isV2UserDeModelopsViewAllFamily(userGroups)) {
        return false;
    }
    if (isV2UserStreamFilterExemptLead(userGroups))
        return false;
    if (extractV2UserRoleCodes(userGroups).length > 0)
        return true;
    const normalized = normalizeV2UserGroups(userGroups);
    /** mipm + департамент/стрим → «Бизнес-партнёр стрима». */
    if (normalized.includes("mipm") &&
        extractDepartmentsAndStreamGroups(userGroups).length > 0) {
        return true;
    }
    return false;
}
function extractDepartmentsAndStreamGroups(userGroups) {
    const normalized = normalizeV2UserGroups(userGroups);
    const fromGroups = normalized.filter((group) => Object.values(V2_DEPARTMENT_GROUPS).includes(group) ||
        Object.values(V2_LEGACY_STREAM_GROUPS).includes(group) ||
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES.includes(group) ||
        V2_IMPLEMENTATION_STREAM_LABEL_VALUES.includes(group));
    const fromSuffixes = [];
    for (const group of normalized) {
        const match = group.match(V2_STREAM_SUFFIX_RE);
        if (match)
            fromSuffixes.push(match[1].toLowerCase());
    }
    return [...new Set([...fromGroups, ...fromSuffixes])];
}
function expandStreamCodeAliases(streams) {
    const expanded = new Set();
    for (const stream of streams) {
        const trimmed = stream.trim();
        if (!trimmed)
            continue;
        if ((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)(trimmed)) {
            expanded.add(trimmed);
            continue;
        }
        for (const code of v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES) {
            if (v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code] === trimmed) {
                expanded.add(code);
            }
        }
    }
    return [...expanded];
}
/**
 * Коды implementationStream из groups (департаменты + AD-суффиксы),
 * без учёта lead-exemption фильтра реестра.
 */
function resolveV2UserScopedStreamsFromGroups(userGroups) {
    const departmentsAndStreams = extractDepartmentsAndStreamGroups(userGroups);
    const mapped = departmentsAndStreams.flatMap((group) => DEPARTMENT_TO_V2_STREAM_CODES[group] ?? []);
    const directCodes = departmentsAndStreams.filter((group) => (0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)(group));
    return expandStreamCodeAliases([...mapped, ...directCodes]);
}
/** Коды implementationStream пользователя из groups Keycloak. */
function resolveV2UserImplementationStreamsFromGroups(userGroups, options) {
    if (!isV2UserStreamFilteredByGroups(userGroups, options)) {
        return [];
    }
    return resolveV2UserScopedStreamsFromGroups(userGroups);
}
/** Allow-list для фильтра реестра: коды + подписи (как Nest expandStreamAliases). */
function resolveV2UserAllowedStreamFilterValues(userGroups, options) {
    const codes = resolveV2UserImplementationStreamsFromGroups(userGroups, options);
    const expanded = new Set();
    for (const code of codes) {
        expanded.add(code);
        expanded.add(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code]);
    }
    return [...expanded];
}
function readImplementationStream(formData) {
    if (!formData || typeof formData !== "object")
        return undefined;
    const generalInfo = formData.generalInfo;
    if (!generalInfo || typeof generalInfo !== "object")
        return undefined;
    const raw = generalInfo.implementationStream;
    if (typeof raw === "string" && raw.trim())
        return raw.trim();
    return undefined;
}
/**
 * Фильтр списка анкет по стриму пользователя (логика бывшего Nest StreamFilterInterceptor).
 * `filterEnabled=false` → список без изменений.
 */
function filterV2QuestionnairesByUserStreamGroups(items, userGroups, filterEnabled, options) {
    if (!filterEnabled)
        return [...items];
    if (!isV2UserStreamFilteredByGroups(userGroups, options))
        return [...items];
    const allowed = resolveV2UserAllowedStreamFilterValues(userGroups, options);
    if (allowed.length === 0)
        return [];
    return items.filter((item) => {
        const primary = readImplementationStream(item.formData);
        if (!primary)
            return true;
        return allowed.includes(primary);
    });
}
