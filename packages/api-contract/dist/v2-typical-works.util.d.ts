/**
 * `localParams` стрима для массива типовых работ (любой блок с `streamBlock` /
 * legacy `streamDataSources` / `streamModelControl`).
 */
export declare function readStreamLocalParamsForTypicalOutput(data: Record<string, unknown>, outputArrayPath: string, uiSchema?: Record<string, unknown>): Record<string, unknown>;
/** Локальные параметры стрима + строка компонента; поля источника перекрывают localParams. */
export declare function mergeTypicalCoefficientContext(localParams: Record<string, unknown>, sourceRow: Record<string, unknown>): Record<string, unknown>;
/**
 * Плоский контекст полей стрима для триггеров типовых работ.
 * Поля из вложенных групп (например «Группа Кирилла») доступны по ключу leaf-поля.
 */
export declare function flattenTypicalWorkStreamTriggerFields(streamBlock: Record<string, unknown>): Record<string, unknown>;
/** Контекст триггеров на уровне стрима (без строк sourceSystems). */
export declare function readTypicalWorksStreamTriggerContext(data: Record<string, unknown>, referencePath: string, uiSchema?: Record<string, unknown>): Record<string, unknown>;
export declare function hasTypicalWorkStreamTriggerContext(context: Record<string, unknown>): boolean;
/** Строка sourceSystems считается заполненной, если в ней есть хотя бы одно осмысленное поле. */
export declare function isFilledTypicalWorkSourceRow(row: Record<string, unknown>): boolean;
