import { type V2AnketaMainSectionId } from "./v2-anketa-workflow.types";
import { type V2QuestionnaireDto } from "./v2-questionnaire.types";
import { type V2AnketaViewerAccessContext } from "./v2-anketa-block-access.util";
export type V2RegistryColumnValueType = "text" | "number" | "date" | "boolean";
export type V2RegistryColumnKind = "meta" | "form" | "sectionStatus" | "panelStatus";
export type V2RegistryLeafColumn = {
    type: "leaf";
    id: string;
    header: string;
    kind: V2RegistryColumnKind;
    formPath?: string;
    metaKey?: keyof V2QuestionnaireDto | string;
    sectionId?: V2AnketaMainSectionId;
    panelPathKey?: string;
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
    /** Сколько элементов массива разворачивать в колонки реестра (fallback без данных). */
    arrayMaxItems?: number;
    /** Строки реестра — для авто-индексов массивов и подписей групп. */
    rows?: V2QuestionnaireDto[];
    /** Явные индексы массивов по dot-пути (например `summary.detailedCalculation`). */
    arrayIndicesByPath?: Record<string, number[]>;
    /** Подписи групп массивов: путь → индекс → заголовок. */
    arrayGroupLabelsByPath?: Record<string, Record<number, string>>;
    /** Контекст зрителя для ролевки колонок экспорта. */
    viewerAccess?: V2AnketaViewerAccessContext;
    /** Применять правила доступа к экспорту (false в админ-превью). */
    applyAccessRules?: boolean;
};
export type V2QuestionnaireRegistryConfigDto = {
    /** Дерево колонок реестра (объединение схем всех привязанных версий шаблонов). */
    columnTree: V2RegistryColumnNode[];
    arrayIndicesByPath: Record<string, number[]>;
    arrayGroupLabelsByPath: Record<string, Record<number, string>>;
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
/** Индексы элементов массива, встречающиеся в данных анкет. */
export declare function collectRegistryArrayIndicesFromRows(rows: V2QuestionnaireDto[], dotPath: string): number[];
/** Подписи групп массива (stageName, streamName и т.п.) из данных анкет. */
export declare function collectRegistryArrayGroupLabelsFromRows(rows: V2QuestionnaireDto[], dotPath: string, nameField: string): Record<number, string>;
export declare function deriveRegistryColumnOptionsFromRows(rows: V2QuestionnaireDto[]): V2RegistrySchemaColumnOptions;
/** Статический набор колонок (fallback без схемы). */
export declare function buildStaticV2QuestionnaireRegistryColumnTree(): V2RegistryColumnNode[];
/** Колонки реестра из версии jsonSchema/uiSchema шаблона. */
export declare function buildV2QuestionnaireRegistryColumnTree(jsonSchema?: Record<string, unknown>, uiSchema?: Record<string, unknown>, options?: V2RegistrySchemaColumnOptions): V2RegistryColumnNode[];
/** Объединяет деревья колонок из нескольких версий схем (как при экспорте XLSX). */
export declare function mergeV2QuestionnaireRegistryColumnTrees(trees: readonly (readonly V2RegistryColumnNode[])[]): V2RegistryColumnNode[];
export declare function buildV2QuestionnaireRegistryConfig(schemas: Array<{
    jsonSchema: Record<string, unknown>;
    uiSchema: Record<string, unknown>;
}>, rows?: V2QuestionnaireDto[]): V2QuestionnaireRegistryConfigDto;
export declare function flattenV2RegistryColumnTree(nodes: readonly V2RegistryColumnNode[]): V2RegistryLeafColumn[];
export declare function getByFormPath(obj: unknown, path: string): unknown;
export declare function buildV2QuestionnaireRegistryExportColumns(jsonSchema?: Record<string, unknown>, uiSchema?: Record<string, unknown>, options?: V2RegistrySchemaColumnOptions): V2RegistryExportColumn[];
