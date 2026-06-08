import type { RJSFSchema } from "@rjsf/utils";
import type { V2ArchComponentType } from "@smart-anketa/api-contract";

const YES_NO = ["Да", "Нет"] as const;

const DEPLOY_CHANNEL_ITEMS = [
	"Батч",
	"Батч+загрузка",
	"Батч+Онлайн",
	"Онлайн",
	"Онлайн GPU",
	"Стриминг",
	"Мобильные",
	"LLM",
	"Гео",
	"Облако",
	"Графовая платформа",
] as const;

export type ArchComponentPresetDef = {
	make: () => RJSFSchema;
	uiOptions?: Record<string, unknown>;
	/** Дочерние ветки uiSchema (ключи — имена properties), без ui:options корня. */
	uiBranch?: Record<string, unknown>;
};

export const ARCH_COMPONENT_PRESET_DEFS: Record<
	V2ArchComponentType,
	ArchComponentPresetDef
> = {
	modelService: {
		make: () => ({
			type: "object",
			title: "Модельный сервис",
			properties: {
				workType: {
					type: "string",
					title: "Тип работ",
					enum: ["Разработка", "Доработка", "Настройка"],
				},
				modelClass: {
					type: "string",
					title: "Класс моделей",
					enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
				},
				deployChannels: {
					type: "array",
					title: "Каналы внедрения",
					items: { type: "string", enum: [...DEPLOY_CHANNEL_ITEMS] },
					uniqueItems: true,
				},
				pkRecalibration: {
					type: "string",
					title: "ПК: Рекалибровка",
					enum: [...YES_NO],
				},
				pkNewType: {
					type: "string",
					title: "ПК: Новый тип модели",
					enum: [...YES_NO],
				},
			},
		}),
		uiOptions: {
			archComponent: "modelService",
			sectionRole: "subsection",
			showFilledCount: true,
		},
	},
	sourceSystem: {
		make: () => ({
			type: "array",
			title: "Системы-источники",
			items: {
				type: "object",
				title: "Система-источник",
				required: ["name"],
				properties: {
					name: { type: "string", title: "Название источника" },
					type: {
						type: "string",
						title: "Тип",
						enum: ["Внутренний", "Внешний"],
					},
					domainComplexity: {
						type: "string",
						title: "Сложность предметной области",
						enum: ["Низкая", "Средняя", "Высокая", "Неизвестно", "Масштабное"],
					},
					entityVolume: {
						type: "string",
						title: "Объём запроса по сущностям",
						enum: ["Точечное", "Малое", "Среднее", "Большое", "Масштабное"],
					},
					requirements: {
						type: "string",
						title: "Требования",
						enum: ["Понятны", "Не понятны", "Рисковые"],
					},
					additionalUncertainty: {
						type: "string",
						title: "Доп. неопределённость источника",
						enum: ["Нет", "Да"],
					},
					integrationReadiness: {
						type: "string",
						title: "Готовность к интеграции в ПД",
						enum: [
							"Готов к интеграции",
							"Нужны доработки ИС",
							"Сложная интеграция",
						],
					},
					daptRegistry: {
						type: "string",
						title: "Реестр в ДАПТ",
						enum: ["Есть", "Нет"],
					},
				},
			},
		}),
		uiOptions: {
			archComponent: "sourceSystem",
			addable: true,
			removable: true,
			orderable: false,
		},
	},
	dataProcess: {
		make: () => ({
			type: "object",
			title: "Процессы обработки данных",
			properties: {
				workType: {
					type: "string",
					title: "Тип работ",
					enum: ["Разработка", "Доработка", "Настройка"],
				},
				implComplexity: {
					type: "string",
					title: "Сложность реализации",
					enum: ["Низкая", "Средняя", "Высокая", "Неизвестно"],
				},
				deliveryMode: {
					type: "string",
					title: "Данные заказчику",
					enum: ["Напрямую", "Опосредованно", "Неизвестно"],
				},
			},
		}),
		uiOptions: {
			archComponent: "dataProcess",
			sectionRole: "subsection",
			showFilledCount: true,
		},
	},
	dataMart: {
		make: () => ({
			type: "object",
			title: "Объект / Витрина данных",
			properties: {
				workType: {
					type: "string",
					title: "Тип работ",
					enum: ["Разработка", "Доработка", "Настройка"],
				},
				metricsCount: {
					type: "string",
					title: "Количество метрик",
					enum: ["До 20", "20–50", "Более 50"],
				},
				integrationReadiness: {
					type: "string",
					title: "Готовность к интеграции в ПД",
					enum: [
						"Готов к интеграции",
						"Нужны доработки ИС",
						"Сложная интеграция",
					],
				},
			},
		}),
		uiOptions: {
			archComponent: "dataMart",
			sectionRole: "subsection",
			showFilledCount: true,
		},
	},
	model: {
		make: () => ({
			type: "object",
			title: "Модели",
			properties: {
				workType: {
					type: "string",
					title: "Тип работ",
					enum: ["Обучение", "Дообучение", "Калибровка"],
				},
				modelsCount: { type: "integer", title: "Кол-во моделей" },
				algorithmType: {
					type: "string",
					title: "Тип алгоритма",
					enum: [
						"Табличные данные",
						"Временные ряды",
						"NLP",
						"CV",
						"RL",
					],
				},
				algorithmCoeff: {
					type: "string",
					title: "Коэф. алгоритма",
					enum: ["×0.75", "×1.00", "×1.25", "×1.50"],
				},
				autoML: {
					type: "string",
					title: "AutoML",
					enum: ["Не требуется", "Требуется"],
				},
				modelsList: {
					type: "array",
					title: "Список моделей",
					items: {
						type: "object",
						title: "Модель",
						required: ["name"],
						properties: {
							name: { type: "string", title: "Название модели" },
							class: {
								type: "string",
								title: "Класс",
								enum: [
									"Розничный бизнес",
									"Корпоративный бизнес",
									"Прочий",
								],
							},
							taskType: {
								type: "string",
								title: "Тип задачи",
								enum: [
									"Бинарная классификация",
									"Многоклассовая классификация",
									"Регрессия",
									"Кластеризация",
									"Ранжирование",
								],
							},
							algorithm: {
								type: "string",
								title: "Алгоритм",
								enum: [
									"Табличные данные",
									"Временные ряды",
									"NLP",
									"CV",
									"RL",
								],
							},
							autoML: {
								type: "string",
								title: "Auto ML",
								enum: [...YES_NO],
							},
							role: {
								type: "string",
								title: "Роль",
								enum: ["Оркестратор", "Подчинённая", "Независимая"],
							},
						},
					},
				},
			},
		}),
		uiOptions: {
			archComponent: "model",
			sectionRole: "subsection",
			showFilledCount: true,
		},
		uiBranch: {
			modelsList: {
				"ui:options": {
					orderable: false,
					addable: true,
					removable: true,
				},
			},
		},
	},
	deployChannel: {
		make: () => ({
			type: "array",
			title: "Каналы внедрения",
			items: {
				type: "string",
				enum: [...DEPLOY_CHANNEL_ITEMS],
			},
			uniqueItems: true,
		}),
		uiOptions: { archComponent: "deployChannel" },
	},
	modelControl: {
		make: () => ({
			type: "object",
			title: "Контроль модели",
			properties: {
				modelClass: {
					type: "string",
					title: "Класс моделей",
					enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
				},
				controlTypes: {
					type: "array",
					title: "Вид контроля",
					items: {
						type: "string",
						enum: ["КД", "ТМ", "ОК", "АК", "КМЗ", "ОВ"],
					},
					uniqueItems: true,
				},
			},
		}),
		uiOptions: {
			archComponent: "modelControl",
			sectionRole: "subsection",
		},
	},
	typicalWork: {
		make: () => ({
			type: "array",
			title: "Типовые работы",
			readOnly: true,
			items: {
				type: "object",
				title: "Типовая работа",
				properties: {
					name: {
						type: "string",
						title: "Наименование",
						readOnly: true,
					},
					workType: {
						type: "string",
						title: "Тип работ",
						readOnly: true,
					},
					reason: {
						type: "string",
						title: "Причина",
						readOnly: true,
					},
					estimateHoursPerDay: {
						type: "number",
						title: "Базовая оценка (ч/д)",
						readOnly: true,
					},
					coefficient: {
						type: "number",
						title: "Коэф.",
						readOnly: true,
					},
					total: {
						type: "number",
						title: "Итог",
						readOnly: true,
					},
				},
			},
		}),
		uiOptions: {
			archComponent: "typicalWork",
			addable: false,
			removable: false,
			orderable: false,
		},
	},
	atypicalWork: {
		make: () => ({
			type: "array",
			title: "Нетиповые работы",
			items: {
				type: "object",
				title: "Нетиповая задача",
				required: ["name"],
				properties: {
					name: { type: "string", title: "Задача" },
					estimateHoursPerDay: {
						type: "number",
						title: "Оценка ч/д",
					},
					coefficient: {
						type: "number",
						title: "Коэф.",
						default: 1.5,
					},
					total: {
						type: "number",
						title: "Итог",
						readOnly: true,
					},
					includeInCalculation: {
						type: "boolean",
						title: "Включить в расчёт",
						default: true,
					},
				},
			},
		}),
		uiOptions: {
			archComponent: "atypicalWork",
			addable: true,
			removable: true,
			orderable: false,
		},
	},
};
