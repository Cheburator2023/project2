import type { V2TypicalWorkCardDto, V2TypicalWorkLaborParamGroupDto } from "./v2-typical-work.types";
export type V2TypicalWorkSchemaFieldSyncRequestDto = {
    templateVersionId: string;
    mode: "dryRun" | "apply";
    operation: "upsert" | "delete";
    field: {
        schemaFieldUid: string;
        previousCode?: string | null;
        /** Доп. legacy-коды (slug, sourceKeys) для сопоставления правил/формул. */
        aliasCodes?: string[];
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
export type V2TypicalWorkSchemaBulkSyncResponseDto = V2TypicalWorkSchemaFieldSyncImpactDto & {
    fieldsProcessed: number;
    consistencyIssues: import("./v2-template-work-schema-params.util").TypicalWorkSchemaConsistencyIssue[];
};
/** Ключ совпадения для uq_v2_typical_work_labor (work, stream, param_code, value_code). */
export declare function laborCoefficientStoredKey(row: {
    valueCode?: string | null;
    valueLabel?: string | null;
}): string;
export declare function dedupeLaborCoefficientsByStoredValue<T extends {
    valueCode?: string | null;
    valueLabel?: string | null;
}>(coefficients: readonly T[]): T[];
type MergeableLaborParamGroup = {
    paramCode: string;
    schemaFieldUid?: string | null;
    paramName?: string | null;
    kind?: "by_value" | "any_of";
    coefficients?: Array<{
        valueCode?: string | null;
        valueLabel?: string | null;
    }>;
    anyOf?: V2TypicalWorkLaborParamGroupDto["anyOf"];
};
/** Схлопывает группы с одним paramCode — иначе patchWork ловит uq_v2_typical_work_labor_param. */
export declare function mergeLaborParamGroupsByParamCode<T extends MergeableLaborParamGroup>(groups: T[]): T[];
export declare function reconcileTypicalWorkCardWithSchemaField(card: V2TypicalWorkCardDto, request: V2TypicalWorkSchemaFieldSyncRequestDto): {
    card: V2TypicalWorkCardDto;
    changed: boolean;
    impact: Omit<V2TypicalWorkSchemaFieldSyncImpactDto, "worksMatched" | "worksUpdated">;
};
export {};
