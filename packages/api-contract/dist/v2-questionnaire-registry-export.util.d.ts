import type { V2QuestionnaireDto } from "./v2-questionnaire.types";
import { buildV2QuestionnaireRegistryExportColumns, type V2RegistryExportColumn, type V2RegistrySchemaColumnOptions } from "./v2-questionnaire-registry-columns.util";
export type { V2RegistryExportColumn, V2RegistrySchemaColumnOptions };
export declare function formatV2RegistryExportCellValue(value: unknown): string;
export { buildV2QuestionnaireRegistryExportColumns };
export declare function buildV2QuestionnaireRegistryExportRow(row: V2QuestionnaireDto, columns?: V2RegistryExportColumn[]): Record<string, string>;
