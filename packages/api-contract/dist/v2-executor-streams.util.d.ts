/** Справочник стримов-исполнителей в редакторе логики и на стримовых блоках анкеты. */
export declare const V2_EXECUTOR_STREAM_LABELS: readonly ["ДАДМ", "ПиРМ", "Источники данных", "Контроль моделей", "Цифровые агенты", "Потоковые данные"];
export type V2ExecutorStreamLabel = (typeof V2_EXECUTOR_STREAM_LABELS)[number];
/** Код справочника v2 для привязки блока к стриму (конструктор). */
export declare const V2_EXECUTOR_STREAMS_DICTIONARY_CODE = "v2.streams.executor";
/** Заводские ключи корневых блоков → стрим (миграция старых шаблонов). */
export declare const V2_LEGACY_STREAM_BLOCK_EXECUTOR: Partial<Record<string, V2ExecutorStreamLabel>>;
/** Имена стримов в БД типовых работ → область UI. */
export declare const V2_DB_STREAM_TO_EXECUTOR_AREA: Record<string, V2ExecutorStreamLabel>;
export declare function isV2ExecutorStreamLabel(value: string): value is V2ExecutorStreamLabel;
export declare function inferLegacyStreamExecutorForBlockKey(blockKey: string): V2ExecutorStreamLabel | null;
export declare function resolveExecutorStreamAreaLabel(stream: string): string;
