"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeStreamBlockExecutor = normalizeStreamBlockExecutor;
exports.normalizeStreamBlockExecutors = normalizeStreamBlockExecutors;
exports.serializeStreamBlockExecutors = serializeStreamBlockExecutors;
exports.resolveStreamBlockExecutorsLabel = resolveStreamBlockExecutorsLabel;
exports.inferLegacyStreamBlockExecutorCode = inferLegacyStreamBlockExecutorCode;
exports.resolveStreamBlockExecutorLabel = resolveStreamBlockExecutorLabel;
exports.resolveStreamBlockExecutorScopeStreams = resolveStreamBlockExecutorScopeStreams;
exports.resolveLogicStreamForDbExecutor = resolveLogicStreamForDbExecutor;
exports.resolveLogicStreamDbExecutor = resolveLogicStreamDbExecutor;
const v2_executor_streams_util_1 = require("./v2-executor-streams.util");
const v2_implementation_streams_util_1 = require("./v2-implementation-streams.util");
const v2_model_stream_typical_works_constants_1 = require("./v2-model-stream-typical-works.constants");
const LEGACY_EXECUTOR_LABEL_TO_CODE = {
    ПиРМ: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM,
    "Источники данных": v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
    "Контроль моделей": v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL,
    "Цифровые агенты": v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT,
    "Потоковые данные": v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.STRDAT,
};
const LEGACY_BLOCK_KEY_TO_CODE = {
    streamDataSources: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.IDSRC,
    streamModelControl: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.MDLCTL,
    streamDigitalAgents: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DIGAGT,
    streamStreamingData: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.STRDAT,
    field_i8dL7QZa: v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.DADM,
};
/** DB-имена стримов типовых работ, сопоставимые коду блока (для фильтрации работ). */
const IMPLEMENTATION_STREAM_DB_SCOPE = {
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
    [v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM.PIRM]: ["ПиРМ", "ПiРМ (правила и развитие модели)"],
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
/** Нормализует код или legacy-подпись стрима → код V2_IMPLEMENTATION_STREAM. */
function normalizeStreamBlockExecutor(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    if ((0, v2_implementation_streams_util_1.isV2ImplementationStreamCode)(trimmed))
        return trimmed;
    for (const code of v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES) {
        if (v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code] === trimmed)
            return code;
    }
    if ((0, v2_executor_streams_util_1.isV2ExecutorStreamLabel)(trimmed)) {
        return LEGACY_EXECUTOR_LABEL_TO_CODE[trimmed] ?? null;
    }
    return null;
}
/** Нормализует одно значение или массив в уникальный список кодов (порядок сохраняется). */
function normalizeStreamBlockExecutors(value) {
    if (typeof value === "string") {
        const code = normalizeStreamBlockExecutor(value);
        return code ? [code] : [];
    }
    if (!Array.isArray(value))
        return [];
    const result = [];
    for (const item of value) {
        if (typeof item !== "string")
            continue;
        const code = normalizeStreamBlockExecutor(item);
        if (code && !result.includes(code))
            result.push(code);
    }
    return result;
}
/** Сериализация в uiSchema: один код — строка, несколько — массив. */
function serializeStreamBlockExecutors(executors) {
    if (executors.length === 0)
        return undefined;
    if (executors.length === 1)
        return executors[0];
    return [...executors];
}
function resolveStreamBlockExecutorsLabel(value) {
    const codes = normalizeStreamBlockExecutors(value);
    if (codes.length === 0)
        return "";
    return codes.map((code) => v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code]).join(", ");
}
function inferLegacyStreamBlockExecutorCode(blockKey) {
    const direct = LEGACY_BLOCK_KEY_TO_CODE[blockKey];
    if (direct)
        return direct;
    const legacyLabel = (0, v2_executor_streams_util_1.inferLegacyStreamExecutorForBlockKey)(blockKey);
    if (legacyLabel)
        return normalizeStreamBlockExecutor(legacyLabel);
    return null;
}
function resolveStreamBlockExecutorLabel(value) {
    const code = normalizeStreamBlockExecutor(value);
    if (code)
        return v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code];
    return value.trim();
}
/** Стримы БД / подписи, в которых ищется назначение работы для блока. */
function resolveStreamBlockExecutorScopeStreams(executor) {
    const code = normalizeStreamBlockExecutor(executor);
    if (!code) {
        const trimmed = executor.trim();
        return trimmed ? [trimmed] : [];
    }
    const scoped = IMPLEMENTATION_STREAM_DB_SCOPE[code];
    const label = v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code];
    const result = scoped ? [...scoped] : [];
    if (!result.includes(code))
        result.push(code);
    if (!result.includes(label))
        result.push(label);
    // Legacy umbrella: старые типовые работы привязаны к «Модельный стрим».
    if ((0, v2_model_stream_typical_works_constants_1.isV2ModelImplementationStreamCode)(code) &&
        !result.includes(v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR)) {
        result.push(v2_model_stream_typical_works_constants_1.V2_MODEL_STREAM_EXECUTOR);
    }
    return result;
}
/** Код implementationStream для имени стрима в БД типовых работ. */
function resolveLogicStreamForDbExecutor(dbStream) {
    const trimmed = dbStream.trim();
    if (!trimmed)
        return null;
    const direct = normalizeStreamBlockExecutor(trimmed);
    if (direct)
        return direct;
    const area = v2_executor_streams_util_1.V2_DB_STREAM_TO_EXECUTOR_AREA[trimmed];
    if (area)
        return normalizeStreamBlockExecutor(area);
    for (const code of v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_CODES) {
        const scoped = IMPLEMENTATION_STREAM_DB_SCOPE[code];
        if (scoped?.includes(trimmed))
            return code;
    }
    return null;
}
/** Каноническое имя стрима в БД типовых работ для кода / legacy-значения. */
function resolveLogicStreamDbExecutor(codeOrValue) {
    const code = normalizeStreamBlockExecutor(codeOrValue);
    if (!code)
        return codeOrValue.trim();
    const scoped = IMPLEMENTATION_STREAM_DB_SCOPE[code];
    const label = v2_implementation_streams_util_1.V2_IMPLEMENTATION_STREAM_LABELS[code];
    if (scoped?.includes(label))
        return label;
    if (scoped?.length)
        return scoped[0];
    return label;
}
