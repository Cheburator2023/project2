# Смарт-анкета — конфигурируемый калькулятор: RJSF + JSONLogic

Единая спецификация: JSON Schema (RJSF) для формы + слой правил на JSONLogic
(генерация типовых работ, вычисление коэффициентов, итогов и статусов).

Корень
Смарт-анкета → общий статус: «Черновик» → «Завершено». Порождает три блока (стрелки от корня). У каждого блока — свой локальный статус: «Создано» → «В работе» → «Заполнено».
Блок 1. Общая информация
Общие параметры и параметры в разрезе арх. компонента «Модельный сервис». Ответственный — без привязки / модельный сервис.
Общие параметры (без привязки к арх. компоненту):

Стрим-исполнитель — Моделирование РБ / RnD / РБ (КМБ и КСБ) / Финансовое моделирование
Департамент заказчика — Депозитарий / Опер. поддержка / Персонал / Кредитный
Сложность постановки задачи — шкала 1–5 (от «валидация нормативно не установлена» до «предоставление Модели Регулятору»)
Требуется создание ИС — Требуется / Не требуется
Требуется создание сервиса — Требуется / Не требуется
Оценка реализации на пре-проме (MVP/Прототип) [Контроль моделей]
Определение необходимости промышленной реализации [Контроль моделей]
Оценка новых интеграционных решений [Контроль моделей]
Общая неопределённость (модальное окно)

Арх. компонент «Модельный сервис» — параметры (модалка):

Тип работ — Разработка / Доработка / Настройка
Класс моделей — 1–9 [Контроль моделей]
Вид контроля — КД, ТМ, ОК, АК, КМЗ, ОВ (multi) [Контроль моделей]
ПК-коэффициенты (тройки значений на КД/ТМ/прочее): Рекалибровка ×0.25 на ОК/АК/КМЗ; Использование в другом канале ×1/×0.75/×1; Переработка существующей ×1/×0.75/×0.75; Модель ПВР/Регуляторная ×1.5×3; Новый тип модели ×2.0×3
Каналы внедрения (multi) — Батч / Батч+загрузка / Батч+Онлайн / Онлайн / Онлайн GPU / Стриминг / Мобильные / LLM / Гео / Облако / Графовая платформа
Блок Да/Нет [ПиРМ]: Подключение ИС к РЕПО; Интерфейс; Доработка бизнес-функционала; Функционал системы; Визуализация и аналитика; Расширение кластера; Новая модель; Требуется НТ; КРС утилизации серверов; Логирование

Блок 2. Детальная информация
Параметры в разрезе арх. компонентов. Ответственный — модельный стрим. Четыре компонента, каждый с модалкой параметров.
1. Система-источник — Тип работ; Тип источника (Внутр./Внешн.); далее блок [ИД — Внутр.] (реплика в ДАПП, требования понятны, риск новых требований ×1.0…×2.4, готовность к ПРОМ, доработка, интеграции СХК/СФП, мониторинг) и большой блок [ИД — Внешн.] (детализация запроса в RDS ×0.75…×1.5, определены ли источники, NDA ×1.25, конфиденциальность, юр.основания пилота ×1.25, договор, соревновательная процедура ×1.25, новое/доработка ×1.1/×0.75).
2. Процессы обработки данных — Тип работ; Автосертификация; Feature Store; конфиденциальные данные; новый/повторный пилот; пилот (обмен конф. данными, хеширование, двусторонний обмен); данные заказчику напрямую ×0.8 / опосредованно ×1.2; юр.основания обмена ×1.25; сложность реализации ×1.0/×1.5; сложность логики витрины.
3. Витрина / Объект данных — Тип работ; риск новых требований ×1.0…×2.4; готовность к интеграции в ПД ×0.5/×0.8/×1.2; количество метрик (до 20 / 20–50 / >50); конфиденциальность; сложность реализации/логики; типы признаков (сырые / тёплый / горячий / потоковый); контроль качества; разметка датасета; авто-разметка; импорт/экспорт; обновление ИС 1860 «Маркер»; ПДн; логирование.
4. Модели — Тип работ (Обучение / Дообучение / Калибровка); ПК Ансамбль/каскад ×2.3/×2.3/0; АвтоМЛ; внешний код; преобразование данных; постановка на регламент; новая библиотека / базовая модель; ГПУ ИС 1655; функционал системы.
Связка «Параметр — архитектурный компонент». От всех четырёх компонентов идут стрелки «Формируют» в две карточки:

Типовые работы — автоматически по справочнику, на основании параметров и арх. компонентов. В первой итерации распределяются в подитогах по этапам разработки моделей.
Нетиповые работы — вручную. Поля строки: Наименование, Тип работ, Базовая оценка (ч/д), Коэффициент, Итог, Включить в расчёт (toggle).

Блок 3. Платформенные и поддерживающие стримы
Создаётся автоматически по перечню типовых работ модельного стрима или при явном привлечении стрима. У каждого стрима — свой блок локальных параметров.

Стрим «Контроль моделей» → локальные ПК: контуры (region/inno.local) ×1.1; пользовательские сценарии ×1.05 или ×1.5^n; определённость структуры логов ×1.25; контроль работы сервиса вместо моделей.
Стрим «Источники данных» → локальные параметры: сложность предметной области ×0.75…×1.75; объём запроса по сущностям ×0.75…×1.75; разовая загрузка «Облако»; стейкхолдеры; объём изменения в ТИС; изучение регламентов; пересогласование артефакта (с метками [ИД — Внутр./Внешн.]).

Локальные параметры стримов «Формируют» → Типовые работы (на стрим) и Нетиповые работы (на стрим) — те же поля строки, что и в Блоке 2.

Что важно для модели данных и движка (по сравнению с первой версией картина прояснилась):
Появилось разделение источника параметра — это справочники-владельцы. Метки [Контроль моделей], [ПиРМ], [Источники данных], [ИД — Внутр.], [ИД — Внешн.], [Справочник] — это не косметика, а атрибут source_dictionary у параметра. Он же определяет, в какой стрим Блока 3 уйдёт типовая работа. То есть [Контроль моделей] на параметре модельного сервиса → автогенерация работ в стриме «Контроль моделей». Это прямая связь параметр → стрим, рядом со связью параметр → арх.компонент.
Параметры неоднородны по типу значения — их минимум четыре вида: boolean (Да/Нет), single-select (enum), multi-select (Каналы внедрения, Вид контроля), и числовая шкала/степень (×1.5^n). У многих опций к значению привязан коэффициент, причём иногда это тройка коэффициентов (по видам контроля КД/ТМ/прочее). Значит, у варианта ответа не одно поле coef, а вектор коэффициентов с ключом по другому измерению — это уже не плоский справочник, а матрица. Под JSONLogic+mathjs, который у тебя в smart-anketa, это ляжет как правило вида «выбери коэффициент из map по второму параметру».
Формула строки работы видна явно: Итог = Базовая оценка (ч/д) × произведение коэффициентов, агрегируется только при Включить в расчёт = true. У типовых работ базовая оценка и набор коэффициентов приходят из справочника по правилу, у нетиповых — руками.
Два уровня статуса теперь различаются: глобальный у анкеты (Черновик/Завершено, 2 состояния) и локальный у каждого раздела (3 состояния). Глобальный — почти наверняка агрегат/гейт по локальным.

"Там в квадратных скобках указано, откуда этот параметр взялся (ПиРМ, Контроль моделей и тд) - это разумеется, не надо брать в интерфейс. Параметры по арх компонентам задаются/редактируются путем открытия модального окна (смотри дизайны)" - аналитик

---

## 0. Модель данных (концепция)

```
Anketa
 ├─ status: "draft" | "done"                    // общий статус
 ├─ block1 (Общая информация)        status: created|in_progress|filled
 │    ├─ commonParams                            // без привязки к арх. компоненту
 │    └─ modelService (арх. компонент)           // параметры в модалке
 ├─ block2 (Детальная информация)    status: created|in_progress|filled
 │    └─ components[]                             // 4 типа арх. компонентов
 │         ├─ source            (Система-источник)
 │         ├─ dataProcess       (Процессы обработки данных)
 │         ├─ dataMart          (Витрина / Объект данных)
 │         └─ model             (Модели)
 └─ block3 (Платформенные/поддерживающие стримы)  status: created|in_progress|filled
      └─ streams[]                                // создаётся автоматически
           ├─ modelControl     (Контроль моделей)
           └─ dataSources       (Источники данных)

works[] (общая таблица, в каждом блоке/стриме):
  isTypical: boolean          // true — авто из справочника, false — вручную
  name, workType, baseEstimate(ч/д), coefficient, total, includeInCalc
```

Ключевые инварианты, вытащенные из схемы:

- **Параметр полиморфен по владельцу** (`ownerType`: anketa | component | stream) — одна сущность, дискриминатор.
- **У параметра есть `sourceDictionary`** — метка `[Контроль моделей] / [ПиРМ] / [Источники данных] / [ИД — Внутр.] / [ИД — Внешн.] / [Справочник]`. Она определяет, **в какой стрим Блока 3** уйдёт сгенерированная типовая работа.
- **Коэффициент опции бывает вектором** (тройка по видам контроля КД/ТМ/прочее, либо степенная формула `×1.5^n`) — не скаляр.
- **Итог строки**: `total = baseEstimate × Π(coefficients)`, агрегируется только при `includeInCalc = true`.
- **Статусы двухуровневые**: глобальный (2 состояния, гейт) + локальный по разделам (3 состояния).

---

## 1. JSON Schema (RJSF)

Корневая схема. Перечисления опций вынесены в `$defs` для переиспользования.

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "$id": "https://t1/smart-anketa/schema.json",
  "title": "Смарт-анкета",
  "type": "object",
  "required": ["block1", "block2"],
  "properties": {
    "status": {
      "type": "string",
      "title": "Общий статус",
      "enum": ["draft", "done"],
      "default": "draft"
    },
    "block1": { "$ref": "#/$defs/Block1" },
    "block2": { "$ref": "#/$defs/Block2" },
    "block3": { "$ref": "#/$defs/Block3" }
  },

  "$defs": {

    "SectionStatus": {
      "type": "string",
      "title": "Статус раздела",
      "enum": ["created", "in_progress", "filled"],
      "default": "created"
    },

    "YesNo":      { "type": "string", "enum": ["yes", "no"] },
    "ReqNotReq":  { "type": "string", "enum": ["required", "not_required"] },
    "WorkType":   { "type": "string", "enum": ["dev", "rework", "setup"] },
    "ModelWorkType": { "type": "string", "enum": ["train", "retrain", "calibrate"] },

    "Work": {
      "type": "object",
      "properties": {
        "isTypical":     { "type": "boolean", "default": false },
        "name":          { "type": "string", "title": "Наименование" },
        "workType":      { "type": "string", "title": "Тип работ" },
        "baseEstimate":  { "type": "number", "title": "Базовая оценка (ч/д)", "minimum": 0 },
        "coefficient":   { "type": "number", "title": "Коэффициент", "default": 1 },
        "total":         { "type": "number", "title": "Итог", "readOnly": true },
        "includeInCalc": { "type": "boolean", "title": "Включить в расчёт", "default": true }
      },
      "required": ["name", "baseEstimate"]
    },

    "Works": {
      "type": "object",
      "properties": {
        "typical":    { "type": "array", "title": "Типовые работы",   "items": { "$ref": "#/$defs/Work" } },
        "nonTypical": { "type": "array", "title": "Нетиповые работы", "items": { "$ref": "#/$defs/Work" } }
      }
    },

    "Block1": {
      "type": "object",
      "title": "Блок 1. Общая информация",
      "properties": {
        "status": { "$ref": "#/$defs/SectionStatus" },
        "commonParams":  { "$ref": "#/$defs/CommonParams" },
        "modelService":  { "$ref": "#/$defs/ModelServiceComponent" }
      }
    },

    "CommonParams": {
      "type": "object",
      "title": "Общие параметры (без привязки к арх. компоненту)",
      "properties": {
        "executorStream": {
          "title": "Стрим-исполнитель",
          "type": "string",
          "enum": ["model_rb", "model_rnd", "model_rb_kmb_ksb", "fin_model"]
        },
        "customerDept": {
          "title": "Департамент заказчика",
          "type": "string",
          "enum": ["depository", "ops_support", "hr", "credit"]
        },
        "taskComplexity": {
          "title": "Сложность постановки задачи",
          "type": "integer",
          "enum": [1, 2, 3, 4, 5]
        },
        "needIS":      { "title": "Требуется создание ИС",      "$ref": "#/$defs/ReqNotReq" },
        "needService": { "title": "Требуется создание сервиса", "$ref": "#/$defs/ReqNotReq" },
        "needMVP":     { "title": "Оценка реализации на пре-проме (MVP/Прототип)", "$ref": "#/$defs/ReqNotReq" },
        "needProd":    { "title": "Определение необходимости промышл. реализации", "$ref": "#/$defs/ReqNotReq" },
        "needIntegrEval": { "title": "Оценка новых интеграционных решений", "$ref": "#/$defs/ReqNotReq" },
        "generalUncertainty": { "title": "Общая неопределённость", "type": "object" }
      }
    },

    "ModelServiceComponent": {
      "type": "object",
      "title": "Арх. компонент «Модельный сервис»",
      "properties": {
        "workType":  { "title": "Тип работ", "$ref": "#/$defs/WorkType" },
        "modelClass": {
          "title": "Класс моделей",
          "type": "integer", "minimum": 1, "maximum": 9
        },
        "controlKind": {
          "title": "Вид контроля",
          "type": "array",
          "items": { "type": "string", "enum": ["KD", "TM", "OK", "AK", "KMZ", "OV"] },
          "uniqueItems": true
        },
        "pkRecalibration":   { "title": "ПК — Рекалибровка модели", "$ref": "#/$defs/YesNo" },
        "pkOtherChannel":    { "title": "ПК — Использование в другом канале", "$ref": "#/$defs/YesNo" },
        "pkRework":          { "title": "ПК — Переработка существующей модели", "$ref": "#/$defs/YesNo" },
        "pkRegulatory":      { "title": "ПК — Модель ПВР / Регуляторная", "$ref": "#/$defs/YesNo" },
        "pkNewType":         { "title": "ПК — Новый тип модели", "$ref": "#/$defs/YesNo" },
        "deployChannels": {
          "title": "Каналы внедрения",
          "type": "array", "uniqueItems": true,
          "items": {
            "type": "string",
            "enum": ["batch", "batch_export", "batch_online", "online", "online_gpu",
                     "streaming", "mobile", "llm", "geo", "cloud", "graph"]
          }
        },
        "repoConnect":   { "title": "Подключение ИС к РЕПО", "$ref": "#/$defs/YesNo" },
        "needInterface": { "title": "Необходимость организации интерфейса", "$ref": "#/$defs/YesNo" },
        "reworkBiz":     { "title": "Доработка бизнес-функционала", "$ref": "#/$defs/YesNo" },
        "needSysFunc":   { "title": "Требуется функционал системы", "$ref": "#/$defs/YesNo" },
        "needViz":       { "title": "Визуализация данных и аналитика", "$ref": "#/$defs/YesNo" },
        "needCluster":   { "title": "Расширение инфраструктуры кластера", "$ref": "#/$defs/YesNo" },
        "needNewModel":  { "title": "Требуется новая модель", "$ref": "#/$defs/YesNo" },
        "needNT":        { "title": "Требуется НТ", "$ref": "#/$defs/YesNo" },
        "needKRS":       { "title": "Выполнение КРС утилизации серверов", "$ref": "#/$defs/YesNo" },
        "needLogging":   { "title": "Необходимость логирования", "$ref": "#/$defs/YesNo" }
      }
    },

    "Block2": {
      "type": "object",
      "title": "Блок 2. Детальная информация",
      "properties": {
        "status": { "$ref": "#/$defs/SectionStatus" },
        "components": {
          "type": "array",
          "title": "Архитектурные компоненты",
          "items": {
            "oneOf": [
              { "$ref": "#/$defs/SourceComponent" },
              { "$ref": "#/$defs/DataProcessComponent" },
              { "$ref": "#/$defs/DataMartComponent" },
              { "$ref": "#/$defs/ModelComponent" }
            ]
          }
        },
        "works": { "$ref": "#/$defs/Works" }
      }
    },

    "SourceComponent": {
      "type": "object",
      "title": "Система-источник",
      "properties": {
        "kind":     { "const": "source" },
        "workType": { "title": "Тип работ", "$ref": "#/$defs/WorkType" },
        "sourceType": { "title": "Тип источника", "type": "string", "enum": ["internal", "external"] },

        "replicaDAPP":      { "title": "Источник с репликой в ДАПП", "$ref": "#/$defs/YesNo" },
        "reqClear":         { "title": "Требования по источникам", "type": "string", "enum": ["clear", "unclear"] },
        "newReqRisk":       { "title": "Риск привнесения новых требований (источники)",
                              "type": "string", "enum": ["yes", "no"] },
        "newReqRiskCount":  { "title": "Кол-во новых требований", "type": "integer", "minimum": 0 },
        "prodReady":        { "title": "Готовность интеграций к выводу в ПРОМ", "$ref": "#/$defs/YesNo" },
        "needSourceRework": { "title": "Необходима доработка источника к ПРОМ", "$ref": "#/$defs/YesNo" },
        "intermediateIntegr": { "title": "Интеграции с промежуточными системами (СХК, СФП…)", "$ref": "#/$defs/YesNo" },
        "needMonitoring":   { "title": "Требуется мониторинг (таблиц / источника / витрины)", "$ref": "#/$defs/YesNo" },

        "rdsClarity":       { "title": "Детализация и ясность запроса в RDS",
                              "type": "string", "enum": ["high", "medium", "low", "unknown"] },
        "sourcesDefined":   { "title": "Определены ли источники", "type": "string", "enum": ["defined", "search"] },
        "dataConcrete":     { "title": "Конкретизированы ли искомые данные", "$ref": "#/$defs/YesNo" },
        "ndaNeeded":        { "title": "Необходимо заключение NDA", "type": "string", "enum": ["yes", "no", "unknown"] },
        "ndaStdForm":       { "title": "Согласие на стандартную форму NDA", "$ref": "#/$defs/YesNo" },
        "confidential":     { "title": "Конфиденциальные данные", "$ref": "#/$defs/YesNo" },
        "legalPilot":       { "title": "Юр. основания для пилота / разовой загрузки",
                              "type": "string", "enum": ["yes", "no", "unknown"] },
        "contractType":     { "title": "Договор: регламентная или разовая загрузка", "$ref": "#/$defs/YesNo" },
        "competitiveProc":  { "title": "Проведение соревновательной процедуры",
                              "type": "string", "enum": ["not_provided", "unknown", "provided"] },
        "contractStdForm":  { "title": "Согласие на форму договора Банка", "$ref": "#/$defs/YesNo" },
        "newOrRework":      { "title": "Новое решение / доработка",
                              "type": "string", "enum": ["new", "rework", "unknown"] }
      },
      "required": ["kind", "sourceType"]
    },

    "DataProcessComponent": {
      "type": "object",
      "title": "Процессы обработки данных",
      "properties": {
        "kind":     { "const": "dataProcess" },
        "workType": { "title": "Тип работ", "$ref": "#/$defs/WorkType" },
        "autoCert":         { "title": "Необходимость автосертификации", "$ref": "#/$defs/YesNo" },
        "featureStore":     { "title": "Хранилище признаков (экспорт в Feature Store)", "$ref": "#/$defs/YesNo" },
        "confidential":     { "title": "Конфиденциальные данные в предмете исследования", "$ref": "#/$defs/YesNo" },
        "pilotType":        { "title": "Новый пилот или повторный",
                              "type": "string", "enum": ["new", "repeat", "one_time"] },
        "pilotConfExchange":{ "title": "Пилот: обмен конфиденциальными данными", "$ref": "#/$defs/YesNo" },
        "pilotHashing":     { "title": "Пилот: хеширование / шифрование", "$ref": "#/$defs/YesNo" },
        "pilotTwoWay":      { "title": "Пилот: двусторонний обмен данными", "$ref": "#/$defs/YesNo" },
        "deliveryMode":     { "title": "Данные заказчику: напрямую или через витрины / модель",
                              "type": "string", "enum": ["direct", "indirect", "unknown"] },
        "legalExchange":    { "title": "Юр. основания для реализации обмена данными",
                              "type": "string", "enum": ["yes", "no", "unknown"] },
        "implComplexity":   { "title": "Сложность реализации",
                              "type": "string", "enum": ["low", "medium", "high", "unknown"] },
        "martLogicComplexity": { "title": "Сложность логики формирования витрины",
                              "type": "string", "enum": ["low", "medium", "high", "unknown"] }
      },
      "required": ["kind"]
    },

    "DataMartComponent": {
      "type": "object",
      "title": "Витрина / Объект данных",
      "properties": {
        "kind":     { "const": "dataMart" },
        "workType": { "title": "Тип работ", "$ref": "#/$defs/WorkType" },
        "newReqRisk":      { "title": "Риск привнесения новых требований (объекты/витрины)",
                             "type": "string", "enum": ["yes", "no"] },
        "newReqRiskCount": { "title": "Кол-во новых требований", "type": "integer", "minimum": 0 },
        "integrReadiness": { "title": "Готовность к интеграции в ПД",
                             "type": "string", "enum": ["high", "is_rework", "complex"] },
        "metricsCount":    { "title": "Количество метрик", "type": "string", "enum": ["lt20", "20_50", "gt50"] },
        "confidential":    { "title": "Конфиденциальные данные", "$ref": "#/$defs/YesNo" },
        "implComplexity":  { "title": "Сложность реализации",
                             "type": "string", "enum": ["low", "medium", "high", "unknown"] },
        "martLogicComplexity": { "title": "Сложность логики формирования витрины",
                             "type": "string", "enum": ["low", "medium", "high", "unknown"] },
        "rawData":         { "title": "Сырые данные", "$ref": "#/$defs/YesNo" },
        "warmFeature":     { "title": "Тёплый признак", "$ref": "#/$defs/YesNo" },
        "hotFeature":      { "title": "Горячий признак", "$ref": "#/$defs/YesNo" },
        "streamFeature":   { "title": "Потоковый признак", "$ref": "#/$defs/YesNo" },
        "qualityControl":  { "title": "Требуется контроль качества", "$ref": "#/$defs/YesNo" },
        "qualityControlCount": { "title": "Кол-во контролей", "type": "integer", "minimum": 0 },
        "labeling":        { "title": "Разметка данных для обучающего датасета", "$ref": "#/$defs/YesNo" },
        "autoLabelModel":  { "title": "Новая модель для автоматической разметки", "$ref": "#/$defs/YesNo" },
        "autoImportExport":{ "title": "Авто импорт/экспорт размеченных данных / отчётности", "$ref": "#/$defs/YesNo" },
        "markerUpdate":    { "title": "Обновление ИС 1860 «Маркер»", "$ref": "#/$defs/YesNo" },
        "personalData":    { "title": "Обработка персональных / специальных данных", "$ref": "#/$defs/YesNo" },
        "needLogging":     { "title": "Необходимость логирования", "$ref": "#/$defs/YesNo" }
      },
      "required": ["kind"]
    },

    "ModelComponent": {
      "type": "object",
      "title": "Модели",
      "properties": {
        "kind":     { "const": "model" },
        "workType": { "title": "Тип работ", "$ref": "#/$defs/ModelWorkType" },
        "pkEnsemble":      { "title": "ПК — Ансамбль / каскад моделей", "$ref": "#/$defs/YesNo" },
        "autoML":          { "title": "Признак АвтоМЛ", "$ref": "#/$defs/YesNo" },
        "externalCode":    { "title": "Предоставление внешнего кода", "$ref": "#/$defs/YesNo" },
        "dataTransform":   { "title": "Требуется преобразование данных", "$ref": "#/$defs/YesNo" },
        "scheduling":      { "title": "Постановка на регламент", "$ref": "#/$defs/YesNo" },
        "newLib":          { "title": "Требуется новая библиотека", "$ref": "#/$defs/YesNo" },
        "newLibBaseModel": { "title": "Требуется новая библиотека / базовая модель", "$ref": "#/$defs/YesNo" },
        "gpuIS1655":       { "title": "Проект использует ГПУ ИС 1655", "$ref": "#/$defs/YesNo" },
        "needSysFunc":     { "title": "Требуется функционал системы", "$ref": "#/$defs/YesNo" }
      },
      "required": ["kind"]
    },

    "Block3": {
      "type": "object",
      "title": "Блок 3. Платформенные и поддерживающие стримы",
      "properties": {
        "status": { "$ref": "#/$defs/SectionStatus" },
        "streams": {
          "type": "array",
          "title": "Стримы",
          "items": {
            "oneOf": [
              { "$ref": "#/$defs/ModelControlStream" },
              { "$ref": "#/$defs/DataSourcesStream" }
            ]
          }
        }
      }
    },

    "ModelControlStream": {
      "type": "object",
      "title": "Стрим «Контроль моделей»",
      "properties": {
        "kind": { "const": "modelControl" },
        "pkMultiContour":    { "title": "ПК — Применение в разных контурах (region / inno.local)", "$ref": "#/$defs/YesNo" },
        "pkUserScenarios":   { "title": "ПК — Разные пользовательские сценарии", "$ref": "#/$defs/YesNo" },
        "pkUserScenariosN":  { "title": "Кол-во сценариев (n)", "type": "integer", "minimum": 0 },
        "pkLogStructure":    { "title": "ПК — Определённость структуры логов", "$ref": "#/$defs/YesNo" },
        "pkServiceControl":  { "title": "ПК — Контроль работы сервиса вместо моделей", "$ref": "#/$defs/YesNo" },
        "works": { "$ref": "#/$defs/Works" }
      },
      "required": ["kind"]
    },

    "DataSourcesStream": {
      "type": "object",
      "title": "Стрим «Источники данных»",
      "properties": {
        "kind": { "const": "dataSources" },
        "domainComplexity": { "title": "Сложность предметной области",
          "type": "string", "enum": ["low", "medium", "high", "unknown", "scale"] },
        "requestVolume":    { "title": "Объём запроса по сущностям",
          "type": "string", "enum": ["point", "small", "medium", "large", "scale"] },
        "cloudOneTimeLoad": { "title": "Разовая загрузка командой «Облако» в ИС хранения Банка", "$ref": "#/$defs/YesNo" },
        "stakeholdersKnown":{ "title": "Известны ли все стейкхолдеры", "$ref": "#/$defs/YesNo" },
        "tisChangeVolume":  { "title": "Объём изменения, вносимого в ТИС",
          "type": "string", "enum": ["point", "small", "medium", "large", "scale"] },
        "studyRegulations": { "title": "Изучение регламентов Банка по редактируемому разделу", "$ref": "#/$defs/YesNo" },
        "reapproveArtifact":{ "title": "Пересогласование артефакта", "$ref": "#/$defs/YesNo" },
        "works": { "$ref": "#/$defs/Works" }
      },
      "required": ["kind"]
    }
  }
}
```

---

## 2. uiSchema (RJSF)

```json
{
  "status": { "ui:widget": "hidden" },
  "block1": {
    "status": { "ui:widget": "radio", "ui:options": { "inline": true } },
    "commonParams": {
      "ui:order": ["executorStream", "customerDept", "taskComplexity",
                   "needIS", "needService", "needMVP", "needProd",
                   "needIntegrEval", "generalUncertainty"],
      "taskComplexity": { "ui:widget": "select" },
      "generalUncertainty": {
        "ui:field": "ModalField",
        "ui:options": { "modal": true, "title": "Общая неопределённость" }
      }
    },
    "modelService": {
      "ui:field": "ModalField",
      "ui:options": { "modal": true, "title": "Параметры модельного сервиса" },
      "controlKind":   { "ui:widget": "checkboxes" },
      "deployChannels":{ "ui:widget": "checkboxes" }
    }
  },
  "block2": {
    "components": {
      "ui:options": { "addable": true, "orderable": true },
      "items": { "ui:field": "ComponentModalField" }
    },
    "works": {
      "typical":    { "ui:field": "WorksTable", "ui:options": { "readonly": true } },
      "nonTypical": { "ui:field": "WorksTable", "ui:options": { "editable": true } }
    }
  },
  "block3": {
    "ui:help": "Создаётся автоматически по перечню типовых работ модельного стрима.",
    "streams": { "items": { "ui:field": "StreamModalField" } }
  }
}
```

`ModalField` / `ComponentModalField` / `StreamModalField` — кастомные RJSF-поля,
рендерящие вложенную схему в модалке. `WorksTable` — таблица строк работ с
inline-редактированием и колонкой `total` (readOnly) + toggle `includeInCalc`.

---

## 3. JSONLogic — слой правил

JSONLogic покрывает условную логику (видимость, выбор коэффициента, флаги
генерации). Числовая арифметика (`×1.5^n`, произведения) — на mathjs;
JSONLogic возвращает либо скаляр-коэффициент, либо выражение для mathjs.

### 3.1. Справочник опций → коэффициенты

Скалярные коэффициенты (одно значение на опцию):

```json
{
  "source.rdsClarity": { "high": 0.75, "medium": 1.25, "low": 1.5, "unknown": 1.0 },
  "source.sourcesDefined": { "defined": 0.75, "search": 1.25 },
  "source.ndaNeeded": { "yes": 1.25, "no": 0, "unknown": 1.0 },
  "source.legalPilot": { "yes": 0, "no": 1.25, "unknown": 1.0 },
  "source.competitiveProc": { "not_provided": 0, "unknown": 1.0, "provided": 1.25 },
  "source.newOrRework": { "new": 1.1, "rework": 0.75, "unknown": 1.0 },

  "dataProcess.deliveryMode": { "direct": 0.8, "indirect": 1.2, "unknown": 1.0 },
  "dataProcess.legalExchange": { "yes": 0, "no": 1.25, "unknown": 1.0 },
  "dataProcess.implComplexity": { "low": 1.0, "medium": 1.0, "high": 1.5, "unknown": 1.25 },

  "dataMart.integrReadiness": { "high": 0.5, "is_rework": 0.8, "complex": 1.2 },
  "dataMart.implComplexity": { "low": 1.0, "medium": 1.0, "high": 1.5, "unknown": 1.25 },

  "dataSources.domainComplexity": { "low": 0.75, "medium": 1.0, "high": 1.5, "unknown": 1.0, "scale": 1.75 },
  "dataSources.requestVolume": { "point": 0.75, "small": 0.75, "medium": 1.0, "large": 1.25, "scale": 1.75 },
  "dataSources.tisChangeVolume": { "point": 0.75, "small": 0.75, "medium": 1.0, "large": 1.25, "scale": 1.5 }
}
```

### 3.2. Векторные коэффициенты (тройка КД / ТМ / прочее)

ПК у модельного сервиса задаются как `[КД, ТМ, прочее]`. Финальный коэффициент
выбирается по виду контроля, выбранному пользователем (`controlKind`).

```json
{
  "vectorCoeffs": {
    "modelService.pkRecalibration": { "yes": { "OK": 0.25, "AK": 0.25, "KMZ": 0.25, "_default": 1 } },
    "modelService.pkOtherChannel":  { "yes": { "KD": 1, "TM": 0.75, "_default": 1 } },
    "modelService.pkRework":        { "yes": { "KD": 1, "TM": 0.75, "_default": 0.75 } },
    "modelService.pkRegulatory":    { "yes": { "_default": 1.5 } },
    "modelService.pkNewType":       { "yes": { "_default": 2.0 } },
    "model.pkEnsemble":             { "yes": { "KD": 2.3, "TM": 2.3, "_default": 0 } }
  }
}
```

Правило выбора вектора (для одного вида контроля `ctrl`):

```json
{
  "if": [
    { "==": [ { "var": "modelService.pkRework" }, "yes" ] },
    { "if": [
        { "==": [ { "var": "ctrl" }, "KD" ] }, 1,
        { "==": [ { "var": "ctrl" }, "TM" ] }, 0.75,
        0.75
    ] },
    1
  ]
}
```

### 3.3. Коэффициент от количества (риск новых требований ×1.0…×2.4)

`newReqRiskCount` мапится в коэффициент ступенчато (clamp 1.0…2.4). Формулу
лучше отдать mathjs, JSONLogic — только условие активации:

```json
{
  "if": [
    { "==": [ { "var": "source.newReqRisk" }, "yes" ] },
    { "min": [ 2.4, { "+": [ 1.0, { "*": [ 0.2, { "var": "source.newReqRiskCount" } ] } ] } ] },
    1.0
  ]
}
```

> mathjs-эквивалент: `min(2.4, 1.0 + 0.2 * newReqRiskCount)`.
> Степенной ПК сценариев: `pow(1.5, pkUserScenariosN)` (или `1.05` для линейного варианта).

### 3.4. Правила генерации типовых работ

Каждое правило: `when` (JSONLogic-предикат) → создаёт строку работы с привязкой
к справочнику-стриму (`stream`) и шаблоном оценки/коэффициента.

```json
{
  "typicalWorkRules": [
    {
      "id": "src.integration.internal",
      "when": { "and": [
        { "==": [ { "var": "source.sourceType" }, "internal" ] },
        { "==": [ { "var": "source.intermediateIntegr" }, "yes" ] }
      ] },
      "stream": "dataSources",
      "work": { "name": "Интеграция с промежуточными системами", "workType": "dev", "baseEstimate": 5 },
      "coeffRefs": ["source.newReqRisk"]
    },
    {
      "id": "src.external.nda",
      "when": { "and": [
        { "==": [ { "var": "source.sourceType" }, "external" ] },
        { "==": [ { "var": "source.ndaNeeded" }, "yes" ] }
      ] },
      "stream": "dataSources",
      "work": { "name": "Заключение NDA с источником", "workType": "setup", "baseEstimate": 3 },
      "coeffRefs": ["source.ndaNeeded"]
    },
    {
      "id": "mart.qualityControl",
      "when": { "==": [ { "var": "dataMart.qualityControl" }, "yes" ] },
      "stream": "dataSources",
      "work": { "name": "Контроль качества витрины", "workType": "dev", "baseEstimate": 2 },
      "qty": { "var": "dataMart.qualityControlCount" }
    },
    {
      "id": "model.regulatory.control",
      "when": { "==": [ { "var": "modelService.pkRegulatory" }, "yes" ] },
      "stream": "modelControl",
      "work": { "name": "Контроль регуляторной модели", "workType": "dev", "baseEstimate": 8 },
      "coeffRefs": ["modelService.pkRegulatory"]
    },
    {
      "id": "modelctrl.logs",
      "when": { "==": [ { "var": "modelControl.pkLogStructure" }, "yes" ] },
      "stream": "modelControl",
      "work": { "name": "Анализ структуры логов", "workType": "setup", "baseEstimate": 4 },
      "coeff": 1.25
    }
  ]
}
```

> `stream` определяется по `sourceDictionary` параметра-триггера
> (`[Контроль моделей]` → `modelControl`, `[Источники данных]`/`[ИД — *]` → `dataSources`).
> Это и есть связь **параметр → стрим Блока 3**: триггер из Блока 1/2 порождает
> типовую работу в соответствующем стриме.

### 3.5. Расчёт итога строки

JSONLogic — гейт `includeInCalc`, mathjs — произведение:

```json
{
  "if": [ { "var": "includeInCalc" },
          { "*": [ { "var": "baseEstimate" }, { "var": "coefficient" } ] },
          0 ] }
}
```

> При нескольких коэффициентах: `total = includeInCalc ? baseEstimate * prod(coeffs) : 0`
> — собирается на mathjs из массива `coeffs`, полученного применением правил 3.1–3.3.

### 3.6. Статусы (валидация перехода)

```json
{
  "section.canMarkFilled": {
    "and": [
      { "!!": { "var": "requiredParamsComplete" } },
      { ">=": [ { "var": "worksCount" }, 1 ] }
    ]
  },
  "anketa.canMarkDone": {
    "all": [
      { "var": "sectionStatuses" },
      { "==": [ { "var": "" }, "filled" ] }
    ]
  }
}
```

Глобальный `done` доступен только когда все локальные разделы в `filled`
(глобальный статус — гейт-агрегат по локальным).

---

## 4. Pipeline исполнения (рекомендованный порядок)

```
1. RJSF рендерит форму по schema + uiSchema
2. onChange → собираем formData
3. typicalWorkRules: для каждого правила eval(when, formData)
     → если true, создаём work, привязываем stream по sourceDictionary
4. для каждой work: собираем coeffs (3.1 скаляр + 3.2 вектор по controlKind + 3.3 от кол-ва)
5. mathjs: total = includeInCalc ? baseEstimate * prod(coeffs) : 0
6. агрегируем подитоги по этапам (Блок 2) и по стримам (Блок 3)
7. статусы: section.canMarkFilled, затем anketa.canMarkDone
```

Раздельные движки осознанно: **JSONLogic** — предикаты и выбор значения из
справочника (сериализуемо, хранится в БД как конфиг калькулятора);
**mathjs** — числовые формулы (степени, произведения, clamp), которые в чистом
JSONLogic выражать громоздко.