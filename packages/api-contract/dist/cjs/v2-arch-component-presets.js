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
                "pkRecalibration": {
                    "type": "string",
                    "title": "ПК: Рекалибровка",
                    "enum": [
                        "Да",
                        "Нет"
                    ]
                },
                "pkOtherChannel": {
                    "type": "string",
                    "title": "ПК: Использование в другом канале",
                    "enum": [
                        "Да",
                        "Нет"
                    ]
                },
                "pkRework": {
                    "type": "string",
                    "title": "ПК: Переработка существующей",
                    "enum": [
                        "Да",
                        "Нет"
                    ]
                },
                "pkRegulatory": {
                    "type": "string",
                    "title": "ПК: Модель ПВР/Регуляторная",
                    "enum": [
                        "Да",
                        "Нет"
                    ]
                },
                "pkNewType": {
                    "type": "string",
                    "title": "ПК: Новый тип модели",
                    "enum": [
                        "Да",
                        "Нет"
                    ]
                },
                "pirmBlock": {
                    "type": "object",
                    "title": "Блок ПиРМ",
                    "properties": {
                        "connectISRepo": {
                            "type": "string",
                            "title": "Подключение ИС к РЕПО",
                            "enum": [
                                "Да",
                                "Нет"
                            ]
                        },
                        "interface": {
                            "type": "string",
                            "title": "Интерфейс",
                            "enum": [
                                "Да",
                                "Нет"
                            ]
                        },
                        "businessFunc": {
                            "type": "string",
                            "title": "Доработка бизнес-функционала",
                            "enum": [
                                "Да",
                                "Нет"
                            ]
                        },
                        "systemFunc": {
                            "type": "string",
                            "title": "Функционал системы",
                            "enum": [
                                "Да",
                                "Нет"
                            ]
                        },
                        "visualization": {
                            "type": "string",
                            "title": "Визуализация и аналитика",
                            "enum": [
                                "Да",
                                "Нет"
                            ]
                        },
                        "clusterExpansion": {
                            "type": "string",
                            "title": "Расширение кластера",
                            "enum": [
                                "Да",
                                "Нет"
                            ]
                        },
                        "newModel": {
                            "type": "string",
                            "title": "Новая модель",
                            "enum": [
                                "Да",
                                "Нет"
                            ]
                        },
                        "loadTesting": {
                            "type": "string",
                            "title": "Требуется НТ",
                            "enum": [
                                "Да",
                                "Нет"
                            ]
                        },
                        "krsUtilization": {
                            "type": "string",
                            "title": "КРС утилизации серверов",
                            "enum": [
                                "Да",
                                "Нет"
                            ]
                        },
                        "logging": {
                            "type": "string",
                            "title": "Логирование",
                            "enum": [
                                "Да",
                                "Нет"
                            ]
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
                "deployChannels",
                "pkRecalibration",
                "pkOtherChannel",
                "pkRework",
                "pkRegulatory",
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
                "ui:widget": "select"
            },
            "pkOtherChannel": {
                "ui:widget": "select"
            },
            "pkRework": {
                "ui:widget": "select"
            },
            "pkRegulatory": {
                "ui:widget": "select"
            },
            "pkNewType": {
                "ui:widget": "select"
            },
            "pirmBlock": {
                "ui:options": {
                    "sectionRole": "panel"
                }
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
                    "daptRegistry": {
                        "type": "string",
                        "title": "Реестр в ДАПТ",
                        "enum": [
                            "Есть",
                            "Нет"
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
                    "additionalUncertainty": {
                        "type": "string",
                        "title": "Доп. неопределённость источника",
                        "enum": [
                            "Нет",
                            "Да"
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
                        "type": "string",
                        "title": "Коэф. данных",
                        "enum": [
                            "Нет",
                            "Да"
                        ]
                    },
                    "nda": {
                        "type": "string",
                        "title": "НДА",
                        "enum": [
                            "Нет",
                            "Да"
                        ]
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
                    "ui:widget": "select"
                },
                "integrationReadiness": {
                    "ui:widget": "select"
                },
                "dataCoeff": {
                    "ui:widget": "select"
                },
                "nda": {
                    "ui:widget": "select"
                },
                "manualParameters": {
                    "ui:widget": "checkboxes",
                    "ui:options": {
                        "inline": false
                    }
                }
            }
        }
    },
    "dataProcess": {
        "schema": {
            "type": "object",
            "title": "Процессы обработки данных",
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
                "autoCertification": {
                    "type": "string",
                    "title": "Автосертификация",
                    "enum": [
                        "Да",
                        "Нет"
                    ]
                },
                "featureStore": {
                    "type": "string",
                    "title": "Feature Store",
                    "enum": [
                        "Да",
                        "Нет"
                    ]
                },
                "confidentialData": {
                    "type": "string",
                    "title": "Конфиденциальные данные",
                    "enum": [
                        "Да",
                        "Нет"
                    ]
                },
                "deliveryMode": {
                    "type": "string",
                    "title": "Данные заказчику",
                    "enum": [
                        "Напрямую",
                        "Опосредованно",
                        "Неизвестно"
                    ]
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
                "integrationReadiness": {
                    "type": "string",
                    "title": "Готовность к интеграции в ПД",
                    "enum": [
                        "Готов к интеграции",
                        "Нужны доработки ИС",
                        "Сложная интеграция"
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
                "qualityControl": {
                    "type": "string",
                    "title": "Контроль качества",
                    "enum": [
                        "Да",
                        "Нет"
                    ]
                }
            }
        },
        "uiOptions": {
            "archComponent": "dataMart",
            "sectionRole": "subsection",
            "showFilledCount": true
        }
    },
    "model": {
        "schema": {
            "type": "object",
            "title": "Модели",
            "properties": {
                "workType": {
                    "type": "string",
                    "title": "Тип работ",
                    "enum": [
                        "Обучение",
                        "Дообучение",
                        "Калибровка"
                    ]
                },
                "modelsCount": {
                    "type": "integer",
                    "title": "Кол-во моделей"
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
                "autoML": {
                    "type": "string",
                    "title": "AutoML",
                    "enum": [
                        "Не требуется",
                        "Требуется"
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
                "cascadeEnsemble": {
                    "type": "string",
                    "title": "Каскад/ансамбль",
                    "enum": [
                        "Да",
                        "Нет"
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
                                "type": "string",
                                "title": "Auto ML",
                                "enum": [
                                    "Да",
                                    "Нет"
                                ]
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
                        "ui:widget": "select"
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
            }
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
