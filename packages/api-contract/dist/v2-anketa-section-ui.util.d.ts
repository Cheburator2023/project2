import { type V2AnketaMainSectionId } from "./v2-anketa-workflow.types";
export declare const V2_ANKETA_SECTION_ROLE_VALUES: readonly ["main", "subsection", "panel", "flat"];
export type V2AnketaSectionRole = (typeof V2_ANKETA_SECTION_ROLE_VALUES)[number];
export type V2AnketaSectionTitleVariant = "h5" | "h6";
export type V2AnketaSectionUiOptions = {
    /** Роль секции в layout анкеты (конструктор / uiSchema). */
    sectionRole?: V2AnketaSectionRole;
    /** Accordion: развёрнута по умолчанию. */
    defaultExpanded?: boolean;
    /** Привязка к workflow.sections для главных секций. */
    workflowSectionId?: V2AnketaMainSectionId;
    /** Подсекция: счётчик заполненных элементов в заголовке. */
    showFilledCount?: boolean;
    titleVariant?: V2AnketaSectionTitleVariant;
    hidden?: boolean;
};
declare const STREAM_SECTION_IDS: V2AnketaMainSectionId[];
export declare function readV2AnketaSectionUiOptions(uiNode: unknown): V2AnketaSectionUiOptions;
export declare function isV2AnketaMainSectionId(value: string): value is V2AnketaMainSectionId;
export declare function isV2AnketaStreamSectionId(value: string): value is V2AnketaMainSectionId;
/** Роль секции: явно из ui:options или эвристика для старых схем без layout. */
export declare function resolveV2AnketaSectionRole(uiNode: unknown, path: string[]): V2AnketaSectionRole;
export declare function resolveV2AnketaDefaultExpanded(uiNode: unknown, path: string[], role: V2AnketaSectionRole): boolean;
export declare function resolveV2AnketaWorkflowSectionId(uiNode: unknown, path: string[]): V2AnketaMainSectionId | null;
export declare function resolveV2AnketaSectionTitleVariant(uiNode: unknown, fallback?: V2AnketaSectionTitleVariant): V2AnketaSectionTitleVariant;
export { STREAM_SECTION_IDS as V2_ANKETA_STREAM_SECTION_IDS };
