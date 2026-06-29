/** Канонические jsonSchema/ui для арх. компонентов (из v2-default-anketa.snapshot.json). */
const SNAPSHOT_ARCH_PRESETS = {
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
                        "Доработка",
                        "Настройка"
                    ],
                    "type": "string",
                    "title": "Тип работ"
                },
                "modelClass": {
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
                        "Да",
                        "Нет"
                    ],
                    "type": "string",
                    "title": "Способ загрузки данных в BI-систему"
                },
                "field_F7nK-We5": {
                    "type": "string",
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
                "field_SvNx6iEq": {
                    "type": "array",
                    "items": {
                        "type": "string"
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
                        "type": "string"
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
                    "dictionaryCode": "v2.generalInfo.modelService.workType"
                },
                "ui:placeholder": "Тип работ"
            },
            "modelClass": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.method.2.класс_моделей"
                },
                "ui:placeholder": "Класс моделей"
            },
            "prePromEval": {
                "ui:placeholder": "Необходимость поддержки проведения пилота"
            },
            "pkRegulatory": {
                "ui:options": {},
                "ui:placeholder": "ПВР/Регуляторная"
            },
            "field_4IL7OStC": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "Способ загрузки данных в BI-систему"
                },
                "ui:placeholder": "Способ загрузки данных в BI-систему"
            },
            "field_F7nK-We5": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.modelserviceiInfo.bidbtype"
                },
                "ui:placeholder": "Тип БД для BI-системы"
            },
            "field_JcKtx9Mg": {
                "ui:options": {},
                "ui:placeholder": "Требуется оркестратор"
            },
            "field_KzzDtkB0": {
                "ui:options": {},
                "ui:placeholder": "Требуется визуализация результатов работы модельного сервиса"
            },
            "field_SvNx6iEq": {
                "ui:widget": "select",
                "ui:options": {
                    "multiple": true,
                    "dictionaryCode": "v2.method.3.вид_контроля"
                },
                "ui:placeholder": "Вид контроля"
            },
            "field_Y2S_XRAQ": {
                "ui:options": {},
                "ui:placeholder": "Использование данных СХК через РЕПО"
            },
            "field_dEVFQVQn": {
                "ui:placeholder": "Название модельного сервиса"
            },
            "field_imxB4YEd": {
                "ui:options": {},
                "ui:placeholder": "Первичное подключение ИС к РЕПО"
            },
            "field_jUm5syZf": {
                "ui:widget": "select",
                "ui:options": {
                    "multiple": true,
                    "dictionaryCode": "v2.method.4.канал_внедрения"
                },
                "ui:placeholder": "Каналы внедрения"
            },
            "field_kkbRs50S": {
                "ui:options": {},
                "ui:placeholder": "Хранение артефактов в РЕПО"
            },
            "field_o_HRj6VO": {
                "ui:options": {
                    "tooltip": "Применяется в случае, если требуется создать прототип модели, которую Заказчик планирует апробировать перед выносом в пром. Длительность пилота ограничена 6 месяцами. Блокируется при выборе 'Да' в поле 'Модель разработана?"
                },
                "ui:placeholder": "Необходимость пилота"
            },
            "field_r66ph-79": {
                "ui:options": {},
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
                        "type": "boolean",
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
                        "type": "boolean",
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
                        "type": "boolean",
                        "title": "Требуется регламентный импорт/экспорт данных или отчетности в/из ИС 1860"
                    },
                    "field_8pFvwc-v": {
                        "type": "boolean",
                        "title": "Наличие реплики в DAPP"
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
                            "Точечное",
                            "Малое",
                            "Среднее",
                            "Большое",
                            "Масштабное"
                        ],
                        "type": "string",
                        "title": "Риск появления дополнительных систем-источников"
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
                    "field_TvqjyIO-": {
                        "type": "boolean",
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
                        "type": "boolean",
                        "title": "Требуется ручная обработка результатов автоматизированной разметки данных"
                    },
                    "field_Y_K0Hy0e": {
                        "type": "string",
                        "title": "Количество сущностей (исходных таблиц)"
                    },
                    "field_d3OCFyaC": {
                        "type": "string",
                        "title": "Сложность предметной области"
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
                        "type": "boolean",
                        "title": "Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик"
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
                    "field_whHc-OoW": {
                        "type": "boolean",
                        "title": "Риск появления дополнительных систем-источников"
                    },
                    "field_wuYlhnu0": {
                        "type": "string",
                        "title": "Сложность настройки шаблона разметки данных"
                    }
                }
            },
            "title": "Системы источники"
        },
        "uiOptions": {
            "addable": true,
            "orderable": false,
            "removable": true,
            "archComponent": "sourceSystem"
        },
        "uiBranch": {
            "items": {
                "name": {
                    "ui:widget": "text",
                    "ui:options": {
                        "tooltip": "Заполняется при отсутствии витрин с агрегатами/широких витрин с агрегатами/широких витрин на регламенте в области ответственности модельного стрима, при необходимости поиска данных, указывается количество внутренних (в т.ч. в ответственности другого стрима) и внешних источников данных"
                    },
                    "ui:placeholder": "Название источника"
                },
                "type": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.type"
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
                    "field_d3OCFyaC",
                    "field_Y_K0Hy0e",
                    "field_nE73kPQl",
                    "field_HuOLfL4K",
                    "field_wf7CHiVI",
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
                    "ui:options": {},
                    "ui:placeholder": "Необходим новый тракт данных от источника"
                },
                "field_-t8JSf3p": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_-t8JSf3p"
                    }
                },
                "field_1ANadh7U": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_1ANadh7U"
                    }
                },
                "field_1bl3dfSX": {
                    "ui:options": {}
                },
                "field_3a0vme2u": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_3a0vme2u"
                    }
                },
                "field_4Gff93vI": {
                    "ui:options": {}
                },
                "field_4jxR0E0m": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_4jxR0E0m"
                    }
                },
                "field_61bkBs0m": {
                    "ui:options": {}
                },
                "field_8pFvwc-v": {
                    "ui:placeholder": "Наличие реплики в DAPP"
                },
                "field_9BXQE8SI": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_K2ioHD8d"
                    }
                },
                "field_AKLVuyFy": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_p4zxdNZG"
                    }
                },
                "field_DBFG7kIN": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_DBFG7kIN"
                    }
                },
                "field_DJJtx7nX": {
                    "ui:options": {}
                },
                "field_HuOLfL4K": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "Риск появления дополнительных систем-источников"
                    }
                },
                "field_L1lRlgf1": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_L1lRlgf1"
                    }
                },
                "field_TvqjyIO-": {
                    "ui:options": {}
                },
                "field_VX7y3PsB": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_VX7y3PsB"
                    }
                },
                "field_WgK6lIS-": {
                    "ui:options": {}
                },
                "field_Y_K0Hy0e": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.method.28.объ_м_запроса_по_сущностям"
                    }
                },
                "field_d3OCFyaC": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.method.27.сложность_предметной_области"
                    }
                },
                "field_fJ_7OdE7": {
                    "ui:options": {},
                    "ui:placeholder": "Необходимо подтвердить возможность интеграции"
                },
                "field_lDw9gG39": {
                    "ui:options": {}
                },
                "field_lzP44Urx": {
                    "ui:options": {},
                    "ui:placeholder": "Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик"
                },
                "field_nE73kPQl": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.method.29.детализация_и_ясность_запроса_rds"
                    }
                },
                "field_tpROQBf5": {
                    "ui:widget": "select",
                    "ui:options": {
                        "tooltip": "Соглашение о неразглашении",
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.nda"
                    }
                },
                "field_vqqlHbU6": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_HMnqITVb"
                    }
                },
                "field_wf7CHiVI": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_wf7CHiVI"
                    }
                },
                "field_whHc-OoW": {
                    "ui:options": {},
                    "ui:placeholder": "Риск появления дополнительных систем-источников"
                },
                "field_wuYlhnu0": {
                    "ui:widget": "select",
                    "ui:options": {
                        "dictionaryCode": "v2.detailInfo.sourceSystems.items.field_wuYlhnu0"
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
                        "Нет"
                    ],
                    "type": "string",
                    "title": "Требуется хэширование/ шифрование"
                },
                "field_HgUCNn6E": {
                    "enum": [
                        "Да",
                        "Нет"
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
                        "Нет"
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
                        "Нет"
                    ],
                    "type": "string",
                    "title": "Наличие конфиденциальных данных"
                }
            }
        },
        "uiOptions": {
            "sectionRole": "subsection",
            "archComponent": "dataProcess",
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
                    "dictionaryCode": "v2.detailInfo.dataProcess.deliveryMode"
                }
            },
            "field_C6oqyTPh": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataProcess.field_C6oqyTPh"
                }
            },
            "field_HgUCNn6E": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataProcess.field_HgUCNn6E"
                }
            },
            "field_It-B8PfV": {
                "ui:placeholder": "Название процесса"
            },
            "field_R3Lx-csF": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataProcess.field_R3Lx-csF"
                }
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
            "confidentialData": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataProcess.confidentialData"
                }
            }
        }
    },
    "dataMart": {
        "schema": {
            "type": "object",
            "title": "Объект / Витрина данных",
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
                        "Нет"
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
                    "enum": [
                        "Да",
                        "Нет"
                    ],
                    "type": "string",
                    "title": "Наличие конфиденциальных данных"
                },
                "field_N9LFD6Hu": {
                    "enum": [
                        "Да",
                        "Нет"
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
                        "Да",
                        "Нет"
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
                        "Да",
                        "Нет"
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
                }
            }
        },
        "uiOptions": {
            "sectionRole": "subsection",
            "archComponent": "dataMart",
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
                    "dictionaryCode": "v2.detailInfo.dataMart.workType"
                }
            },
            "metricsCount": {
                "ui:options": {}
            },
            "field_0uV7wafS": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataMart.field_0uV7wafS"
                }
            },
            "field_28IPlEQu": {
                "ui:options": {}
            },
            "field_46LCnfWo": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataMart.field_46LCnfWo"
                }
            },
            "field_Ad1msOl7": {
                "ui:options": {}
            },
            "field_L-WWLDWY": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataMart.field_L-WWLDWY"
                }
            },
            "field_N9LFD6Hu": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataMart.field_N9LFD6Hu"
                }
            },
            "field_Q8DGJNTn": {
                "ui:options": {}
            },
            "field_fRuMuWtn": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataMart.deliveryMode"
                }
            },
            "field_hIM0c5gG": {
                "ui:options": {}
            },
            "field_le47srI7": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.detailInfo.dataMart.field_le47srI7"
                }
            },
            "field_lovKvLZc": {
                "ui:options": {}
            },
            "field_rZeUo8a_": {
                "ui:options": {}
            },
            "field_w_EN6lWe": {
                "ui:options": {}
            },
            "field_xva1dRvW": {
                "ui:options": {}
            }
        }
    },
    "model": {
        "schema": {
            "type": "object",
            "title": "Модель",
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
                        "Временные ряды",
                        "NLP",
                        "CV",
                        "RL"
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
                    "title": "Роль модели"
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
                "ui:options": {}
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
                    "dictionaryCode": "v2.detailInfo.model.workType"
                }
            },
            "algorithmType": {
                "ui:widget": "select",
                "ui:options": {
                    "tooltip": "По умолчанию применяется один тип алгоритма: >1 возможно для каскада или ансамблей моделей, если в одном решении используется комбинация алгоритмов/типов ML задач (т.е. для всех моделей/подмоделей решения может быть задействован один тип алгоритма). Заполняем вложенный список алгоритмов по типу данных, алгоритмов ML и инфраструктуры, участвующей во внедрении решения:\n\n· Табличные данные — любой ML-алгоритм (в т.ч. без учителя)\n· Текстовая аналитика — Классические модели — алгоритмы для текста (кроме LLM)\n· Текстовая аналитика — LLM — LLM для текста\n· Аудиоаналитика — алгоритмы для звука (аудио, видео)\n· Компьютерное зрение — CV — алгоритмы для изображений (аудио, видео)\n· Оптимизационная задача — модельный оптимизатор или эвристики\n· ГЕОаналитика — требуется платформа геоаналитики\n· Графовая аналитика — требуется графовая платформа",
                    "dictionaryCode": "v2.detailInfo.model.algorithmType"
                }
            },
            "field_58TkWuwu": {
                "ui:options": {}
            },
            "field_CeBkWcQc": {
                "ui:options": {}
            },
            "field_S23CbRXp": {
                "ui:options": {}
            },
            "field_S41Rqt5E": {
                "ui:options": {}
            },
            "field_VbI-0aiT": {
                "ui:widget": "select",
                "ui:options": {
                    "dictionaryCode": "v2.method.13.роль_модели"
                }
            },
            "field_atxiq-UM": {}
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
