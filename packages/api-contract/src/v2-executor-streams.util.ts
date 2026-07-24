/** Справочник стримов-исполнителей в редакторе логики и на стримовых блоках анкеты. */
import {
	normalizeStreamBlockExecutor,
	normalizeStreamBlockExecutors,
	resolveStreamBlockExecutorScopeStreams,
} from "./v2-stream-block-executor.util";
import {
	resolveModelStreamCatalogScopeDbStreams,
	V2_MODEL_STREAM_EXECUTOR,
	isV2ModelImplementationStreamCode,
} from "./v2-model-stream-typical-works.constants";
import {
	resolveModelStreamCatalogScopeFromEntries,
	type V2ImplementationStreamCatalogEntry,
} from "./v2-implementation-stream-catalog.util";
import { isV2ImplementationStreamCode } from "./v2-implementation-streams.util";

export const V2_EXECUTOR_STREAM_LABELS = [
	"ДАДМ",
	"ПиРМ",
	"Источники данных",
	"Контроль моделей",
	"Цифровые агенты",
	"Потоковые данные",
	"Модельный стрим",
] as const;

export type V2ExecutorStreamLabel = (typeof V2_EXECUTOR_STREAM_LABELS)[number];

/**
 * @deprecated Используйте `V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE`
 * (`v2.generalInfo.implementationStream`). Константа оставлена для совместимости.
 */
export const V2_EXECUTOR_STREAMS_DICTIONARY_CODE =
	"v2.generalInfo.implementationStream";

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
		"Модельный стрим": "Модельный стрим",
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
	"Модельный стрим": resolveModelStreamCatalogScopeDbStreams(),
};

/** Стримы БД/области UI, в которых ищется назначение работы для блока typicalWork. */
export function resolveExecutorScopeDbStreams(
	executorStream: string,
	catalog?: readonly V2ImplementationStreamCatalogEntry[],
): readonly string[] {
	const trimmed = executorStream.trim();
	if (!trimmed) return [];

	if (
		trimmed === V2_MODEL_STREAM_EXECUTOR ||
		trimmed === "Модельные стримы"
	) {
		if (catalog?.length) {
			return resolveModelStreamCatalogScopeFromEntries(catalog);
		}
		return resolveModelStreamCatalogScopeDbStreams();
	}

	if (isV2ExecutorStreamLabel(trimmed)) {
		if (trimmed === V2_MODEL_STREAM_EXECUTOR && catalog?.length) {
			return resolveModelStreamCatalogScopeFromEntries(catalog);
		}
		return EXECUTOR_SCOPE_DB_STREAMS[trimmed] ?? [trimmed];
	}

	// Код / DB-имя модельного стрима → его scope (+ legacy umbrella).
	const asCode =
		(isV2ImplementationStreamCode(trimmed) ? trimmed : null) ??
		normalizeStreamBlockExecutor(trimmed, catalog);
	if (asCode && isV2ModelImplementationStreamCode(asCode)) {
		const scoped = [
			...resolveStreamBlockExecutorScopeStreams(asCode, catalog),
		];
		if (!scoped.includes(V2_MODEL_STREAM_EXECUTOR)) {
			scoped.push(V2_MODEL_STREAM_EXECUTOR);
		}
		return scoped;
	}

	if (normalizeStreamBlockExecutor(trimmed, catalog)) {
		return resolveStreamBlockExecutorScopeStreams(trimmed, catalog);
	}

	return [trimmed];
}

/** Работа назначена на стрим-исполнитель блока typicalWork (legacy без boundWorkIds). */
export function typicalWorkAssignedToExecutorStream(
	workStreams: readonly string[],
	executorStream: string,
): boolean {
	const trimmed = executorStream.trim();
	if (!trimmed) return false;
	const scopeStreams = resolveExecutorScopeDbStreams(trimmed);
	return workStreams.some(
		(stream) =>
			scopeStreams.includes(stream.trim()) ||
			scopeStreams.includes(resolveExecutorStreamAreaLabel(stream)),
	);
}

/** Работа назначена хотя бы на один из стримов-исполнителей блока. */
export function typicalWorkAssignedToAnyExecutorStream(
	workStreams: readonly string[],
	executorStreams: string | readonly string[],
): boolean {
	const executors = normalizeStreamBlockExecutors(executorStreams);
	if (executors.length === 0) return false;
	return executors.some((executor) =>
		typicalWorkAssignedToExecutorStream(workStreams, executor),
	);
}
