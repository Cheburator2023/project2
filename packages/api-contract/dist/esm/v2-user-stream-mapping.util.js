import { isV2ImplementationStreamCode, V2_IMPLEMENTATION_STREAM, V2_IMPLEMENTATION_STREAM_CODES, V2_IMPLEMENTATION_STREAM_LABELS, } from "./v2-implementation-streams.util";
import { mapV2AdGroupLeafToRoleCodes } from "./v2-ad-domain-groups.util";
/** Роли Keycloak, для которых стрим берётся из департамента / groups (как на бекенде). */
export const V2_USER_STREAM_FILTERED_ROLE_CODES = [
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
export const V2_USER_STREAM_FILTER_EXEMPT_LEAD_CODES = [
    "ds_lead",
    "de_lead",
    "modelops_lead",
];
/** `/mipm` без департамента = Бизнес-партнёр (все стримы); с департаментом = Бизнес-партнёр стрима. */
export const V2_USER_CONDITIONAL_STREAM_FILTER_ROLE_CODES = ["mipm"];
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
/** Департамент Keycloak → коды v2 implementationStream (синхронно с StreamMappingService). */
const DEPARTMENT_TO_V2_STREAM_CODES = {
    [V2_DEPARTMENT_GROUPS.KIB_SMB]: [V2_IMPLEMENTATION_STREAM.KMBKCB],
    [V2_DEPARTMENT_GROUPS.PARTNERSHIPS_IT]: [
        V2_IMPLEMENTATION_STREAM.PTITPC,
    ],
    [V2_DEPARTMENT_GROUPS.RB]: [V2_IMPLEMENTATION_STREAM.RB],
    [V2_DEPARTMENT_GROUPS.ML_ALGORITHMS]: [V2_IMPLEMENTATION_STREAM.RND],
    [V2_DEPARTMENT_GROUPS.PROCESS_FINANCIAL]: [
        V2_IMPLEMENTATION_STREAM.FINMDL,
    ],
    [V2_IMPLEMENTATION_STREAM.KMBKCB]: [V2_IMPLEMENTATION_STREAM.KMBKCB],
    [V2_IMPLEMENTATION_STREAM.RB]: [V2_IMPLEMENTATION_STREAM.RB],
    [V2_IMPLEMENTATION_STREAM.PTITPC]: [V2_IMPLEMENTATION_STREAM.PTITPC],
    [V2_IMPLEMENTATION_STREAM.FINMDL]: [V2_IMPLEMENTATION_STREAM.FINMDL],
    [V2_IMPLEMENTATION_STREAM.RND]: [V2_IMPLEMENTATION_STREAM.RND],
    [V2_IMPLEMENTATION_STREAM.IDSRC]: [V2_IMPLEMENTATION_STREAM.IDSRC],
    [V2_IMPLEMENTATION_STREAM.MDLCTL]: [V2_IMPLEMENTATION_STREAM.MDLCTL],
    [V2_IMPLEMENTATION_STREAM.DADM]: [V2_IMPLEMENTATION_STREAM.DADM],
    [V2_IMPLEMENTATION_STREAM.PIRM]: [V2_IMPLEMENTATION_STREAM.PIRM],
    [V2_IMPLEMENTATION_STREAM.STRDAT]: [V2_IMPLEMENTATION_STREAM.STRDAT],
    [V2_IMPLEMENTATION_STREAM.DIGAGT]: [V2_IMPLEMENTATION_STREAM.DIGAGT],
};
const V2_IMPLEMENTATION_STREAM_LABEL_VALUES = Object.values(V2_IMPLEMENTATION_STREAM_LABELS);
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
export function normalizeV2UserGroups(userGroups) {
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
            for (const code of mapV2AdGroupLeafToRoleCodes(leaf)) {
                pushUnique(result, code);
            }
        }
    }
    return result;
}
export function extractV2UserRoleCodes(userGroups) {
    const normalized = normalizeV2UserGroups(userGroups);
    return normalized.filter((group) => V2_USER_STREAM_FILTERED_ROLE_CODES.includes(group));
}
export function isV2UserStreamFilterExemptLead(userGroups) {
    const normalized = normalizeV2UserGroups(userGroups);
    return V2_USER_STREAM_FILTER_EXEMPT_LEAD_CODES.some((role) => normalized.includes(role));
}
export function isV2UserStreamFilteredByGroups(userGroups) {
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
        V2_IMPLEMENTATION_STREAM_CODES.includes(group) ||
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
        if (isV2ImplementationStreamCode(trimmed)) {
            expanded.add(trimmed);
            continue;
        }
        for (const code of V2_IMPLEMENTATION_STREAM_CODES) {
            if (V2_IMPLEMENTATION_STREAM_LABELS[code] === trimmed) {
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
export function resolveV2UserScopedStreamsFromGroups(userGroups) {
    const departmentsAndStreams = extractDepartmentsAndStreamGroups(userGroups);
    const mapped = departmentsAndStreams.flatMap((group) => DEPARTMENT_TO_V2_STREAM_CODES[group] ?? []);
    const directCodes = departmentsAndStreams.filter((group) => isV2ImplementationStreamCode(group));
    return expandStreamCodeAliases([...mapped, ...directCodes]);
}
/** Коды implementationStream пользователя из groups Keycloak. */
export function resolveV2UserImplementationStreamsFromGroups(userGroups) {
    if (!isV2UserStreamFilteredByGroups(userGroups)) {
        return [];
    }
    return resolveV2UserScopedStreamsFromGroups(userGroups);
}
/** Allow-list для фильтра реестра: коды + подписи (как Nest expandStreamAliases). */
export function resolveV2UserAllowedStreamFilterValues(userGroups) {
    const codes = resolveV2UserImplementationStreamsFromGroups(userGroups);
    const expanded = new Set();
    for (const code of codes) {
        expanded.add(code);
        expanded.add(V2_IMPLEMENTATION_STREAM_LABELS[code]);
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
export function filterV2QuestionnairesByUserStreamGroups(items, userGroups, filterEnabled) {
    if (!filterEnabled)
        return [...items];
    if (!isV2UserStreamFilteredByGroups(userGroups))
        return [...items];
    const allowed = resolveV2UserAllowedStreamFilterValues(userGroups);
    if (allowed.length === 0)
        return [];
    return items.filter((item) => {
        const primary = readImplementationStream(item.formData);
        if (!primary)
            return true;
        return allowed.includes(primary);
    });
}
