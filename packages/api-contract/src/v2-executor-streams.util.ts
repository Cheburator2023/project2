/** Справочник стримов-исполнителей в редакторе логики и на стримовых блоках анкеты. */
export const V2_EXECUTOR_STREAM_LABELS = [
	"ДАДМ",
	"ПиРМ",
	"Источники данных",
	"Контроль моделей",
	"Цифровые агенты",
	"Потоковые данные",
] as const;

export type V2ExecutorStreamLabel = (typeof V2_EXECUTOR_STREAM_LABELS)[number];

/** Код справочника v2 для привязки блока к стриму (конструктор). */
export const V2_EXECUTOR_STREAMS_DICTIONARY_CODE = "v2.streams.executor";

/** Заводские ключи корневых блоков → стрим (миграция старых шаблонов). */
export const V2_LEGACY_STREAM_BLOCK_EXECUTOR: Partial<
	Record<string, V2ExecutorStreamLabel>
> = {
	streamDataSources: "Источники данных",
	streamModelControl: "Контроль моделей",
	streamDigitalAgents: "Цифровые агенты",
	streamStreamingData: "Потоковые данные",
	field_i8dL7QZa: "ДАДМ",
	field_aJEu5ziT: "ПиРМ",
};

/** Имена стримов в БД типовых работ → область UI. */
export const V2_DB_STREAM_TO_EXECUTOR_AREA: Record<string, V2ExecutorStreamLabel> =
	{
		"ИД. Внутренний": "Источники данных",
		"ИД. Внешний": "Источники данных",
		"ПиРМ (правила и развитие модели)": "ПиРМ",
		"Витрины данных": "ДАДМ",
		Интеграции: "ДАДМ",
		"Модельный сервис": "ДАДМ",
		"Сопровождение и поддержка": "ДАДМ",
		"Архитектура данных": "ДАДМ",
	};

export function isV2ExecutorStreamLabel(
	value: string,
): value is V2ExecutorStreamLabel {
	return (V2_EXECUTOR_STREAM_LABELS as readonly string[]).includes(value);
}

export function inferLegacyStreamExecutorForBlockKey(
	blockKey: string,
): V2ExecutorStreamLabel | null {
	return V2_LEGACY_STREAM_BLOCK_EXECUTOR[blockKey] ?? null;
}

export function resolveExecutorStreamAreaLabel(stream: string): string {
	return V2_DB_STREAM_TO_EXECUTOR_AREA[stream] ?? stream;
}

/** DB-стримы, сопоставляемые области UI (для фильтрации работ по стриму блока). */
const EXECUTOR_SCOPE_DB_STREAMS: Partial<
	Record<V2ExecutorStreamLabel, readonly string[]>
> = {
	"Источники данных": ["ИД. Внутренний", "ИД. Внешний", "Источники данных"],
	ПиРМ: ["ПиРМ", "ПиРМ (правила и развитие модели)"],
};

/** Стримы БД/области UI, в которых ищется назначение работы для блока typicalWork. */
export function resolveExecutorScopeDbStreams(
	executorStream: string,
): readonly string[] {
	const trimmed = executorStream.trim();
	if (!trimmed) return [];
	if (isV2ExecutorStreamLabel(trimmed)) {
		return EXECUTOR_SCOPE_DB_STREAMS[trimmed] ?? [trimmed];
	}
	return [trimmed];
}

/** Работа назначена на стрим-исполнитель блока typicalWork (legacy без boundWorkIds). */
export function typicalWorkAssignedToExecutorStream(
	workStreams: readonly string[],
	executorStream: string,
): boolean {
	const scopeStreams = resolveExecutorScopeDbStreams(executorStream);
	return workStreams.some(
		(stream) =>
			scopeStreams.includes(stream) ||
			scopeStreams.includes(resolveExecutorStreamAreaLabel(stream)),
	);
}
