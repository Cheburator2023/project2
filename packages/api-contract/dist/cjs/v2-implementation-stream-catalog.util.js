"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE = void 0;
exports.buildFactoryImplementationStreamPayload = buildFactoryImplementationStreamPayload;
exports.buildFactoryImplementationStreamCatalog = buildFactoryImplementationStreamCatalog;
exports.parseImplementationStreamPayload = parseImplementationStreamPayload;
exports.normalizeImplementationStreamCatalogEntry = normalizeImplementationStreamCatalogEntry;
exports.isValidImplementationStreamCodeFormat = isValidImplementationStreamCodeFormat;
exports.findImplementationStreamCatalogEntry = findImplementationStreamCatalogEntry;
exports.resolveCatalogEntryScopeStreams = resolveCatalogEntryScopeStreams;
exports.resolveModelStreamCatalogScopeFromEntries = resolveModelStreamCatalogScopeFromEntries;
exports.resolveCatalogDbExecutorName = resolveCatalogDbExecutorName;
exports.buildStreamFilterAliasMap = buildStreamFilterAliasMap;
exports.catalogCodes = catalogCodes;
exports.catalogEnumPair = catalogEnumPair;
/**
 * Каталог стрим-исполнителей (DB-owned): payload items словаря
 * `v2.generalInfo.implementationStream` + resolved DTO для клиента/Nest.
 */
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
Object.defineProperty(exports, "V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE", { enumerable: true, get: function () { return v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE; } });
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
const FIELD_POINTER = "/generalInfo/implementationStream";
/** Factory DB-scope / aliases (до загрузки каталога из БД). */
const FACTORY_DB_NAMES = {
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB]: ["Разработка моделей КМБ и КСБ"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB]: ["Моделирование РБ"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC]: ["AI-модели партнерств"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL]: ["Финансовое моделирование"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND]: ["Моделирование RnD"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC]: [
        "ИД. Внутренний",
        "ИД. Внешний",
        "Источники данных",
    ],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]: [
        "ПиРМ",
        "ПиРМ (правила и развитие модели)",
        "Платформы и Решения для моделирования",
    ],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL]: ["Контроль моделей"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM]: [
        "ДАДМ",
        "Витрины данных",
        "Интеграции",
        "Модельный сервис",
        "Сопровождение и поддержка",
        "Архитектура данных",
    ],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.STRDAT]: ["Потоковые данные"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT]: ["Цифровые агенты"],
};
const FACTORY_LEGACY_LABELS = {
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]: ["ПиРМ"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC]: ["Источники данных"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL]: ["Контроль моделей"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT]: ["Цифровые агенты"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.STRDAT]: ["Потоковые данные"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM]: ["ДАДМ"],
};
const FACTORY_KEYCLOAK_ALIASES = {
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB]: [
        "Управление моделирования КИБ и СМБ",
    ],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC]: [
        "Управление моделирования партнерств и ИТ-процессов",
    ],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB]: ["Управление моделирования РБ"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND]: [
        "Управление перспективных алгоритмов машинного обучения",
    ],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL]: [
        "Управление процессных и финансовых моделей",
    ],
};
const FACTORY_V1_LABELS = {
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.KMBKCB]: ["Разработка моделей для КМБ и КСБ"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PTITPC]: [
        "Модели партнерств и платформы больших данных",
    ],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RB]: ["Моделирование РБ"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.RND]: ["Моделирование RnD"],
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.FINMDL]: ["Финансовое моделирование"],
};
function asStringArray(value) {
    if (!Array.isArray(value))
        return [];
    const result = [];
    for (const item of value) {
        if (typeof item !== "string")
            continue;
        const trimmed = item.trim();
        if (trimmed && !result.includes(trimmed))
            result.push(trimmed);
    }
    return result;
}
function buildFactoryImplementationStreamPayload(code) {
    const label = v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code];
    const dbNames = [...(FACTORY_DB_NAMES[code] ?? [])];
    if (label && !dbNames.includes(label))
        dbNames.unshift(label);
    return {
        storeCode: true,
        fieldPointer: FIELD_POINTER,
        dbNames,
        legacyLabels: [...(FACTORY_LEGACY_LABELS[code] ?? [])],
        keycloakAliases: [...(FACTORY_KEYCLOAK_ALIASES[code] ?? [])],
        isModelStream: v2_model_stream_typical_works_constants_1.V2_MODEL_IMPLEMENTATION_STREAM_CODES.includes(code),
        v1Labels: [...(FACTORY_V1_LABELS[code] ?? [])],
    };
}
/** Factory entries для seed / soft-sync / fallback до загрузки БД. */
function buildFactoryImplementationStreamCatalog() {
    return v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES.map((code, order) => ({
        code,
        label: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code],
        order,
        isActive: true,
        payload: buildFactoryImplementationStreamPayload(code),
    }));
}
function parseImplementationStreamPayload(raw, options) {
    const record = raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw
        : {};
    const label = options?.label?.trim() ?? "";
    let dbNames = asStringArray(record.dbNames);
    if (dbNames.length === 0 && label)
        dbNames = [label];
    return {
        storeCode: true,
        fieldPointer: typeof record.fieldPointer === "string" && record.fieldPointer.trim()
            ? record.fieldPointer.trim()
            : FIELD_POINTER,
        dbNames,
        legacyLabels: asStringArray(record.legacyLabels),
        keycloakAliases: asStringArray(record.keycloakAliases),
        isModelStream: record.isModelStream === true,
        v1Labels: asStringArray(record.v1Labels),
    };
}
function normalizeImplementationStreamCatalogEntry(input) {
    const code = input.code.trim();
    const label = input.label.trim();
    if (!code || !label)
        return null;
    return {
        code,
        label,
        order: typeof input.order === "number" && Number.isFinite(input.order)
            ? input.order
            : 0,
        isActive: input.isActive !== false,
        payload: parseImplementationStreamPayload(input.payload, { label }),
    };
}
/** Валидация кода стрима (formData / streamExecutor): 1–6 символов, [a-z0-9]. */
function isValidImplementationStreamCodeFormat(code) {
    return /^[a-z0-9]{1,6}$/.test(code.trim());
}
function findImplementationStreamCatalogEntry(value, catalog) {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    for (const entry of catalog) {
        if (!entry.isActive && entry.code !== trimmed)
            continue;
        if (entry.code === trimmed || entry.label === trimmed)
            return entry;
        if (entry.payload.dbNames.includes(trimmed))
            return entry;
        if (entry.payload.legacyLabels.includes(trimmed))
            return entry;
        if (entry.payload.v1Labels.includes(trimmed))
            return entry;
        if (entry.payload.keycloakAliases.includes(trimmed))
            return entry;
    }
    return null;
}
/** Scope DB-имён для фильтра типовых работ по коду/подписи стрима. */
function resolveCatalogEntryScopeStreams(entry) {
    const result = [];
    const push = (value) => {
        const trimmed = value.trim();
        if (trimmed && !result.includes(trimmed))
            result.push(trimmed);
    };
    push(entry.code);
    push(entry.label);
    for (const name of entry.payload.dbNames)
        push(name);
    for (const name of entry.payload.legacyLabels)
        push(name);
    if (entry.payload.isModelStream) {
        push(v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR);
        push("Модельные стримы");
    }
    return result;
}
function resolveModelStreamCatalogScopeFromEntries(catalog) {
    const result = [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR, "Модельные стримы"];
    for (const entry of catalog) {
        if (!entry.isActive || !entry.payload.isModelStream)
            continue;
        for (const name of resolveCatalogEntryScopeStreams(entry)) {
            if (!result.includes(name))
                result.push(name);
        }
    }
    return result;
}
/** Каноническое DB-имя для назначения типовой работы. */
function resolveCatalogDbExecutorName(entry) {
    return entry.payload.dbNames[0] ?? entry.label;
}
/** Alias-map для stream filter: keycloak/dept → [code, label, v1…]. */
function buildStreamFilterAliasMap(catalog) {
    const map = {};
    const add = (key, values) => {
        const trimmed = key.trim();
        if (!trimmed)
            return;
        const bucket = map[trimmed] ?? (map[trimmed] = []);
        for (const value of values) {
            const v = value.trim();
            if (v && !bucket.includes(v))
                bucket.push(v);
        }
    };
    for (const entry of catalog) {
        if (!entry.isActive)
            continue;
        const aliases = [
            entry.code,
            entry.label,
            ...entry.payload.v1Labels,
            ...entry.payload.dbNames,
            ...entry.payload.legacyLabels,
        ];
        add(entry.code, aliases);
        for (const kc of entry.payload.keycloakAliases) {
            add(kc, aliases);
        }
    }
    return map;
}
function catalogCodes(catalog, options) {
    const activeOnly = options?.activeOnly !== false;
    return catalog
        .filter((entry) => (activeOnly ? entry.isActive : true))
        .map((entry) => entry.code);
}
function catalogEnumPair(catalog) {
    const active = catalog
        .filter((entry) => entry.isActive)
        .slice()
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "ru"));
    return {
        enums: active.map((entry) => entry.code),
        enumNames: active.map((entry) => entry.label),
    };
}
