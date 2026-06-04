/**
 * `localParams` стрима для массива типовых работ (`streamDataSources.*` /
 * `streamModelControl.*`).
 */
export declare function readStreamLocalParamsForTypicalOutput(data: Record<string, unknown>, outputArrayPath: string): Record<string, unknown>;
/** Локальные параметры стрима + строка компонента; поля источника перекрывают localParams. */
export declare function mergeTypicalCoefficientContext(localParams: Record<string, unknown>, sourceRow: Record<string, unknown>): Record<string, unknown>;
