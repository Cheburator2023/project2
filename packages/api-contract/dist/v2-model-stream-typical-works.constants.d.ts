/** Эталонные id 10 типовых работ модельного стрима (factory registry). */
export declare const V2_MODEL_STREAM_FACTORY_WORK_IDS: readonly ["f5667ca4-4de8-4e65-a305-0a34b8945268", "6ee9b8be-c732-4444-8f77-c19a38304a7e", "b31f0862-349d-44df-9cd7-2fbafdc88c40", "ea346f5c-c67f-430c-b56a-53b59b5bc18c", "91929b5d-3e46-4c1e-95c7-0df362a74773", "744fddb7-0705-4c89-a389-32d802dcb37c", "86bb45a8-47da-425e-99be-3ff76b633378", "ddfd88fb-e256-4e2b-ba41-f15642109db2", "80e02a43-c142-4b67-bbd7-39e01e3a6f62", "91538af2-084d-442a-a860-cd8b36f5c0ec"];
export declare const V2_MODEL_STREAM_EXECUTOR = "\u041C\u043E\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u0440\u0438\u043C";
/**
 * Код зонтичного стрима в реестре implementationStream (не выбирается в анкете
 * как implementationStream — только каталог / конструктор типовых работ).
 */
export declare const V2_MODEL_STREAM_UMBRELLA_CODE = "mdls";
/**
 * Пять модельных стримов-исполнителей (ролевка / implementationStream).
 * Legacy-каталог «Модельный стрим» должен видеть назначения на любой из них.
 */
export declare const V2_MODEL_IMPLEMENTATION_STREAM_CODES: readonly ["kmbkcb", "rb", "ptitpc", "finmdl", "rnd"];
/** DB-имена пяти дочерних стримов (registry `streams` / `normsByStream`). */
export declare const V2_MODEL_STREAM_CHILD_DB_NAMES: readonly [string, string, string, string, string];
/** Mother + 5 children — полный список назначений factory model works. */
export declare const V2_MODEL_STREAM_REGISTRY_STREAM_NAMES: readonly ["Модельный стрим", string, string, string, string, string];
export declare function isV2ModelImplementationStreamCode(value: string): value is (typeof V2_MODEL_IMPLEMENTATION_STREAM_CODES)[number];
export declare function isV2ModelStreamUmbrellaLabel(value: string): boolean;
/** DB-имена + коды + legacy-подпись для каталога типовых работ модельного блока. */
export declare function resolveModelStreamCatalogScopeDbStreams(): readonly string[];
/** Всегда показываются в блоке типовых работ и в «Подробном расчёте». */
export declare const V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS: ReadonlySet<string>;
/** Всегда активны (формула считается даже без явных триггеров). */
export declare const V2_MODEL_STREAM_ALWAYS_ACTIVE_WORK_IDS: ReadonlySet<string>;
export declare function isModelStreamAlwaysShownWork(workId: string): boolean;
export declare function isModelStreamAlwaysActiveWork(workId: string): boolean;
/** Порядок строк модельного стрима в итоговой оценке (01 → … → AutoML: внедрение). */
export declare function compareModelStreamTypicalWorkNames(a: string, b: string): number;
export declare function sortModelStreamTypicalWorkRows<T extends {
    name?: unknown;
    workId?: unknown;
}>(rows: T[]): T[];
export type DedupeTypicalWorkRowsOptions = {
    /** Для стрима «Источники данных»: не склеивать разные объекты-источники. */
    groupBySourceName?: boolean;
};
/**
 * Одна работа — одна строка.
 * Fan-out по источникам/компонентам схлопывается: коэффициент и итог суммируются
 * (множитель = число дублей при исходном коэф. 1).
 */
export declare function dedupeTypicalWorkRowsByWorkId<T extends {
    workId?: unknown;
    name?: unknown;
    taskCode?: unknown;
    coefficient?: unknown;
    total?: unknown;
    estimateHoursPerDay?: unknown;
    coefficientDisplay?: unknown;
    sourceName?: unknown;
    reason?: unknown;
    formulaBreakdown?: unknown;
}>(rows: T[], options?: DedupeTypicalWorkRowsOptions): T[];
/** Строка модельного стрима для «Подробного расчёта»: только с ненулевым итогом. */
export declare function isModelStreamTypicalWorkVisibleInSummary(row: {
    total?: unknown;
}): boolean;
