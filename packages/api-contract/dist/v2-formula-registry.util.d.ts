import type { V2TypicalWorkFormulaBadgeDto, V2WorkFormulaToken, V2WorkRoundingMode } from "./v2-typical-work.types";
export type V2FormulaRegistryParamRefDto = {
    paramCode: string;
    paramName?: string | null;
    kind: "param_coeff" | "param_anyof";
    invalid?: boolean;
};
export type V2FormulaRegistryWorkRefDto = {
    assignmentId: string;
    workId?: string | null;
    workName?: string | null;
    invalid?: boolean;
};
export type V2FormulaRegistryItemDto = {
    id: string;
    workId: string;
    workName: string;
    templateId: string;
    templateName: string;
    templateVersionId: string;
    versionNumber: number;
    versionStatus: string;
    streamExecutor: string;
    assignmentId: string | null;
    formulaText: string;
    formulaBadge: V2TypicalWorkFormulaBadgeDto;
    roundingMode: V2WorkRoundingMode;
    paramRefs: V2FormulaRegistryParamRefDto[];
    workRefs: V2FormulaRegistryWorkRefDto[];
    hasInvalidRefs: boolean;
    createdAt: string;
    updatedAt: string;
};
export type V2FormulaRegistryTemplateOptionDto = {
    id: string;
    name: string;
};
export type V2FormulaRegistryListResponseDto = {
    total: number;
    items: V2FormulaRegistryItemDto[];
    templateOptions: V2FormulaRegistryTemplateOptionDto[];
};
export declare function extractFormulaRegistryLinks(tokens: V2WorkFormulaToken[]): {
    paramRefs: V2FormulaRegistryParamRefDto[];
    workRefs: V2FormulaRegistryWorkRefDto[];
    hasInvalidRefs: boolean;
};
export declare function formatFormulaRegistryParamLabel(paramCode: string, paramName?: string | null): string;
