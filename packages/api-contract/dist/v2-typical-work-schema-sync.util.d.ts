import type { V2TypicalWorkCardDto, V2TypicalWorkLaborParamGroupDto } from "./v2-typical-work.types";
export type V2TypicalWorkSchemaFieldSyncRequestDto = {
    templateVersionId: string;
    mode: "dryRun" | "apply";
    operation: "upsert" | "delete";
    /**
     * Uid-ы полей, которых больше нет в схеме версии. Ссылки работ на них
     * считаются непривязанными: иначе поле, пересозданное в конструкторе,
     * навсегда остаётся с мёртвой привязкой (матч по коду/имени блокируется
     * при заполненном schemaFieldUid).
     */
    staleSchemaFieldUids?: string[];
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
/** Работа, которую затронет синхронизация, — для предпросмотра перед apply. */
export type V2TypicalWorkSchemaSyncAffectedWorkDto = {
    workId: string;
    workName: string;
    streamExecutor: string;
    rulesUpdated: number;
    rulesRemoved: number;
    laborParamsUpdated: number;
    laborParamsRemoved: number;
    formulaInvalidated: boolean;
};
export type V2TypicalWorkSchemaFieldSyncImpactDto = {
    worksMatched: number;
    worksUpdated: number;
    rulesUpdated: number;
    rulesRemoved: number;
    laborParamsUpdated: number;
    laborParamsRemoved: number;
    formulasInvalidated: number;
    affectedWorks: V2TypicalWorkSchemaSyncAffectedWorkDto[];
};
/** Слияние записей об одной работе, затронутой несколькими полями схемы. */
export declare function mergeSchemaSyncAffectedWorks(target: V2TypicalWorkSchemaSyncAffectedWorkDto[], incoming: V2TypicalWorkSchemaSyncAffectedWorkDto[]): V2TypicalWorkSchemaSyncAffectedWorkDto[];
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
    impact: Omit<V2TypicalWorkSchemaFieldSyncImpactDto, "worksMatched" | "worksUpdated" | "affectedWorks">;
};
export {};
