import { isV2ImplementationStreamCode, V2_IMPLEMENTATION_STREAM, V2_IMPLEMENTATION_STREAM_CODES, V2_IMPLEMENTATION_STREAM_LABELS, } from "./v2-implementation-streams.util";
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
export function normalizeV2UserGroups(userGroups) {
    const result = [];
    for (const group of userGroups) {
        if (typeof group !== "string")
            continue;
        const normalized = group.replace(/^\//, "");
        if (normalized.includes("/")) {
            const parts = normalized.split("/");
            if (parts[0] === "departament") {
                result.push(parts.slice(1).join("/"));
            }
            else {
                result.push(...parts);
            }
        }
        else {
            result.push(normalized);
        }
    }
    return result;
}
export function extractV2UserRoleCodes(userGroups) {
    const normalized = normalizeV2UserGroups(userGroups);
    return normalized.filter((group) => V2_USER_STREAM_FILTERED_ROLE_CODES.includes(group));
}
export function isV2UserStreamFilteredByGroups(userGroups) {
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
/** Коды implementationStream пользователя из groups Keycloak. */
export function resolveV2UserImplementationStreamsFromGroups(userGroups) {
    if (!isV2UserStreamFilteredByGroups(userGroups)) {
        return [];
    }
    const departmentsAndStreams = extractDepartmentsAndStreamGroups(userGroups);
    const mapped = departmentsAndStreams.flatMap((group) => DEPARTMENT_TO_V2_STREAM_CODES[group] ?? []);
    const directCodes = departmentsAndStreams.filter((group) => isV2ImplementationStreamCode(group));
    return expandStreamCodeAliases([...mapped, ...directCodes]);
}
