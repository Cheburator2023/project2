# Версия 35 анкеты: параметры и справочники

Источник: `smart-anketa-v2-2026-06-28.json`

## Мета версии

| Поле | Значение |
| --- | --- |
| Шаблон | Новая схема (`b6fd1c00-7d52-4c2d-9042-d862185b6f26`) |
| Версия | **35** (`cb2fb7f2-f8cd-490f-a701-3a16d0c085d4`) |
| Статус | published |
| Опубликована | 2026-06-25T14:19:00.309Z |
| Справочников в snapshot | 71 |
| Привязок uiSchema → dictionaryCode | 75 |
| Методологических параметров (v2.method.*) | 11 |

## Параметры раздела «Детальная информация» (без справочника)

Поля `detailInfo.parameters` — не привязаны к `dictionaryCode`, хранятся в схеме анкеты.

| Ключ | Заголовок | Тип | По умолчанию |
| --- | --- | --- | --- |
| `streamNames` | Названия стримов | string | — |
| `streamsOutsideDADM` | Стримы вне ДАДМ | boolean | false |

## Параметры (v2.method.*)

Используются в полях анкеты и/или в логике типовых работ (коэффициенты, условия).

| Код параметра | Наименование | Категория | Поля анкеты | Значения |
| --- | --- | --- | --- | --- |
| `v2.method.13.роль_модели` | Роль модели | Методологический | `detailInfo.modelsList.items.field_VbI-0aiT` (Роль модели) | `обычная` — Обычная, `оркестратор` — Оркестратор |
| `v2.method.14.тип_работ_для_нетиповой_работы_пропро` | Тип работ для нетиповой работы (ПроПро) | Методологический | `field_aJEu5ziT.field_eCyDEFw3.items.workType` (Тип работ)<br>`streamDataSources.field_eCyDEFw3.items.workType` (Тип работ)<br>`streamModelControl.field_QkVbhG-_.items.workType` (Тип работ)<br>`streamDigitalAgents.field_r8nz3JWH.items.workType` (Тип работ)<br>`streamStreamingData.field_2l6A7K3g.items.workType` (Тип работ) | `новая_функциональность` — Новая функциональность, `архитектурная_задача` — Архитектурная задача, `линейная_деятельность` — Линейная деятельность, `сопровождение` — Сопровождение, `технический_долг` — Технический долг |
| `v2.method.2.класс_моделей` | Класс моделей | Методологический (триггер расчёта) | `generalInfo.modelService.modelClass` (Класс моделей) | `1_розничные_регуляторные_модели` — 1 — Розничные регуляторные модели, `2_розничные_бизнес_модели` — 2 — Розничные бизнес-модели, `3_розничные_модели_crm` — 3 — Розничные модели CRM, `4_розничные_модели_collection` — 4 — Розничные модели Collection, `5_корпоративные_регуляторные_модели` — 5 — Корпоративные регуляторные модели, `6_корпоративные_бизнес_модели` — 6 — Корпоративные бизнес-модели, `7_прочие_корпоративные_модели` — 7 — Прочие корпоративные модели, `8_модели_финансового_моделирования` — 8 — Модели финансового моделирования, `9_модели_цифровых_помощников` — 9 — Модели цифровых помощников |
| `v2.method.21.сроки_инициативы` | Сроки инициативы | Методологический (шкала) | `uncertaintyCalculation.field_xGCMlbMP` (Сроки инициативы) | `менее_1_мес` — Менее 1 мес., `1_4_мес` — 1–4 мес., `4_10_мес` — 4–10 мес., `10_18_мес` — 10–18 мес., `более_18_мес` — Более 18 мес. |
| `v2.method.22.стоимость_инициативы` | Стоимость инициативы | Методологический (шкала) | `uncertaintyCalculation.field_bbTNlnC6` (Стоимость инициативы) | `до_45_3_млн` — до 45.3 млн, `45_3_438_млн` — 45.3 — 438 млн, `438_870_млн` — 438 — 870 млн, `870_млн_2_млрд` — 870 млн — 2 млрд, `от_2_млрд` — От 2 млрд |
| `v2.method.27.сложность_предметной_области` | Сложность предметной области | Методологический (с коэф.) | `detailInfo.sourceSystems.items.field_d3OCFyaC` (Сложность предметной области) | `низкая` — Низкая, `средняя` — Средняя, `высокая` — Высокая, `Неизвестно` |
| `v2.method.28.объ_м_запроса_по_сущностям` | Объём запроса по сущностям | Методологический (с коэф.) | `detailInfo.sourceSystems.items.field_Y_K0Hy0e` (Количество сущностей (исходных таблиц)) | `точечное` — Точечное (1-4), `малое` — Малое (5-9), `среднее` — Среднее (9-15), `Крупное` — Крупное (15-20), `Большое` — Большое (20-25), `Масштабное` — Масштабное (25+), `Неизвестно` |
| `v2.method.29.детализация_и_ясность_запроса_rds` | Детализация и ясность запроса (RDS) | Методологический (с коэф.) | `detailInfo.sourceSystems.items.field_nE73kPQl` (Детализация и ясность запроса постановки задачи) | `высокая` — Высокая, `средняя` — Средняя, `низкая` — Низкая, `неизвестно` — Неизвестно |
| `v2.method.3.вид_контроля` | Вид контроля | Методологический | `generalInfo.modelService.field_SvNx6iEq` (Вид контроля) | `кд_качество_модельных_данных` — КД — Качество модельных данных, `тм_технический_контроль` — ТМ — Технический контроль, `ок_оперативный_контроль` — ОК — Оперативный контроль, `ак_аналитический_контроль` — АК — Аналитический контроль, `кмз_контроль_модельных_значений` — КМЗ — Контроль модельных значений, `ов_оценка_влияния_моделей` — ОВ — Оценка влияния моделей |
| `v2.method.4.канал_внедрения` | Канал внедрения | Методологический | `generalInfo.modelService.field_jUm5syZf` (Каналы внедрения) | `батч` — Батч, `батч_загрузка_данных_потребителю` — Батч + загрузка данных потребителю, `батч_онлайн` — Батч + Онлайн, `онлайн` — Онлайн, `онлайн_gpu` — Онлайн gpu, `стриминг` — Стриминг, `мобильные_устройства` — Мобильные устройства, `llm` — LLM, `гео_сервисы` — Гео-сервисы, `внедрение_в_облаке` — Внедрение в облаке, `графовая_платформа` — Графовая платформа |
| `v2.method.5.тип_источника_данных` | Тип источника данных | Методологический | `streamModelControl.localParams.field_Vc8LdrIe` (Тип источника) | `внутренний` — Внутренний, `внешний` — Внешний |

## Справочники по группам

### Workflow и мета

| dictionaryCode | Наименование | Поле анкеты | Значения |
| --- | --- | --- | --- |
| `v2.meta.status` | Статус | `meta.status` — Статус | `Активная`, `Архив` |
| `v2.workflow.globalStatus` | Глобальный статус | `workflow.globalStatus` — Глобальный статус | `Черновик`, `Заполнено` |
| `v2.workflow.sections.detailInfo` | detailInfo | `workflow.sections.detailInfo` — — | `Создано`, `В работе`, `Заполнено` |
| `v2.workflow.sections.generalInfo` | generalInfo | `workflow.sections.generalInfo` — — | `Создано`, `В работе`, `Заполнено` |
| `v2.workflow.sections.streamDataSources` | streamDataSources | `workflow.sections.streamDataSources` — — | `Создано`, `В работе`, `Заполнено` |
| `v2.workflow.sections.streamModelControl` | streamModelControl | `workflow.sections.streamModelControl` — — | `Создано`, `В работе`, `Заполнено` |

### Общие сведения

| dictionaryCode | Наименование | Поле анкеты | Значения |
| --- | --- | --- | --- |
| `v2.generalInfo.businessCustomer` | Департамент заказчика | `generalInfo.businessCustomer` — Департамент заказчика | `Департамент развития клиентской базы. Управление Розничный клиент`, `Департамент развития клиентской базы. Управление Технологии продаж и продвижения`, `Департамент развития клиентской базы. Управление дистанционных продаж`, `Департамент развития клиентской базы. Управление продаж и развития клиентской базы`, `Департамент развития клиентской базы. Управление развития коммерческих компетенций`, `Департамент розничных кредитных рисков. Управление количественной оценки рисков`, `Департамент розничных кредитных рисков. Управление портфельного анализа`, `Департамент розничных кредитных рисков. Управление развития процессов и технологий`, `Департамент стратегии и корпоративного развития. Управление корпоративного развития`, `Департамент стратегии и корпоративного развития. Управление стратегии`, `Департамент стратегии и корпоративного развития. Управление стратегических проектов`, `Департамент стратегии и корпоративного развития. Управление Центр качества клиентского опыта`, `Департамент структурных продуктов и структурирования`, `Департамент сбережений и зачислений. Управление Государственные услуги`, `Департамент сбережений и зачислений. Управление Зарплатные проекты`, `Департамент сбережений и зачислений. Управление Сбережения`, `Департамент сбережений и зачислений. Управление Старшее поколение`, `Департамент сбережений и зачислений. Управление экспертизы и поддержки процессов`, `Департамент кредитного розничного бизнеса`, `Департамент кредитного розничного бизнеса. Управление Автокредитование`, `Департамент кредитного розничного бизнеса. Управление Альтернативное кредитование`, `Департамент кредитного розничного бизнеса. Управление Ипотечное кредитование`, `Департамент кредитного розничного бизнеса. Управление координации и поддержки кредитных продуктов`, `Департамент кредитного розничного бизнеса. Управление Кредитные карты`, `Департамент кредитного розничного бизнеса. Управление Потребительское кредитование`, `Департамент кредитного розничного бизнеса. Управление Общекредитные процессы и сервисы`, `Департамент кредитного розничного бизнеса. Управление Страхование`, `Департамент транзакционного розничного бизнеса`, `Департамент розничных продаж`, `Департамент продаж в партнерских каналах`, `Департамент развития инструментов обслуживания`, `Департамент развития клиентского сервиса`, `Департамент партнерств`, `Департамент партнерств. Управление развития партнерств`, `Управление координации стратегических проектов по фондированию и лояльности`, `Управление координации и развития бизнеса в дочерних компаниях`, `Управление. Программы лояльности`, `Управление продаж в корпоративном канале`, `Управление экспертизы и фрод-мониторинга`, `Управление модельных рисков и валидации`, `Дочерняя компания` |
| `v2.generalInfo.complexity` | Сложность постановки задачи | `generalInfo.complexity` — Регуляторные требования | `1 — Низкая ×1.00` — 1 — Проведение регулярной валидации Регулятором нормативно не установлено, `2 — Средняя ×1.25` — 2 — Проведение регулярной валидации Регулятором нормативно не установлено +Модель оценки риска, `3 — Повышенная ×1.50` — 3 — Проведение регулярной валидации Регулятором нормативно не установлено + Заказчик запрашивает проведение первичной валидации модели, `4 — Высокая ×2.00` — 4 — Банком не планируется предоставление Модели Регулятору, но регулярная валидация установлена Регулятором, `5 — Максимальная ×3.00` — 5 — Банком планируется предоставление Модели Регулятору для одобрения к использованию |
| `v2.generalInfo.implementationStream` | Стрим-исполнитель | `generalInfo.implementationStream` — Стрим-исполнитель | `Моделирование РБ`, `RnD`, `РБ (КМБ и КСБ)`, `Финансовое моделирование` |
| `v2.generalInfo.modelService.workType` | Тип работ: Калибровка | `generalInfo.modelService.workType` — Тип работ | `Разработка`, `Внедрение`, `Доработка`, `Калибровка` |

### Детальная информация

| dictionaryCode | Наименование | Поле анкеты | Значения |
| --- | --- | --- | --- |
| `v2.detailInfo.dataMart.deliveryMode` | Способ предоставления данных заказчику | `detailInfo.dataMart.field_fRuMuWtn` — Способ предоставления данных заказчику | `непосредственно` — Непосредственно, `опосредованно` — Опосредованно, `неизвестно` — Неизвестно |
| `v2.detailInfo.dataMart.field_0uV7wafS` | Требуется хэширование/ шифрование | `detailInfo.dataMart.field_0uV7wafS` — Требуется хэширование/ шифрование | `да` — Да, `нет` — Нет, `неизвестно` — Неизвестно |
| `v2.detailInfo.dataMart.field_46LCnfWo` | Сложность реализации | `detailInfo.dataMart.field_46LCnfWo` — Сложность реализации | `Высокая`, `Средняя`, `Низкая`, `Неизвестно` |
| `v2.detailInfo.dataMart.field_L-WWLDWY` | Наличие конфиденциальных данных | `detailInfo.dataMart.field_L-WWLDWY` — Наличие конфиденциальных данных | `да` — Да, `нет` — Нет, `неизвестно` — Неизвестно |
| `v2.detailInfo.dataMart.field_le47srI7` | Слой хранения | `detailInfo.dataMart.field_le47srI7` — Слой хранения | `холодный` — Холодный, `теплый` — Теплый, `горячий` — Горячий, `потоковый` — Потоковый |
| `v2.detailInfo.dataMart.field_N9LFD6Hu` | Двусторонний обмен данными | `detailInfo.dataMart.field_N9LFD6Hu` — Двусторонний обмен данными | `да` — Да, `нет` — Нет, `неизвестно` — Неизвестно |
| `v2.detailInfo.dataMart.workType` | Тип работ | `detailInfo.dataMart.workType` — Тип работ | `Разработка`, `Доработка`, `Настройка` |
| `v2.detailInfo.dataProcess.confidentialData` | Конфиденциальные данные | `detailInfo.dataProcess.confidentialData` — Наличие конфиденциальных данных | `Да`, `Нет`, `Неизвестно` |
| `v2.detailInfo.dataProcess.deliveryMode` | Способ предоставления данных заказчику | `detailInfo.dataProcess.deliveryMode` — Способ предоставления данных заказчику | `Напрямую`, `Опосредованно`, `Неизвестно` |
| `v2.detailInfo.dataProcess.field_C6oqyTPh` | Требуется хэширование/ шифрование | `detailInfo.dataProcess.field_C6oqyTPh` — Требуется хэширование/ шифрование | `да` — Да, `нет` — Нет, `неизвестно` — Неизвестно |
| `v2.detailInfo.dataProcess.field_HgUCNn6E` | Тип процесса обработки данных | `detailInfo.dataProcess.field_HgUCNn6E` — Тип процесса обработки данных | `пакетный` — Пакетный, `потоковый` — Потоковый |
| `v2.detailInfo.dataProcess.field_R3Lx-csF` | Двусторонний обмен данными | `detailInfo.dataProcess.field_R3Lx-csF` — Двусторонний обмен данными | `да` — Да, `нет` — Нет, `неизвестно` — Неизвестно |
| `v2.detailInfo.dataProcess.implComplexity` | Сложность реализации | `detailInfo.dataProcess.field_UEzs5Q87` — Сложность реализации | `Низкая`, `Средняя`, `Высокая`, `Неизвестно` |
| `v2.detailInfo.dataProcess.workType` | Тип работ | `detailInfo.dataProcess.field_yJ51GkCR` — Тип работ | `Разработка`, `Доработка`, `Настройка` |
| `v2.detailInfo.model.algorithmType` | Тип алгоритма | `detailInfo.modelsList.items.algorithmType` — Сложность алгоритма / тип ML задачи | `Табличные данные`, `Текстовая аналитика — Классические модели`, `Текстовая аналитика — LLM`, `Аудио-аналитика`, `Компьютерное зрение`, `Оптимизационная задача`, `Гео-аналитика`, `Графовая аналитика` |
| `v2.detailInfo.model.workType` | Тип работ | `detailInfo.modelsList.items.workType` — Тип работ | `Обучение`, `Дообучение`, `Калибровка` |
| `v2.detailInfo.sourceSystems.items.field_-t8JSf3p` | Форма договора | `detailInfo.sourceSystems.items.field_-t8JSf3p` — Форма договора | `Неизвестно`, `Стандартная` |
| `v2.detailInfo.sourceSystems.items.field_1ANadh7U` | Тип загрузки данных | `detailInfo.sourceSystems.items.field_1ANadh7U` — Тип загрузки данных | `Однократный`, `Регламентный` |
| `v2.detailInfo.sourceSystems.items.field_3a0vme2u` | Предусмотрено проведение конкурса? | `detailInfo.sourceSystems.items.field_3a0vme2u` — Предусмотрено проведение конкурса | `Да`, `Нет`, `Неизвестно` |
| `v2.detailInfo.sourceSystems.items.field_4jxR0E0m` | Пилот | `detailInfo.sourceSystems.items.field_4jxR0E0m` — Пилот | `Первичный`, `Повторный`, `Не требуется` |
| `v2.detailInfo.sourceSystems.items.field_DBFG7kIN` | Наличие юридического основания для пилота | `detailInfo.sourceSystems.items.field_DBFG7kIN` — Наличие юридического основания для пилота | `Да`, `Нет`, `Неизвестно` |
| `v2.detailInfo.sourceSystems.items.field_HMnqITVb` | Требуется хэширование/ шифрование | `detailInfo.sourceSystems.items.field_vqqlHbU6` — Требуется хэширование/ шифрование | `Да`, `Нет`, `Неизвестно` |
| `v2.detailInfo.sourceSystems.items.field_K2ioHD8d` | Режим обмена данными | `detailInfo.sourceSystems.items.field_9BXQE8SI` — Режим обмена данными | `Односторонний`, `Двусторонний`, `Неизвестно` |
| `v2.detailInfo.sourceSystems.items.field_L1lRlgf1` | Сложность реализации | `detailInfo.sourceSystems.items.field_L1lRlgf1` — Сложность реализации | `Высокая`, `Средняя`, `Низкая`, `Неизвестно` |
| `v2.detailInfo.sourceSystems.items.field_p4zxdNZG` | Наличие конфиденциальных данных | `detailInfo.sourceSystems.items.field_AKLVuyFy` — Наличие конфиденциальных данных | `Да`, `Нет`, `Неизвестно` |
| `v2.detailInfo.sourceSystems.items.field_VX7y3PsB` | Сложность конфигурации модели разметки данных | `detailInfo.sourceSystems.items.field_VX7y3PsB` — Сложность конфигурации модели разметки данных | `Высокая`, `Средняя`, `Низкая`, `Неизвестно` |
| `v2.detailInfo.sourceSystems.items.field_wf7CHiVI` | Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик | `detailInfo.sourceSystems.items.field_wf7CHiVI` — Необходимо уточнение требований по составу выгружаемых данных и алгоритмам расчета метрик | `Да`, `Нет`, `Неизвестно` |
| `v2.detailInfo.sourceSystems.items.field_wuYlhnu0` | Сложность настройки шаблона разметки данных | `detailInfo.sourceSystems.items.field_wuYlhnu0` — Сложность настройки шаблона разметки данных | `Высокая`, `Средняя`, `Низкая`, `Неизвестно` |
| `v2.detailInfo.sourceSystems.items.nda` | NDA | `detailInfo.sourceSystems.items.field_tpROQBf5` — NDA | `Стандартное`, `Нестандартное`, `Неизвестно` |
| `v2.detailInfo.sourceSystems.items.type` | Тип системы-источника | `detailInfo.sourceSystems.items.type` — Тип системы-источника | `Внутренний`, `Внешний` |

### Объекты данных

| dictionaryCode | Наименование | Поле анкеты | Значения |
| --- | --- | --- | --- |
| `v2.dataObjects.applicationSources.items.development` | Доработка | `detailInfo.field_npwqpBHt.items.workType` — Тип работ | `Не нужна`, `С нуля`, `Нужна` |

### Модельный сервис

| dictionaryCode | Наименование | Поле анкеты | Значения |
| --- | --- | --- | --- |
| `v2.modelserviceiInfo.bidbtype` | Тип БД для BI-системы | `generalInfo.modelService.field_F7nK-We5` — Тип БД для BI-системы | `Векторные`, `Графовые`, `Временные ряды и события`, `Документо-ориентированные`, `Специализированные` |

### Локальные параметры стримов

| dictionaryCode | Наименование | Поле анкеты | Значения |
| --- | --- | --- | --- |
| `v2.streamDataSources.localParams.reapproveArtifact` | Необходимо пересогласование артефакта | `streamDataSources.localParams.field_fWcU13WA` — Необходимо пересогласование артефакта | `Да`, `Нет`, `Неизвестно` |
| `v2.streamDataSources.localParams.stakeholdersKnown` | Стейкхолдеры известны (владелец сервиса, разработчик модели / витрин, РП и тд.)? | `streamDataSources.localParams.field_oHrG3Q3A` — Стейкхолдеры известны (владелец сервиса, разработчик модели / витрин, РП и тд.)? | `Да`, `Нет`, `Неизвестны` |
| `v2.streamDataSources.localParams.studyRegulations` | Необходимость изучения регламентов Банка | `streamDataSources.localParams.field_P1nnb5h5` — Необходимость изучения регламентов Банка | `Да`, `Нет`, `Неизвестно` |
| `v2.streamDataSources.localParams.tisChangeVolume` | Объем изменений в ТИС | `streamDataSources.localParams.field_FLO128j-` — Объем изменений в ТИС | `неизвестно` — Неизвестно, `точечное_1_4` — Точечное (1-4), `малое_5_9` — Малое (5-9), `среднее_9_15` — Среднее (9-15), `крупное_15_20` — Крупное (15-20), `большое_20_25` — Большое (20-25), `масштабное_25` — Масштабное (25+) |
| `v2.streamModelControl.localParams.field_EhLyopSI` | Разнородность пользовательских сценариев применения модельного сервиса | `streamModelControl.localParams.field_oVFNOrlT` — Разнородность пользовательских сценариев  применения модельного сервиса | `1` — Нет, `2` — Единая структура логов, `3` — Разные структуры логов |

### Расчёт неопределённости

| dictionaryCode | Наименование | Поле анкеты | Значения |
| --- | --- | --- | --- |
| `v2.uncertaintyCalculation.riskGroup.adjacentProjectsImpact` | Негативное влияние смежных проектов на показатели проекта | `uncertaintyCalculation.riskGroup.adjacentProjectsImpact` — Негативное влияние смежных проектов на показатели проекта | `Низкий`, `Средний`, `Высокий` |
| `v2.uncertaintyCalculation.riskGroup.businessComplexity` | Изменение, недостаточная проработка или сложности бизнес процессов Банка | `uncertaintyCalculation.riskGroup.businessComplexity` — Изменение, недостаточная проработка или сложности бизнес процессов Банка | `Низкий`, `Средний`, `Высокий` |
| `v2.uncertaintyCalculation.riskGroup.controlProceduresLack` | Недостаток или отсутствие контрольных процедур | `uncertaintyCalculation.riskGroup.controlProceduresLack` — Недостаток или отсутствие контрольных процедур | `Низкий`, `Средний`, `Высокий` |
| `v2.uncertaintyCalculation.riskGroup.defectsInSolution` | Наличие дефектов во внедряемом решении/ ПО в рамках проекта | `uncertaintyCalculation.riskGroup.defectsInSolution` — Наличие дефектов во внедряемом решении/ ПО в рамках проекта | `Низкий`, `Средний`, `Высокий` |
| `v2.uncertaintyCalculation.riskGroup.isNotUsedAfterProject` | Неиспользование ИС после завершения проекта | `uncertaintyCalculation.riskGroup.isNotUsedAfterProject` — Неиспользование ИС после завершения проекта | `Низкий`, `Средний`, `Высокий` |
| `v2.uncertaintyCalculation.riskGroup.itArchitectureChanges` | Изменения целевой ИТ архитектуры Банка | `uncertaintyCalculation.riskGroup.itArchitectureChanges` — Изменения целевой ИТ архитектуры Банка | `Низкий`, `Средний`, `Высокий` |
| `v2.uncertaintyCalculation.riskGroup.laborCostIncrease` | Увеличение трудозатрат проекта по причине недостаточной | `uncertaintyCalculation.riskGroup.laborCostIncrease` — Увеличение трудозатрат проекта по причине недостаточной проработки требований на этапе планирования проекта | `Низкий`, `Средний`, `Высокий` |
| `v2.uncertaintyCalculation.riskGroup.regulatoryChanges` | Изменение регуляторных требований | `uncertaintyCalculation.riskGroup.regulatoryChanges` — Изменение регуляторных требований | `Низкий`, `Средний`, `Высокий` |
| `v2.uncertaintyCalculation.riskGroup.sanctions` | Введение санкционных мер и других ограничений | `uncertaintyCalculation.riskGroup.sanctions` — Введение санкционных мер и других ограничений | `Низкий`, `Средний`, `Высокий` |
| `v2.uncertaintyCalculation.riskGroup.staffShortage` | Отсутствие квалифицированного персонала или ошибок персонала | `uncertaintyCalculation.riskGroup.staffShortage` — Отсутствие квалифицированного персонала или ошибок персонала | `Низкий`, `Средний`, `Высокий` |
| `v2.uncertaintyCalculation.riskGroup.thirdPartyNegligence` | Недобросовестное исполнение услуг со стороны привлечённых | `uncertaintyCalculation.riskGroup.thirdPartyNegligence` — Недобросовестное исполнение услуг со стороны привлеченных контрагентов/ подрядчиков | `Низкий`, `Средний`, `Высокий` |

### Legacy (без префикса v2)

| dictionaryCode | Наименование | Поле анкеты | Значения |
| --- | --- | --- | --- |
| `Риск появления дополнительных систем-источников` | Риск появления дополнительных систем-источников | `detailInfo.sourceSystems.items.field_HuOLfL4K` — Риск появления дополнительных систем-источников | `Есть`, `Нет`, `Неизвестно` |
| `Способ загрузки данных в BI-систему` | Способ загрузки данных в BI-систему | `generalInfo.modelService.field_4IL7OStC` — Способ загрузки данных в BI-систему | `Ручной`, `Автоматизированный` |

## Полный список referencedDictionaryCodes

- `Риск появления дополнительных систем-источников`
- `Способ загрузки данных в BI-систему`
- `v2.dataObjects.applicationSources.items.development`
- `v2.detailInfo.dataMart.deliveryMode`
- `v2.detailInfo.dataMart.field_0uV7wafS`
- `v2.detailInfo.dataMart.field_46LCnfWo`
- `v2.detailInfo.dataMart.field_L-WWLDWY`
- `v2.detailInfo.dataMart.field_le47srI7`
- `v2.detailInfo.dataMart.field_N9LFD6Hu`
- `v2.detailInfo.dataMart.workType`
- `v2.detailInfo.dataProcess.confidentialData`
- `v2.detailInfo.dataProcess.deliveryMode`
- `v2.detailInfo.dataProcess.field_C6oqyTPh`
- `v2.detailInfo.dataProcess.field_HgUCNn6E`
- `v2.detailInfo.dataProcess.field_R3Lx-csF`
- `v2.detailInfo.dataProcess.implComplexity`
- `v2.detailInfo.dataProcess.workType`
- `v2.detailInfo.model.algorithmType`
- `v2.detailInfo.model.workType`
- `v2.detailInfo.sourceSystems.items.field_-t8JSf3p`
- `v2.detailInfo.sourceSystems.items.field_1ANadh7U`
- `v2.detailInfo.sourceSystems.items.field_3a0vme2u`
- `v2.detailInfo.sourceSystems.items.field_4jxR0E0m`
- `v2.detailInfo.sourceSystems.items.field_DBFG7kIN`
- `v2.detailInfo.sourceSystems.items.field_HMnqITVb`
- `v2.detailInfo.sourceSystems.items.field_K2ioHD8d`
- `v2.detailInfo.sourceSystems.items.field_L1lRlgf1`
- `v2.detailInfo.sourceSystems.items.field_p4zxdNZG`
- `v2.detailInfo.sourceSystems.items.field_VX7y3PsB`
- `v2.detailInfo.sourceSystems.items.field_wf7CHiVI`
- `v2.detailInfo.sourceSystems.items.field_wuYlhnu0`
- `v2.detailInfo.sourceSystems.items.nda`
- `v2.detailInfo.sourceSystems.items.type`
- `v2.generalInfo.businessCustomer`
- `v2.generalInfo.complexity`
- `v2.generalInfo.implementationStream`
- `v2.generalInfo.modelService.workType`
- `v2.meta.status`
- `v2.method.13.роль_модели`
- `v2.method.14.тип_работ_для_нетиповой_работы_пропро`
- `v2.method.2.класс_моделей`
- `v2.method.21.сроки_инициативы`
- `v2.method.22.стоимость_инициативы`
- `v2.method.27.сложность_предметной_области`
- `v2.method.28.объ_м_запроса_по_сущностям`
- `v2.method.29.детализация_и_ясность_запроса_rds`
- `v2.method.3.вид_контроля`
- `v2.method.4.канал_внедрения`
- `v2.method.5.тип_источника_данных`
- `v2.modelserviceiInfo.bidbtype`
- `v2.streamDataSources.localParams.reapproveArtifact`
- `v2.streamDataSources.localParams.stakeholdersKnown`
- `v2.streamDataSources.localParams.studyRegulations`
- `v2.streamDataSources.localParams.tisChangeVolume`
- `v2.streamModelControl.localParams.field_EhLyopSI`
- `v2.uncertaintyCalculation.riskGroup.adjacentProjectsImpact`
- `v2.uncertaintyCalculation.riskGroup.businessComplexity`
- `v2.uncertaintyCalculation.riskGroup.controlProceduresLack`
- `v2.uncertaintyCalculation.riskGroup.defectsInSolution`
- `v2.uncertaintyCalculation.riskGroup.isNotUsedAfterProject`
- `v2.uncertaintyCalculation.riskGroup.itArchitectureChanges`
- `v2.uncertaintyCalculation.riskGroup.laborCostIncrease`
- `v2.uncertaintyCalculation.riskGroup.regulatoryChanges`
- `v2.uncertaintyCalculation.riskGroup.sanctions`
- `v2.uncertaintyCalculation.riskGroup.staffShortage`
- `v2.uncertaintyCalculation.riskGroup.thirdPartyNegligence`
- `v2.workflow.globalStatus`
- `v2.workflow.sections.detailInfo`
- `v2.workflow.sections.generalInfo`
- `v2.workflow.sections.streamDataSources`
- `v2.workflow.sections.streamModelControl`
