/** Эталонные id 10 типовых работ модельного стрима (factory registry). */
export declare const V2_MODEL_STREAM_FACTORY_WORK_IDS: readonly ["f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4001", "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4002", "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4003", "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4004", "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4005", "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4006", "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4007", "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4008", "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4009", "f8e3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4010"];
export declare const V2_MODEL_STREAM_EXECUTOR = "\u041C\u043E\u0434\u0435\u043B\u044C\u043D\u044B\u0439 \u0441\u0442\u0440\u0438\u043C";
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
