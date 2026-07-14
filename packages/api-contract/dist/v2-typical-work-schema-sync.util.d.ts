import type { V2TypicalWorkCardDto } from "./v2-typical-work.types";
export type V2TypicalWorkSchemaFieldSyncRequestDto = {
    templateVersionId: string;
    mode: "dryRun" | "apply";
    operation: "upsert" | "delete";
    field: {
        schemaFieldUid: string;
        previousCode?: string | null;
        code?: string | null;
        name?: string | null;
        values?: Array<{
            code: string;
            label: string;
        }>;
    };
};
export type V2TypicalWorkSchemaFieldSyncImpactDto = {
    worksMatched: number;
    worksUpdated: number;
    rulesUpdated: number;
    rulesRemoved: number;
    laborParamsUpdated: number;
    laborParamsRemoved: number;
    formulasInvalidated: number;
};
export declare function reconcileTypicalWorkCardWithSchemaField(card: V2TypicalWorkCardDto, request: V2TypicalWorkSchemaFieldSyncRequestDto): {
    card: V2TypicalWorkCardDto;
    changed: boolean;
    impact: Omit<V2TypicalWorkSchemaFieldSyncImpactDto, "worksMatched" | "worksUpdated">;
};
