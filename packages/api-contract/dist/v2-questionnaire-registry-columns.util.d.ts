import { type V2AnketaMainSectionId } from "./v2-anketa-workflow.types";
import type { V2QuestionnaireDto } from "./v2-questionnaire.types";
export type V2RegistryColumnValueType = "text" | "number" | "date" | "boolean";
export type V2RegistryColumnKind = "meta" | "form" | "sectionStatus";
export type V2RegistryLeafColumn = {
    type: "leaf";
    id: string;
    header: string;
    kind: V2RegistryColumnKind;
    formPath?: string;
    metaKey?: keyof V2QuestionnaireDto | string;
    sectionId?: V2AnketaMainSectionId;
    valueType?: V2RegistryColumnValueType;
};
export type V2RegistryGroupColumn = {
    type: "group";
    header: string;
    openByDefault?: boolean;
    children: V2RegistryColumnNode[];
};
export type V2RegistryColumnNode = V2RegistryLeafColumn | V2RegistryGroupColumn;
export type V2RegistryExportColumn = {
    key: string;
    header: string;
    valueGetter: (row: V2QuestionnaireDto) => unknown;
};
export type V2RegistrySchemaColumnOptions = {
    /** Сколько элементов массива разворачивать в колонки реестра. */
    arrayMaxItems?: number;
};
/** Подписи группы рисков (из jsonSchema.title заводской схемы). */
export declare const V2_UNCERTAINTY_RISK_GROUP_LABELS: Record<string, string>;
/** Порядок полей группы рисков в uncertaintyCalculation.riskGroup. */
export declare const V2_UNCERTAINTY_RISK_GROUP_ORDER: readonly ["businessComplexity", "defectsInSolution", "adjacentProjectsImpact", "laborCostIncrease", "thirdPartyNegligence", "staffShortage", "sanctions", "controlProceduresLack", "regulatoryChanges", "isNotUsedAfterProject", "itArchitectureChanges"];
/** Порядок полей в uncertaintyCalculation. */
export declare const V2_UNCERTAINTY_CALCULATION_FIELD_ORDER: readonly ["initiativeTimeline", "initiativeCost", "uncertaintyAdjustment", "riskGroup"];
export declare function registryFormColumnId(formPath: string): string;
/** Ширина колонки по длине заголовка — заголовок помещается без обрезки. */
export declare function estimateRegistryColumnWidth(header: string): number;
/** Статический набор колонок (fallback без схемы). */
export declare function buildStaticV2QuestionnaireRegistryColumnTree(): V2RegistryColumnNode[];
/** Колонки реестра из версии jsonSchema/uiSchema шаблона. */
export declare function buildV2QuestionnaireRegistryColumnTree(jsonSchema?: Record<string, unknown>, uiSchema?: Record<string, unknown>, options?: V2RegistrySchemaColumnOptions): V2RegistryColumnNode[];
export declare function flattenV2RegistryColumnTree(nodes: V2RegistryColumnNode[]): V2RegistryLeafColumn[];
export declare function getByFormPath(obj: unknown, path: string): unknown;
export declare function buildV2QuestionnaireRegistryExportColumns(jsonSchema?: Record<string, unknown>, uiSchema?: Record<string, unknown>, options?: V2RegistrySchemaColumnOptions): V2RegistryExportColumn[];
