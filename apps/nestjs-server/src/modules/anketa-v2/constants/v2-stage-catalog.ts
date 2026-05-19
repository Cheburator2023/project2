/** Каталог этапов E2E (паритет с v1 `assessmentCalculationsStore` / `CalculationResultTable`). */
export const V2_STAGE_BASE_VALUES = {
	stage01: 33,
	stage02: 15,
	stage04: 51,
	stage05A: 40,
	stage05: 37,
	amlDrafting: 68,
	stage05B: 34,
	stage07: 56,
	stage09: 50,
	amlEnforcement: 68,
} as const;

export type V2StageKey = keyof typeof V2_STAGE_BASE_VALUES;

export const V2_STAGE_DISPLAY_NAMES: Record<V2StageKey, string> = {
	stage01: "01. Постановка задачи",
	stage02: "02. Поиск данных",
	stage04: "04. Построение витрины для разработки",
	stage05A: "05A. Разработка MVP",
	stage05: "05. Разработка модели",
	amlDrafting: "AML разработка",
	stage05B: "05B. Пилотирование модели",
	stage07: "07. Разработка витрины для применения модели",
	stage09: "09. Адаптация и внедрение",
	amlEnforcement: "AML внедрение",
};

export const V2_PLATFORM_STREAM_NAMES = [
	"Платформы и решения для моделирования",
	"Контроль моделей",
	"Источники данных",
] as const;
