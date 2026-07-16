import type { WorkSchemaParamDef } from "./v2-work-schema-params-match.util";
import type { TypicalWorkRuleLike } from "./v2-works-catalog-match.util";
/** Строит список полей схемы шаблона для сопоставления с legacy-кодами работ. */
export declare function buildWorkSchemaParamsFromTemplate(params: {
    jsonSchema: Record<string, unknown>;
    uiSchema?: Record<string, unknown>;
}): WorkSchemaParamDef[];
export type TypicalWorkSchemaConsistencyIssue = {
    workId?: string;
    streamExecutor?: string;
    kind: "trigger" | "labor" | "labor_value" | "formula";
    paramCode: string;
    paramName?: string | null;
    message: string;
};
export type TypicalWorkSchemaConsistencyInput = {
    schemaParams: WorkSchemaParamDef[];
    rules: TypicalWorkRuleLike[];
    laborParamCodes: Array<{
        paramCode: string;
        paramName?: string | null;
        schemaFieldUid?: string | null;
        kind?: string | null;
        coefficients?: Array<{
            valueCode: string | null;
            valueLabel: string | null;
        }>;
    }>;
    formulaParamCodes?: string[];
    /** Параметры методологического каталога (заводской snapshot) — не требуют поля схемы. */
    methodologyParams?: Array<{
        code: string;
        name: string;
    }>;
    /** Полный методологический каталог со значениями — для проверки «Значение недоступно». */
    methodologyCatalog?: Array<{
        code: string;
        name: string;
        sourceKeys?: string[];
        values: Array<{
            code: string;
            label: string;
        }>;
    }>;
};
export declare function enrichWorkSchemaParamsWithCatalogAliases<T extends WorkSchemaParamDef>(schemaParams: T[], catalog: Array<{
    code: string;
    name: string;
}>): T[];
export declare function schemaEnumValueMatchesRule(enumValue: {
    code: string;
    label: string;
}, rule: {
    valueCode: string | null;
    valueLabel: string | null;
}): boolean;
export declare function collectTypicalWorkSchemaConsistencyIssues(input: TypicalWorkSchemaConsistencyInput): TypicalWorkSchemaConsistencyIssue[];
export declare function findCatalogPreviousCodeForSchemaParam(catalog: Array<{
    code: string;
    name: string;
}>, schemaParam: WorkSchemaParamDef): string | undefined;
