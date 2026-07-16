import { inferLegacyStreamExecutorForBlockKey, isV2ExecutorStreamLabel, V2_DB_STREAM_TO_EXECUTOR_AREA, } from "./v2-executor-streams.util";
import { V2_IMPLEMENTATION_STREAM, V2_IMPLEMENTATION_STREAM_CODES, V2_IMPLEMENTATION_STREAM_LABELS, isV2ImplementationStreamCode, } from "./v2-implementation-streams.util";
const LEGACY_EXECUTOR_LABEL_TO_CODE = {
    ПиРМ: V2_IMPLEMENTATION_STREAM.PIRM,
    "Источники данных": V2_IMPLEMENTATION_STREAM.IDSRC,
    "Контроль моделей": V2_IMPLEMENTATION_STREAM.MDLCTL,
    "Цифровые агенты": V2_IMPLEMENTATION_STREAM.DIGAGT,
    "Потоковые данные": V2_IMPLEMENTATION_STREAM.STRDAT,
};
const LEGACY_BLOCK_KEY_TO_CODE = {
    streamDataSources: V2_IMPLEMENTATION_STREAM.IDSRC,
    streamModelControl: V2_IMPLEMENTATION_STREAM.MDLCTL,
    streamDigitalAgents: V2_IMPLEMENTATION_STREAM.DIGAGT,
    streamStreamingData: V2_IMPLEMENTATION_STREAM.STRDAT,
    field_i8dL7QZa: V2_IMPLEMENTATION_STREAM.DADM,
};
/** DB-имена стримов типовых работ, сопоставимые коду блока (для фильтрации работ). */
const IMPLEMENTATION_STREAM_DB_SCOPE = {
    [V2_IMPLEMENTATION_STREAM.KMBKCB]: ["Разработка моделей КМБ и КСБ"],
    [V2_IMPLEMENTATION_STREAM.RB]: ["Моделирование РБ"],
    [V2_IMPLEMENTATION_STREAM.PTITPC]: ["AI-модели партнерств"],
    [V2_IMPLEMENTATION_STREAM.FINMDL]: ["Финансовое моделирование"],
    [V2_IMPLEMENTATION_STREAM.RND]: ["Моделирование RnD"],
    [V2_IMPLEMENTATION_STREAM.IDSRC]: [
        "ИД. Внутренний",
        "ИД. Внешний",
        "Источники данных",
    ],
    [V2_IMPLEMENTATION_STREAM.PIRM]: ["ПиРМ", "ПiРМ (правила и развитие модели)"],
    [V2_IMPLEMENTATION_STREAM.MDLCTL]: ["Контроль моделей"],
    [V2_IMPLEMENTATION_STREAM.DADM]: [
        "ДАДМ",
        "Витрины данных",
        "Интеграции",
        "Модельный сервис",
        "Сопровождение и поддержка",
        "Архитектура данных",
    ],
    [V2_IMPLEMENTATION_STREAM.STRDAT]: ["Потоковые данные"],
    [V2_IMPLEMENTATION_STREAM.DIGAGT]: ["Цифровые агенты"],
};
/** Нормализует код или legacy-подпись стрима → код V2_IMPLEMENTATION_STREAM. */
export function normalizeStreamBlockExecutor(value) {
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    if (isV2ImplementationStreamCode(trimmed))
        return trimmed;
    for (const code of V2_IMPLEMENTATION_STREAM_CODES) {
        if (V2_IMPLEMENTATION_STREAM_LABELS[code] === trimmed)
            return code;
    }
    if (isV2ExecutorStreamLabel(trimmed)) {
        return LEGACY_EXECUTOR_LABEL_TO_CODE[trimmed] ?? null;
    }
    return null;
}
export function inferLegacyStreamBlockExecutorCode(blockKey) {
    const direct = LEGACY_BLOCK_KEY_TO_CODE[blockKey];
    if (direct)
        return direct;
    const legacyLabel = inferLegacyStreamExecutorForBlockKey(blockKey);
    if (legacyLabel)
        return normalizeStreamBlockExecutor(legacyLabel);
    return null;
}
export function resolveStreamBlockExecutorLabel(value) {
    const code = normalizeStreamBlockExecutor(value);
    if (code)
        return V2_IMPLEMENTATION_STREAM_LABELS[code];
    return value.trim();
}
/** Стримы БД / подписи, в которых ищется назначение работы для блока. */
export function resolveStreamBlockExecutorScopeStreams(executor) {
    const code = normalizeStreamBlockExecutor(executor);
    if (!code) {
        const trimmed = executor.trim();
        return trimmed ? [trimmed] : [];
    }
    const scoped = IMPLEMENTATION_STREAM_DB_SCOPE[code];
    const label = V2_IMPLEMENTATION_STREAM_LABELS[code];
    const result = scoped ? [...scoped] : [];
    if (!result.includes(code))
        result.push(code);
    if (!result.includes(label))
        result.push(label);
    return result;
}
/** Код implementationStream для имени стрима в БД типовых работ. */
export function resolveLogicStreamForDbExecutor(dbStream) {
    const trimmed = dbStream.trim();
    if (!trimmed)
        return null;
    const direct = normalizeStreamBlockExecutor(trimmed);
    if (direct)
        return direct;
    const area = V2_DB_STREAM_TO_EXECUTOR_AREA[trimmed];
    if (area)
        return normalizeStreamBlockExecutor(area);
    for (const code of V2_IMPLEMENTATION_STREAM_CODES) {
        const scoped = IMPLEMENTATION_STREAM_DB_SCOPE[code];
        if (scoped?.includes(trimmed))
            return code;
    }
    return null;
}
/** Каноническое имя стрима в БД типовых работ для кода / legacy-значения. */
export function resolveLogicStreamDbExecutor(codeOrValue) {
    const code = normalizeStreamBlockExecutor(codeOrValue);
    if (!code)
        return codeOrValue.trim();
    const scoped = IMPLEMENTATION_STREAM_DB_SCOPE[code];
    const label = V2_IMPLEMENTATION_STREAM_LABELS[code];
    if (scoped?.includes(label))
        return label;
    if (scoped?.length)
        return scoped[0];
    return label;
}
