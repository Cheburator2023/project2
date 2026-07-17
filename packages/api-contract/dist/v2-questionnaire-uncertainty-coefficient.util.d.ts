/** Приращение к коэффициенту неопределённости по уровню риска (v2 riskGroup). */
export declare function mapV2UncertaintyRiskLevelIncrement(level: string): number;
export type V2QuestionnaireUncertaintyCoefficient = {
    /** Есть заполненные риски или корректировка — неопределённость «рассчитана». */
    calculated: boolean;
    /** 1, если не рассчитана; иначе 1 + Σриски + корректировка%. */
    coefficient: number;
};
/** Коэффициент общей неопределённости для нетиповых работ (и legacy stage calc). */
export declare function resolveV2QuestionnaireUncertaintyCoefficient(formData: Record<string, unknown>): V2QuestionnaireUncertaintyCoefficient;
/** Код параметра «Общая неопределённость» в формулах типовых работ модельного стрима. */
export declare const V2_TYPICAL_WORK_UNCERTAINTY_PARAM_CODE = "overallUncertainty";
/** Параметр трудоёмкости «Общая неопределённость» — вычисляемый, не из справочника коэффициентов. */
export declare function isTypicalWorkComputedUncertaintyParam(paramCode: string, paramName?: string | null): boolean;
export type TypicalWorkLaborParamRef = {
    paramCode: string;
    paramName?: string | null;
};
/**
 * Подставляет коэффициент общей неопределённости из uncertaintyCalculation
 * (K = 1 + Σриски + поправка%/100; если не рассчитана — 1).
 * Перекрывает фиксированные строки коэффициентов в конфигураторе.
 */
export declare function applyComputedOverallUncertaintyToTypicalWorkParamCoefficients(formData: Record<string, unknown>, paramCoefficients: Record<string, number>, options?: {
    laborParamRefs?: readonly TypicalWorkLaborParamRef[];
    formulaParamCodes?: readonly string[];
}): void;
export type SyncAtypicalWorkCoefficientsResult = {
    formData: Record<string, unknown>;
    updatedPaths: string[];
    changed: boolean;
};
/** Подставляет коэффициент неопределённости во все строки arch-блоков atypicalWork. */
export declare function syncAtypicalWorkCoefficientsInFormData(formData: Record<string, unknown>, uiSchema: unknown, coefficient: number): SyncAtypicalWorkCoefficientsResult;
