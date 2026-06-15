/** Канонические jsonSchema/ui для арх. компонентов (из v2-default-anketa.snapshot.json). */
const SNAPSHOT_ARCH_PRESETS = {
    "modelService": {
        "schema": {
            "type": "object",
            "title": "Модельный сервис",
            "properties": {
                "deployChannels": {
                    "type": "array",
                    "title": "Каналы внедрения",
                    "items": {
                        "type": "string",
                        "enum": [
                            "Не требуется",
                            "Батч",
                            "Батч+загрузка данных потребителю",
                            "Батч+Онлайн",
                            "Онлайн",
                            "Онлайн GPU",
                            "Стриминг",
                            "Мобильные устройства",
                            "LLM",
                            "Гео-сервисы",
                            "Внедрение в облаке",
                            "Графовая платформа"
                        ]
                    },
                    "uniqueItems": true
                },
                "modelClass": {
                    "type": "string",
                    "title": "Класс модели",
                    "enum": [
                        "Розничные регуляторные модели",
                        "Розничные бизнес-модели",
                        "Розничные модели CRM",
                        "Розничные модели Collection",
                        "Корпоративные регуляторные модели",
                        "Корпоративные бизнес-модели",
                        "Прочие корпоративные модели",
                        "Модели финансового моделирования",
                        "Модели цифровых помощников"
                    ]
                },
                "controlTypes": {
                    "type": "array",
                    "title": "Вид контроля",
                    "items": {
                        "type": "string",
                        "enum": [
                            "Качество модельных данных [КД]",
                            "Технический контроль [ТМ]",
                            "Оперативный контроль [ОК]",
                            "Аналитический контроль [АК]",
                            "Контроль модельных значений [КМЗ]",
                            "Оценка влияния моделей [ОВ]"
                        ]
                    },
                    "uniqueItems": true
                },
                "workType": {
                    "type": "string",
                    "title": "Тип работ: Калибровка",
                    "enum": [
                        "Разработка",
                        "Внедрение",
                        "Доработка",
                        "Калибровка"
                    ]
                },
                "pkRegulatory": {
                    "type": "boolean",
                    "title": "ПВР/Регуляторный"
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
                "field_Y2S_XRAQ": {
                    "type": "boolean",
                    "title": "Использование данных СХК через РЕПО"
                },
                "field_JcKtx9Mg": {
                    "type": "boolean",
                    "title": "Требуется оркестратор"
                },
                "field_KzzDtkB0": {
                    "type": "boolean",
                    "title": "Требуется визуализация результатов работы модельного сервиса"
                },
                "field_F7nK-We5": {
                    "type": "boolean",
                    "title": "Тип БД для BI-системы"
                },
                "field_4IL7OStC": {
                    "type": "string",
                    "title": "Способ загрузки данных в BI-систему",
                    "enum": [
                        "Ручной",
                        "Автоматизированный"
                    ]
                },
                "field_zNF-O2fH": {
                    "type": "boolean",
                    "title": "Необходимость пилота (MVP)"
                },
                "field_Y7z2a__S": {
                    "type": "boolean",
                    "title": "Необходимость поддержки проведения пилота"
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
                "deployChannels",
                "modelClass",
                "controlTypes",
                "workType",
                "pkRegulatory",
                "field_imxB4YEd",
                "field_kkbRs50S",
                "field_r66ph-79",
                "field_Y2S_XRAQ",
                "field_JcKtx9Mg",
                "field_KzzDtkB0",
                "field_F7nK-We5",
                "field_4IL7OStC",
                "field_zNF-O2fH",
                "field_Y7z2a__S"
            ],
            "workType": {
                "ui:widget": "select"
            },
            "modelClass": {
                "ui:widget": "select"
            },
            "controlTypes": {
                "ui:widget": "text"
            },
            "deployChannels": {
                "ui:widget": "text"
            },
            "pkRegulatory": {
                "ui:widget": "checkbox"
            },
            "field_4IL7OStC": {
                "ui:widget": "select"
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
            },
            "field_zNF-O2fH": {
                "ui:widget": "checkbox"
            },
            "field_Y7z2a__S": {
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
                    "field_RFcOprSG": {
                        "type": "boolean",
                        "title": "Наличие реплики в DAPP"
                    },
                    "field_wf7CHiVI": {
                        "type": "string",
                        "title": "Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик",
                        "enum": [
                            "Неизвестно",
                            "Да",
                            "Нет"
                        ]
                    },
                    "field_HuOLfL4K": {
                        "type": "string",
                        "title": "Риск появления дополнительных систем-источников",
                        "enum": [
                            "Неизвестно",
                            "Да",
                            "Нет"
                        ]
                    },
                    "field_bHwz9vwn": {
                        "type": "string",
                        "title": "Необходим новый тракт данных от источника",
                        "enum": [
                            "Неизвестно",
                            "Высокая",
                            "Средняя",
                            "Низкая"
                        ]
                    },
                    "field_fJ_7OdE7": {
                        "type": "boolean",
                        "title": "Необходимо подтвердить возможность интеграции"
                    },
                    "type": {
                        "type": "string",
                        "title": "Тип системы-источника",
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
                            "Высокая"
                        ]
                    },
                    "entityVolume": {
                        "type": "string",
                        "title": "Количество сущностей (исходных таблиц)",
                        "enum": [
                            "Неизвестно",
                            "Точечное (1-4)",
                            "Малое (5-9)",
                            "Среднее (9-15)",
                            "Крупное (15-20)",
                            "Большое (20-25)",
                            "Масштабное (25+)"
                        ]
                    },
                    "field_nE73kPQl": {
                        "type": "string",
                        "title": "Детализация и ясность запроса постановки задачи",
                        "enum": [
                            "Низкая",
                            "Средняя",
                            "Высокая"
                        ]
                    },
                    "nda": {
                        "type": "string",
                        "title": "NDA",
                        "enum": [
                            "Неизвестно",
                            "Стандартная",
                            "Нестандартная"
                        ]
                    },
                    "field_p4zxdNZG": {
                        "type": "string",
                        "title": "Наличие конфиденциальных данных",
                        "enum": [
                            "Неизвестно",
                            "Да",
                            "Нет"
                        ]
                    },
                    "field_4jxR0E0m": {
                        "type": "string",
                        "title": "Пилот",
                        "enum": [
                            "Нет",
                            "Первичный",
                            "Повторный"
                        ]
                    },
                    "field_DBFG7kIN": {
                        "type": "string",
                        "title": "Наличие юридического основания для пилота",
                        "enum": [
                            "Неизвестно",
                            "Да",
                            "Нет"
                        ]
                    },
                    "field_vqqlHbU6": {
                        "type": "string",
                        "title": "Требуется хэширование/ шифрование?",
                        "enum": [
                            "Неизвестно",
                            "Да",
                            "Нет"
                        ]
                    },
                    "field_K2ioHD8d": {
                        "type": "string",
                        "title": "Режим обмена данными",
                        "enum": [
                            "Неизвестен",
                            "Одностороний",
                            "Двусторонний"
                        ]
                    },
                    "field_1ANadh7U": {
                        "type": "string",
                        "title": "Тип загрузки данных",
                        "enum": [
                            "Однократный",
                            "Регламентный"
                        ]
                    },
                    "field_3a0vme2u": {
                        "type": "string",
                        "title": "Предусмотрено проведение конкурса?",
                        "enum": [
                            "Неизвестно",
                            "Да",
                            "Нет"
                        ]
                    },
                    "field_-t8JSf3p": {
                        "type": "string",
                        "title": "Форма договора",
                        "enum": [
                            "Неизвестно",
                            "Стандартная",
                            "Нестандартная"
                        ]
                    },
                    "field_DJJtx7nX": {
                        "type": "boolean",
                        "title": "Требуется разметка данных источника"
                    },
                    "field_1bl3dfSX": {
                        "type": "boolean",
                        "title": "Требуется новая модель для автоматической разметки данных"
                    },
                    "field_wuYlhnu0": {
                        "type": "boolean",
                        "title": "Сложность настройки шаблона разметки данных"
                    },
                    "field_4Gff93vI": {
                        "type": "boolean",
                        "title": "Требуется подготовка сырых данных для загрузки в ИС 1860"
                    },
                    "field_F8GPVM7R": {
                        "type": "boolean",
                        "title": "Размер модели разметки данных"
                    },
                    "field_TvqjyIO-": {
                        "type": "boolean",
                        "title": "Требуется донастройка ИС 1860 под выбранную модель разметки данных"
                    },
                    "field_VX7y3PsB": {
                        "type": "boolean",
                        "title": "Сложность конфигурации модели разметки данных"
                    },
                    "field_bylzUFPM": {
                        "type": "boolean",
                        "title": "Требуется регламентный импорт/экспорт данных или отчетности в/из ИС 1860"
                    },
                    "field_L1lRlgf1": {
                        "type": "string",
                        "title": "Сложность реализации",
                        "enum": [
                            "Неизвестно",
                            "Высокая",
                            "Средняя",
                            "Низкая"
                        ]
                    },
                    "field_lDw9gG39": {
                        "type": "boolean",
                        "title": "Требуются специальные условия хранения и обработки конфиденциальных данных, не поддерживаемые коммунальным сервисом"
                    },
                    "field_WgK6lIS-": {
                        "type": "boolean",
                        "title": "Требуется ручная обработка результатов автоматизированной разметки данных"
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
                "nda": {
                    "ui:widget": "select"
                },
                "field_RFcOprSG": {
                    "ui:widget": "checkbox"
                },
                "field_bHwz9vwn": {
                    "ui:widget": "select"
                },
                "field_fJ_7OdE7": {
                    "ui:widget": "checkbox"
                },
                "field_nE73kPQl": {
                    "ui:widget": "select"
                },
                "ui:order": [
                    "name",
                    "field_RFcOprSG",
                    "field_wf7CHiVI",
                    "field_HuOLfL4K",
                    "field_bHwz9vwn",
                    "field_fJ_7OdE7",
                    "type",
                    "domainComplexity",
                    "entityVolume",
                    "field_nE73kPQl",
                    "nda",
                    "field_p4zxdNZG",
                    "field_4jxR0E0m",
                    "field_DBFG7kIN",
                    "field_vqqlHbU6",
                    "field_K2ioHD8d",
                    "field_1ANadh7U",
                    "field_3a0vme2u",
                    "field_-t8JSf3p",
                    "field_DJJtx7nX",
                    "field_1bl3dfSX",
                    "field_wuYlhnu0",
                    "field_4Gff93vI",
                    "field_F8GPVM7R",
                    "field_TvqjyIO-",
                    "field_VX7y3PsB",
                    "field_bylzUFPM",
                    "field_L1lRlgf1",
                    "field_lDw9gG39",
                    "field_WgK6lIS-"
                ],
                "field_wf7CHiVI": {
                    "ui:widget": "select"
                },
                "field_HuOLfL4K": {
                    "ui:widget": "select"
                },
                "field_p4zxdNZG": {
                    "ui:widget": "select"
                },
                "field_4jxR0E0m": {
                    "ui:widget": "select"
                },
                "field_DBFG7kIN": {
                    "ui:widget": "select"
                },
                "field_vqqlHbU6": {
                    "ui:widget": "select"
                },
                "field_K2ioHD8d": {
                    "ui:widget": "select"
                },
                "field_1ANadh7U": {
                    "ui:widget": "select"
                },
                "field_3a0vme2u": {
                    "ui:widget": "select"
                },
                "field_-t8JSf3p": {
                    "ui:widget": "select"
                },
                "field_DJJtx7nX": {
                    "ui:widget": "checkbox"
                },
                "field_1bl3dfSX": {
                    "ui:widget": "checkbox"
                },
                "field_wuYlhnu0": {
                    "ui:widget": "checkbox"
                },
                "field_4Gff93vI": {
                    "ui:widget": "checkbox"
                },
                "field_F8GPVM7R": {
                    "ui:widget": "checkbox"
                },
                "field_TvqjyIO-": {
                    "ui:widget": "checkbox"
                },
                "field_VX7y3PsB": {
                    "ui:widget": "checkbox"
                },
                "field_bylzUFPM": {
                    "ui:widget": "checkbox"
                },
                "field_L1lRlgf1": {
                    "ui:widget": "select"
                },
                "field_lDw9gG39": {
                    "ui:widget": "checkbox"
                },
                "field_WgK6lIS-": {
                    "ui:widget": "checkbox"
                }
            }
        }
    },
    "dataProcess": {
        "schema": {
            "type": "object",
            "title": "Процессы обработки данных",
            "properties": {
                "implComplexity": {
                    "type": "string",
                    "title": "Сложность реализации",
                    "enum": [
                        "Неизвестно",
                        "Высокая",
                        "Средняя",
                        "Низкая"
                    ]
                },
                "workType": {
                    "type": "string",
                    "title": "Тип работ",
                    "enum": [
                        "Разработка",
                        "Доработка"
                    ]
                },
                "deliveryMode": {
                    "type": "string",
                    "title": "Способ предоставления данных заказчику",
                    "enum": [
                        "Неизвестно",
                        "Непосредственно",
                        "Опосредованно"
                    ]
                },
                "field_G9cgk2fq": {
                    "type": "string",
                    "title": "Наличие конфиденциальных данных",
                    "enum": [
                        "Неизвестно",
                        "Да",
                        "Нет"
                    ]
                },
                "field_C6oqyTPh": {
                    "type": "string",
                    "title": "Требуется хэширование/ шифрование",
                    "enum": [
                        "Неизвестно",
                        "Да",
                        "Нет"
                    ]
                },
                "field_R3Lx-csF": {
                    "type": "string",
                    "title": "Двусторонний обмен данными",
                    "enum": [
                        "Неизвестно",
                        "Да",
                        "Нет"
                    ]
                },
                "field_HgUCNn6E": {
                    "type": "string",
                    "title": "Тип процесса обработки данных",
                    "enum": [
                        "Пакетный",
                        "Потоковый"
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
            "field_C6oqyTPh": {
                "ui:widget": "select"
            },
            "field_HgUCNn6E": {
                "ui:widget": "select"
            },
            "field_R3Lx-csF": {
                "ui:widget": "select"
            },
            "ui:order": [
                "implComplexity",
                "workType",
                "deliveryMode",
                "field_G9cgk2fq",
                "field_C6oqyTPh",
                "field_R3Lx-csF",
                "field_HgUCNn6E"
            ],
            "implComplexity": {
                "ui:widget": "select"
            },
            "workType": {
                "ui:widget": "select"
            },
            "deliveryMode": {
                "ui:widget": "select"
            },
            "field_G9cgk2fq": {
                "ui:widget": "select"
            }
        }
    },
    "dataMart": {
        "schema": {
            "type": "object",
            "title": "Объект / Витрина данных",
            "properties": {
                "field_xva1dRvW": {
                    "type": "boolean",
                    "title": "Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик"
                },
                "field_Ad1msOl7": {
                    "type": "boolean",
                    "title": "Необходима продуктивизация"
                },
                "metricsCount": {
                    "type": "number",
                    "title": "Количество метрик"
                },
                "workType": {
                    "type": "string",
                    "title": "Тип работ",
                    "enum": [
                        "Не требуется",
                        "Разработка",
                        "Доработка"
                    ]
                },
                "deliveryMode": {
                    "type": "string",
                    "title": "Способ предоставления данных заказчику",
                    "enum": [
                        "Неизвестно",
                        "Непосредственно",
                        "Опосредованно"
                    ]
                },
                "field_qI2JSr--": {
                    "type": "string",
                    "title": "Отсутствует?",
                    "enum": [
                        "Неизвестно",
                        "Да",
                        "Нет"
                    ]
                },
                "field_46LCnfWo": {
                    "type": "string",
                    "title": "Сложность реализации",
                    "enum": [
                        "Неизвестно",
                        "Высокая",
                        "Средняя",
                        "Низкая"
                    ]
                },
                "field_L-WWLDWY": {
                    "type": "string",
                    "title": "Наличие конфиденциальных данных",
                    "enum": [
                        "Неизвестно",
                        "Да",
                        "Нет"
                    ]
                },
                "field_0uV7wafS": {
                    "type": "string",
                    "title": "Требуется хэширование/ шифрование",
                    "enum": [
                        "Неизвестно",
                        "Да",
                        "Нет"
                    ]
                },
                "field_N9LFD6Hu": {
                    "type": "string",
                    "title": "Двусторонний обмен данными",
                    "enum": [
                        "Неизвестно",
                        "Да",
                        "Нет"
                    ]
                },
                "field_lovKvLZc": {
                    "type": "boolean",
                    "title": "Реализуется в Хранилище признаков"
                },
                "field_hIM0c5gG": {
                    "type": "boolean",
                    "title": "Содержит сырые данные"
                },
                "field_w_EN6lWe": {
                    "type": "boolean",
                    "title": "Требуется парсинг сырых данных"
                },
                "featuresCount": {
                    "type": "number",
                    "title": "Количество признаков"
                },
                "field_le47srI7": {
                    "type": "string",
                    "title": "Слой хранения",
                    "enum": [
                        "Холодный",
                        "Теплый",
                        "Горячий",
                        "Потоковый"
                    ]
                },
                "field_rZeUo8a_": {
                    "type": "boolean",
                    "title": "Требуется контроль качества Признаков"
                },
                "field_Q8DGJNTn": {
                    "type": "boolean",
                    "title": "Количество Контролей качества Признаков"
                },
                "field_Iw77UzvX": {
                    "type": "boolean",
                    "title": "Синхронизировать с ИД, использовать единый параметр"
                },
                "field_qea3tBuA": {
                    "type": "boolean",
                    "title": "Необходимость продуктивизации"
                }
            }
        },
        "uiOptions": {
            "archComponent": "dataMart",
            "sectionRole": "subsection",
            "showFilledCount": true
        },
        "uiBranch": {
            "field_0uV7wafS": {
                "ui:widget": "select"
            },
            "field_Ad1msOl7": {
                "ui:widget": "checkbox"
            },
            "field_L-WWLDWY": {
                "ui:widget": "select"
            },
            "field_N9LFD6Hu": {
                "ui:widget": "select"
            },
            "field_Q8DGJNTn": {
                "ui:widget": "checkbox"
            },
            "field_le47srI7": {
                "ui:widget": "select"
            },
            "field_rZeUo8a_": {
                "ui:widget": "checkbox"
            },
            "field_xva1dRvW": {
                "ui:widget": "checkbox"
            },
            "ui:order": [
                "field_xva1dRvW",
                "field_Ad1msOl7",
                "metricsCount",
                "workType",
                "deliveryMode",
                "field_qI2JSr--",
                "field_46LCnfWo",
                "field_L-WWLDWY",
                "field_0uV7wafS",
                "field_N9LFD6Hu",
                "field_lovKvLZc",
                "field_hIM0c5gG",
                "field_w_EN6lWe",
                "featuresCount",
                "field_le47srI7",
                "field_rZeUo8a_",
                "field_Q8DGJNTn",
                "field_Iw77UzvX",
                "field_qea3tBuA"
            ],
            "metricsCount": {
                "ui:widget": "updown"
            },
            "workType": {
                "ui:widget": "select"
            },
            "deliveryMode": {
                "ui:widget": "select"
            },
            "field_qI2JSr--": {
                "ui:widget": "select"
            },
            "field_46LCnfWo": {
                "ui:widget": "select"
            },
            "field_lovKvLZc": {
                "ui:widget": "checkbox"
            },
            "field_hIM0c5gG": {
                "ui:widget": "checkbox"
            },
            "field_w_EN6lWe": {
                "ui:widget": "checkbox"
            },
            "featuresCount": {
                "ui:widget": "updown"
            },
            "field_Iw77UzvX": {
                "ui:widget": "checkbox"
            },
            "field_qea3tBuA": {
                "ui:widget": "checkbox"
            }
        }
    },
    "model": {
        "schema": {
            "type": "object",
            "title": "Модели",
            "properties": {
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
                },
                "modelRole": {
                    "type": "string",
                    "title": "Роль модели",
                    "enum": [
                        "Обычная",
                        "Оркестратор"
                    ]
                },
                "autoMLNeed": {
                    "type": "boolean",
                    "title": "Необходимость AutoML"
                },
                "field_9W8BzAKb": {
                    "type": "boolean",
                    "title": "АвтоМЛ: встраивание внешнего кода"
                },
                "field_aKQrdZUU": {
                    "type": "boolean",
                    "title": "АвтоМЛ: требуется преобразование данных"
                },
                "field_TStAwALi": {
                    "type": "boolean",
                    "title": "АвтоМЛ: требуется постановка на регламент"
                },
                "field_Da3ks0Pr": {
                    "type": "boolean",
                    "title": "АвтоМЛ: требуется новая библиотека"
                },
                "algorithmComplexity": {
                    "type": "string",
                    "title": "Сложность алгоритма / тип ML задачи",
                    "enum": [
                        "Табличные данные",
                        "Текстовая аналитика — Классические модели",
                        "Текстовая аналитика — LLM",
                        "Аудио аналитика",
                        "Оптимизационная задача",
                        "Гео-аналитика",
                        "Графовая аналитика"
                    ]
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
            "ui:order": [
                "modelsList",
                "modelRole",
                "autoMLNeed",
                "field_9W8BzAKb",
                "field_aKQrdZUU",
                "field_TStAwALi",
                "field_Da3ks0Pr",
                "algorithmComplexity"
            ],
            "autoMLNeed": {
                "ui:widget": "checkbox"
            },
            "field_9W8BzAKb": {
                "ui:widget": "checkbox"
            },
            "field_aKQrdZUU": {
                "ui:widget": "checkbox"
            },
            "field_TStAwALi": {
                "ui:widget": "checkbox"
            },
            "field_Da3ks0Pr": {
                "ui:widget": "checkbox"
            },
            "algorithmComplexity": {
                "ui:widget": "select"
            },
            "modelRole": {
                "ui:widget": "select"
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
export const V2_ARCH_COMPONENT_PRESET_DEFS_FROM_SNAPSHOT = {
    modelService: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.modelService),
    sourceSystem: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.sourceSystem),
    dataProcess: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.dataProcess),
    dataMart: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.dataMart),
    model: presetFromSnapshot(SNAPSHOT_ARCH_PRESETS.model),
};
