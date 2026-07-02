/**
 * `localParams` стрима для массива типовых работ (любой блок с `streamBlock` /
 * legacy `streamDataSources` / `streamModelControl`).
 */
export declare function readStreamLocalParamsForTypicalOutput(data: Record<string, unknown>, outputArrayPath: string, uiSchema?: Record<string, unknown>): Record<string, unknown>;
/** Локальные параметры стрима + строка компонента; поля источника перекрывают localParams. */
export declare function mergeTypicalCoefficientContext(localParams: Record<string, unknown>, sourceRow: Record<string, unknown>): Record<string, unknown>;
