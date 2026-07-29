/** Эталонные id 10 типовых работ модельного стрима (factory registry / anketa boundWorkIds). */
export declare const V2_MODEL_STREAM_FACTORY_WORK_IDS: readonly ["fbfa5b48-abae-442a-a7a7-6b7ccebe88f7", "8004b30d-592f-4fb6-81f4-b4e052f56d90", "64e97c0a-8662-4530-9aac-57016cf4f32e", "9c71a3a2-d980-4d39-a603-ca1d35f9ea31", "4a349bdc-be66-4c86-b36c-b6733eec8455", "d888922b-f141-4e9c-84bc-2c9dbc5dfee3", "278cd153-4188-4dea-bba7-a45edaed7bbf", "5862d9a7-b2d5-4a99-90f8-a042532a62aa", "053b1fbc-25ef-4182-9b78-dc100ce19712", "22c7a066-51de-4b59-b5a1-770733276212"];
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
/**
 * @deprecated Работы модельного стрима появляются только по триггеру (CSV).
 * Оставлено пустым для обратной совместимости импортов.
 */
export declare const V2_MODEL_STREAM_ALWAYS_SHOWN_WORK_IDS: ReadonlySet<string>;
/**
 * @deprecated Работы модельного стрима считаются только по триггеру (CSV).
 * Оставлено пустым для обратной совместимости импортов.
 */
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
