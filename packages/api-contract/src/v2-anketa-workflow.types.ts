/** Глобальный статус заполнения анкеты (первая итерация). */
export const V2_ANKETA_GLOBAL_STATUS_VALUES = ["Черновик", "Заполнено"] as const;
export type V2AnketaGlobalStatus =
	(typeof V2_ANKETA_GLOBAL_STATUS_VALUES)[number];

/** Локальный статус раздела (линейный, без отката). */
export const V2_ANKETA_SECTION_STATUS_VALUES = [
	"Создано",
	"В работе",
	"Заполнено",
] as const;
export type V2AnketaSectionStatus =
	(typeof V2_ANKETA_SECTION_STATUS_VALUES)[number];

/** Идентификаторы основных разделов анкеты. */
export const V2_ANKETA_MAIN_SECTION_IDS = [
	"generalInfo",
	"detailInfo",
	"streamDataSources",
	"streamMlPlatform",
	"streamModelControl",
] as const;
export type V2AnketaMainSectionId =
	(typeof V2_ANKETA_MAIN_SECTION_IDS)[number];

export type V2AnketaWorkflowDto = {
	globalStatus: V2AnketaGlobalStatus;
	sections: Record<V2AnketaMainSectionId, V2AnketaSectionStatus>;
};
