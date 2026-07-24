import { type V2AnketaGlobalStatus, type V2AnketaMainSectionId, type V2AnketaSectionStatus, type V2AnketaWorkflowDto } from "./v2-anketa-workflow.types";
export declare function createDefaultV2AnketaWorkflow(): V2AnketaWorkflowDto;
export declare function normalizeV2AnketaWorkflow(raw: unknown): V2AnketaWorkflowDto;
/** Цель workflow, которую нужно завершить до глобального «Заполнено». */
export type V2AnketaRequiredWorkflowTarget = {
    kind: "main";
    sectionId: V2AnketaMainSectionId;
} | {
    kind: "panel";
    pathKey: string;
};
export declare function isWorkflowTargetCompleted(workflow: V2AnketaWorkflowDto, target: V2AnketaRequiredWorkflowTarget): boolean;
/**
 * Все обязательные разделы подтверждены.
 * Без `requiredTargets` — legacy: все `V2_ANKETA_MAIN_SECTION_IDS`.
 * С `requiredTargets` (из uiSchema) — только реально присутствующие/активные секции,
 * включая кастомные stream-блоки в `panelSections`.
 */
export declare function allRequiredSectionsCompleted(workflow: V2AnketaWorkflowDto, requiredTargets?: readonly V2AnketaRequiredWorkflowTarget[]): boolean;
/** Анкета заблокирована для правок (заполнена или зафиксирован срез). */
export declare function isAnketaGloballyLocked(workflow: Pick<V2AnketaWorkflowDto, "globalStatus">): boolean;
export declare function markSectionInProgress(workflow: V2AnketaWorkflowDto, sectionId: V2AnketaMainSectionId): V2AnketaWorkflowDto;
export declare function completeSection(workflow: V2AnketaWorkflowDto, sectionId: V2AnketaMainSectionId): V2AnketaWorkflowDto;
export declare function readPanelSectionStatus(workflow: V2AnketaWorkflowDto, pathKey: string): V2AnketaSectionStatus;
export declare function completePanelSection(workflow: V2AnketaWorkflowDto, pathKey: string): V2AnketaWorkflowDto;
/** Глобальное «Заполнено» — только когда все разделы подтверждены (кнопка в шапке). */
export declare function completeGlobalQuestionnaire(workflow: V2AnketaWorkflowDto, requiredTargets?: readonly V2AnketaRequiredWorkflowTarget[]): V2AnketaWorkflowDto;
/** Фиксация среза (§3.13): Заполнено → Утверждена. */
export declare function holdQuestionnaire(workflow: V2AnketaWorkflowDto): V2AnketaWorkflowDto;
export declare function mainSectionIdForFormPath(path: string): V2AnketaMainSectionId | null;
/** Поле/арх-компонент недоступен для редактирования после завершения раздела или анкеты. */
export declare function isAnketaFormPathLocked(workflow: V2AnketaWorkflowDto, pathKey: string): boolean;
export declare const V2_ANKETA_GLOBAL_COMPLETE_LABEL = "\u0417\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u044C \u0437\u0430\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0435 \u0430\u043D\u043A\u0435\u0442\u044B";
export declare const V2_ANKETA_HOLD_LABEL = "\u0417\u0430\u0444\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0440\u0435\u0437";
export declare const V2_ANKETA_SECTION_COMPLETE_LABELS: Record<V2AnketaMainSectionId, string>;
export declare const V2_ANKETA_MAIN_SECTION_TITLES: Record<V2AnketaMainSectionId, string>;
export declare const V2_ANKETA_SECTION_STATUS_CHIP_COLOR: Record<V2AnketaSectionStatus, "default" | "warning" | "success">;
export declare const V2_ANKETA_GLOBAL_STATUS_CHIP_COLOR: Record<V2AnketaGlobalStatus, "default" | "success" | "primary">;
