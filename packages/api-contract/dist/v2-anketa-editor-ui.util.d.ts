import { type V2ArchComponentType } from "./v2-anketa-section-ui.util";
export type V2AnketaModalKind = "dataSource" | "modelService" | "modelServiceBlock" | "nonStandardTask" | "rjsfObject";
export type V2AnketaCanvasUiKind = "hidden" | "utility" | "system";
export type V2AnketaEditorBindings = {
    /** Корневые ключи uiSchema, не показываемые в теле RJSF-формы. */
    hiddenRootKeys: string[];
    modalArrayPaths: string[];
    readonlyArrayTablePaths: string[];
    modalObjectPaths: string[];
    /** Dot-пути полей, скрытых в теле анкеты (модалки арх. объектов). */
    bodyHiddenDotPaths: string[];
    modalKindByPath: Record<string, V2AnketaModalKind>;
};
/** Скрытое поле/секция (ui:widget hidden, ui:hidden или ui:options.hidden). */
export declare function isV2AnketaHiddenUiNode(uiNode: unknown): boolean;
/** Есть ли в uiSchema поле с виджетом модалки неопределённости. */
export declare function schemaHasUncertaintyModalWidget(uiSchema: Record<string, unknown>): boolean;
/** Метка на холсте конструктора: скрытая, системная или служебная. */
export declare function resolveV2AnketaCanvasUiKind(uiNode: unknown): V2AnketaCanvasUiKind | null;
export declare function isV2AnketaModalObjectArch(arch: V2ArchComponentType | null): boolean;
/** Корневые поля анкеты, помеченные hidden в uiSchema. */
export declare function listV2AnketaHiddenRootKeys(uiSchema: Record<string, unknown>): string[];
/** Обход jsonSchema + uiSchema: модалки, компактные таблицы, скрытые поля тела. */
export declare function resolveV2AnketaEditorBindings(jsonSchema: Record<string, unknown>, uiSchema: Record<string, unknown>): V2AnketaEditorBindings;
export declare function modalKindForPathFromBindings(path: string, bindings: V2AnketaEditorBindings): V2AnketaModalKind | null;
