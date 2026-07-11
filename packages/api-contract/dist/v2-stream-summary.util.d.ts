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
export declare function buildExecutorStreamWorkSummaryRows(data: Record<string, unknown>, uiSchema: unknown): V2StreamWorkSummaryRow[];
