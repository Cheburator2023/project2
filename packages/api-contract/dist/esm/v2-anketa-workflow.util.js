import { V2_ANKETA_GLOBAL_STATUS_VALUES, V2_ANKETA_MAIN_SECTION_IDS, V2_ANKETA_SECTION_STATUS_VALUES, } from "./v2-anketa-workflow.types";
export function createDefaultV2AnketaWorkflow() {
    const sections = Object.fromEntries(V2_ANKETA_MAIN_SECTION_IDS.map((id) => [id, "Создано"]));
    return { globalStatus: "Черновик", sections };
}
export function normalizeV2AnketaWorkflow(raw) {
    const defaults = createDefaultV2AnketaWorkflow();
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return defaults;
    const input = raw;
    const globalStatus = V2_ANKETA_GLOBAL_STATUS_VALUES.includes(input.globalStatus)
        ? input.globalStatus
        : defaults.globalStatus;
    const sectionsRaw = input.sections && typeof input.sections === "object"
        ? input.sections
        : {};
    const sections = { ...defaults.sections };
    for (const id of V2_ANKETA_MAIN_SECTION_IDS) {
        const value = sectionsRaw[id];
        if (typeof value === "string" &&
            V2_ANKETA_SECTION_STATUS_VALUES.includes(value)) {
            sections[id] = value;
        }
    }
    const panelSectionsRaw = input.panelSections && typeof input.panelSections === "object"
        ? input.panelSections
        : {};
    const panelSections = {};
    for (const [pathKey, value] of Object.entries(panelSectionsRaw)) {
        if (typeof pathKey === "string" &&
            pathKey.trim() &&
            typeof value === "string" &&
            V2_ANKETA_SECTION_STATUS_VALUES.includes(value)) {
            panelSections[pathKey] = value;
        }
    }
    return {
        globalStatus,
        sections,
        ...(Object.keys(panelSections).length > 0 ? { panelSections } : {}),
    };
}
export function isWorkflowTargetCompleted(workflow, target) {
    if (target.kind === "main") {
        return workflow.sections[target.sectionId] === "Заполнено";
    }
    return readPanelSectionStatus(workflow, target.pathKey) === "Заполнено";
}
/**
 * Все обязательные разделы подтверждены.
 * Без `requiredTargets` — legacy: все `V2_ANKETA_MAIN_SECTION_IDS`.
 * С `requiredTargets` (из uiSchema) — только реально присутствующие/активные секции,
 * включая кастомные stream-блоки в `panelSections`.
 */
export function allRequiredSectionsCompleted(workflow, requiredTargets) {
    if (requiredTargets) {
        if (requiredTargets.length === 0)
            return false;
        return requiredTargets.every((target) => isWorkflowTargetCompleted(workflow, target));
    }
    return V2_ANKETA_MAIN_SECTION_IDS.every((id) => workflow.sections[id] === "Заполнено");
}
/** Анкета заблокирована для правок (заполнена или зафиксирован срез). */
export function isAnketaGloballyLocked(workflow) {
    return (workflow.globalStatus === "Заполнено" ||
        workflow.globalStatus === "Утверждена");
}
export function markSectionInProgress(workflow, sectionId) {
    if (isAnketaGloballyLocked(workflow))
        return workflow;
    const status = workflow.sections[sectionId];
    if (status !== "Создано")
        return workflow;
    return {
        ...workflow,
        sections: { ...workflow.sections, [sectionId]: "В работе" },
    };
}
export function completeSection(workflow, sectionId) {
    if (isAnketaGloballyLocked(workflow))
        return workflow;
    return {
        ...workflow,
        globalStatus: workflow.globalStatus,
        sections: {
            ...workflow.sections,
            [sectionId]: "Заполнено",
        },
    };
}
export function readPanelSectionStatus(workflow, pathKey) {
    return workflow.panelSections?.[pathKey] ?? "Создано";
}
export function completePanelSection(workflow, pathKey) {
    if (isAnketaGloballyLocked(workflow))
        return workflow;
    const trimmed = pathKey.trim();
    if (!trimmed)
        return workflow;
    return {
        ...workflow,
        panelSections: {
            ...workflow.panelSections,
            [trimmed]: "Заполнено",
        },
    };
}
/** Глобальное «Заполнено» — только когда все разделы подтверждены (кнопка в шапке). */
export function completeGlobalQuestionnaire(workflow, requiredTargets) {
    if (isAnketaGloballyLocked(workflow))
        return workflow;
    if (!allRequiredSectionsCompleted(workflow, requiredTargets))
        return workflow;
    return { ...workflow, globalStatus: "Заполнено" };
}
/** Фиксация среза (§3.13): Заполнено → Утверждена. */
export function holdQuestionnaire(workflow) {
    if (workflow.globalStatus !== "Заполнено")
        return workflow;
    return { ...workflow, globalStatus: "Утверждена" };
}
export function mainSectionIdForFormPath(path) {
    const root = path.split(".")[0]?.trim();
    if (!root)
        return null;
    return V2_ANKETA_MAIN_SECTION_IDS.includes(root)
        ? root
        : null;
}
/** Поле/арх-компонент недоступен для редактирования после завершения раздела или анкеты. */
export function isAnketaFormPathLocked(workflow, pathKey) {
    if (isAnketaGloballyLocked(workflow))
        return true;
    const trimmed = pathKey.trim();
    if (!trimmed)
        return false;
    const mainSectionId = mainSectionIdForFormPath(trimmed);
    if (mainSectionId &&
        workflow.sections[mainSectionId] === "Заполнено") {
        return true;
    }
    const panelSections = workflow.panelSections;
    if (!panelSections)
        return false;
    for (const [panelPath, status] of Object.entries(panelSections)) {
        if (status !== "Заполнено")
            continue;
        if (trimmed === panelPath || trimmed.startsWith(`${panelPath}.`)) {
            return true;
        }
    }
    return false;
}
export const V2_ANKETA_GLOBAL_COMPLETE_LABEL = "Завершить заполнение анкеты";
export const V2_ANKETA_HOLD_LABEL = "Зафиксировать срез";
export const V2_ANKETA_SECTION_COMPLETE_LABELS = {
    generalInfo: "Завершить заполнение общей информации",
    detailInfo: "Завершить заполнение детальной информации",
    streamDataSources: "Завершить заполнение стрима «Источники данных»",
    streamModelControl: "Завершить заполнение стрима «Контроль моделей»",
};
export const V2_ANKETA_MAIN_SECTION_TITLES = {
    generalInfo: "Общая информация",
    detailInfo: "Детальная информация",
    streamDataSources: "Стрим «Источники данных»",
    streamModelControl: "Стрим «Контроль моделей»",
};
export const V2_ANKETA_SECTION_STATUS_CHIP_COLOR = {
    Создано: "default",
    "В работе": "warning",
    Заполнено: "success",
};
export const V2_ANKETA_GLOBAL_STATUS_CHIP_COLOR = {
    Черновик: "default",
    Заполнено: "success",
    Утверждена: "primary",
};
