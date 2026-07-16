"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_USER_STREAM_FILTERED_ROLE_CODES = void 0;
exports.normalizeV2UserGroups = normalizeV2UserGroups;
exports.extractV2UserRoleCodes = extractV2UserRoleCodes;
exports.isV2UserStreamFilteredByGroups = isV2UserStreamFilteredByGroups;
exports.resolveV2UserImplementationStreamsFromGroups = resolveV2UserImplementationStreamsFromGroups;
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
/** Роли Keycloak, для которых стрим берётся из департамента / groups (как на бекенде). */
exports.V2_USER_STREAM_FILTERED_ROLE_CODES = [
    "ds",
    "de",
    "sarep",
    "data_expert",
    "mipm_stream",
    "modelops",
];
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
    [V2_DEPARTMENT_GROUPS.KIB_SMB]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB],
    [V2_DEPARTMENT_GROUPS.PARTNERSHIPS_IT]: [
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC,
    ],
    [V2_DEPARTMENT_GROUPS.RB]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB],
    [V2_DEPARTMENT_GROUPS.ML_ALGORITHMS]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND],
    [V2_DEPARTMENT_GROUPS.PROCESS_FINANCIAL]: [
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL,
    ],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.STRDAT]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.STRDAT],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT]: [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT],
};
const V2_IMPLEMENTATION_STREAM_LABEL_VALUES = Object.values(v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS);
function normalizeV2UserGroups(userGroups) {
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
function extractV2UserRoleCodes(userGroups) {
    const normalized = normalizeV2UserGroups(userGroups);
    return normalized.filter((group) => exports.V2_USER_STREAM_FILTERED_ROLE_CODES.includes(group));
}
function isV2UserStreamFilteredByGroups(userGroups) {
    return extractV2UserRoleCodes(userGroups).length > 0;
}
function extractDepartmentsAndStreamGroups(userGroups) {
    const normalized = normalizeV2UserGroups(userGroups);
    return normalized.filter((group) => Object.values(V2_DEPARTMENT_GROUPS).includes(group) ||
        Object.values(V2_LEGACY_STREAM_GROUPS).includes(group) ||
        v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES.includes(group) ||
        V2_IMPLEMENTATION_STREAM_LABEL_VALUES.includes(group));
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
/** Коды implementationStream пользователя из groups Keycloak. */
function resolveV2UserImplementationStreamsFromGroups(userGroups) {
    if (!isV2UserStreamFilteredByGroups(userGroups)) {
        return [];
    }
    const departmentsAndStreams = extractDepartmentsAndStreamGroups(userGroups);
    const mapped = departmentsAndStreams.flatMap((group) => DEPARTMENT_TO_V2_STREAM_CODES[group] ?? []);
    const directCodes = departmentsAndStreams.filter((group) => (0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)(group));
    return expandStreamCodeAliases([...mapped, ...directCodes]);
}
