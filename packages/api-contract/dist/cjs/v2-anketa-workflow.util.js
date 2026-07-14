"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ANKETA_GLOBAL_STATUS_CHIP_COLOR = exports.V2_ANKETA_SECTION_STATUS_CHIP_COLOR = exports.V2_ANKETA_MAIN_SECTION_TITLES = exports.V2_ANKETA_SECTION_COMPLETE_LABELS = exports.V2_ANKETA_GLOBAL_COMPLETE_LABEL = void 0;
exports.createDefaultV2AnketaWorkflow = createDefaultV2AnketaWorkflow;
exports.normalizeV2AnketaWorkflow = normalizeV2AnketaWorkflow;
exports.allRequiredSectionsCompleted = allRequiredSectionsCompleted;
exports.markSectionInProgress = markSectionInProgress;
exports.completeSection = completeSection;
exports.readPanelSectionStatus = readPanelSectionStatus;
exports.completePanelSection = completePanelSection;
exports.completeGlobalQuestionnaire = completeGlobalQuestionnaire;
exports.mainSectionIdForFormPath = mainSectionIdForFormPath;
exports.isAnketaFormPathLocked = isAnketaFormPathLocked;
const v2_anketa_workflow_types_1 = require("./v2-anketa-workflow.types");
function createDefaultV2AnketaWorkflow() {
    const sections = Object.fromEntries(v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS.map((id) => [id, "Создано"]));
    return { globalStatus: "Черновик", sections };
}
function normalizeV2AnketaWorkflow(raw) {
    const defaults = createDefaultV2AnketaWorkflow();
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return defaults;
    const input = raw;
    const globalStatus = v2_anketa_workflow_types_1.V2_ANKETA_GLOBAL_STATUS_VALUES.includes(input.globalStatus)
        ? input.globalStatus
        : defaults.globalStatus;
    const sectionsRaw = input.sections && typeof input.sections === "object"
        ? input.sections
        : {};
    const sections = { ...defaults.sections };
    for (const id of v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS) {
        const value = sectionsRaw[id];
        if (typeof value === "string" &&
            v2_anketa_workflow_types_1.V2_ANKETA_SECTION_STATUS_VALUES.includes(value)) {
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
            v2_anketa_workflow_types_1.V2_ANKETA_SECTION_STATUS_VALUES.includes(value)) {
            panelSections[pathKey] = value;
        }
    }
    return {
        globalStatus,
        sections,
        ...(Object.keys(panelSections).length > 0 ? { panelSections } : {}),
    };
}
function allRequiredSectionsCompleted(workflow) {
    return v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS.every((id) => workflow.sections[id] === "Заполнено");
}
function markSectionInProgress(workflow, sectionId) {
    if (workflow.globalStatus === "Заполнено")
        return workflow;
    const status = workflow.sections[sectionId];
    if (status !== "Создано")
        return workflow;
    return {
        ...workflow,
        sections: { ...workflow.sections, [sectionId]: "В работе" },
    };
}
function completeSection(workflow, sectionId) {
    if (workflow.globalStatus === "Заполнено")
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
function readPanelSectionStatus(workflow, pathKey) {
    return workflow.panelSections?.[pathKey] ?? "Создано";
}
function completePanelSection(workflow, pathKey) {
    if (workflow.globalStatus === "Заполнено")
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
function completeGlobalQuestionnaire(workflow) {
    if (workflow.globalStatus === "Заполнено")
        return workflow;
    if (!allRequiredSectionsCompleted(workflow))
        return workflow;
    return { ...workflow, globalStatus: "Заполнено" };
}
function mainSectionIdForFormPath(path) {
    const root = path.split(".")[0]?.trim();
    if (!root)
        return null;
    return v2_anketa_workflow_types_1.V2_ANKETA_MAIN_SECTION_IDS.includes(root)
        ? root
        : null;
}
/** Поле/арх-компонент недоступен для редактирования после завершения раздела или анкеты. */
function isAnketaFormPathLocked(workflow, pathKey) {
    if (workflow.globalStatus === "Заполнено")
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
exports.V2_ANKETA_GLOBAL_COMPLETE_LABEL = "Завершить заполнение анкеты";
exports.V2_ANKETA_SECTION_COMPLETE_LABELS = {
    generalInfo: "Завершить заполнение общей информации",
    detailInfo: "Завершить заполнение детальной информации",
    streamDataSources: "Завершить заполнение стрима «Источники данных»",
    streamModelControl: "Завершить заполнение стрима «Контроль моделей»",
};
exports.V2_ANKETA_MAIN_SECTION_TITLES = {
    generalInfo: "Общая информация",
    detailInfo: "Детальная информация",
    streamDataSources: "Стрим «Источники данных»",
    streamModelControl: "Стрим «Контроль моделей»",
};
exports.V2_ANKETA_SECTION_STATUS_CHIP_COLOR = {
    Создано: "default",
    "В работе": "warning",
    Заполнено: "success",
};
exports.V2_ANKETA_GLOBAL_STATUS_CHIP_COLOR = {
    Черновик: "default",
    Заполнено: "success",
};
