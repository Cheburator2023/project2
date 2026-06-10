"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2_ARCH_COMPONENT_PRESET_DEFS_FROM_SNAPSHOT = void 0;
/** Канонические jsonSchema/ui для арх. компонентов (из v2-default-anketa.snapshot.json). */
const SNAPSHOT_ARCH_PRESETS = {
    "modelService": {
        "schema": {
            "type": "object",
            "title": "Модельный сервис",
            "properties": {
                "workType": {
                    "type": "string",
                    "title": "Тип работ",
                    "enum": [
                        "Разработка",
                        "Доработка",
                        "Настройка"
                    ]
                },
                "modelClass": {
                    "type": "string",
                    "title": "Класс моделей",
                    "enum": [
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "7",
                        "8",
                        "9"
                    ]
                },
                "controlTypes": {
                    "type": "array",
                    "title": "Вид контроля",
                    "items": {
                        "type": "string",
                        "enum": [
                            "КД",
                            "ТМ",
                            "ОК",
                            "АК",
                            "КМЗ",
                            "ОВ"
                        ]
                    },
                    "uniqueItems": true
                },
                "pkRegulatory": {
                    "type": "boolean",
                    "title": "ПК: Модель ПВР/Регуляторная"
                },
                "deployChannels": {
                    "type": "array",
                    "title": "Каналы внедрения",
                    "items": {
                        "type": "string",
                        "enum": [
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
                            "Графовая платформа"
                        ]
                    },
                    "uniqueItems": true
                },
                "field_4IL7OStC": {
                    "type": "boolean",
                    "title": "Способ загрузки данных в BI-систему"
                },
                "field_F7nK-We5": {
                    "type": "boolean",
                    "title": "Тип БД для BI-системы"
                },
                "field_JcKtx9Mg": {
                    "type": "boolean",
                    "title": "Требуется оркестратор"
                },
                "field_KzzDtkB0": {
                    "type": "boolean",
                    "title": "Требуется визуализация результатов работы модельного сервиса"
                },
                "field_Y2S_XRAQ": {
                    "type": "boolean",
                    "title": "Использование данных СХК через РЕПО"
                },
                "field_imxB4YEd": {
                    "type": "boolean",
                    "title": "Первичное подключение ИС к РЕПО"
                },
                "field_kkbRs50S": {
                    "type": "boolean",
                    "title": "Хранение артефактов в РЕПО"
                },
                "field_r66ph-79": {
                    "type": "boolean",
                    "title": "Перекладка артефактов между контурами посредством РЕПО"
                },
                "pkRecalibration": {
                    "type": "boolean",
                    "title": "ПК: Рекалибровка"
                },
                "pkOtherChannel": {
                    "type": "boolean",
                    "title": "ПК: Использование в другом канале"
                },
                "pkRework": {
                    "type": "boolean",
                    "title": "ПК: Переработка существующей"
                },
                "pkNewType": {
                    "type": "boolean",
                    "title": "ПК: Новый тип модели"
                },
                "pirmBlock": {
                    "type": "object",
                    "title": "Блок ПиРМ",
                    "properties": {
                        "connectISRepo": {
                            "type": "boolean",
                            "title": "Подключение ИС к РЕПО"
                        },
                        "interface": {
                            "type": "boolean",
                            "title": "Интерфейс"
                        },
                        "businessFunc": {
                            "type": "boolean",
                            "title": "Доработка бизнес-функционала"
                        },
                        "systemFunc": {
                            "type": "boolean",
                            "title": "Функционал системы"
                        },
                        "visualization": {
                            "type": "boolean",
                            "title": "Визуализация и аналитика"
                        },
                        "clusterExpansion": {
                            "type": "boolean",
                            "title": "Расширение кластера"
                        },
                        "newModel": {
                            "type": "boolean",
                            "title": "Новая модель"
                        },
                        "loadTesting": {
                            "type": "boolean",
                            "title": "Требуется НТ"
                        },
                        "krsUtilization": {
                            "type": "boolean",
                            "title": "КРС утилизации серверов"
                        },
                        "logging": {
                            "type": "boolean",
                            "title": "Логирование"
                        }
                    }
                }
            }
        },
        "uiOptions": {
            "archComponent": "modelService",
            "sectionRole": "subsection",
            "showFilledCount": true
        },
        "uiBranch": {
            "ui:order": [
                "workType",
                "modelClass",
                "controlTypes",
                "pkRegulatory",
                "deployChannels",
                "field_4IL7OStC",
                "field_F7nK-We5",
                "field_JcKtx9Mg",
                "field_KzzDtkB0",
                "field_Y2S_XRAQ",
                "field_imxB4YEd",
                "field_kkbRs50S",
                "field_r66ph-79",
                "pkRecalibration",
                "pkOtherChannel",
                "pkRework",
                "pkNewType",
                "pirmBlock"
            ],
            "workType": {
                "ui:widget": "select"
            },
            "modelClass": {
                "ui:widget": "select"
            },
            "controlTypes": {
                "ui:widget": "checkboxes"
            },
            "deployChannels": {
                "ui:widget": "checkboxes"
            },
            "pkRecalibration": {
                "ui:widget": "checkbox"
            },
            "pkOtherChannel": {
                "ui:widget": "checkbox"
            },
            "pkRework": {
                "ui:widget": "checkbox"
            },
            "pkRegulatory": {
                "ui:widget": "checkbox"
            },
            "pkNewType": {
                "ui:widget": "checkbox"
            },
            "pirmBlock": {
                "ui:options": {
                    "sectionRole": "panel"
                },
                "connectISRepo": {
                    "ui:widget": "checkbox"
                },
                "interface": {
                    "ui:widget": "checkbox"
                },
                "businessFunc": {
                    "ui:widget": "checkbox"
                },
                "systemFunc": {
                    "ui:widget": "checkbox"
                },
                "visualization": {
                    "ui:widget": "checkbox"
                },
                "clusterExpansion": {
                    "ui:widget": "checkbox"
                },
                "newModel": {
                    "ui:widget": "checkbox"
                },
                "loadTesting": {
                    "ui:widget": "checkbox"
                },
                "krsUtilization": {
                    "ui:widget": "checkbox"
                },
                "logging": {
                    "ui:widget": "checkbox"
                }
            },
            "field_4IL7OStC": {
                "ui:widget": "checkbox"
            },
            "field_F7nK-We5": {
                "ui:widget": "checkbox"
            },
            "field_JcKtx9Mg": {
                "ui:widget": "checkbox"
            },
            "field_KzzDtkB0": {
                "ui:widget": "checkbox"
            },
            "field_Y2S_XRAQ": {
                "ui:widget": "checkbox"
            },
            "field_imxB4YEd": {
                "ui:widget": "checkbox"
            },
            "field_kkbRs50S": {
                "ui:widget": "checkbox"
            },
            "field_r66ph-79": {
                "ui:widget": "checkbox"
            }
        }
    },
    "sourceSystem": {
        "schema": {
            "type": "array",
            "title": "Системы источники",
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
                        "type": "string",
                        "title": "Тип",
                        "enum": [
                            "Внутренний",
                            "Внешний"
                        ]
                    },
                    "entityVolume": {
                        "type": "string",
                        "title": "Объём запроса по сущностям",
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ]
                    },
                    "requirements": {
                        "type": "string",
                        "title": "Требования",
                        "enum": [
                            "Понятны",
                            "Не понятны",
                            "Рисковые"
                        ]
                    },
                    "field_-t8JSf3p": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Форма договора"
                    },
                    "field_1ANadh7U": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Тип загрузки данных"
                    },
                    "field_1bl3dfSX": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Требуется новая модель для автоматической разметки данных"
                    },
                    "field_3a0vme2u": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Предусмотрено проведение конкурса"
                    },
                    "field_4Gff93vI": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Требуется подготовка сырых данных для загрузки в ИС 1860"
                    },
                    "field_4jxR0E0m": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Пилот"
                    },
                    "field_61bkBs0m": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Требуется регламентный импорт/экспорт данных или отчетности в/из ИС 1860"
                    },
                    "field_788N1lwi": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Режим обмена данными"
                    },
                    "field_9BXQE8SI": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Режим обмена данными"
                    },
                    "field_AKLVuyFy": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Наличие конфиденциальных данных"
                    },
                    "field_DBFG7kIN": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Наличие юридического основания для пилота"
                    },
                    "field_DJJtx7nX": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
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
                    "field_HMnqITVb": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Требуется хэширование/ шифрование"
                    },
                    "field_HuOLfL4K": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Риск появления дополнительных систем-источников"
                    },
                    "field_K2ioHD8d": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Режим обмена данными"
                    },
                    "field_L1lRlgf1": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Сложность реализации"
                    },
                    "field_LxBG0mW-": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Наличие конфиденциальных данных"
                    },
                    "field_RFcOprSG": {
                        "type": "boolean",
                        "title": "Наличие реплики в DAPP"
                    },
                    "field_TvqjyIO-": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Требуется донастройка ИС 1860 под выбранную модель разметки данных"
                    },
                    "field_VX7y3PsB": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Сложность конфигурации модели разметки данных"
                    },
                    "field_WgK6lIS-": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Требуется ручная обработка результатов автоматизированной разметки данных"
                    },
                    "field_bHwz9vwn": {
                        "type": "boolean",
                        "title": "Необходим новый тракт данных от источника"
                    },
                    "field_bylzUFPM": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Требуется регламентный импорт/экспорт данных или отчетности в/из ИС 1860"
                    },
                    "field_fJ_7OdE7": {
                        "type": "boolean",
                        "title": "Необходимо подтвердить возможность интеграции"
                    },
                    "field_lDw9gG39": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Требуются специальные условия хранения и обработки конфиденциальных данных, не поддерживаемые коммунальным сервисом"
                    },
                    "field_nE73kPQl": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Детализация и ясность запроса постановки задачи"
                    },
                    "field_p4zxdNZG": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Наличие конфиденциальных данных"
                    },
                    "field_tpROQBf5": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "NDA"
                    },
                    "field_vqqlHbU6": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Требуется хэширование/ шифрование"
                    },
                    "field_wf7CHiVI": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик"
                    },
                    "field_wuYlhnu0": {
                        "enum": [
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Сложность настройки шаблона разметки данных"
                    },
                    "domainComplexity": {
                        "type": "string",
                        "title": "Сложность предметной области",
                        "enum": [
                            "Низкая",
                            "Средняя",
                            "Высокая",
                            "Неизвестно",
                            "Масштабное"
                        ]
                    },
                    "additionalUncertainty": {
                        "type": "boolean",
                        "title": "Доп. неопределённость источника"
                    },
                    "daptRegistry": {
                        "type": "string",
                        "title": "Реестр в ДАПТ",
                        "enum": [
                            "Есть",
                            "Нет"
                        ]
                    },
                    "integrationReadiness": {
                        "type": "string",
                        "title": "Готовность к интеграции в ПД",
                        "enum": [
                            "Готов к интеграции",
                            "Нужны доработки ИС",
                            "Сложная интеграция"
                        ]
                    },
                    "dataCoeff": {
                        "type": "boolean",
                        "title": "Коэф. данных"
                    },
                    "nda": {
                        "type": "boolean",
                        "title": "НДА"
                    },
                    "manualParameters": {
                        "type": "array",
                        "title": "Ручные параметры источника (IND)",
                        "items": {
                            "type": "string",
                            "enum": [
                                "Готовы интеграции, выполнены доработки источников к выводу в ПРОМ",
                                "Необходима доработка источник т к выводу в ПРОМ",
                                "Требуются интеграции с промежуточными системами (например СХК,СФП, и тд)",
                                "Требуется мониторинг (таблиц/ источника/Витрины)",
                                "Инициировано предыдущим этапом (например, инициировано загрузкой, в которой уже прошла часть аналитики)",
                                "Сложность предметной области. Оценивается лидером команды/стрима исполнителя на основании опыта и профиля команды.",
                                "Объем запроса по сущностям",
                                "Детализация и ясность запроса в RDS или ином артефакте, предоставляемые заказчиком",
                                "Определены ли исследуемые источник(и) или исследование предполагает их поиск",
                                "Конкретизированы ли искомые данные или состав/объём данных понадобится в каждом источнике определять в согласовании с заказчиком",
                                "Необходимо ли заключение NDA",
                                "Согласен ли Источник на стандартную форму NDA",
                                "Предмет исследования включает в себя конфиденциальные данные",
                                "Новый пилот или повторный",
                                "Есть ли юридические основания для проведения пилота / разовой загрузки",
                                "Пилот / разовая загрузка предусматривает обмен конфиденциальными данными",
                                "Пилот / разовая загрузка предусматривает хэширование/шифрование",
                                "Пилот / разовая загрузка предусматривает двусторонний обмен данными",
                                "Предусматривает ли пилот разовую загрузку командой Облако в ИС храрнения Банка?",
                                "Договор предусматривает регламентную или разовую загрузу",
                                "Предусмотрено ли проведение соревновательной процедуры (конкурса)",
                                "Согласен ли Источник на стандартную форму договора Банка",
                                "Новое решение или доработка существующего",
                                "Известны ли все стеикхолдеры (владелец сервиса, разработчик модели / витрин, РП и тд.)",
                                "Данные необходимы заказчику непосредственно или через витрины / модель",
                                "Есть ли юридические основания для реализация решения по обмену данными",
                                "Сложность реализации. Определяется техническим лидом команды/стрима исполнителя.",
                                "Сложность логики формирования витрины и предметной области. Оценивается лидером команды/стрима исполнителя на основании опыта и профиля команды.",
                                "Объем изменения, вносимого в ТИС",
                                "Необходимо ли изучение регламентов Банка по ведению радактируемого раздела",
                                "Необходимо ли пеерсогласование артефакта"
                            ]
                        },
                        "uniqueItems": true
                    }
                }
            }
        },
        "uiOptions": {
            "orderable": false,
            "addable": true,
            "removable": true,
            "archComponent": "sourceSystem"
        },
        "uiBranch": {
            "items": {
                "name": {
                    "ui:widget": "text"
                },
                "type": {
                    "ui:widget": "select"
                },
                "domainComplexity": {
                    "ui:widget": "select"
                },
                "entityVolume": {
                    "ui:widget": "select"
                },
                "daptRegistry": {
                    "ui:widget": "select",
                    "ui:options": {
                        "label": false
                    }
                },
                "requirements": {
                    "ui:widget": "select"
                },
                "additionalUncertainty": {
                    "ui:widget": "checkbox"
                },
                "integrationReadiness": {
                    "ui:widget": "select"
                },
                "dataCoeff": {
                    "ui:widget": "checkbox"
                },
                "nda": {
                    "ui:widget": "checkbox"
                },
                "manualParameters": {
                    "ui:widget": "checkboxes",
                    "ui:options": {
                        "inline": false
                    }
                },
                "field_RFcOprSG": {
                    "ui:widget": "checkbox"
                },
                "field_bHwz9vwn": {
                    "ui:widget": "checkbox"
                },
                "field_fJ_7OdE7": {
                    "ui:widget": "checkbox"
                },
                "field_nE73kPQl": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.method.28.объ_м_запроса_по_сущностям"
                    }
                },
                "ui:order": [
                    "name",
                    "type",
                    "entityVolume",
                    "requirements",
                    "field_-t8JSf3p",
                    "field_1ANadh7U",
                    "field_1bl3dfSX",
                    "field_3a0vme2u",
                    "field_4Gff93vI",
                    "field_4jxR0E0m",
                    "field_61bkBs0m",
                    "field_788N1lwi",
                    "field_9BXQE8SI",
                    "field_AKLVuyFy",
                    "field_DBFG7kIN",
                    "field_DJJtx7nX",
                    "field_F8GPVM7R",
                    "field_HMnqITVb",
                    "field_HuOLfL4K",
                    "field_K2ioHD8d",
                    "field_L1lRlgf1",
                    "field_LxBG0mW-",
                    "field_RFcOprSG",
                    "field_TvqjyIO-",
                    "field_VX7y3PsB",
                    "field_WgK6lIS-",
                    "field_bHwz9vwn",
                    "field_bylzUFPM",
                    "field_fJ_7OdE7",
                    "field_lDw9gG39",
                    "field_nE73kPQl",
                    "field_p4zxdNZG",
                    "field_tpROQBf5",
                    "field_vqqlHbU6",
                    "field_wf7CHiVI",
                    "field_wuYlhnu0",
                    "domainComplexity",
                    "additionalUncertainty",
                    "daptRegistry",
                    "integrationReadiness",
                    "dataCoeff",
                    "nda",
                    "manualParameters"
                ]
            }
        }
    },
    "dataProcess": {
        "schema": {
            "type": "object",
            "title": "Процессы обработки данных",
            "properties": {
                "deliveryMode": {
                    "type": "string",
                    "title": "Данные заказчику",
                    "enum": [
                        "Напрямую",
                        "Опосредованно",
                        "Неизвестно"
                    ]
                },
                "field_C6oqyTPh": {
                    "type": "boolean",
                    "title": "Требуется хэширование/ шифрование"
                },
                "field_HgUCNn6E": {
                    "type": "boolean",
                    "title": "Тип процесса обработки данных"
                },
                "field_R3Lx-csF": {
                    "type": "boolean",
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
                    "type": "boolean",
                    "title": "Конфиденциальные данные"
                },
                "workType": {
                    "type": "string",
                    "title": "Тип работ",
                    "enum": [
                        "Разработка",
                        "Доработка",
                        "Настройка"
                    ]
                },
                "autoCertification": {
                    "type": "boolean",
                    "title": "Автосертификация"
                },
                "featureStore": {
                    "type": "boolean",
                    "title": "Feature Store"
                },
                "implComplexity": {
                    "type": "string",
                    "title": "Сложность реализации",
                    "enum": [
                        "Низкая",
                        "Средняя",
                        "Высокая",
                        "Неизвестно"
                    ]
                }
            }
        },
        "uiOptions": {
            "archComponent": "dataProcess",
            "sectionRole": "subsection",
            "showFilledCount": true
        },
        "uiBranch": {
            "autoCertification": {
                "ui:widget": "checkbox"
            },
            "featureStore": {
                "ui:widget": "checkbox"
            },
            "confidentialData": {
                "ui:widget": "checkbox"
            },
            "field_C6oqyTPh": {
                "ui:widget": "checkbox"
            },
            "field_HgUCNn6E": {
                "ui:widget": "checkbox"
            },
            "field_R3Lx-csF": {
                "ui:widget": "checkbox"
            },
            "field_UEzs5Q87": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataProcess.implComplexity"
                }
            },
            "field_yJ51GkCR": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataProcess.workType"
                }
            },
            "ui:order": [
                "deliveryMode",
                "field_C6oqyTPh",
                "field_HgUCNn6E",
                "field_R3Lx-csF",
                "field_UEzs5Q87",
                "field_yJ51GkCR",
                "confidentialData",
                "workType",
                "autoCertification",
                "featureStore",
                "implComplexity"
            ]
        }
    },
    "dataMart": {
        "schema": {
            "type": "object",
            "title": "Объект / Витрина данных",
            "properties": {
                "workType": {
                    "type": "string",
                    "title": "Тип работ",
                    "enum": [
                        "Разработка",
                        "Доработка",
                        "Настройка"
                    ]
                },
                "metricsCount": {
                    "type": "string",
                    "title": "Количество метрик",
                    "enum": [
                        "До 20",
                        "20–50",
                        "Более 50"
                    ]
                },
                "field_0uV7wafS": {
                    "type": "boolean",
                    "title": "Требуется хэширование/ шифрование"
                },
                "field_28IPlEQu": {
                    "type": "boolean",
                    "title": "Количество метрик"
                },
                "field_46LCnfWo": {
                    "enum": [
                        "До 20",
                        "20–50",
                        "Более 50"
                    ],
                    "type": "string",
                    "title": "Сложность реализации"
                },
                "field_Ad1msOl7": {
                    "type": "boolean",
                    "title": "Необходима продуктивизация"
                },
                "field_L-WWLDWY": {
                    "type": "boolean",
                    "title": "Наличие конфиденциальных данных"
                },
                "field_N9LFD6Hu": {
                    "type": "boolean",
                    "title": "Двусторонний обмен данными"
                },
                "field_Q8DGJNTn": {
                    "type": "boolean",
                    "title": "Количество Контролей качества Признаков"
                },
                "field_fRuMuWtn": {
                    "type": "boolean",
                    "title": "Способ предоставления данных заказчику"
                },
                "field_hIM0c5gG": {
                    "enum": [
                        "До 20",
                        "20–50",
                        "Более 50"
                    ],
                    "type": "string",
                    "title": "Содержит сырые данные"
                },
                "field_le47srI7": {
                    "type": "boolean",
                    "title": "Слой хранения"
                },
                "field_lovKvLZc": {
                    "enum": [
                        "До 20",
                        "20–50",
                        "Более 50"
                    ],
                    "type": "string",
                    "title": "Реализуется в Хранилище признаков"
                },
                "field_rZeUo8a_": {
                    "type": "boolean",
                    "title": "Требуется контроль качества Признаков"
                },
                "field_w_EN6lWe": {
                    "enum": [
                        "До 20",
                        "20–50",
                        "Более 50"
                    ],
                    "type": "string",
                    "title": "Требуется парсинг сырых данных"
                },
                "field_xva1dRvW": {
                    "type": "boolean",
                    "title": "Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик"
                },
                "integrationReadiness": {
                    "type": "string",
                    "title": "Готовность к интеграции в ПД",
                    "enum": [
                        "Готов к интеграции",
                        "Нужны доработки ИС",
                        "Сложная интеграция"
                    ]
                },
                "qualityControl": {
                    "type": "boolean",
                    "title": "Контроль качества"
                }
            }
        },
        "uiOptions": {
            "archComponent": "dataMart",
            "sectionRole": "subsection",
            "showFilledCount": true
        },
        "uiBranch": {
            "qualityControl": {
                "ui:widget": "checkbox"
            },
            "field_0uV7wafS": {
                "ui:widget": "checkbox"
            },
            "field_28IPlEQu": {
                "ui:widget": "checkbox"
            },
            "field_Ad1msOl7": {
                "ui:widget": "checkbox"
            },
            "field_L-WWLDWY": {
                "ui:widget": "checkbox"
            },
            "field_N9LFD6Hu": {
                "ui:widget": "checkbox"
            },
            "field_Q8DGJNTn": {
                "ui:widget": "checkbox"
            },
            "field_fRuMuWtn": {
                "ui:widget": "checkbox"
            },
            "field_le47srI7": {
                "ui:widget": "checkbox"
            },
            "field_rZeUo8a_": {
                "ui:widget": "checkbox"
            },
            "field_xva1dRvW": {
                "ui:widget": "checkbox"
            },
            "ui:order": [
                "workType",
                "metricsCount",
                "field_0uV7wafS",
                "field_28IPlEQu",
                "field_46LCnfWo",
                "field_Ad1msOl7",
                "field_L-WWLDWY",
                "field_N9LFD6Hu",
                "field_Q8DGJNTn",
                "field_fRuMuWtn",
                "field_hIM0c5gG",
                "field_le47srI7",
                "field_lovKvLZc",
                "field_rZeUo8a_",
                "field_w_EN6lWe",
                "field_xva1dRvW",
                "integrationReadiness",
                "qualityControl"
            ]
        }
    },
    "model": {
        "schema": {
            "type": "object",
            "title": "Модели",
            "properties": {
                "autoML": {
                    "type": "boolean",
                    "title": "AutoML"
                },
                "workType": {
                    "type": "string",
                    "title": "Тип работ",
                    "enum": [
                        "Обучение",
                        "Дообучение",
                        "Калибровка"
                    ]
                },
                "algorithmType": {
                    "type": "string",
                    "title": "Тип алгоритма",
                    "enum": [
                        "Табличные данные",
                        "Временные ряды",
                        "NLP",
                        "CV",
                        "RL"
                    ]
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
                "cascadeEnsemble": {
                    "type": "boolean",
                    "title": "Каскад/ансамбль"
                },
                "modelsCount": {
                    "type": "integer",
                    "title": "Кол-во моделей"
                },
                "algorithmCoeff": {
                    "type": "string",
                    "title": "Коэф. алгоритма",
                    "enum": [
                        "×0.75",
                        "×1.00",
                        "×1.25",
                        "×1.50"
                    ]
                },
                "specialist": {
                    "type": "string",
                    "title": "Специалист",
                    "enum": [
                        "+10%",
                        "+20%",
                        "+0%"
                    ]
                },
                "modelsList": {
                    "type": "array",
                    "title": "Список моделей",
                    "items": {
                        "type": "object",
                        "title": "Модель",
                        "required": [
                            "name"
                        ],
                        "properties": {
                            "name": {
                                "type": "string",
                                "title": "Название модели"
                            },
                            "class": {
                                "type": "string",
                                "title": "Класс",
                                "enum": [
                                    "Розничный бизнес",
                                    "Корпоративный бизнес",
                                    "Прочий"
                                ]
                            },
                            "taskType": {
                                "type": "string",
                                "title": "Тип задачи",
                                "enum": [
                                    "Бинарная классификация",
                                    "Многоклассовая классификация",
                                    "Регрессия",
                                    "Кластеризация",
                                    "Ранжирование"
                                ]
                            },
                            "algorithm": {
                                "type": "string",
                                "title": "Алгоритм",
                                "enum": [
                                    "Табличные данные",
                                    "Временные ряды",
                                    "NLP",
                                    "CV",
                                    "RL"
                                ]
                            },
                            "autoML": {
                                "type": "boolean",
                                "title": "Auto ML"
                            },
                            "role": {
                                "type": "string",
                                "title": "Роль",
                                "enum": [
                                    "Оркестратор",
                                    "Подчинённая",
                                    "Независимая"
                                ]
                            },
                            "trainingSources": {
                                "type": "array",
                                "title": "Витрины источников",
                                "items": {
                                    "type": "string"
                                }
                            },
                            "applicationSources": {
                                "type": "array",
                                "title": "Витрины применения",
                                "items": {
                                    "type": "string"
                                }
                            }
                        }
                    }
                }
            }
        },
        "uiOptions": {
            "archComponent": "model",
            "sectionRole": "subsection",
            "showFilledCount": true
        },
        "uiBranch": {
            "modelsList": {
                "ui:options": {
                    "orderable": false,
                    "addable": true,
                    "removable": true
                },
                "items": {
                    "name": {
                        "ui:widget": "text"
                    },
                    "class": {
                        "ui:widget": "select"
                    },
                    "taskType": {
                        "ui:widget": "select"
                    },
                    "algorithm": {
                        "ui:widget": "select"
                    },
                    "autoML": {
                        "ui:widget": "checkbox"
                    },
                    "role": {
                        "ui:widget": "select"
                    },
                    "trainingSources": {
                        "ui:options": {
                            "orderable": false,
                            "addable": true,
                            "removable": true
                        },
                        "items": {
                            "ui:widget": "text"
                        }
                    },
                    "applicationSources": {
                        "ui:options": {
                            "orderable": false,
                            "addable": true,
                            "removable": true
                        },
                        "items": {
                            "ui:widget": "text"
                        }
                    }
                }
            },
            "autoML": {
                "ui:widget": "checkbox"
            },
            "cascadeEnsemble": {
                "ui:widget": "checkbox"
            },
            "field_58TkWuwu": {
                "ui:widget": "checkbox"
            },
            "field_CeBkWcQc": {
                "ui:widget": "checkbox"
            },
            "field_S23CbRXp": {
                "ui:widget": "checkbox"
            },
            "field_S41Rqt5E": {
                "ui:widget": "checkbox"
            },
            "ui:order": [
                "autoML",
                "workType",
                "algorithmType",
                "field_58TkWuwu",
                "field_CeBkWcQc",
                "field_S23CbRXp",
                "field_S41Rqt5E",
                "cascadeEnsemble",
                "modelsCount",
                "algorithmCoeff",
                "specialist",
                "modelsList"
            ]
        }
    }
};
function presetFromSnapshot(raw) {
    return {
        make: () => structuredClone(raw.schema),
        ...(Object.keys(raw.uiOptions).length > 0 ? { uiOptions: raw.uiOptions } : {}),
        ...(raw.uiBranch && Object.keys(raw.uiBranch).length > 0
            ? { uiBranch: raw.uiBranch }
            : {}),
    };
}
exports.V2_ARCH_COMPONENT_PRESET_DEFS_FROM_SNAPSHOT = {
    modelService: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.modelService),
    sourceSystem: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.sourceSystem),
    dataProcess: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.dataProcess),
    dataMart: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.dataMart),
    model: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.model),
};
