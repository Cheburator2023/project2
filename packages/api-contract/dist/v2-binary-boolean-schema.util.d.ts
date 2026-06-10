/** Двузначные enum-справочники «да/нет» и «требуется/не требуется» → boolean в схеме. */
export declare function binaryEnumKey(values: string[]): string;
/** Подлежит ли поле замене string+enum на boolean. */
export declare function isBinaryBooleanEnum(values: string[]): boolean;
/** true ↔ «Да» / «Требуется», false ↔ «Нет» / «Не требуется». */
export declare function coerceBinaryBooleanFormValue(value: unknown): boolean | undefined;
export declare function isPositiveBinaryFormValue(value: unknown): boolean;
/** Ключ в coefficientByField.values для boolean или legacy string. */
export declare function binaryEnumCoeffKey(value: unknown, positiveLabel?: "Да" | "Требуется"): string | undefined;
