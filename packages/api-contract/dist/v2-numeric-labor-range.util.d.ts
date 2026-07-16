export type NumericLaborRangePreset = {
    valueCode: string;
    valueLabel: string;
    coefficient: number;
};
export declare const METRICS_COUNT_LABOR_RANGES: NumericLaborRangePreset[];
/** Коэффициенты доп. витрин по legacy-формуле: 1 → 1, n>1 → 1+(n−1)×0.75. */
export declare function buildProductionAdditionalVitrinsLaborRows(): NumericLaborRangePreset[];
/** Стартовые строки «По значениям» для известных числовых параметров. */
export declare function resolveNumericLaborPresetRows(paramName: string | null | undefined): NumericLaborRangePreset[] | null;
export declare function isNumericLaborByValueParam(input: {
    numeric?: boolean;
    values?: unknown[];
    name?: string | null;
}): boolean;
export declare function buildNumericLaborCoefficientRows(preset: NumericLaborRangePreset[], ctx: {
    streamExecutor: string;
    paramCode: string;
    paramName: string | null;
    idPrefix?: string;
}): Array<{
    id: string;
    streamExecutor: string;
    paramCode: string;
    paramName: string | null;
    valueCode: string;
    valueLabel: string;
    coefficient: number;
}>;
