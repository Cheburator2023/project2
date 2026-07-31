export type V2StreamWorkSummaryRow = {
    streamName: string;
    blockKey: string;
    streamExecutor: string;
    baseTypicalScore: number;
    adjustedTypicalScore: number;
    deviationPercent: number | null;
    atypicalScore: number;
};
/** Суммы типовых и нетиповых работ по каждому активному стримовому блоку анкеты. */
export declare function buildExecutorStreamWorkSummaryRows(data: Record<string, unknown>, uiSchema: unknown, typicalScoreMultiplier?: number): V2StreamWorkSummaryRow[];
export type V2StreamAtypicalSubtotal = {
    /** Метка стрима, совпадающая с группировкой типовых работ в панели итогов. */
    streamLabel: string;
    atypicalTotal: number;
};
/**
 * Нетиповые работы каждого блока-стрима под меткой, по которой панель итогов группирует
 * типовые работы. Возвращает все блоки схемы, включая стримы без нетиповых работ.
 */
export declare function buildAtypicalTotalsByStreamLabel(formData: Record<string, unknown> | null | undefined, uiSchema: unknown, liveFormData?: Record<string, unknown> | null): V2StreamAtypicalSubtotal[];
