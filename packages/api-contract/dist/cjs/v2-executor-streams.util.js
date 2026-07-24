"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_DB_STREAM_TO_EXECUTOR_AREA = exports.V2_LEGACY_STREAM_BLOCK_EXECUTOR = exports.V2_EXECUTOR_STREAMS_DICTIONARY_CODE = exports.V2_EXECUTOR_STREAM_LABELS = void 0;
exports.isV2ExecutorStreamLabel = isV2ExecutorStreamLabel;
exports.inferLegacyStreamExecutorForBlockKey = inferLegacyStreamExecutorForBlockKey;
exports.resolveExecutorStreamAreaLabel = resolveExecutorStreamAreaLabel;
exports.resolveExecutorScopeDbStreams = resolveExecutorScopeDbStreams;
exports.typicalWorkAssignedToExecutorStream = typicalWorkAssignedToExecutorStream;
exports.typicalWorkAssignedToAnyExecutorStream = typicalWorkAssignedToAnyExecutorStream;
/** Справочник стримов-исполнителей в редакторе логики и на стримовых блоках анкеты. */
const v2_stream_block_executor_util_1 = require("./v2-stream-block-executor.util");
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
const v2_implementation_stream_catalog_util_1 = require("./v2-implementation-stream-catalog.util");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
exports.V2_EXECUTOR_STREAM_LABELS = [
    "ДАДМ",
    "ПиРМ",
    "Источники данных",
    "Контроль моделей",
    "Цифровые агенты",
    "Потоковые данные",
    "Модельный стрим",
];
/**
 * @deprecated Используйте `V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE`
 * (`v2.generalInfo.implementationStream`). Константа оставлена для совместимости.
 */
exports.V2_EXECUTOR_STREAMS_DICTIONARY_CODE = "v2.generalInfo.implementationStream";
/** Заводские ключи корневых блоков → стрим (миграция старых шаблонов). */
exports.V2_LEGACY_STREAM_BLOCK_EXECUTOR = {
    streamDataSources: "Источники данных",
    streamModelControl: "Контроль моделей",
    streamDigitalAgents: "Цифровые агенты",
    streamStreamingData: "Потоковые данные",
    field_i8dL7QZa: "ДАДМ",
    field_aJEu5ziT: "ПиРМ",
};
/** Имена стримов в БД типовых работ → область UI. */
exports.V2_DB_STREAM_TO_EXECUTOR_AREA = {
    "ИД. Внутренний": "Источники данных",
    "ИД. Внешний": "Источники данных",
    "ПиРМ (правила и развитие модели)": "ПиРМ",
    "Витрины данных": "ДАДМ",
    Интеграции: "ДАДМ",
    "Модельный сервис": "ДАДМ",
    "Сопровождение и поддержка": "ДАДМ",
    "Архитектура данных": "ДАДМ",
    "Модельный стрим": "Модельный стрим",
};
function isV2ExecutorStreamLabel(value) {
    return exports.V2_EXECUTOR_STREAM_LABELS.includes(value);
}
function inferLegacyStreamExecutorForBlockKey(blockKey) {
    return exports.V2_LEGACY_STREAM_BLOCK_EXECUTOR[blockKey] ?? null;
}
function resolveExecutorStreamAreaLabel(stream) {
    return exports.V2_DB_STREAM_TO_EXECUTOR_AREA[stream] ?? stream;
}
/** DB-стримы, сопоставляемые области UI (для фильтрации работ по стриму блока). */
const EXECUTOR_SCOPE_DB_STREAMS = {
    "Источники данных": ["ИД. Внутренний", "ИД. Внешний", "Источники данных"],
    ПиРМ: ["ПиРМ", "ПиРМ (правила и развитие модели)"],
    "Модельный стрим": (0, v2_model_stream_typical_works_constants_1.resolveModelStreamCatalogScopeDbStreams)(),
};
/** Стримы БД/области UI, в которых ищется назначение работы для блока typicalWork. */
function resolveExecutorScopeDbStreams(executorStream, catalog) {
    const trimmed = executorStream.trim();
    if (!trimmed)
        return [];
    if (trimmed === v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR ||
        trimmed === "Модельные стримы") {
        if (catalog?.length) {
            return (0, v2_implementation_stream_catalog_util_1.resolveModelStreamCatalogScopeFromEntries)(catalog);
        }
        return (0, v2_model_stream_typical_works_constants_1.resolveModelStreamCatalogScopeDbStreams)();
    }
    if (isV2ExecutorStreamLabel(trimmed)) {
        if (trimmed === v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR && catalog?.length) {
            return (0, v2_implementation_stream_catalog_util_1.resolveModelStreamCatalogScopeFromEntries)(catalog);
        }
        return EXECUTOR_SCOPE_DB_STREAMS[trimmed] ?? [trimmed];
    }
    // Код / DB-имя модельного стрима → его scope (+ legacy umbrella).
    const asCode = ((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)(trimmed) ? trimmed : null) ??
        (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutor)(trimmed, catalog);
    if (asCode && (0, v2_model_stream_typical_works_constants_1.isV2ModelImplementationStreamCode)(asCode)) {
        const scoped = [
            ...(0, v2_stream_block_executor_util_1.resolveStreamBlockExecutorScopeStreams)(asCode, catalog),
        ];
        if (!scoped.includes(v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR)) {
            scoped.push(v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR);
        }
        return scoped;
    }
    if ((0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutor)(trimmed, catalog)) {
        return (0, v2_stream_block_executor_util_1.resolveStreamBlockExecutorScopeStreams)(trimmed, catalog);
    }
    return [trimmed];
}
/** Работа назначена на стрим-исполнитель блока typicalWork (legacy без boundWorkIds). */
function typicalWorkAssignedToExecutorStream(workStreams, executorStream, catalog) {
    const trimmed = executorStream.trim();
    if (!trimmed)
        return false;
    const scopeStreams = resolveExecutorScopeDbStreams(trimmed, catalog);
    return workStreams.some((stream) => scopeStreams.includes(stream.trim()) ||
        scopeStreams.includes(resolveExecutorStreamAreaLabel(stream)));
}
/** Работа назначена хотя бы на один из стримов-исполнителей блока. */
function typicalWorkAssignedToAnyExecutorStream(workStreams, executorStreams, catalog) {
    const executors = (0, v2_stream_block_executor_util_1.normalizeStreamBlockExecutors)(executorStreams, catalog);
    if (executors.length === 0)
        return false;
    return executors.some((executor) => typicalWorkAssignedToExecutorStream(workStreams, executor, catalog));
}
