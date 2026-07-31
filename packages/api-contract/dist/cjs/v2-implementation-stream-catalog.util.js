"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE = void 0;
exports.buildFactoryImplementationStreamPayload = buildFactoryImplementationStreamPayload;
exports.buildFactoryModelUmbrellaStreamCatalogEntry = buildFactoryModelUmbrellaStreamCatalogEntry;
exports.buildFactoryImplementationStreamCatalog = buildFactoryImplementationStreamCatalog;
exports.parseImplementationStreamPayload = parseImplementationStreamPayload;
exports.normalizeImplementationStreamCatalogEntry = normalizeImplementationStreamCatalogEntry;
exports.isValidImplementationStreamCodeFormat = isValidImplementationStreamCodeFormat;
exports.findImplementationStreamCatalogEntry = findImplementationStreamCatalogEntry;
exports.resolveCatalogEntryScopeStreams = resolveCatalogEntryScopeStreams;
exports.resolveModelStreamCatalogScopeFromEntries = resolveModelStreamCatalogScopeFromEntries;
exports.isUmbrellaStreamCatalogEntry = isUmbrellaStreamCatalogEntry;
exports.isFactoryProtectedStreamCode = isFactoryProtectedStreamCode;
exports.resolveCatalogDbExecutorName = resolveCatalogDbExecutorName;
exports.buildStreamFilterAliasMap = buildStreamFilterAliasMap;
exports.catalogCodes = catalogCodes;
exports.catalogEnumPair = catalogEnumPair;
exports.buildFactoryAnketaFormStreamDictionaryItems = buildFactoryAnketaFormStreamDictionaryItems;
/**
 * Каталог стрим-исполнителей (таблица `v2_stream` / factory fallback).
 * Справочник формы `v2.generalInfo.implementationStream` — отдельно (только enum анкеты).
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
    const isModelStream = v2_model_stream_typical_works_constants_1.V2_MODEL_IMPLEMENTATION_STREAM_CODES.includes(code);
    return {
        storeCode: true,
        fieldPointer: FIELD_POINTER,
        dbNames,
        legacyLabels: [...(FACTORY_LEGACY_LABELS[code] ?? [])],
        keycloakAliases: [...(FACTORY_KEYCLOAK_ALIASES[code] ?? [])],
        isModelStream,
        isUmbrellaStream: false,
        v1Labels: [...(FACTORY_V1_LABELS[code] ?? [])],
    };
}
/** Заводской зонтичный стрим «Модельный стрим» (реестр / конструктор типовых работ). */
function buildFactoryModelUmbrellaStreamCatalogEntry() {
    return {
        code: v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_UMBRELLA_CODE,
        label: v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR,
        order: -1,
        // Зонтик: в реестре isActive=false; каталог типовых работ резолвится по коду.
        isActive: false,
        payload: {
            storeCode: true,
            fieldPointer: FIELD_POINTER,
            dbNames: [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR, "Модельные стримы"],
            legacyLabels: [v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR, "Модельные стримы"],
            keycloakAliases: [],
            isModelStream: false,
            isUmbrellaStream: true,
            v1Labels: [],
        },
    };
}
/** Factory entries для seed / soft-sync / fallback до загрузки БД. */
function buildFactoryImplementationStreamCatalog() {
    const children = v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES.map((code, order) => ({
        code,
        label: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code],
        order,
        isActive: true,
        payload: buildFactoryImplementationStreamPayload(code),
    }));
    return [buildFactoryModelUmbrellaStreamCatalogEntry(), ...children];
}
function parseImplementationStreamPayload(raw, options) {
    const record = raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw
        : {};
    const label = options?.label?.trim() ?? "";
    const code = options?.code?.trim() ?? "";
    let dbNames = asStringArray(record.dbNames);
    if (dbNames.length === 0) {
        // Канон для назначений типовых работ: код (как в uiSchema.streamExecutor),
        // плюс подпись для обратной совместимости / отображения.
        if (code)
            dbNames.push(code);
        if (label && !dbNames.includes(label))
            dbNames.push(label);
    }
    const isUmbrellaStream = record.isUmbrellaStream === true ||
        code === v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_UMBRELLA_CODE;
    return {
        storeCode: true,
        fieldPointer: typeof record.fieldPointer === "string" && record.fieldPointer.trim()
            ? record.fieldPointer.trim()
            : FIELD_POINTER,
        dbNames,
        legacyLabels: asStringArray(record.legacyLabels),
        keycloakAliases: asStringArray(record.keycloakAliases),
        isModelStream: !isUmbrellaStream && record.isModelStream === true,
        isUmbrellaStream,
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
        payload: parseImplementationStreamPayload(input.payload, { label, code }),
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
    if (entry.payload.isModelStream || entry.payload.isUmbrellaStream) {
        push(v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR);
        push("Модельные стримы");
        push(v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_UMBRELLA_CODE);
    }
    return result;
}
function resolveModelStreamCatalogScopeFromEntries(catalog) {
    const result = [
        v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR,
        "Модельные стримы",
        v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_UMBRELLA_CODE,
    ];
    for (const entry of catalog) {
        if (!entry.isActive)
            continue;
        if (!entry.payload.isModelStream && !entry.payload.isUmbrellaStream) {
            continue;
        }
        for (const name of resolveCatalogEntryScopeStreams(entry)) {
            if (!result.includes(name))
                result.push(name);
        }
    }
    return result;
}
/** Зонтичный стрим (payload или заводской код mdls). */
function isUmbrellaStreamCatalogEntry(entry) {
    return entry.payload.isUmbrellaStream === true;
}
/** Заводские коды, которые нельзя удалить из реестра. */
function isFactoryProtectedStreamCode(code) {
    const trimmed = code.trim();
    return ((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)(trimmed) ||
        trimmed === v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_UMBRELLA_CODE);
}
/** Каноническое DB-имя для назначения типовой работы. */
function resolveCatalogDbExecutorName(entry) {
    if (entry.payload.isUmbrellaStream) {
        return entry.payload.dbNames[0] ?? entry.label;
    }
    // Кастомные стримы: код совпадает с ui:options.streamExecutor стрим-блока.
    // Заводские — первое dbNames (исторические русские имена в БД).
    if (!(0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)(entry.code)) {
        return entry.code;
    }
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
    const includeUmbrella = options?.includeUmbrella === true;
    return catalog
        .filter((entry) => (activeOnly ? entry.isActive : true))
        .filter((entry) => includeUmbrella || !entry.payload.isUmbrellaStream)
        .map((entry) => entry.code);
}
/** Коды/подписи из каталога реестра (без зонтичных). Форма анкеты — из словаря. */
function catalogEnumPair(catalog) {
    const active = catalog
        .filter((entry) => entry.isActive && !entry.payload.isUmbrellaStream)
        .slice()
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, "ru"));
    return {
        enums: active.map((entry) => entry.code),
        enumNames: active.map((entry) => entry.label),
    };
}
/** Заводские items словаря формы: только 5 модельных стримов (1:1 с select анкеты). */
function buildFactoryAnketaFormStreamDictionaryItems() {
    return v2_model_stream_typical_works_constants_1.V2_MODEL_IMPLEMENTATION_STREAM_CODES.map((code, order) => ({
        code,
        label: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code],
        order,
        payload: { storeCode: true },
    }));
}
