import type { V2QuestionnaireDto } from "./v2-questionnaire.types";
export type V2RegistryExportColumn = {
    key: string;
    header: string;
    valueGetter: (row: V2QuestionnaireDto) => unknown;
};
export declare function formatV2RegistryExportCellValue(value: unknown): string;
/** Плоский список колонок реестра v2 (совпадает с AG Grid). */
export declare function buildV2QuestionnaireRegistryExportColumns(): V2RegistryExportColumn[];
export declare function buildV2QuestionnaireRegistryExportRow(row: V2QuestionnaireDto, columns?: V2RegistryExportColumn[]): Record<string, string>;
