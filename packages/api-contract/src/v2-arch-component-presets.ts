import type { RJSFSchema } from "@rjsf/utils";
import type { V2ArchComponentType } from "./v2-anketa-section-ui.util";

export type V2ArchComponentPresetDef = {
	make: () => RJSFSchema;
	uiOptions?: Record<string, unknown>;
	/** Дочерние ветки uiSchema (ключи — имена properties), без ui:options корня. */
	uiBranch?: Record<string, unknown>;
};

type SnapshotArchPresetRaw = {
	schema: RJSFSchema;
	uiOptions: Record<string, unknown>;
	uiBranch?: Record<string, unknown>;
};

/** Канонические jsonSchema/ui для арх. компонентов (из v2-default-anketa.snapshot.json). */
const SNAPSHOT_ARCH_PRESETS: Record<string, SnapshotArchPresetRaw> = {
	"modelService": {
		"schema": {
			"type": "object",
			"title": "Модельный сервис",
			"required": [
				"field_dEVFQVQn"
			],
			"properties": {
				"workType": {
					"enum": [
						"Разработка",
						"Внедрение",
						"Доработка",
						"Калибровка",
						"Разработка и внедрение"
					],
					"type": "string",
					"title": "Тип работ"
				},
				"modelClass": {
					"enum": [
						"1 — Розничные регуляторные модели",
						"2 — Розничные бизнес-модели",
						"3 — Розничные модели CRM",
						"4 — Розничные модели Collection",
						"5 — Корпоративные регуляторные модели",
						"6 — Корпоративные бизнес-модели",
						"7 — Прочие корпоративные модели",
						"8 — Модели финансового моделирования",
						"9 — Модели цифровых помощников"
					],
					"type": "string",
					"title": "Класс моделей"
				},
				"prePromEval": {
					"type": "boolean",
					"title": "Необходимость поддержки проведения пилота"
				},
				"pkRegulatory": {
					"type": "boolean",
					"title": "ПВР/Регуляторная"
				},
				"field_4IL7OStC": {
					"enum": [
						"Ручной",
						"Автоматизированный"
					],
					"type": "string",
					"title": "Способ загрузки данных в BI-систему"
				},
				"field_F7nK-We5": {
					"type": "string",
					"title": "Тип БД для BI-системы",
					"enum": [
						"Векторные",
						"Графовые",
						"Временные ряды и события",
						"Документо-ориентированные",
						"Специализированные"
					]
				},
				"field_JcKtx9Mg": {
					"type": "boolean",
					"title": "Требуется оркестратор"
				},
				"field_KzzDtkB0": {
					"type": "boolean",
					"title": "Требуется визуализация результатов работы модельного сервиса"
				},
				"field_SvNx6iEq": {
					"type": "array",
					"items": {
						"type": "string",
						"enum": [
							"КД — Качество модельных данных",
							"ТМ — Технический контроль",
							"ОК — Оперативный контроль",
							"АК — Аналитический контроль",
							"КМЗ — Контроль модельных значений",
							"ОВ — Оценка влияния моделей"
						]
					},
					"title": "Вид контроля",
					"uniqueItems": true
				},
				"field_Y2S_XRAQ": {
					"type": "boolean",
					"title": "Использование данных СХК через РЕПО"
				},
				"field_dEVFQVQn": {
					"type": "string",
					"title": "Название модельного сервиса"
				},
				"field_imxB4YEd": {
					"type": "boolean",
					"title": "Первичное подключение ИС к РЕПО"
				},
				"field_jUm5syZf": {
					"type": "array",
					"items": {
						"type": "string",
						"enum": [
							"Батч",
							"Батч + загрузка данных потребителю",
							"Батч + Онлайн",
							"Онлайн",
							"Онлайн gpu",
							"Стриминг",
							"Мобильные устройства",
							"LLM",
							"Гео-сервисы",
							"Внедрение в облаке",
							"Графовая платформа"
						]
					},
					"title": "Каналы внедрения",
					"uniqueItems": true
				},
				"field_kkbRs50S": {
					"type": "boolean",
					"title": "Хранение артефактов в РЕПО"
				},
				"field_o_HRj6VO": {
					"type": "boolean",
					"title": "Необходимость пилота (MVP)"
				},
				"field_r66ph-79": {
					"type": "boolean",
					"title": "Перекладка артефактов между контурами посредством РЕПО"
				}
			}
		},
		"uiOptions": {
			"sectionRole": "subsection",
			"archComponent": "modelService",
			"schemaFieldUid": "field_3bc4dc73-6804-4107-8251-5e41d9a1dfed",
			"showFilledCount": true
		},
		"uiBranch": {
			"ui:order": [
				"field_dEVFQVQn",
				"workType",
				"modelClass",
				"field_jUm5syZf",
				"field_SvNx6iEq",
				"field_o_HRj6VO",
				"prePromEval",
				"pkRegulatory",
				"field_imxB4YEd",
				"field_kkbRs50S",
				"field_r66ph-79",
				"field_Y2S_XRAQ",
				"field_JcKtx9Mg",
				"field_KzzDtkB0",
				"field_F7nK-We5",
				"field_4IL7OStC"
			],
			"workType": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.generalInfo.modelService.workType",
					"schemaFieldUid": "field_22ae6d02-b421-41ee-ba8a-5b3153f0f040"
				},
				"ui:placeholder": "Тип работ"
			},
			"modelClass": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.method.2.класс_моделей",
					"schemaFieldUid": "field_248655c8-3aa7-4a38-9afd-d09c21f9f122"
				},
				"ui:placeholder": "Класс моделей"
			},
			"prePromEval": {
				"ui:options": {
					"schemaFieldUid": "field_7ff20c0a-1cd7-4d66-99ae-b52ed1a9bb3a"
				},
				"ui:placeholder": "Необходимость поддержки проведения пилота"
			},
			"pkRegulatory": {
				"ui:options": {
					"schemaFieldUid": "field_08ccfd5f-235f-40d5-bbee-4a4873b9a8d0"
				},
				"ui:placeholder": "ПВР/Регуляторная"
			},
			"field_4IL7OStC": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "Способ загрузки данных в BI-систему",
					"schemaFieldUid": "field_2ceb3182-537b-4ffb-80e7-03ff397d61f2"
				},
				"ui:placeholder": "Способ загрузки данных в BI-систему"
			},
			"field_F7nK-We5": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.modelserviceiInfo.bidbtype",
					"schemaFieldUid": "field_f1d16b7e-c700-40fc-abee-8c7dbad9e6ac"
				},
				"ui:placeholder": "Тип БД для BI-системы"
			},
			"field_JcKtx9Mg": {
				"ui:options": {
					"schemaFieldUid": "field_9c96b450-48ee-4284-b8ea-0419b45812f8"
				},
				"ui:placeholder": "Требуется оркестратор"
			},
			"field_KzzDtkB0": {
				"ui:options": {
					"schemaFieldUid": "field_031c725e-0b8d-49bb-a44c-61606b62fe4e"
				},
				"ui:placeholder": "Требуется визуализация результатов работы модельного сервиса"
			},
			"field_SvNx6iEq": {
				"ui:widget": "select",
				"ui:options": {
					"multiple": true,
					"dictionaryCode": "v2.method.3.вид_контроля",
					"schemaFieldUid": "field_355676f4-fbf4-4e9c-9870-86736e6e05d7"
				},
				"ui:placeholder": "Вид контроля"
			},
			"field_Y2S_XRAQ": {
				"ui:options": {
					"schemaFieldUid": "field_467bb8b7-95ba-4383-b06b-c42515f9d9d7"
				},
				"ui:placeholder": "Использование данных СХК через РЕПО"
			},
			"field_dEVFQVQn": {
				"ui:options": {
					"schemaFieldUid": "field_18c2a4b9-199d-4f71-84e0-1c94caf3ca8b"
				},
				"ui:placeholder": "Название модельного сервиса"
			},
			"field_imxB4YEd": {
				"ui:options": {
					"schemaFieldUid": "field_d3b505fd-e708-4ec0-9669-b6352b705d42"
				},
				"ui:placeholder": "Первичное подключение ИС к РЕПО"
			},
			"field_jUm5syZf": {
				"ui:widget": "select",
				"ui:options": {
					"multiple": true,
					"dictionaryCode": "v2.method.4.канал_внедрения",
					"schemaFieldUid": "field_4fb7d302-c5f0-49e6-9cd2-959a1fbe1f4e"
				},
				"ui:placeholder": "Каналы внедрения"
			},
			"field_kkbRs50S": {
				"ui:options": {
					"schemaFieldUid": "field_03128147-5fa6-4163-8aee-5eeadfeb15e9"
				},
				"ui:placeholder": "Хранение артефактов в РЕПО"
			},
			"field_o_HRj6VO": {
				"ui:options": {
					"tooltip": "Применяется в случае, если требуется создать прототип модели, которую Заказчик планирует апробировать перед выносом в пром. Длительность пилота ограничена 6 месяцами. Блокируется при выборе 'Да' в поле 'Модель разработана?",
					"schemaFieldUid": "field_eb6300e7-8889-40bf-92a1-0c8a778de8ef"
				},
				"ui:placeholder": "Необходимость пилота"
			},
			"field_r66ph-79": {
				"ui:options": {
					"schemaFieldUid": "field_40c7febb-4936-4cb9-9a83-3f95bbf28754"
				},
				"ui:placeholder": "Перекладка артефактов между контурами посредством РЕПО"
			}
		}
	},
	"sourceSystem": {
		"schema": {
			"type": "array",
			"items": {
				"type": "object",
				"title": "Система источник",
				"required": [
					"name"
				],
				"properties": {
					"name": {
						"type": "string",
						"title": "Название источника"
					},
					"type": {
						"enum": [
							"Внутренний",
							"Внешний"
						],
						"type": "string",
						"title": "Тип системы-источника"
					},
					"field_-EGYyyJF": {
						"type": "boolean",
						"title": "Необходим новый тракт данных от источника"
					},
					"field_-t8JSf3p": {
						"enum": [
							"Неизвестно",
							"Стандартная",
							"Нестандартная"
						],
						"type": "string",
						"title": "Форма договора"
					},
					"field_1ANadh7U": {
						"enum": [
							"Однократный",
							"Регламентный"
						],
						"type": "string",
						"title": "Тип загрузки данных"
					},
					"field_1bl3dfSX": {
						"type": "boolean",
						"title": "Требуется новая модель для автоматической разметки данных"
					},
					"field_3a0vme2u": {
						"enum": [
							"Да",
							"Нет",
							"Неизвестно"
						],
						"type": "string",
						"title": "Предусмотрено проведение конкурса"
					},
					"field_4Gff93vI": {
						"type": "boolean",
						"title": "Требуется подготовка сырых данных для загрузки в ИС 1860"
					},
					"field_4jxR0E0m": {
						"enum": [
							"Первичный",
							"Повторный"
						],
						"type": "string",
						"title": "Пилот"
					},
					"field_61bkBs0m": {
						"type": "boolean",
						"title": "Требуется регламентный импорт/экспорт данных или отчетности в/из ИС 1860"
					},
					"field_8pFvwc-v": {
						"type": "boolean",
						"title": "Наличие реплики в DAPP"
					},
					"field_9BXQE8SI": {
						"enum": [
							"Односторонний",
							"Двусторонний",
							"Неизвестно"
						],
						"type": "string",
						"title": "Режим обмена данными"
					},
					"field_AKLVuyFy": {
						"enum": [
							"Да",
							"Нет",
							"Неизвестно"
						],
						"type": "string",
						"title": "Наличие конфиденциальных данных"
					},
					"field_DBFG7kIN": {
						"enum": [
							"Да",
							"Нет",
							"Неизвестно"
						],
						"type": "string",
						"title": "Наличие юридического основания для пилота"
					},
					"field_DJJtx7nX": {
						"type": "boolean",
						"title": "Требуется разметка данных источника"
					},
					"field_F8GPVM7R": {
						"enum": [
							"Точечное",
							"Малое",
							"Среднее",
							"Большое",
							"Масштабное"
						],
						"type": "string",
						"title": "Размер модели разметки данных"
					},
					"field_HuOLfL4K": {
						"enum": [
							"Есть",
							"Нет",
							"Неизвестно"
						],
						"type": "string",
						"title": "Риск появления дополнительных систем-источников"
					},
					"field_L1lRlgf1": {
						"enum": [
							"Высокая",
							"Средняя",
							"Низкая",
							"Неизвестно"
						],
						"type": "string",
						"title": "Сложность реализации"
					},
					"field_TvqjyIO-": {
						"type": "boolean",
						"title": "Требуется донастройка ИС 1860 под выбранную модель разметки данных"
					},
					"field_VX7y3PsB": {
						"enum": [
							"Высокая",
							"Средняя",
							"Низкая",
							"Неизвестно"
						],
						"type": "string",
						"title": "Сложность конфигурации модели разметки данных"
					},
					"field_WgK6lIS-": {
						"type": "boolean",
						"title": "Требуется ручная обработка результатов автоматизированной разметки данных"
					},
					"field_Y_K0Hy0e": {
						"type": "string",
						"title": "Количество сущностей (исходных таблиц)",
						"enum": [
							"Точечное (1-4)",
							"Малое (5-9)",
							"Среднее (9-15)",
							"Крупное (15-20)",
							"Большое (20-25)",
							"Масштабное (25+)",
							"Неизвестно"
						]
					},
					"field_d3OCFyaC": {
						"type": "string",
						"title": "Сложность предметной области",
						"enum": [
							"Низкая",
							"Средняя",
							"Высокая",
							"Неизвестно"
						]
					},
					"field_fJ_7OdE7": {
						"type": "boolean",
						"title": "Необходимо подтвердить возможность интеграции"
					},
					"field_lDw9gG39": {
						"type": "boolean",
						"title": "Требуются специальные условия хранения и обработки конфиденциальных данных, не поддерживаемые коммунальным сервисом"
					},
					"field_lzP44Urx": {
						"type": "string",
						"title": "Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик",
						"enum": [
							"Да",
							"Нет",
							"Неизвестно"
						]
					},
					"field_nE73kPQl": {
						"enum": [
							"Высокая",
							"Средняя",
							"Низкая",
							"Неизвестно"
						],
						"type": "string",
						"title": "Детализация и ясность запроса постановки задачи"
					},
					"field_qMxSfHk1": {
						"type": "boolean",
						"title": "Требуется интеграция с промежуточной системой (СХК, СФП и др.)"
					},
					"field_tpROQBf5": {
						"enum": [
							"Стандартное",
							"Нестандартное",
							"Неизвестно"
						],
						"type": "string",
						"title": "NDA"
					},
					"field_vqqlHbU6": {
						"enum": [
							"Да",
							"Нет",
							"Неизвестно"
						],
						"type": "string",
						"title": "Требуется хэширование/ шифрование"
					},
					"field_whHc-OoW": {
						"type": "boolean",
						"title": "Риск появления дополнительных систем-источников"
					},
					"field_wuYlhnu0": {
						"type": "string",
						"title": "Сложность настройки шаблона разметки данных",
						"enum": [
							"Высокая",
							"Средняя",
							"Низкая",
							"Неизвестно"
						]
					}
				}
			},
			"title": "Системы источники"
		},
		"uiOptions": {
			"addable": true,
			"orderable": false,
			"removable": true,
			"archComponent": "sourceSystem",
			"schemaFieldUid": "field_4a77415d-9c12-4256-bc63-4087d1196874"
		},
		"uiBranch": {
			"items": {
				"name": {
					"ui:widget": "text",
					"ui:options": {
						"tooltip": "Заполняется при отсутствии витрин с агрегатами/широких витрин с агрегатами/широких витрин на регламенте в области ответственности модельного стрима, при необходимости поиска данных, указывается количество внутренних (в т.ч. в ответственности другого стрима) и внешних источников данных",
						"schemaFieldUid": "field_bbe1adba-db69-4d19-a15d-a4d269727aca"
					},
					"ui:placeholder": "Название источника"
				},
				"type": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.type",
						"schemaFieldUid": "field_f0070137-09a8-432a-bd47-dd6e901d8cb2"
					}
				},
				"ui:order": [
					"name",
					"type",
					"field_8pFvwc-v",
					"field_lzP44Urx",
					"field_whHc-OoW",
					"field_-EGYyyJF",
					"field_fJ_7OdE7",
					"field_qMxSfHk1",
					"field_d3OCFyaC",
					"field_Y_K0Hy0e",
					"field_nE73kPQl",
					"field_HuOLfL4K",
					"field_tpROQBf5",
					"field_AKLVuyFy",
					"field_4jxR0E0m",
					"field_DBFG7kIN",
					"field_vqqlHbU6",
					"field_9BXQE8SI",
					"field_1ANadh7U",
					"field_3a0vme2u",
					"field_-t8JSf3p",
					"field_DJJtx7nX",
					"field_F8GPVM7R",
					"field_1bl3dfSX",
					"field_wuYlhnu0",
					"field_4Gff93vI",
					"field_TvqjyIO-",
					"field_VX7y3PsB",
					"field_61bkBs0m",
					"field_L1lRlgf1",
					"field_lDw9gG39",
					"field_WgK6lIS-"
				],
				"field_-EGYyyJF": {
					"ui:options": {
						"schemaFieldUid": "field_6676112d-2c43-41a0-8b3c-bd0d492ecd49"
					},
					"ui:placeholder": "Необходим новый тракт данных от источника"
				},
				"field_-t8JSf3p": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_-t8JSf3p",
						"schemaFieldUid": "field_1a1d2a81-91ee-4a96-a38d-7d9e63e7edfc"
					}
				},
				"field_1ANadh7U": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_1ANadh7U",
						"schemaFieldUid": "field_f80e7284-6d7b-48be-87b4-31d898e8ba33"
					}
				},
				"field_1bl3dfSX": {
					"ui:options": {
						"schemaFieldUid": "field_9278382f-a3b6-4c1f-88e0-ef31ac39e54b"
					}
				},
				"field_3a0vme2u": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_3a0vme2u",
						"schemaFieldUid": "field_057938c2-0209-4665-be31-2adca840940f"
					}
				},
				"field_4Gff93vI": {
					"ui:options": {
						"schemaFieldUid": "field_7ec2be63-0014-4dd4-966d-44404aaad910"
					}
				},
				"field_4jxR0E0m": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_4jxR0E0m",
						"schemaFieldUid": "field_32d71261-cc35-4a8e-97cd-21e5fd21f199"
					}
				},
				"field_61bkBs0m": {
					"ui:options": {
						"schemaFieldUid": "field_00e91b78-dcc7-4457-9fc0-f1a45a643c32"
					}
				},
				"field_8pFvwc-v": {
					"ui:options": {
						"schemaFieldUid": "field_f1bda400-9a8d-4ee0-b3ac-f4f73549792a"
					},
					"ui:placeholder": "Наличие реплики в DAPP"
				},
				"field_9BXQE8SI": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_K2ioHD8d",
						"schemaFieldUid": "field_704c304c-c99a-40b6-86a0-a7562024e8c5"
					}
				},
				"field_AKLVuyFy": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_p4zxdNZG",
						"schemaFieldUid": "field_759bbb62-26dc-44ea-9e16-40ad1c4bfa03"
					}
				},
				"field_DBFG7kIN": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_DBFG7kIN",
						"schemaFieldUid": "field_c5eb01d6-6ed6-45c5-8e44-521568e0b7ac"
					}
				},
				"field_DJJtx7nX": {
					"ui:options": {
						"schemaFieldUid": "field_8d2fadfa-bffc-48fc-ae01-2e8295462beb"
					}
				},
				"field_F8GPVM7R": {
					"ui:options": {
						"schemaFieldUid": "field_ee81cbee-281b-4d15-b478-9b5dffac47aa"
					}
				},
				"field_HuOLfL4K": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "Риск появления дополнительных систем-источников",
						"schemaFieldUid": "field_8f0b912b-84cd-4bf9-b978-f6713eed8b36"
					}
				},
				"field_L1lRlgf1": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_L1lRlgf1",
						"schemaFieldUid": "field_8cc4ea6a-62b9-410e-b56f-dda6755e65ff"
					}
				},
				"field_TvqjyIO-": {
					"ui:options": {
						"schemaFieldUid": "field_1a58b817-eb43-451c-a592-500b96998076"
					}
				},
				"field_VX7y3PsB": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_VX7y3PsB",
						"schemaFieldUid": "field_58353db5-247f-465a-8250-97b4693839bb"
					}
				},
				"field_WgK6lIS-": {
					"ui:options": {
						"schemaFieldUid": "field_83980706-189a-43ac-a9a3-ebb355fbcf01"
					}
				},
				"field_Y_K0Hy0e": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.method.28.объ_м_запроса_по_сущностям",
						"schemaFieldUid": "field_751a2780-f830-4a45-a4bb-6698014f5b9d"
					}
				},
				"field_d3OCFyaC": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.method.27.сложность_предметной_области",
						"schemaFieldUid": "field_3f716282-d75b-498f-a0b4-2d99f4a6599e"
					}
				},
				"field_fJ_7OdE7": {
					"ui:options": {
						"schemaFieldUid": "field_8a8bbc10-ade4-41c0-bc37-6f1eadb99723"
					},
					"ui:placeholder": "Необходимо подтвердить возможность интеграции"
				},
				"field_lDw9gG39": {
					"ui:options": {
						"schemaFieldUid": "field_7d161d75-68cc-45be-92d2-2991928b567b"
					}
				},
				"field_lzP44Urx": {
					"ui:options": {
						"schemaFieldUid": "field_213d174a-4e1d-4843-8505-f7f5f4737feb"
					},
					"ui:placeholder": "Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик"
				},
				"field_nE73kPQl": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.method.29.детализация_и_ясность_запроса_rds",
						"schemaFieldUid": "field_d8ea6134-00e5-4fc6-9253-4885103db9e2"
					}
				},
				"field_qMxSfHk1": {
					"ui:options": {
						"schemaFieldUid": "field_2eeb9751-22b7-4545-afeb-75bc4c7ec74e"
					},
					"ui:placeholder": "Требуется интеграция с промежуточной системой (СХК, СФП и др.)"
				},
				"field_tpROQBf5": {
					"ui:widget": "select",
					"ui:options": {
						"tooltip": "Соглашение о неразглашении",
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.nda",
						"schemaFieldUid": "field_37dc02ff-01f5-4ae8-844a-cc66023efc98"
					}
				},
				"field_vqqlHbU6": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_HMnqITVb",
						"schemaFieldUid": "field_8e679168-535f-4dd9-b11c-790393469e8e"
					}
				},
				"field_whHc-OoW": {
					"ui:options": {
						"schemaFieldUid": "field_7464bec8-4d2e-4360-a38c-447fd0342be9"
					},
					"ui:placeholder": "Риск появления дополнительных систем-источников"
				},
				"field_wuYlhnu0": {
					"ui:widget": "select",
					"ui:options": {
						"dictionaryCode": "v2.detailInfo.sourceSystems.items.field_wuYlhnu0",
						"schemaFieldUid": "field_d6554cad-b9ca-4b1e-b885-8868f35e60f5"
					}
				}
			}
		}
	},
	"dataProcess": {
		"schema": {
			"type": "object",
			"title": "Процессы обработки данных",
			"required": [
				"field_It-B8PfV"
			],
			"properties": {
				"deliveryMode": {
					"enum": [
						"Напрямую",
						"Опосредованно",
						"Неизвестно"
					],
					"type": "string",
					"title": "Способ предоставления данных заказчику"
				},
				"field_C6oqyTPh": {
					"enum": [
						"Да",
						"Нет",
						"Неизвестно"
					],
					"type": "string",
					"title": "Требуется хэширование/ шифрование"
				},
				"field_HgUCNn6E": {
					"enum": [
						"Пакетный",
						"Потоковый"
					],
					"type": "string",
					"title": "Тип процесса обработки данных"
				},
				"field_It-B8PfV": {
					"type": "string",
					"title": "Название процесса"
				},
				"field_R3Lx-csF": {
					"enum": [
						"Да",
						"Нет",
						"Неизвестно"
					],
					"type": "string",
					"title": "Двусторонний обмен данными"
				},
				"field_UEzs5Q87": {
					"enum": [
						"Низкая",
						"Средняя",
						"Высокая",
						"Неизвестно"
					],
					"type": "string",
					"title": "Сложность реализации"
				},
				"field_yJ51GkCR": {
					"enum": [
						"Разработка",
						"Доработка",
						"Настройка"
					],
					"type": "string",
					"title": "Тип работ"
				},
				"confidentialData": {
					"enum": [
						"Да",
						"Нет",
						"Неизвестно"
					],
					"type": "string",
					"title": "Наличие конфиденциальных данных"
				}
			}
		},
		"uiOptions": {
			"sectionRole": "subsection",
			"archComponent": "dataProcess",
			"schemaFieldUid": "field_51b8a4f4-d0f3-455e-9591-120a4d6293e5",
			"showFilledCount": true
		},
		"uiBranch": {
			"ui:order": [
				"field_It-B8PfV",
				"field_yJ51GkCR",
				"deliveryMode",
				"field_UEzs5Q87",
				"confidentialData",
				"field_C6oqyTPh",
				"field_R3Lx-csF",
				"field_HgUCNn6E"
			],
			"deliveryMode": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataProcess.deliveryMode",
					"schemaFieldUid": "field_3fa66577-5e4e-4021-a21c-d9f3d40125cd"
				}
			},
			"field_C6oqyTPh": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataProcess.field_C6oqyTPh",
					"schemaFieldUid": "field_99d467e2-2205-4096-81c7-762d5d04166c"
				}
			},
			"field_HgUCNn6E": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataProcess.field_HgUCNn6E",
					"schemaFieldUid": "field_553faff6-a347-41a5-8ac7-feab2fc38e46"
				}
			},
			"field_It-B8PfV": {
				"ui:options": {
					"schemaFieldUid": "field_8bc18250-e9e2-4d55-ad33-6776b857a03d"
				},
				"ui:placeholder": "Название процесса"
			},
			"field_R3Lx-csF": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataProcess.field_R3Lx-csF",
					"schemaFieldUid": "field_9f1865ca-e9a1-4130-9ee7-d8dc37452bce"
				}
			},
			"field_UEzs5Q87": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataProcess.implComplexity",
					"schemaFieldUid": "field_aa1dc517-1277-4ca5-ad9f-ed0bb8a9efe6"
				}
			},
			"field_yJ51GkCR": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataProcess.workType",
					"schemaFieldUid": "field_68f5a4fa-579f-4b89-b4f3-11214957dffe"
				}
			},
			"confidentialData": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataProcess.confidentialData",
					"schemaFieldUid": "field_d6d1a663-62f2-42c8-b0fb-b3f5d8e9bc51"
				}
			}
		}
	},
	"dataMart": {
		"schema": {
			"type": "object",
			"title": "Объект / Витрина данных",
			"required": [
				"field_zApubb5V"
			],
			"properties": {
				"workType": {
					"enum": [
						"Разработка",
						"Доработка",
						"Настройка"
					],
					"type": "string",
					"title": "Тип работ"
				},
				"metricsCount": {
					"type": "number",
					"title": "Количество признаков"
				},
				"field_0uV7wafS": {
					"enum": [
						"Да",
						"Нет",
						"Неизвестно"
					],
					"type": "string",
					"title": "Требуется хэширование/ шифрование"
				},
				"field_28IPlEQu": {
					"type": "number",
					"title": "Количество метрик"
				},
				"field_46LCnfWo": {
					"enum": [
						"Высокая",
						"Средняя",
						"Низкая",
						"Неизвестно"
					],
					"type": "string",
					"title": "Сложность реализации"
				},
				"field_Ad1msOl7": {
					"type": "boolean",
					"title": "Необходима продуктивизация"
				},
				"field_L-WWLDWY": {
					"enum": [
						"Да",
						"Нет",
						"Неизвестно"
					],
					"type": "string",
					"title": "Наличие конфиденциальных данных"
				},
				"field_N9LFD6Hu": {
					"enum": [
						"Да",
						"Нет",
						"Неизвестно"
					],
					"type": "string",
					"title": "Двусторонний обмен данными"
				},
				"field_Q8DGJNTn": {
					"type": "number",
					"title": "Количество контролей качества признаков"
				},
				"field_fRuMuWtn": {
					"enum": [
						"Непосредственно",
						"Опосредованно",
						"Неизвестно"
					],
					"type": "string",
					"title": "Способ предоставления данных заказчику"
				},
				"field_hIM0c5gG": {
					"type": "boolean",
					"title": "Содержит сырые данные"
				},
				"field_le47srI7": {
					"enum": [
						"Холодный",
						"Теплый",
						"Горячий",
						"Потоковый"
					],
					"type": "string",
					"title": "Слой хранения"
				},
				"field_lovKvLZc": {
					"type": "boolean",
					"title": "Реализуется в Хранилище признаков"
				},
				"field_rZeUo8a_": {
					"type": "boolean",
					"title": "Требуется контроль качества Признаков"
				},
				"field_w_EN6lWe": {
					"type": "boolean",
					"title": "Требуется парсинг сырых данных"
				},
				"field_xva1dRvW": {
					"type": "boolean",
					"title": "Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик"
				},
				"field_zApubb5V": {
					"type": "string",
					"title": "Название объекта/витрины данных"
				},
				"readyPromReports": {
					"type": "boolean",
					"title": "Наличие готовых пром витрин (необходима продуктивизация)"
				}
			}
		},
		"uiOptions": {
			"sectionRole": "subsection",
			"archComponent": "dataMart",
			"schemaFieldUid": "field_5516bbf5-1a48-40a6-88f8-d05728ca64b3",
			"showFilledCount": true
		},
		"uiBranch": {
			"ui:order": [
				"field_zApubb5V",
				"workType",
				"field_lovKvLZc",
				"field_hIM0c5gG",
				"field_w_EN6lWe",
				"metricsCount",
				"field_46LCnfWo",
				"field_le47srI7",
				"field_rZeUo8a_",
				"field_Q8DGJNTn",
				"field_xva1dRvW",
				"readyPromReports",
				"field_Ad1msOl7",
				"field_28IPlEQu",
				"field_fRuMuWtn",
				"field_L-WWLDWY",
				"field_0uV7wafS",
				"field_N9LFD6Hu"
			],
			"workType": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataMart.workType",
					"schemaFieldUid": "field_6f91d0c5-3949-4468-88e9-29741af2b07d"
				}
			},
			"metricsCount": {
				"ui:options": {
					"schemaFieldUid": "field_77f9732b-b562-4e32-b8ff-67d106f17fcf"
				}
			},
			"field_0uV7wafS": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataMart.field_0uV7wafS",
					"schemaFieldUid": "field_13c2cdce-f11e-4d6a-8577-0ad7e1940170"
				}
			},
			"field_28IPlEQu": {
				"ui:options": {
					"schemaFieldUid": "field_e03806f6-01f4-44ee-835a-e9e5bae8f6c6"
				}
			},
			"field_46LCnfWo": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataMart.field_46LCnfWo",
					"schemaFieldUid": "field_9aaf1e8d-e27c-4f48-a631-9f690ea03a07"
				}
			},
			"field_Ad1msOl7": {
				"ui:options": {
					"schemaFieldUid": "field_08a71e6d-809b-41a3-aa63-10c8b89da9a0"
				}
			},
			"field_L-WWLDWY": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataMart.field_L-WWLDWY",
					"schemaFieldUid": "field_1a14aa49-5c0c-41e7-81b8-637f03555391"
				}
			},
			"field_N9LFD6Hu": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataMart.field_N9LFD6Hu",
					"schemaFieldUid": "field_8cff1155-e458-4fea-a8c7-abad1260df8f"
				}
			},
			"field_Q8DGJNTn": {
				"ui:options": {
					"schemaFieldUid": "field_e48e94c0-465e-47de-8a9c-ae8d95ca8d6c"
				}
			},
			"field_fRuMuWtn": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataMart.deliveryMode",
					"schemaFieldUid": "field_5389285c-9fe6-4a47-bfdb-2ad6a082cbd0"
				}
			},
			"field_hIM0c5gG": {
				"ui:options": {
					"schemaFieldUid": "field_73e7ba4b-2124-44c9-bfc3-7d5d524c9076"
				}
			},
			"field_le47srI7": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.dataMart.field_le47srI7",
					"schemaFieldUid": "field_bffd7490-feee-4eb1-a48e-524746fd659c"
				}
			},
			"field_lovKvLZc": {
				"ui:options": {
					"schemaFieldUid": "field_7e902aa9-dd30-4944-a4ba-b70d14ff7ee1"
				}
			},
			"field_rZeUo8a_": {
				"ui:options": {
					"schemaFieldUid": "field_c7affe0f-873e-42e1-b79a-c29c62b26c0f"
				}
			},
			"field_w_EN6lWe": {
				"ui:options": {
					"schemaFieldUid": "field_5525d556-6cd1-4efa-b10b-0f24ea6c1d96"
				}
			},
			"field_xva1dRvW": {
				"ui:options": {
					"schemaFieldUid": "field_0845a1af-f430-4897-9300-4a3c580aa6ee"
				}
			},
			"field_zApubb5V": {
				"ui:options": {
					"schemaFieldUid": "field_877bae45-21cb-4237-a20a-83260f054e9e"
				}
			},
			"readyPromReports": {
				"ui:widget": "checkbox",
				"ui:options": {
					"schemaFieldUid": "field_12d42005-7d15-4d0f-9aa0-2b6eebc596c8"
				}
			}
		}
	},
	"model": {
		"schema": {
			"type": "object",
			"title": "Модель",
			"required": [
				"field_atxiq-UM"
			],
			"properties": {
				"autoML": {
					"type": "boolean",
					"title": "Необходимость AutoML"
				},
				"workType": {
					"enum": [
						"Обучение",
						"Дообучение",
						"Калибровка"
					],
					"type": "string",
					"title": "Тип работ"
				},
				"algorithmType": {
					"enum": [
						"Табличные данные",
						"Текстовая аналитика — Классические модели",
						"Текстовая аналитика — LLM",
						"Аудио-аналитика",
						"Компьютерное зрение",
						"Оптимизационная задача",
						"Гео-аналитика",
						"Графовая аналитика"
					],
					"type": "string",
					"title": "Сложность алгоритма / тип ML задачи"
				},
				"field_58TkWuwu": {
					"type": "boolean",
					"title": "AutoML: встраивание внешнего кода"
				},
				"field_CeBkWcQc": {
					"type": "boolean",
					"title": "AutoML: требуется преобразование данных"
				},
				"field_S23CbRXp": {
					"type": "boolean",
					"title": "AutoML: требуется постановка на регламент"
				},
				"field_S41Rqt5E": {
					"type": "boolean",
					"title": "AutoML: требуется новая библиотека"
				},
				"field_VbI-0aiT": {
					"type": "string",
					"title": "Роль модели",
					"enum": [
						"Обычная",
						"Оркестратор"
					]
				},
				"field_atxiq-UM": {
					"type": "string",
					"title": "Название модели"
				}
			}
		},
		"uiOptions": {},
		"uiBranch": {
			"autoML": {
				"ui:options": {
					"schemaFieldUid": "field_8b58cf5d-ea4a-4180-8670-ff2021bcaa9b"
				}
			},
			"ui:order": [
				"field_atxiq-UM",
				"workType",
				"field_VbI-0aiT",
				"algorithmType",
				"autoML",
				"field_S41Rqt5E",
				"field_S23CbRXp",
				"field_CeBkWcQc",
				"field_58TkWuwu"
			],
			"workType": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.detailInfo.model.workType",
					"schemaFieldUid": "field_450d6b84-7414-42d9-8d4c-57409e4f90c8"
				}
			},
			"algorithmType": {
				"ui:widget": "select",
				"ui:options": {
					"tooltip": "По умолчанию применяется один тип алгоритма: >1 возможно для каскада или ансамблей моделей, если в одном решении используется комбинация алгоритмов/типов ML задач (т.е. для всех моделей/подмоделей решения может быть задействован один тип алгоритма). Заполняем вложенный список алгоритмов по типу данных, алгоритмов ML и инфраструктуры, участвующей во внедрении решения:\n\n· Табличные данные — любой ML-алгоритм (в т.ч. без учителя)\n· Текстовая аналитика — Классические модели — алгоритмы для текста (кроме LLM)\n· Текстовая аналитика — LLM — LLM для текста\n· Аудиоаналитика — алгоритмы для звука (аудио, видео)\n· Компьютерное зрение — CV — алгоритмы для изображений (аудио, видео)\n· Оптимизационная задача — модельный оптимизатор или эвристики\n· ГЕОаналитика — требуется платформа геоаналитики\n· Графовая аналитика — требуется графовая платформа",
					"dictionaryCode": "v2.detailInfo.model.algorithmType",
					"schemaFieldUid": "field_bd100464-101d-4d4e-8096-751dab52e01f"
				}
			},
			"field_58TkWuwu": {
				"ui:options": {
					"schemaFieldUid": "field_ef1169ba-7832-472a-8043-494ff92c7c57"
				}
			},
			"field_CeBkWcQc": {
				"ui:options": {
					"schemaFieldUid": "field_6f650ab1-89c0-4e26-bf4f-b61fb494cde1"
				}
			},
			"field_S23CbRXp": {
				"ui:options": {
					"schemaFieldUid": "field_6cf96965-0a42-4e6e-b63d-79d724faf002"
				}
			},
			"field_S41Rqt5E": {
				"ui:options": {
					"schemaFieldUid": "field_278b61ee-774f-4e84-9a41-e9ce26c5319f"
				}
			},
			"field_VbI-0aiT": {
				"ui:widget": "select",
				"ui:options": {
					"dictionaryCode": "v2.method.13.роль_модели",
					"schemaFieldUid": "field_0bb82aba-dd87-422f-8824-b97f56159fcf"
				}
			},
			"field_atxiq-UM": {
				"ui:options": {
					"schemaFieldUid": "field_641d16cb-4f74-41d3-abbf-12510e14ccae"
				}
			}
		}
	}
};

function presetFromSnapshot(raw: SnapshotArchPresetRaw): V2ArchComponentPresetDef {
	return {
		make: () => structuredClone(raw.schema) as RJSFSchema,
		...(Object.keys(raw.uiOptions).length > 0 ? { uiOptions: raw.uiOptions } : {}),
		...(raw.uiBranch && Object.keys(raw.uiBranch).length > 0
			? { uiBranch: raw.uiBranch }
			: {}),
	};
}

export const V2_ARCH_COMPONENT_PRESET_DEFS_FROM_SNAPSHOT: Pick<
	Record<V2ArchComponentType, V2ArchComponentPresetDef>,
	"modelService" | "sourceSystem" | "dataProcess" | "dataMart" | "model"
> = {
	modelService: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.modelService),
	sourceSystem: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.sourceSystem),
	dataProcess: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.dataProcess),
	dataMart: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.dataMart),
	model: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.model),
};
