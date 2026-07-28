/**
 * Boolean-поля без третьего состояния: отсутствующие / null / "" → `false`,
 * legacy «Да»/«Нет» → boolean. Не трогает «заполненность» строки через
 * schema.default (RJSF), а нормализует уже существующий formData.
 * Возвращает тот же объект, если изменений нет.
 */
export declare function applyBooleanDefaultsToFormData(formData: unknown, schema: unknown): Record<string, unknown>;
/** Заполняет boolean-поля в одной строке/объекте по schema.properties / items. */
export declare function applyBooleanDefaultsToObject(values: Record<string, unknown>, schema: unknown): Record<string, unknown>;
