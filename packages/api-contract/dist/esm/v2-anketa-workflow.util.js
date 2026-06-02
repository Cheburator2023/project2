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
    return { globalStatus, sections };
}
export function allRequiredSectionsCompleted(workflow) {
    return V2_ANKETA_MAIN_SECTION_IDS.every((id) => workflow.sections[id] === "Заполнено");
}
export function markSectionInProgress(workflow, sectionId) {
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
export function completeSection(workflow, sectionId) {
    if (workflow.globalStatus === "Заполнено")
        return workflow;
    return {
        globalStatus: workflow.globalStatus,
        sections: {
            ...workflow.sections,
            [sectionId]: "Заполнено",
        },
    };
}
/** Глобальное «Заполнено» — только когда все разделы подтверждены (кнопка в шапке). */
export function completeGlobalQuestionnaire(workflow) {
    if (workflow.globalStatus === "Заполнено")
        return workflow;
    if (!allRequiredSectionsCompleted(workflow))
        return workflow;
    return { ...workflow, globalStatus: "Заполнено" };
}
export function mainSectionIdForFormPath(path) {
    const root = path.split(".")[0]?.trim();
    if (!root)
        return null;
    return V2_ANKETA_MAIN_SECTION_IDS.includes(root)
        ? root
        : null;
}
export const V2_ANKETA_GLOBAL_COMPLETE_LABEL = "Завершить заполнение анкеты";
export const V2_ANKETA_SECTION_COMPLETE_LABELS = {
    generalInfo: "Завершить заполнение общей информации",
    detailInfo: "Завершить заполнение детальной информации",
    streamDataSources: "Завершить заполнение стрима «Источники данных»",
    streamMlPlatform: "Завершить заполнение стрима «Платформы и решения для моделирования»",
    streamModelControl: "Завершить заполнение стрима «Контроль моделей»",
};
export const V2_ANKETA_MAIN_SECTION_TITLES = {
    generalInfo: "Общая информация",
    detailInfo: "Детальная информация",
    streamDataSources: "Стрим «Источники данных»",
    streamMlPlatform: "Стрим «Платформы и решения для моделирования»",
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
};
