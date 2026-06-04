/** Глобальный статус заполнения анкеты (первая итерация). */
export declare const V2_ANKETA_GLOBAL_STATUS_VALUES: readonly ["Черновик", "Заполнено"];
export type V2AnketaGlobalStatus = (typeof V2_ANKETA_GLOBAL_STATUS_VALUES)[number];
/** Локальный статус раздела (линейный, без отката). */
export declare const V2_ANKETA_SECTION_STATUS_VALUES: readonly ["Создано", "В работе", "Заполнено"];
export type V2AnketaSectionStatus = (typeof V2_ANKETA_SECTION_STATUS_VALUES)[number];
/** Идентификаторы основных разделов анкеты. */
export declare const V2_ANKETA_MAIN_SECTION_IDS: readonly ["generalInfo", "detailInfo", "streamDataSources", "streamModelControl"];
export type V2AnketaMainSectionId = (typeof V2_ANKETA_MAIN_SECTION_IDS)[number];
export type V2AnketaWorkflowDto = {
    globalStatus: V2AnketaGlobalStatus;
    sections: Record<V2AnketaMainSectionId, V2AnketaSectionStatus>;
};
