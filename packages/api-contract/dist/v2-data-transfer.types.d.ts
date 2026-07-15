export declare const V2_DATA_TRANSFER_SECTIONS: readonly ["templates", "dictionaries", "typicalWorks", "questionnaires"];
export type V2DataTransferSection = (typeof V2_DATA_TRANSFER_SECTIONS)[number];
export declare const V2_DATA_TRANSFER_SECTION_LABELS: Record<V2DataTransferSection, string>;
/** Читаемые фрагменты имён файлов выгрузки по разделам. */
export declare const V2_DATA_TRANSFER_SECTION_FILE_SLUGS: Record<V2DataTransferSection, string>;
export declare function formatV2DataTransferExportTimestamp(value?: Date | string): string;
export declare function buildV2DataTransferExportFilename(sections: readonly V2DataTransferSection[], exportedAt?: Date | string): string;
export declare const V2_DATA_TRANSFER_DEFAULT_SECTIONS: V2DataTransferSection[];
/** Формулы типовых работ привязаны к версиям шаблонов — при выгрузке работ подтягиваем шаблоны. */
export declare function expandV2DataTransferExportSections(sections: readonly V2DataTransferSection[]): V2DataTransferSection[];
export declare function parseV2DataTransferSections(raw: string | string[] | undefined | null): V2DataTransferSection[];
export declare function serializeV2DataTransferSections(sections: readonly V2DataTransferSection[]): string;
