import type { V2TypicalWorkFormulaDto, V2TypicalWorkLaborArchCountDto, V2WorkArchCountCoeffStep } from "./v2-typical-work.types";
export declare function isArchCountLaborParamName(paramName: string): boolean;
export declare function laborCoefficientValuesToArchCountSteps(values: ReadonlyArray<{
    label: string;
    coefficient: number;
}>): V2WorkArchCountCoeffStep[];
export declare function resolveArchCountLaborFromCatalog(paramName: string, values?: ReadonlyArray<{
    label: string;
    coefficient: number;
}>): V2TypicalWorkLaborArchCountDto | null;
export declare function splitCatalogLaborArchCounts<TLaborCoeff extends {
    paramName: string;
    values: Array<{
        label: string;
        coefficient: number;
    }>;
}>(input: {
    laborParams: string[];
    laborCoefficients?: TLaborCoeff[];
}): {
    laborParams: string[];
    laborCoefficients: TLaborCoeff[];
    laborArchCounts: V2TypicalWorkLaborArchCountDto[];
};
export declare function extractLaborArchCountsFromFormula(formula: V2TypicalWorkFormulaDto): V2TypicalWorkLaborArchCountDto[];
/**
 * Синхронизирует `arch_count_coeff` в формуле с блоком laborArchCounts.
 *
 * Важно: не пересобирает формулу с нуля — иначе ломаются операторы
 * (в т.ч. деление на этапах 02/04) и порядок операндов.
 * Существующие архкоэф обновляются на месте; недостающие вставляются как `× арх…` сразу после N.
 * В конце — repair (два операнда подряд / `× ÷` от старого reconcile).
 */
export declare function reconcileFormulaWithLaborArchCounts(formula: V2TypicalWorkFormulaDto, laborArchCounts: readonly V2TypicalWorkLaborArchCountDto[]): V2TypicalWorkFormulaDto;
export declare function defaultLaborArchCounts(): V2TypicalWorkLaborArchCountDto[];
