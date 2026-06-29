export declare const V2_DATA_TRANSFER_SECTIONS: readonly ["templates", "dictionaries", "typicalWorks", "questionnaires"];
export type V2DataTransferSection = (typeof V2_DATA_TRANSFER_SECTIONS)[number];
export declare const V2_DATA_TRANSFER_SECTION_LABELS: Record<V2DataTransferSection, string>;
export declare const V2_DATA_TRANSFER_DEFAULT_SECTIONS: V2DataTransferSection[];
export declare function parseV2DataTransferSections(raw: string | string[] | undefined | null): V2DataTransferSection[];
export declare function serializeV2DataTransferSections(sections: readonly V2DataTransferSection[]): string;
