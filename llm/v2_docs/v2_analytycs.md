# Smart-Анкета v2 — предварительный анализ, рефакторинг, декомпозиция

> Документ подготовлен перед стартом работ по v2 смарт-анкеты. Цель — зафиксировать текущее состояние бэка/фронта, проблемы текущего json-schema подхода, спланировать рефакторинг и архитектуру, которая выдержит: новых заказчиков/стримы, динамические справочники, админку-конструктор, версионирование схем и параллельное сосуществование v1/v2.
>
> Источники: код `apps/nestjs-server/src`, `apps/react-client/src`, обсуждение `llm/v2_docs/Обсуждение обновления смарт-анкеты (2026-04-21).html`, транскрипт `speech_to_text.html`, параметры `Параметры с UX_combined.csv`, макеты в `llm/Анкета.*.png`.

---

## 0. TL;DR

- Схема анкеты **не в одном месте**: кусочно живёт в БД (`questionnaire_item`, `coefficient`, `stream_average`, `artefact_values`), в статическом `calc_schema.json` на фронте, в `calc_uiSchema.ts`, в `coefficientMappings.ts`, и в «хардкоде» калькуляций (`calculations/*.ts`). Изменить одно поле = потрогать 4–6 мест.
- Бэк по факту **хранилище документов** + несколько сервисов-справочников. Калькуляция и правила валидации завязанных полей живут на фронте. Это совпадает с договорённостью («бэк менять по минимуму», Кузьминов), но для v2 это станет тормозом уже во 2-й итерации (реестр инициатив).
- **RJSF v6.5.1** подходящий инструмент под формы, но текущая реализация использует его ≈ на 30%: `UniversalDependencyWidget` заменяет нативный `dependencies/if-then-else`, многие кастомные виджеты дублируют встроенные, таблица коэффициентов рассчитывается вне RJSF.
- Сквозная типизация **разорвана**: Orval-генерируемые DTO + рукописный `calc_schema.json` + рукописные `IAssessmentFormData` + рукописные `common/api/types/*`. Поле `calculationResult` отправляется на create, но в DTO его нет.
- Админки фактически нет (`AdminPage.tsx` = заглушка). Пермишн `ANKETA_ADMIN_PANEL` существует, но за ним пусто.
- Версионирование: у **записи** анкеты (`calculation`) есть `version/seriesId/parentCalcId`, у **схемы** анкеты его нет (строковый литерал `"1.0.0"`). Для сосуществования v1/v2 этого недостаточно.

**Стратегия рефакторинга v2 (короткая):**

1. Вынести определение схемы анкеты в БД как versioned `anketa_template`: `schema_version` + `json_schema` + `ui_schema` + `calc_ruleset`.
2. Сделать бэк источником правды: отдавать полный пакет (schema + uiSchema + справочники + правила) версионно; генерировать TS-типы для фронта из OpenAPI + JSON Schema (`json-schema-to-ts` / `ts-json-schema-generator`).
3. Не ломать v1: старые записи продолжают открываться v1-рендером (feature flag по `schema_version`), v2 рисуется параллельно.
4. Поднять фронт до data-driven формы без `UniversalDependencyWidget` — перейти на нативные `dependencies`/`allOf:if/then/else`; остальные виджеты оставить минимально тонкими.
5. Построить админку-конструктор поверх модели справочников и `anketa_template` (drag-n-drop секции / поля / коэффициенты / условия).

---

## 1. Карта текущей реализации

### 1.1 Бэкенд (`apps/nestjs-server/src`)

**Сущности / таблицы:**

| Таблица | Роль | Проблемы |
|---|---|---|
| `questionnaire_item` | Описание поля (code, fieldType, options jsonb, isRequired, order) | Смешивает семантику (что поле значит) и представление (options). Нет связи со стримом/секцией/шаблоном. |
| `coefficient` | Коэффициенты (code, baseValue, conditions jsonb, formula) | Формулы вычисляются через `eval()` (`coefficient.service.ts`) — risk. Нет связи с `questionnaire_item` как FK. |
| `stream_average` | Средние значения этапов по эпикам | Именованные как `stage01`…; к стримам/шаблонам не привязаны. |
| `artefact_values` | Легаси-справочник (`artefact_id=6,7` → department/streamExecutor) | Магические константы `6` и `7` в `reference-data.service.ts`. Нет нормализации справочников. |
| `calculation` | Сохранённая анкета: `questionnaireData jsonb`, `finalCoefficient`, `version/seriesId/parentCalcId/status/readableId` | Хранит «документ» без ссылки на **версию схемы** (!). `department` — jsonb-массив строк вместо нормализованной связи. `finalCoefficient` присылается с фронта, бек не пересчитывает. |

**Эндпоинты** (`apps/nestjs-server/src/modules/*/controllers/*`):

- `GET /questionnaire` — агрегированный dump (version в строке `"1.0.0"`, dictionaries, streamAverages, referenceData).
- `GET /questionnaire/coefficients`, `GET /questionnaire/coefficients/:code?value=...`
- `POST /calculation`, `PUT /calculation/:id`, `GET /calculation/all[/list]`, `GET /calculation/:id`
- `POST /calculation/export/excel`
- `POST /calculation/:id/new-version`, `POST /calculation/:id/clone`

**Валидация:** `class-validator` + рукописный `JsonValidationPipe` (только проверка JSON-парсинга). **AJV/JSON Schema валидации на бэке нет.**

**Генерация клиентских типов:** Swagger (`/api-json`) + Orval в `apps/react-client`. Но: часть клиентских типов всё равно рукописных в `common/api/types/*`, а `CreateCalculationDto.calculationResult` **отсутствует**, хотя фронт его отправляет.

**Технический долг бэка (высокий приоритет):**

1. Нет **единого template-документа**: текущие `questionnaire_item` + `coefficient` + `stream_average` + `artefact_values` — это **имплицитная схема**, которую клиент должен уметь собирать. Версионирования нет.
2. `CurrentUser` декоратор работает **только** для `GqlExecutionContext` (`shared/decorators/user.decorator.ts`) — при REST-запросах даст undefined; проходит «случайно» из-за GodModeGuard / Keycloak.
3. `relations: ["coefficients"]` в `QuestionnaireService` — такого relation нет в `QuestionnaireItemEntity`.
4. `eval()` для `coefficient.conditions.formula` — прямой риск RCE, если админка позволит редактировать коэффициенты.
5. `SETUP_COMPLEXITY_VALUES` в DTO (длинные строки «N Сложность: …») vs seed-миграция с числами 1–5 — **расхождение контракта**. Нужна ревизия.
6. `CreateCalculationDto.ValidateIf` в `create-calculation.dto.ts` — опечатки: `AlgorithmComplexity` (должно быть `algorithmComplexity`), `algorrithmType`, `hasValidAlgorithm` используется как массив. Валидация фактически не работает.
7. В `CalculationService.create` брошенный `'unique(no dublicate allowed)'` не совпадает с `catch` на `'unique (no duplicates allowed)'`.
8. `AgGridFilterService` зарегистрирован в модуле, но **не используется** (инжектится `InMemoryFilterService`). Мёртвый код.
9. `compareVersions` в `CalculationService` — мёртвый метод.
10. `@nestjs/graphql` в декораторе — лишняя зависимость для REST.
11. Нет админ-API для правки `questionnaire_item`/`coefficient`/`artefact_values`. Пермишн `ANKETA_ADMIN_PANEL` есть, контроллеров нет.

### 1.2 Фронтенд (`apps/react-client/src`)

**Роутинг** (`routing/routes.ts`): `/`, `/calculation/create`, `/calculation/preview/:id`, `/calculation/new_version/:id`, `/calculation/clone/:id`, `/calculation/compare` (disabled), `/admin` (disabled), `/playground` (disabled devOnly).

**Ключевые узлы:**

- `schemas/calculation/calc_schema.json` — draft-07, **inline без `$defs`**. Top-level поля: `modelDeveloped`, `modelsCount`, `setupComplexity`, `initiativeTimeline`, `initiativeCost`, `uncertaintyAdjustment`, `generalUncertainty` (array), `readyPromReports`, `assessedInitiativesCount`, `dataSourcesCount`, `pilotModelRequired`, `pilotSupportRequired`, `algorithmComplexity` (array), `autoMlRequired`, `productionAdditionalReports` (огромный enum до `"99"`), `productionDeploymentChannels` (string array из 11 каналов).  
  Две `allOf`-ветки: (а) `readyPromReports === "Нет"` ⇒ `required: ["dataSourcesCount"]`; (б) `modelDeveloped === "Нет"` ⇒ ограничить enum `readyPromReports`.
- `schemas/calculation/calc_uiSchema.ts` (228 строк) — конфиг виджетов, подсказки, `valToTitle`, условия через `UniversalDependencyWidget`. Ссылается на поле `description`, **которого нет в JSON Schema**.
- `schemas/calculation/calc_uiSchemaWithCoefficients.ts` — мутирует title’ы схемы: дописывает `(коэфф: x.xx)` в `title` пропертей, прокидывает `coefficientValue`/`coefficientName` в `ui:options`. Работает с копией, но меняет и structural `title` → делает его зависимым от состояния.
- `features/anketaCRUD/organisms/ProjectAssessmentForm.tsx` — главная форма. `withTheme(MuiTheme)`. Синк с `assessmentCalculationsStore`, сброс `readyPromReports` по правилу `modelDeveloped === "Да"` на уровне `onChange` (бизнес-логика вне схемы).
- `features/anketaCRUD/organisms/ProjectAssessmentFormPreview.tsx` — дублирующая форма: `Form` из `@rjsf/mui` напрямую, другой набор виджетов (`ArrayCustomCardListsWidget`).
- `features/anketaCRUD/organisms/BasicInfoForm.tsx` — **отдельная inline-схема**, не из `schemas/*`. Её enum-ы (`department`, `streamExecutor`) подтягиваются из `GET /questionnaire`.
- `common/forms/widgets/*` (1 896 строк суммарно):
  - `TextFieldCustomWidget.tsx` — 581 строк, «швейцарский нож» (текст/селект/multiline/маски).
  - `GeneralUncertaintyWidget.tsx` — 307 строк (расчёт общей неопределённости внутри поля).
  - `UniversalDependencyWidget.tsx` — 274 строки, **парсит строки-условия** (`"modelDeveloped === 'Да'"`) через свою логику. Это мини-язык правил прямо в виджете.
  - `AlgorithmComplexityWidget.tsx`, `ArrayCustomCardListsWidget.tsx`, `NumberInputWidget.tsx`, `RJSFObjectFieldTemplate.tsx`, `ListWidget.tsx` (мёртвый).
- `features/anketaCRUD/calculations/*`:
  - `coefficients.ts` (227) — хардкод коэффициентов по enum-строкам.
  - `generalUncertaintyCoefficient.ts` (297) — матрица риск×вероятность×влияние.
  - `stages.ts` (209) — `@ts-nocheck`, хардкод `stage01..09` с формулами стоимости этапов.
- `features/anketaCRUD/stores/*` — две Zustand-стори: `useAnketaCRUDFormsStore` (UI state 4 форм) + `assessmentCalculationsStore` (live-расчёт коэффициентов/этапов).
- `features/anketaCRUD/constants/coefficientMappings.ts` — маппинг «внутренний код коэф. → отображаемое имя/поле», **дублируется** в `CalculationResultTable.tsx` и `CalculationResultTablePreview.tsx`.
- `features/admin/AdminPage.tsx` — буквально 3 строки, `<div>AdminPage</div>`.

**Версии RJSF:** `@rjsf/core|mui|utils|validator-ajv8` = **6.5.1** (актуальный major). Фичи v6, которыми мы **не пользуемся**: новая система templates (`ArrayFieldItemTemplate/TitleTemplate/DescriptionTemplate`), `experimental_defaultFormStateBehavior`, улучшенная работа с `dependencies` и `allOf:if-then-else`, generic `Registry`.

**В `package.json` уже есть и простаивает**: `react-hook-form` + `@hookform/resolvers` + `zod` + `jsonpath-plus`. Первые три — потенциальная альтернатива RJSF (если решим отказаться). `jsonpath-plus` можно использовать как общий механизм правил/зависимостей.

---

## 2. Проблемы текущего json-schema подхода

### 2.1 Нарушение «single source of truth»

Схема одной анкеты **по факту размазана** по следующим артефактам (порядок = порядок вычисления):

```
calc_schema.json           ← форма полей + базовые required/enum
calc_uiSchema.ts           ← виджеты, подсказки, условия (как строки JS)
calc_uiSchemaWithCoefficients.ts ← модифицирует title схемы на ходу
coefficientMappings.ts     ← внутренний код коэф. ↔ поле формы
coefficients.ts            ← «если поле = X, то коэф = Y»
stages.ts                  ← как коэф. складываются в оценку этапа
BasicInfoForm.tsx          ← отдельная inline-схема шапки
GET /questionnaire         ← dictionaries (options, labels, risk-probability)
coefficient table          ← baseValue + conditions (evaled formula)
artefact_values            ← picklists для department/streamExecutor
```

**Последствия:**

- Чтобы добавить «Стрим Контроль моделей» с параметром «Класс модели» (Топ-5 из CSV) нужно: (1) добавить поле в JSON Schema; (2) добавить uiSchema entry; (3) добавить options-row в questionnaire_item; (4) прописать coefficient row; (5) прописать маппинг в `coefficientMappings`; (6) написать ветку в `stages.ts`; (7) обновить типы в DTO, регенерировать Orval; (8) добавить строку в таблицу результата; (9) перепрошить переводы/тултипы. 9 мест = 9 источников бага.
- JSON Schema в `calc_schema.json` **не используется** как контракт валидации ни на беке (DTO другой), ни даже корректно на фронте (`description` в uiSchema не имеет свойства в schema).
- `calc_uiSchemaWithCoefficients.ts` мутирует **title** JSON Schema — это семантика (описание данных) смешанная с состоянием (текущее значение коэф.). В результате schema не может быть «версионно зафиксирована».

### 2.2 Дублирования

| # | Что дублируется | Где |
|---|---|---|
| 1 | `coefficientDisplayNames` / `coefficientToFormFieldMapping` | `coefficientMappings.ts`, `CalculationResultTable.tsx`, `CalculationResultTablePreview.tsx` |
| 2 | `stageDisplayNames` | `CalculationResultTable.tsx`, `CalculationResultTablePreview.tsx` |
| 3 | Две формы под одно и то же (edit/preview) — `ProjectAssessmentForm` vs `ProjectAssessmentFormPreview` с разным набором виджетов и отдельной логикой `createSchemaWithCoefficients(..., isPreview)` |
| 4 | `BasicInfoForm`-schema inline + часть её полей в `CalculationBaseDto` |
| 5 | Enum строк complexity: `SETUP_COMPLEXITY_VALUES` в DTO vs числа в миграции vs строки в `calc_schema.json` |
| 6 | Типы анкеты: `IAssessmentFormData` (`FormData.d.ts`) vs `CalculationQuestionnaireDataDto` (Orval) vs `AnketaForm` (unused sketch) |
| 7 | Валидация ответов формы: RJSF AJV + class-validator на бэке (с опечатками) — без общего контракта |

### 2.3 Мёртвая / подозрительная логика

- `ListWidget.tsx` — нигде не импортируется.
- `AnketaForm` в `features/anketaCRUD/types/index.ts` — используется как «дизайнерский набросок», не компилируется в runtime-путь.
- `_uiSchema` / `_templates` в `ProjectAssessmentFormPreview` — закомментированы / не пробрасываются.
- `omit(..., ["properties.description"])` в preview — бесполезно, т.к. `description` и так нет в schema.
- `AgGridFilterService` на бэке — зарегистрирован, не инжектится.
- `CalculationService.compareVersions` — приватный, не вызывается.
- `MenuContent.tsx`: `item.rootPath.replace("/", "")` теряет вложенные пути (`/calculation/create` → битый anchor). Фактический side-effect скрыт `disabled: true`.
- `dataSourcesCount` enum содержит `"0"`, но `calculateDataSourceCoefficient` подписан комментом «1..10».
- `description` field живёт только в `calc_uiSchema` без базы в JSON Schema.
- `productionAdditionalReports` — enum из сотен строк, вместо `type: integer` + `pattern` или отдельного справочника.

### 2.4 Несоответствия контракта

- Фронт шлёт в `POST /calculation` поле `calculationResult` (массив стадий из `CalculationResultTable`), **но** в Orval-сгенерированном `CreateCalculationDto` этого свойства нет. Бэк принимает, потому что nest `ValidationPipe` по умолчанию `whitelist: true` не настроен строго или DTO описан с `@ApiProperty()` частично.
- `finalCoefficient` передаётся клиентом и **хранится** без пересчёта. Неверная оценка, присланная клиентом, ломает данные реестра навсегда.
- `GET /questionnaire.version = "1.0.0"` — строковая константа, не синхронизована с `calculation.schemaVersion` (которого нет в таблице).
- Версии у **записи** анкеты есть (`version`, `seriesId`, `status`, `parentCalcId`), но **нет FK на версию схемы**, по которой запись была создана. При введении v2 откроем v1-запись и отрендерим новой формой → ошибки.

### 2.5 Расширяемость под v2 (новые заказчики / стримы)

По обсуждению (раздел 21:30+) и спеке из CSV `Параметры с UX_combined.csv`:
- Должны появиться **стримы**: ПиРМ (модельный), Источники данных (хранение/обработка), Контроль моделей, ML-платформа.
- На каждый стрим — **свой набор архитектурных компонентов** (Система-источник, Процесс обработки, Объект/Набор данных, Модель, ИС) и **свой список параметров** со своими типами UX (из листа «Типы»: stepper, segmented, radio, slider, checkbox-коэфф, таблица-матрица рисков, составные accordion-блоки).
- **Типовые задачи** триггерятся архитектурным компонентом + набором параметров.
- Нетиповые задачи — отдельный тип анкеты (итерация 3+), но уже сейчас структура предполагает их вложенность.

Текущая модель не позволяет это выразить декларативно. `questionnaire_item` без принадлежности к стриму/компоненту, `coefficient` плоский, `stages.ts` — жёсткий.

---

## 3. Сквозная типизация: 1 источник правды

### 3.1 Текущая схема (как есть)

```
[ Backend TypeORM entity ]  ──┐
                              ├── Swagger (@ApiProperty)  ──► openapi.json ──► Orval ──► React-client types
[ class-validator DTO ]   ────┘                                                         │
[ calc_schema.json (static) ] ─────────► RJSF validator-ajv8 ───────────────────────────┤
[ IAssessmentFormData hand ]  ──────────────────────────────────────────────────────────┤
[ common/api/types hand ]   ────────────────────────────────────────────────────────────┘
```

### 3.2 Целевая схема v2

```
┌─────────────────────────────────────────────────────────┐
│  Source of truth: packages/anketa-contracts (TS)        │
│  - zod-схемы доменных сущностей (Anketa, Template,      │
│    Stream, Param, Coefficient, Rule, CalcResult)        │
│  - JSON Schema генерируется из zod (zod-to-json-schema) │
│  - TS-типы генерируются из zod                          │
└─────────────────────────────────────────────────────────┘
       │                          │
       ▼                          ▼
┌────────────────┐       ┌───────────────────┐
│ Nest backend   │       │ React client      │
│ - class-       │       │ - RJSF получает   │
│   validator    │       │   готовый JSON    │
│   ИЛИ zod      │       │   Schema от API   │
│   pipes        │       │ - Zustand store   │
│ - AJV          │       │ - типы @contracts │
│   валидация    │       │   из workspace    │
│   payload по   │       │ - Orval (только   │
│   json-schema  │       │   для REST-layer) │
└────────────────┘       └───────────────────┘
```

**Ключевые принципы:**

1. **Доменные типы пишутся один раз** (zod-схема в `packages/anketa-contracts`). Из них автоматически: (а) JSON Schema для RJSF; (б) TS-типы для фронта; (в) pipes для валидации на бэке; (г) OpenAPI дополнения.
2. Фронт **не держит локальных типов формы**. `IAssessmentFormData` и `AnketaForm` удаляются.
3. `calc_schema.json` перестаёт существовать как файл — вместо него `GET /anketa-templates/:id` отдаёт `{ schema, uiSchema, rules, coefficients, stages, version }`.
4. Бэк **всегда** валидирует `questionnaireData` по **той версии схемы**, которая записана в `calculation.schemaVersion`.
5. Миграции записей между версиями = отдельный опциональный сервис (в v1 — не делаем, по решению из обсуждения).

**Технический стек для перехода:**

- `zod` уже в зависимостях.
- `zod-to-json-schema` — добавить (даёт draft-07 / 2020-12).
- Альтернатива (если хотим писать прямо в JSON Schema): `json-schema-to-ts` / `ts-json-schema-generator` — генерируют TS-типы из JSON Schema. Выбирается один подход.
- Удалить рукописные `common/api/types/*` — заменить на Orval + контракт-пакет.

---

## 4. Фронт: причёсывание RJSF и компонентов калькулятора

### 4.1 Что оставить

- `@rjsf/core` + `@rjsf/mui` + `@rjsf/validator-ajv8` v6.5.1 — остаются. Альтернативы рассмотрены в §6.
- `TextFieldCustomWidget` — оставить как единый виджет ввода, но **разбить**:
  - `TextWidget` (чистый input)
  - `SelectWidget` (MUI select с поддержкой enumNames)
  - `MultilineTextWidget`
  - `MaskedTextWidget` (RFD и похожие)

### 4.2 Что переписать

| Кандидат | Проблема | Что делать |
|---|---|---|
| `UniversalDependencyWidget` | Строки-условия (`"modelDeveloped === 'Да'"`) — свой мини-DSL | Заменить на нативный JSON Schema `dependencies` / `allOf:if-then-else`. RJSF v6 их поддерживает |
| `GeneralUncertaintyWidget` | Монолит в 307 строк внутри виджета | Превратить в custom Field (не widget), который рендерит вложенный RJSF `<Form>` для поддерживаемой под-схемы (как в макете «Рассчёт общей неопределённости») |
| `AlgorithmComplexityWidget` | Дублирует `checkboxes` с бейджами коэф. | Обычный RJSF `CheckboxesWidget` + `ArrayFieldItemTemplate`, бейджи берутся из `ui:options.coefficient` |
| `ArrayCustomCardListsWidget` | Два кодопути (preview vs edit) | Единый `ArrayFieldItemTemplate` с read-only режимом через `formContext` |
| `calc_uiSchemaWithCoefficients.ts` | Мутирует `title` схемы на ходу | Убрать. Коэф. отображать рядом (suffix-слот в `TitleFieldTemplate`) |
| `BasicInfoForm` inline-schema | Отдельная жизнь | Унести в контракт-пакет как `basicInfoSchema` (или как первую секцию основной анкеты) |

### 4.3 Что удалить (мёртвое)

- `ListWidget.tsx`
- `AnketaForm` из `features/anketaCRUD/types/index.ts`
- Закомментированный `_uiSchema`/`_templates` в preview
- `omit(..., ["properties.description"])` в preview
- Дубли `stageDisplayNames` / `coefficientDisplayNames` — в одну константу, потом в API.

### 4.4 Архитектура «секций» под v2

По макетам (`Анкета. Заполнено.png`, «Платформенный стрим») форма — это **N раскрывающихся секций** (`Общая информация`, `Детальная информация`, `ML-платформа`, `Контроль моделей`, `Хранение и обработка данных` …), у каждой секции свой набор полей. Это 1-в-1 ложится на JSON Schema через верхнеуровневый `object` с `properties` = секции. UI: использовать RJSF `ObjectFieldTemplate` с Accordion-рендером.

Ключевой момент: **секции неизвестны на этапе билда** — их конфигурирует админ. Значит секции не должны быть хардкодом `ProjectAssessmentForm.tsx`. Вместо:

```
ProjectAssessmentForm
  └─ RJSFForm(schema, uiSchema)
        └─ ObjectFieldTemplate (рендерит секции как Accordion'ы по ui:order)
             └─ Для секций с ui:widget="stream-card" — StreamSectionTemplate
                  (рендерит таблицы архитектурных компонентов, типовых задач, etc.)
```

Таким образом **ни одного упоминания конкретного стрима в коде**. Добавить «Контроль моделей» = добавить секцию в template-документе (через админку).

---

## 5. Бэк: версионирование схем и справочники

### 5.1 Новая модель данных (предлагается для v2)

```
anketa_template
  id uuid
  code text        -- 'v1_legacy', 'v2_standard', 'v2_customer_x'
  version text     -- semver '2.0.0'
  title text
  customer_id fk   -- nullable (мультизаказчик)
  status enum      -- draft | active | archived
  schema jsonb     -- JSON Schema 2020-12
  ui_schema jsonb  -- RJSF UI Schema
  rules jsonb      -- condition rules (if-then), заменяют UniversalDependencyWidget
  calc_ruleset jsonb   -- опционально: декларативные формулы коэфф. и стадий
  created_at, updated_at, created_by

dictionary
  id uuid
  code text unique  -- 'department', 'streamExecutor', 'channelsOfDeployment' ...
  title text
  scope enum        -- global | per_customer
  customer_id fk nullable

dictionary_item
  id uuid
  dictionary_id fk
  code text
  label text
  value jsonb       -- гибкий (строка/число/объект для сложных)
  order int
  is_active bool
  parent_item_id fk nullable  -- для иерархических справочников

coefficient_rule   -- замена current coefficient + conditions eval
  id uuid
  template_id fk
  code text
  expression jsonb   -- безопасное AST (см. §5.3), НЕ eval
  description text

stage_formula      -- замена stages.ts
  id uuid
  template_id fk
  stage_code text   -- 'stage01'...
  base_value numeric
  expression jsonb  -- AST: product/sum/branch

customer
  id uuid
  code text
  title text

calculation
  ...existing fields...
  template_id fk ──► anketa_template.id
  schema_version text  -- денормализовано для read
```

### 5.2 Эндпоинты v2 (черновик)

Публичные (читает фронт):

- `GET /anketa-templates` — список (фильтр по customer, status)
- `GET /anketa-templates/:id` — `{ schema, uiSchema, rules, calcRuleset, dictionaries: { ... }, version }`
- `GET /anketa-templates/by-code/:code` — последняя active-версия по коду
- `GET /dictionaries/:code` — данные справочника (на фронте кешировать через React Query)
- `POST /calculation` — **validateerase** `questionnaireData` по `template_id.schema`
- прочие `/calculation/*` — как сейчас

Админские:

- `POST/PUT /admin/anketa-templates` (CRUD, черновик → публикация)
- `POST /admin/anketa-templates/:id/publish` (статусы)
- `POST /admin/anketa-templates/:id/clone`
- `POST/PUT/DELETE /admin/dictionaries/:code/items`
- `POST/PUT /admin/coefficient-rules`, `/stage-formulas`
- `POST /admin/anketa-templates/:id/validate` — dry-run валидации схемы (AJV meta) + тестовый прогон calc_ruleset

### 5.3 Безопасные правила вместо `eval()`

Сейчас: `new Function("value", formula)()` — RCE. В v2 — **маленький AST-интерпретатор**:

```jsonc
// пример выражения для coefficient_rule:
{
  "op": "switch",
  "input": { "$path": "setupComplexity" },
  "cases": [
    { "when": { "eq": "1 Регулярная..." }, "then": 1.0 },
    { "when": { "eq": "2 Есть модель..." }, "then": 1.25 }
  ],
  "default": 1.0
}
```

Интерпретатор пишется на ~150 строк, поддерживает: `eq/neq/gt/lt/in`, `and/or/not`, `$path`, `product/sum/max/min`, `switch`. Все операции — чистые функции. Ни `eval`, ни `Function`.

Бонус: это же AST покрывает **условное скрытие полей** (UI-rules) — снимает нагрузку с `UniversalDependencyWidget`.

### 5.4 Версионирование

- `anketa_template.version` растёт при каждом `publish`.
- При создании `calculation` проставляется `template_id` (неизменяемо) и `schema_version` (денормализация).
- При открытии записи фронт загружает **ту самую версию** `anketa_template` → рендерит именно той схемой, которой её сохраняли.
- «Новая версия» / «Клон» анкеты (фича) — не трогает `schema_version`, остаётся в текущем шаблоне.
- «Апгрейд всех черновиков на новый шаблон» — отдельная ручка админки (опциональна для итерации 2–3).

### 5.5 v1 ↔ v2 сосуществование

Решение из обсуждения: не мигрируем данные. Реализация:
- В БД остаются старые сущности как `template_id = 'v1_legacy'` (сид).
- Фронт: роутер один и тот же, но `AnketaPage` делает `switch(template.code)` между `<FormV1/>` (текущий код, заморожен) и `<FormV2/>` (новый data-driven). V1-рендер живёт в отдельной ленивой чанке и **не развивается**.
- Новые анкеты создаются только в v2 (feature flag / конфиг заказчика).
- Старые открываются read-only (по решению: ре-валидировать 2026 нет смысла).

---

## 6. RJSF v6.5.1 — остаёмся или мигрируем?

### 6.1 Что дало обновление до v6.5.1 (чего не хватало в v5)

- Полная типизация на TypeScript, generic `FormProps<T>`.
- Переработанная система templates (`ArrayFieldItemTemplate`, `TitleFieldTemplate`, `DescriptionFieldTemplate`) — можно расщепить `TextFieldCustomWidget` без лютого дублирования.
- `experimental_defaultFormStateBehavior` — управляет, как заполнять дефолты и как не терять user input при условном скрытии (сейчас приходится хаком сбрасывать в `onChange`).
- Корректная работа `dependencies` / `allOf` / `if-then-else` для показа/скрытия полей — **именно это** решит проблему `UniversalDependencyWidget`.
- Улучшенная работа с `anyOf`/`oneOf` (важно для будущих «типов стрима»).

### 6.2 Альтернативы (оценка)

| Вариант | Плюсы | Минусы | Вердикт |
|---|---|---|---|
| **RJSF v6.5.1** (current) | Стандарт JSON Schema, огромная экосистема, MUI-тема готова, валидация AJV. У нас уже внедрено. | Условная логика через `dependencies` становится многословной для 30+ правил. Нет встроенного редактора схемы для админки. | **Оставляем как основной движок.** |
| **Formily (@formily/react)** | Реактивные правила (`x-reactions`), встроенный дизайнер форм (Formily Designer), анти-пример для «админка-конструктор». Китайский стек, но MIT. | Своя spec (не JSON Schema), миграция дорогая. Документация в основном на китайском. Сложный runtime. | **Не сейчас.** Рассмотреть, если админка станет узким местом. |
| **JSONForms (eclipsesource)** | Чистый JSON Schema + отдельный UI Schema (аналогично RJSF). Material renderer. | Менее живой комьюнити, под MUI 7 поддержка слабее. | **Нет.** |
| **SurveyJS (form + creator)** | Есть встроенный drag-n-drop **Creator** (идеально для админки). | Коммерческая лицензия на Creator (≈ $2k/dev), формат не JSON Schema, блокирует контракт-first подход. | **Нет.** Админку построим сами. |
| **react-hook-form + zod + dynamic renderer** | Уже в зависимостях. Максимальная гибкость, производительность. | Нужно писать рендер схемы с нуля (≈ то, что делает RJSF). Огромный объём работы. | **Нет для формы анкеты.** Но **да** для простых форм в админке. |
| **TanStack Form** | Новый, типобезопасный, headless. | Не data-driven из JSON Schema — надо генерировать. | **Нет.** |

**Рекомендация:** остаёмся на **RJSF v6.5.1**. Это даёт нам: 1) готовый рендер по JSON Schema, 2) совместимость со схемой, хранимой в БД, 3) способ подменить любой widget/template без переписывания формы.

Для админки-конструктора — пишем **свой UI** (см. §7), не тянем платный SurveyJS Creator. Формы «внутри админки» (правка dictionary_item, coefficient_rule) делаем на **react-hook-form + zod** — они простые, RJSF там избыточен.

### 6.3 Конкретные шаги «чистки» RJSF-слоя

1. Включить native `dependencies`/`if-then-else` в `calc_schema.json`; удалить все правила из `UniversalDependencyWidget`.
2. Заменить `calc_uiSchemaWithCoefficients.ts` на кастомный `TitleFieldTemplate`, который берёт коэф. из `formContext.coefficients` и рисует suffix-chip. Title схемы больше не мутируется.
3. Разбить `TextFieldCustomWidget` на 3–4 чистых виджета.
4. Вынести `GeneralUncertaintyWidget` в отдельную nested-форму (RJSF `<Form>` поддерживает nested через custom Field).
5. Удалить `ProjectAssessmentFormPreview` — сделать один `ProjectAssessmentForm` с пропом `mode: 'edit' | 'preview'`, который прокидывается через `formContext` в widgets/templates.
6. Единый `formContext`: `{ mode, coefficients, stageResults, dictionaries, rules }`.

---

## 7. Админка-конструктор

### 7.1 Требования (из обсуждения + ваш запрос)

- Редактирование параметров схемы анкеты (поля, типы, enum, required).
- Редактирование справочников (department, streamExecutor, channels, классы моделей…).
- Редактирование коэффициентов и формул (без `eval`).
- Редактирование условной логики (скрыть Y если X=…).
- Поддержка нескольких шаблонов/заказчиков: клонирование шаблона, публикация версий.
- Предпросмотр анкеты «как её увидит пользователь».
- Валидация: нельзя опубликовать шаблон с битыми ссылками (unknown dictionary code, циклические зависимости, итп).

### 7.2 Архитектура UI админки

```
/admin
  ├─ /admin/templates                — список шаблонов (v1, v2, per-customer)
  ├─ /admin/templates/:id            — tabbed editor:
  │    ├─ Overview (code, version, status, customer)
  │    ├─ Fields        — drag-n-drop дерево секций + полей (ui:order)
  │    │    └─ на поле: тип (enum из §5.1 types), enum/справочник, required, default, валидация, помощь
  │    ├─ Rules         — таблица if-then правил (visibility / required / value-compute)
  │    ├─ Coefficients  — таблица coefficient_rule с AST-редактором (визуальный)
  │    ├─ Stages        — stage_formula editor
  │    ├─ Preview       — живой рендер RJSF со всеми правилами
  │    └─ Publish       — diff с предыдущей версией + кнопка публикации
  ├─ /admin/dictionaries            — CRUD справочников и items
  ├─ /admin/customers               — мультизаказчик
  └─ /admin/audit                   — журнал изменений шаблонов
```

### 7.3 Подход к «крутому конструктору»

**Не переизобретать** — использовать:

- **@dnd-kit** или **react-dnd** для drag-n-drop секций/полей.
- **Monaco** (уже в deps!) для редактирования JSON/JSONata выражений как fallback.
- **RJSF** на вкладке Preview — тот же рендер, который увидит пользователь.
- Для редактора правил — визуальный rule-builder типа `react-querybuilder` (MIT) под наш AST.

Ключевая мысль: **админка редактирует документы `anketa_template`**. Она знает про поля `schema/uiSchema/rules/calc_ruleset`, но не про их семантику. Значит: **новый заказчик = новый template** без дописывания кода.

---

## 8. Декомпозиция работ (итерации)

> **Модель исполнения:** 1 fullstack разработчик (держит контекст целиком) + сильный AI-агент (Opus 4.7) в режиме pair programming. Рабочий день — до 16 часов эффективной работы. Оценки ниже **в человеко-часах активной работы**, считая, что агент берёт на себя бойлерплейт, тесты, кодемоды, миграции, документацию. Для перевода в календарные дни — делить на 10–14 h/day (разумный устойчивый темп).

### Итерация 0 — РЕФАКТОРИНГ (без фич)

Цель: убрать размазанность схемы, починить контракт FE↔BE, подготовить почву для v2.

**Бэкенд:**
- [ ] R0-BE-1. Создать `packages/anketa-contracts` (zod-схемы + zod-to-json-schema). `~3h`
- [ ] R0-BE-2. Починить опечатки в `create-calculation.dto.ts` (`AlgorithmComplexity`, `algorrithmType`, `hasValidAlgorithm`); выровнять сообщение `unique(no duplicates allowed)` в catch vs throw. `~1h`
- [ ] R0-BE-3. Добавить в `calculation` колонки `template_id`, `schema_version` (nullable, дефолт `'v1_legacy'`, миграция + backfill). `~2h`
- [ ] R0-BE-4. Выкинуть `eval()` из `coefficient.service.ts`: временно оставить только `baseValue` + switch-кейсы из заведомо безопасного списка. `~1.5h`
- [ ] R0-BE-5. Убить мёртвый код: `AgGridFilterService` из `calculation.module`, `compareVersions`, `@nestjs/graphql` из `CurrentUser`. `~1h`
- [ ] R0-BE-6. Починить `CurrentUser` декоратор для HTTP-контекста (`switchToHttp().getRequest()`). `~0.5h`
- [ ] R0-BE-7. Выровнять `SETUP_COMPLEXITY_VALUES` между миграцией / DTO / фронтом (одна константа в `anketa-contracts`). `~2h`
- [ ] R0-BE-8. Строгий `ValidationPipe` (`whitelist: true, forbidNonWhitelisted: true, transform: true`) + починить drift `CreateCalculationDto` vs фактический payload. `~1.5h`
- [ ] R0-BE-9. Убрать `relations: ["coefficients"]` из `QuestionnaireService` (нет relation в entity). `~0.3h`

**Фронтенд:**
- [ ] R0-FE-1. Удалить `ListWidget.tsx`, `AnketaForm`-sketch, `_uiSchema/_templates` закомменты в preview, `omit(..., ["properties.description"])`. `~0.5h`
- [ ] R0-FE-2. Единый `coefficientMappings` + `stageDisplayNames` (из 3 дублей → один файл). `~1h`
- [ ] R0-FE-3. Объединить `ProjectAssessmentForm` + `…Preview` → одна форма с `mode: 'edit' | 'preview'` через `formContext`. `~3h`
- [ ] R0-FE-4. Заменить мутацию `title` через `calc_uiSchemaWithCoefficients.ts` → кастомный `TitleFieldTemplate` + `formContext.coefficients`. `~2h`
- [ ] R0-FE-5. Заменить `UniversalDependencyWidget` на нативные RJSF `dependencies` / `allOf:if-then-else` (10+ правил). `~4h`
- [ ] R0-FE-6. Разбить `TextFieldCustomWidget` (581 строк) на `TextWidget/SelectWidget/MultilineTextWidget/MaskedTextWidget`. `~3h`
- [ ] R0-FE-7. `calc_schema.json` → переложить в `packages/anketa-contracts` (zod → json-schema генерация). `~2h`
- [ ] R0-FE-8. Orval: регенерировать клиент; выкинуть рукописные `common/api/types/*`, заменить на generated. `~1.5h`
- [ ] R0-FE-9. `MenuContent.tsx`: `replace("/", "")` → корректный matcher по полному пути. `~0.3h`
- [ ] R0-FE-10. Фронт перестаёт слать `calculationResult` в `POST /calculation` (переносится в R1-BE-5 или пока удаляется как неиспользуемое серверным DTO). `~0.5h`

**Оценка:** **~30–35 часов** активной работы с агентом. При ритме 12 h/day — **~3 календарных дня**. Разбит на 8–10 маленьких PR-ов.

### Итерация 1 — V2 «тонкий MVP»

Цель: отрендерить v2-форму по схеме из БД, сохранить запись. Параллельно с v1.

**Бэкенд:**
- [ ] R1-BE-1. Таблицы `anketa_template`, `dictionary`, `dictionary_item`, `customer` + миграции + TypeORM entities. `~3h`
- [ ] R1-BE-2. Сид: перенести `artefact_values` → `dictionary_item` (department, streamExecutor); `questionnaire_item`+`coefficient` → `v1_legacy` template. `~2h`
- [ ] R1-BE-3. Эндпоинты: `GET /anketa-templates`, `/:id`, `/by-code/:code`, `GET /dictionaries`, `/:code`. `~2h`
- [ ] R1-BE-4. Сид `v2_standard` шаблон (секции из CSV: общая инфо + модельный стрим минимум; остальные — заглушки). `~4h`
- [ ] R1-BE-5. AJV-валидация `POST /calculation` по `template.schema`. Fallback на class-validator для `v1_legacy`. `~2h`
- [ ] R1-BE-6. AST-интерпретатор коэффициентов (`/packages/anketa-contracts/src/expr`): парсер, evaluator, тесты. `~4h`
- [ ] R1-BE-7. Пересчёт `finalCoefficient` на бэке через `calc_ruleset` шаблона. `~3h`

**Фронтенд:**
- [ ] R1-FE-1. Слой загрузки шаблона (`useAnketaTemplate(id|code)` через React Query). `~1.5h`
- [ ] R1-FE-2. `AnketaCreatePage` / `AnketaPreviewPage` — роутит на `<FormV1/>` или `<FormV2/>` по `template.code`. `~1h`
- [ ] R1-FE-3. `<FormV2/>` — data-driven RJSF: `schema`, `uiSchema`, `formContext={dictionaries, coefficients, mode}` всё из бэка. `~4h`
- [ ] R1-FE-4. Новые виджеты из CSV: `SegmentedControlWidget`, `StepperWidget`, `RiskMatrixField`, `AccordionField` (общая неопределённость), `StreamSectionTemplate`. `~8h`
- [ ] R1-FE-5. Выбор шаблона на главной при создании (если active-template > 1). `~1h`
- [ ] R1-FE-6. `features/anketaCRUD/v1/` — заморозить в текущем виде (lazy chunk). `~1h`

**Оценка:** **~37 часов**. Ритм 12 h/day → **~3 календарных дня**. Разбит на 10–12 PR-ов.

### Итерация 2 — Админка-конструктор

Цель: админ редактирует схему, справочники, коэффициенты без деплоя.

- [ ] R2-BE-1. Admin CRUD: `/admin/anketa-templates`, `/admin/dictionaries`, `/admin/coefficient-rules`, `/admin/stage-formulas`. `~5h`
- [ ] R2-BE-2. Publish-flow (`draft→active→archived`) + запрет удаления при наличии `calculation.template_id`. `~2h`
- [ ] R2-BE-3. Dry-run валидация схемы (AJV meta + ссылки на справочники + циклы правил). `~2h`
- [ ] R2-BE-4. `anketa_template_audit` (jsonb diff). `~1.5h`
- [ ] R2-FE-1. `/admin/templates` — список + фильтры + clone/new-version. `~2h`
- [ ] R2-FE-2. Редактор полей: `@dnd-kit` drag-n-drop секций/полей, side-panel «свойства поля» (react-hook-form + zod). `~8h`
- [ ] R2-FE-3. Редактор правил на `react-querybuilder` (визуально → в наш AST). `~5h`
- [ ] R2-FE-4. Редактор коэффициентов и стадий (плоские таблицы + AST editor). `~4h`
- [ ] R2-FE-5. Preview-вкладка — RJSF-рендер с тестовыми данными. `~2h`
- [ ] R2-FE-6. Редактор справочников — простой CRUD. `~2h`
- [ ] R2-FE-7. Diff-вьювер (monaco diff) между версиями шаблона. `~2h`

**Оценка:** **~35 часов**. Ритм 12 h/day → **~3 календарных дня** интенсивной работы. Разбит на ~12 PR-ов.

### Сводка по итерациям

| Итерация | Результат | Человеко-часы | Календарно @12h/day |
|---|---|---|---|
| R0 | Рефакторинг, единый контракт, мёртвый код удалён | ~30–35 h | ~3 дня |
| R1 | V2-анкета работает из БД-шаблона, параллельно с v1 | ~37 h | ~3 дня |
| R2 | Админка-конструктор | ~35 h | ~3 дня |
| **R0+R1+R2** | **Полный цикл «рефакторинг + v2 + админка»** | **~100–110 h** | **~9–10 дней** |

Иными словами, при ритме 12–14 h/день и активном использовании агента **в 2 рабочие недели** можно закрыть всё до админки включительно.

### Итерация 3+ — соответствует п.3–5 из плана Шурыгина

- (3) Реестр инициатив + связи между анкетами — требует нормализации на беке (выход из «документного» хранения для ключевых атрибутов).
- (4) Полноценная архитектура сервисов (визуальный редактор компонентов + справочники).
- (5) Привязка РФДИ к этапам работ / задачам.
- (5) Гибкий калькулятор «поиграться и выбрать вариант».

Эти итерации уже требуют нормализованного бэка (архитектурные компоненты, типовые задачи, связи), что логично строится поверх моделей из R1–R2.

---

## 9. Чек-лист «0 — проблемы текущего json-schema подхода»

Кратко, с указанием файлов:

| # | Проблема | Файл / место | Фикс (в Итерации) |
|---|---|---|---|
| 1 | JSON Schema схема разорвана с uiSchema (`description` в uiSchema без backing) | `apps/react-client/src/schemas/calculation/calc_uiSchema.ts` | R0-FE-7 |
| 2 | uiSchema мутирует `title` JSON-схемы на ходу | `calc_uiSchemaWithCoefficients.ts` | R0-FE-4 |
| 3 | Условная логика в строках JS внутри виджета | `UniversalDependencyWidget.tsx:1-274` | R0-FE-5 |
| 4 | Бизнес-правило «сброс readyPromReports при modelDeveloped=Да» в `onChange` | `ProjectAssessmentForm.tsx` | R1 — перенос в rules |
| 5 | Хардкод коэффициентов/стадий | `calculations/coefficients.ts`, `calculations/stages.ts` | R0-FE-2 → R2-BE-1 |
| 6 | Дубли маппингов отображения | `coefficientMappings.ts` + 2 таблицы | R0-FE-2 |
| 7 | Две формы под один смысл (edit/preview) | `ProjectAssessmentForm.tsx` / `…Preview.tsx` | R0-FE-3 |
| 8 | Клиент шлёт `calculationResult`, DTO про это не знает | `AnketaCreatePage.tsx`, `CreateCalculationDto` | R0-BE-8 / R1-BE-5 |
| 9 | `finalCoefficient` доверен клиенту | `calculation.service.ts:create` | R1-BE-5 |
| 10 | `eval()` для формул коэф. | `coefficient.service.ts` | R0-BE-4 → R1 |
| 11 | Нет FK `calculation → schema_version` | `calculation.entity.ts` | R0-BE-3 |
| 12 | Hardcoded `artefact_id=6,7` | `reference-data.service.ts` | R1-BE-1 |
| 13 | `relations: ["coefficients"]` без relation в entity | `questionnaire.service.ts` | R0-BE-5 |
| 14 | Опечатки в `ValidateIf` | `create-calculation.dto.ts` | R0-BE-2 |
| 15 | Несовпадение сообщений `unique(no dublicate allowed)` vs catch | `calculation.service.ts` | R0-BE-2 |
| 16 | Огромный enum `productionAdditionalReports` (до `"99"`) | `calc_schema.json` | R1 — справочник |
| 17 | `MenuContent` battery ломает multi-segment paths | `MenuContent.tsx` | R0-FE-9 |
| 18 | Мёртвые: `ListWidget`, `AgGridFilterService`, `compareVersions`, `AnketaForm` sketch | (см. §2.3) | R0 |
| 19 | Отсутствие админских эндпоинтов при наличии permission | `shared/types/permissions.ts` | R2 |
| 20 | Нет нормализации department (jsonb string array) | `calculation.entity.ts` | R3 (реестр инициатив) |

---

## 10. Риски и ограничения

- **Сроки «выпустить к июлю 26»** (Шурыгин). Итерация 0 (рефакторинг) ≠ видимая фича — её продать стейкхолдерам сложнее. Рекомендация: делать R0 параллельно с R1, отдельной веткой, сливать кусками через PR-ы, не блокировать релиз.
- **Переход с hand-crafted `IAssessmentFormData` на контракты zod** затронет много компонентов. Делать за 1 PR = больно. Нужен кодемод (в репо уже есть `codemods/add_test_ids.ts` как пример) + поэтапный тайп-лок `as unknown as NewType`.
- **RJSF native `dependencies/if-then-else` ≠ 100% того, что умеет текущий виджет**. Для нескольких редких случаев (напр. «disable поле в preview-режиме») всё равно нужен `formContext` + кастомный `ui:disabled`-resolver.
- **Data migration для v1 не делаем** (решение из обсуждения). Но нужно **заморозить v1 frontend** в текущем виде и не ломать при рефакторинге. Путь: выделить `features/anketaCRUD/v1/*` как «замороженный» модуль.
- **Админка-конструктор** = полноценное приложение размером с core feature. В итерации 2 обязательно выделять её в отдельные эпики.
- **Безопасность**: переход от `eval` к AST-интерпретатору обязателен перед тем, как админка позволит редактировать формулы.

---

## 11. Порядок исполнения Итерации 0 (первые 2 рабочих дня)

Порядок подобран так, чтобы каждый шаг был маленьким PR-ом, не ломал сборку и последовательно готовил почву для следующего.

**День 1 (safe cleanup + плацдарм):**

1. R0-FE-1 — удалить мёртвое `(~0.5h)`.
2. R0-BE-5 — удалить мёртвое на беке `(~1h)`.
3. R0-BE-6 — починить `CurrentUser` декоратор `(~0.5h)`.
4. R0-BE-9 — убрать несуществующий relation `(~0.3h)`.
5. R0-BE-2 — фикс опечаток в DTO `(~1h)`.
6. R0-FE-9 — фикс `MenuContent` `(~0.3h)`.
7. R0-FE-2 — дедуп `coefficientMappings` `(~1h)`.
8. R0-BE-1 — создать `packages/anketa-contracts` с zod + json-schema генерацией `(~3h)`.
9. R0-BE-4 — вырубить `eval()` `(~1.5h)`.

**День 2 (контракт + форма):**

10. R0-BE-7 — выровнять `SETUP_COMPLEXITY_VALUES` `(~2h)`.
11. R0-BE-3 — `template_id`/`schema_version` в `calculation` + миграция `(~2h)`.
12. R0-FE-10 — убрать отправку `calculationResult` `(~0.5h)`.
13. R0-BE-8 — строгий `ValidationPipe` `(~1.5h)`.
14. R0-FE-8 — регенерация Orval + удаление рукописных типов `(~1.5h)`.
15. R0-FE-7 — `calc_schema.json` → из `anketa-contracts` `(~2h)`.
16. R0-FE-4 — `TitleFieldTemplate` вместо мутации title `(~2h)`.
17. R0-FE-3 — слияние edit/preview форм `(~3h)`.
18. R0-FE-5 — native `if-then-else` вместо `UniversalDependencyWidget` `(~4h)`.
19. R0-FE-6 — декомпозиция `TextFieldCustomWidget` `(~3h)`.

Каждый пункт закрывается с прогоном `npm run lint && npm run test` и при необходимости локальным smoke.

---

## Приложение A. Файлы, упомянутые в отчёте

- Бэк: `apps/nestjs-server/src/modules/calculation/**`, `apps/nestjs-server/src/modules/questionnaire/**`, `apps/nestjs-server/src/migrations/**`, `apps/nestjs-server/src/shared/decorators/user.decorator.ts`, `apps/nestjs-server/src/shared/types/permissions.ts`
- Фронт: `apps/react-client/src/schemas/calculation/*`, `apps/react-client/src/features/anketaCRUD/**`, `apps/react-client/src/common/forms/**`, `apps/react-client/src/features/admin/AdminPage.tsx`, `apps/react-client/src/routing/**`
- Конфиги: `apps/react-client/package.json`, `package.json`, `apps/react-client/orval.config.js`
- Документы: `llm/v2_docs/Обсуждение обновления смарт-анкеты (2026-04-21).html`, `llm/v2_docs/speech_to_text.html`, `llm/v2_docs/Параметры с UX_combined.csv`, `llm/Анкета.*.png`

## Приложение B. Ссылки на макеты

| Макет | Роль в v2 |
|---|---|
| `llm/Анкета. Заполнено.png` | Эталон полностью заполненной анкеты v2 |
| `llm/Анкета. Незаполнено.png` | Пустое состояние |
| `llm/Анкета. Платформенный стрим.png` | Отдельная секция стрима («ML-платформа», «Контроль моделей», «Хранение и обработка данных») |
| `llm/Анкета. Платформенный стрим Неактивные поля.png` | Disabled-состояние / read-only |
| `llm/Рассчет общей неопределенности.png` | Модалка составного параметра (для `AccordionField`) |
| `llm/Редактирование названия.png` | Инлайн-редактирование + модалка |
| `llm/Список версий.png` | Новый UI версий (объединённый badge + dropdown) |
