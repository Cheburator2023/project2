export type CsvFormulaRoundingMode = "CEIL" | "FLOOR" | "ROUND" | "NONE";
export type CsvFormulaImportRow = {
    stream: string;
    component: string;
    stage: string;
    name: string;
    originalName: string;
    workType: string;
    norm: number | null;
    normRaw: string;
    triggerParams: string[];
    triggerRules: CsvFormulaTriggerRule[];
    laborParams: string[];
    formulaRaw: string;
    /** Колонка «Коэффициенты параметров трудоёмкости» (формат модельного стрима). */
    laborCoefficientsRaw?: string;
};
export type CsvFormulaCatalogPatch = {
    formulaText: string;
    roundingMode: CsvFormulaRoundingMode;
    roundingStep: number | null;
    laborParams?: string[];
    laborCoefficients?: CsvFormulaLaborCoefficient[];
    triggerParams?: string[];
    triggerRules?: CsvFormulaTriggerRule[];
    norm?: number | null;
    normRaw?: string;
    workType?: string;
};
export type CsvFormulaLaborCoefficient = {
    paramName: string;
    values: Array<{
        label: string;
        coefficient: number;
    }>;
};
export type CsvFormulaTriggerRule = {
    paramName: string;
    operator: "=" | "!=" | "in" | "exists" | "unresolved";
    values: string[];
};
export type CsvFormulaParamCandidate = {
    name: string;
    code: string;
};
export type CsvFormulaBuildResult = {
    formulaText: string;
    roundingMode: CsvFormulaRoundingMode;
    roundingStep: number | null;
    unmatchedParams: string[];
    parseError: string | null;
    skippedSpecial: string[];
    inferredLaborParams: string[];
    transformedSpecial: string[];
};
export type CsvFormulaCatalogMatchKey = {
    stream: string;
    component: string;
    stage: string;
    name: string;
};
/** RFC4180-подобный парсер CSV с `;` и многострочными полями в кавычках. */
export declare function parseCsvSemicolon(text: string): string[][];
export declare function parseNormFromCsv(raw: string | undefined): number | null;
export declare function normalizeCsvArchComponent(raw: string): string;
/** Этап 220 / 230 и «?» — как в v2-catalog-component-inference. */
export declare function inferCsvArchComponent(rawComponent: string, stream: string, stage: string): string;
export declare function stripWorkStagePrefix(name: string): string;
/** E2E-этап из названия работы модельного стрима: «01. …», «05A. …», «AutoML: …». */
export declare function extractE2eWorkStage(name: string): string;
export declare function resolveE2eWorkStageAndName(smartName: string): {
    stage: string;
    name: string;
};
/** Шаги K = 1 + (N−1)×increment для архкоэф(Модели; …). */
export declare function buildLinearArchCountSteps(maxCount: number, increment?: number): Array<{
    count: number;
    coefficient: number;
}>;
export declare const MODEL_STREAM_SOURCE_COUNT_STEPS: Array<{
    count: number;
    coefficient: number;
}>;
export declare function formatArchCountFormulaSteps(steps: ReadonlyArray<{
    count: number;
    coefficient: number;
}>): string;
/** Парсит блоки «Параметр: 1→1; 2→1,25 …» из колонки коэффициентов модельного стрима. */
export declare function parseModelStreamLaborCoefficients(raw: string): CsvFormulaLaborCoefficient[];
export declare function parseModelStreamTriggerRules(raw: string): CsvFormulaTriggerRule[];
/** Строка триггера из колонки «Результат выбора» (блок «Триггер: …»). */
export declare function extractTriggerTextFromResultChoice(raw: string): string;
export declare function parseCsvTriggerRules(raw: string): CsvFormulaTriggerRule[];
export declare function parseCsvLaborCoefficients(formulaRaw: string, archComponent?: string): CsvFormulaLaborCoefficient[];
export declare function parseCsvFormulaImportRows(csvText: string): CsvFormulaImportRow[];
export declare function buildCatalogMatchKey(row: Pick<CsvFormulaImportRow, "stream" | "component" | "stage" | "name">): string;
export declare function normalizeParamLabel(label: string): string;
export declare function resolveCsvParamCode(label: string, candidates: CsvFormulaParamCandidate[], overrides?: Record<string, string>): string | null;
export declare function extractFormulaCoreFromCsvText(formulaRaw: string): {
    core: string;
    roundingMode: CsvFormulaRoundingMode;
    roundingStep: number | null;
} | null;
export declare function buildFormulaTextFromCsvCore(core: string, resolveParamCode: (label: string) => string | null): Pick<CsvFormulaBuildResult, "formulaText" | "unmatchedParams" | "skippedSpecial">;
export declare function buildFormulaFromCsvRow(row: Pick<CsvFormulaImportRow, "formulaRaw" | "laborParams">, candidates: CsvFormulaParamCandidate[], overrides?: Record<string, string>): CsvFormulaBuildResult | null;
export declare function csvRowToCatalogPatch(row: CsvFormulaImportRow, candidates: CsvFormulaParamCandidate[], overrides?: Record<string, string>): {
    patch: CsvFormulaCatalogPatch | null;
    build: CsvFormulaBuildResult | null;
};
export type FactorySnapshotTriggerRule = {
    paramName: string;
    operator?: string;
    values?: string[];
    paramCode?: string;
    schemaFieldUid?: string;
    valueCode?: string | null;
    valueLabel?: string | null;
};
/** Нормализует triggerRules factory snapshot: valueCode/valueLabel для boolean «Да»/«Нет». */
export declare function enrichFactorySnapshotTriggerRule(rule: FactorySnapshotTriggerRule): FactorySnapshotTriggerRule;
export declare function validateImportedFormulaText(formulaText: string): string | null;
