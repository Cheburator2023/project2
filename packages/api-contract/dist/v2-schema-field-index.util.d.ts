/**
 * Стабильная идентичность полей/блоков схемы.
 * Path — производная от текущего jsonSchema/uiSchema; SoT — uid / blockUid / role.
 */
export declare const V2_UI_OPTION_SCHEMA_FIELD_UID = "schemaFieldUid";
export declare const V2_UI_OPTION_ARCH_BLOCK_UID = "archBlockUid";
export declare const V2_UI_OPTION_SEMANTIC_ROLE = "semanticRole";
export declare const V2_UI_OPTION_ARCH_COMPONENT = "archComponent";
/** Семантические роли для legacy СФЕРА / отклонений (не JSON-path). */
export declare const V2_SEMANTIC_ROLES: readonly ["modelsList", "modelsCount", "algorithmType", "autoML", "readyPromReports", "pilotNeed", "prePromEval", "deploymentChannels", "sourceSystems", "modelService", "assessedInitiativesCount", "productionAdditionalReports", "uncertaintyAdjustment", "dataSourcesCount"];
export type V2SemanticRole = (typeof V2_SEMANTIC_ROLES)[number];
/** Arch-компоненты, из которых каталог ТР читает source-строки. */
export declare const V2_CATALOG_SOURCE_ARCH_BY_STREAM: {
    readonly modelStream: "modelService";
    readonly sourceSystems: "sourceSystem";
};
export type V2SchemaFieldIndexEntry = {
    pointer: string;
    dotPath: string;
    leafKey: string;
    archComponent?: string;
    semanticRole?: string;
};
export type V2SchemaBlockIndexEntry = {
    pointer: string;
    dotPath: string;
    archComponent: string;
    archBlockUid?: string;
};
export type V2SchemaFieldIndex = {
    byUid: Map<string, V2SchemaFieldIndexEntry>;
    byBlockUid: Map<string, V2SchemaBlockIndexEntry>;
    /** Первый найденный блок данного archComponent → dotPath. */
    byArchComponent: Map<string, V2SchemaBlockIndexEntry>;
    /** semanticRole → schemaFieldUid (или blockUid для массивов). */
    byRole: Map<string, string>;
};
/**
 * Строит индекс uid/blockUid/role → актуальный pointer/dotPath.
 * Перенос поля в конструкторе меняет только этот индекс, не привязки ТР.
 */
export declare function buildV2SchemaFieldIndex(jsonSchema: unknown, uiSchema: unknown): V2SchemaFieldIndex;
export declare function resolveDotPathByArchComponent(index: V2SchemaFieldIndex, archComponent: string, fallbackDotPath?: string | null): string | null;
export declare function resolveDotPathByBlockUid(index: V2SchemaFieldIndex, blockUid: string, fallbackDotPath?: string | null): string | null;
export declare function resolvePointerByFieldUid(index: V2SchemaFieldIndex, schemaFieldUid: string): string | null;
export declare function resolveDotPathByFieldUid(index: V2SchemaFieldIndex, schemaFieldUid: string): string | null;
export declare function resolveFieldUidBySemanticRole(index: V2SchemaFieldIndex, role: string): string | null;
/** Читает formData по schema pointer (`/a/b/items/c`). */
export declare function readFormValueAtSchemaPointer(root: Record<string, unknown>, pointer: string): unknown;
/** Читает formData по dot-path (`a.b.c`), учитывая arch object list (массив → первый элемент). */
export declare function readFormValueAtDotPath(root: Record<string, unknown>, dotPath: string): unknown;
export declare function resolveFormValueByFieldUid(formData: Record<string, unknown>, index: V2SchemaFieldIndex, schemaFieldUid: string): unknown;
export declare function resolveFormValueBySemanticRole(formData: Record<string, unknown>, index: V2SchemaFieldIndex, role: string): unknown;
/**
 * Резолвит sourceArrayPath каталога: blockUid → archComponent → fallback path.
 */
export declare function resolveCatalogSourceArrayPath(options: {
    uiSchema?: unknown;
    jsonSchema?: unknown;
    sourceArchComponent?: string | null;
    sourceBlockUid?: string | null;
    fallbackPath?: string | null;
}): string | null;
/** JSON Pointer `/a/b` → dot `a.b` (без `items`). */
export declare function schemaPointerToDotPath(pointer: string): string;
/**
 * Мост при moveCanvasField: переписывает path-based JsonLogic / payload
 * (старые правила ещё хранят путь; uid-привязки не трогаем).
 */
export declare function rewriteSchemaPathsInValue(value: unknown, oldPointer: string, newPointer: string): unknown;
