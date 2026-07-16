"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_DB_STREAM_TO_EXECUTOR_AREA = exports.V2_LEGACY_STREAM_BLOCK_EXECUTOR = exports.V2_EXECUTOR_STREAMS_DICTIONARY_CODE = exports.V2_EXECUTOR_STREAM_LABELS = void 0;
exports.isV2ExecutorStreamLabel = isV2ExecutorStreamLabel;
exports.inferLegacyStreamExecutorForBlockKey = inferLegacyStreamExecutorForBlockKey;
exports.resolveExecutorStreamAreaLabel = resolveExecutorStreamAreaLabel;
exports.resolveExecutorScopeDbStreams = resolveExecutorScopeDbStreams;
exports.typicalWorkAssignedToExecutorStream = typicalWorkAssignedToExecutorStream;
/** Справочник стримов-исполнителей в редакторе логики и на стримовых блоках анкеты. */
exports.V2_EXECUTOR_STREAM_LABELS = [
    "ДАДМ",
    "ПиРМ",
    "Источники данных",
    "Контроль моделей",
    "Цифровые агенты",
    "Потоковые данные",
    "Модельный стрим",
];
/** Код справочника v2 для привязки блока к стриму (конструктор). */
exports.V2_EXECUTOR_STREAMS_DICTIONARY_CODE = "v2.streams.executor";
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
    "Модельный стрим": ["Модельный стрим"],
};
/** Стримы БД/области UI, в которых ищется назначение работы для блока typicalWork. */
function resolveExecutorScopeDbStreams(executorStream) {
    const trimmed = executorStream.trim();
    if (!trimmed)
        return [];
    if (isV2ExecutorStreamLabel(trimmed)) {
        return EXECUTOR_SCOPE_DB_STREAMS[trimmed] ?? [trimmed];
    }
    return [trimmed];
}
/** Работа назначена на стрим-исполнитель блока typicalWork (legacy без boundWorkIds). */
function typicalWorkAssignedToExecutorStream(workStreams, executorStream) {
    const scopeStreams = resolveExecutorScopeDbStreams(executorStream);
    return workStreams.some((stream) => scopeStreams.includes(stream) ||
        scopeStreams.includes(resolveExecutorStreamAreaLabel(stream)));
}
