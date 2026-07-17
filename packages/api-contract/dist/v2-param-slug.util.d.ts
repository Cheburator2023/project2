/** Legacy slug для paramCode из человекочитаемого названия параметра. */
export declare function slugParamCode(name: string): string;
/** Укладывает valueCode в varchar(120): enum-схемы часто используют длинный текст как code. */
export declare function normalizeStoredValueCode(code: string, label?: string | null): string;
export declare function normalizeStoredValueLabel(label: string | null | undefined): string | null;
/** Код/метка триггера из factory CSV («Да» → true для boolean-полей схемы). */
export declare function resolveCatalogTriggerStoredValue(label: string): {
    valueCode: string;
    valueLabel: string;
};
