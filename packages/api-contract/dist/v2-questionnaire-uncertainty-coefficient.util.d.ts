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
export type SyncAtypicalWorkCoefficientsResult = {
    formData: Record<string, unknown>;
    updatedPaths: string[];
    changed: boolean;
};
/** Подставляет коэффициент неопределённости во все строки arch-блоков atypicalWork. */
export declare function syncAtypicalWorkCoefficientsInFormData(formData: Record<string, unknown>, uiSchema: unknown, coefficient: number): SyncAtypicalWorkCoefficientsResult;
