# План реализации V2 — что можно делать сейчас

Опирается на `MAIN.md`, `DIAGRAM.md`, `ADMIN_IDEAS.md`. Предполагает, что макеты пользовательской анкеты делает другой разработчик и UI v2-формы пока не трогаем.

---

## Этап 0. Уточнения и фиксация архитектуры

См. `QUESTIONS.md`. До получения ответов работаем по дефолтным допущениям (A-01…A-10). Все спорные места помечаем в коде `// ASSUMPTION (Q-XX)`.

---

## Этап 1. Бэкенд V2: фундамент шаблонов и справочников

Можно делать сейчас, не зависит от макетов фронта.

### 1.1 Модуль `anketa-template` (готов пустой каркас)

Создать сущности:

- **`AnketaTemplateEntity`** — корневой шаблон (имя, описание, scope/стрим).
- **`AnketaTemplateVersionEntity`** — версия шаблона (jsonSchema, uiSchema, logic, status, parentVersionId, author, createdAt, releaseNotes).
- **`AnketaTemplateRuleEntity`** *(опционально, если решим хранить правила нормализованно)* — таблица типовых задач со связкой `componentType + paramCode + value → taskCode + estimate`.

Сервисы:

- `AnketaTemplateService` — CRUD шаблонов и версий, переключение `current_version_id`, copy-on-rollback.
- `AnketaTemplateValidationService` — валидация JSON-схемы (`ajv`), детект циклов в `logic`, проверка ссылок на несуществующие поля, лимит размера.
- `AnketaTemplateRuleService` — поиск типовых задач по `(componentType, param, value)` (используется и v2-формой, и потенциально админкой).

Контроллеры:

- `AdminAnketaTemplateController` под `/api/v2/admin/anketa-templates` (Keycloak `smart-anketa-admin`).
- `AnketaTemplateController` под `/api/v2/anketa-templates` для рантайм-чтения опубликованной версии.

DTO:

- Общие в `packages/api-contract/src/anketa-template.types.ts`.

### 1.2 Миграция БД

- Таблица `anketa_template`
- Таблица `anketa_template_version` (со статусом + `parent_version_id`)
- Опционально таблица `anketa_template_rule`
- Индексы по `(template_id, status)` и `(template_id, version_number)`

### 1.3 Расчётный движок V2 (без UI-зависимости)

Можно начать в этом же модуле или вынести в `calculation-v2`:

- Сервис `CalculationV2Service` — принимает данные анкеты + ссылку на версию шаблона → возвращает Total и детализацию.
- Логика по F-05 / F-06 (после уточнения **Q-V2-21**).
- Отдельный pure-функциональный блок, тестируется юнитами без БД.

### 1.4 Тесты

- Юниты на `AnketaTemplateValidationService` (циклы, дубликаты, AJV).
- Юниты на rule-matcher (поиск типовых задач).
- Юниты на calculation engine (после уточнения формул).

---

## Этап 2. Общие типы (`@smart-anketa/api-contract`)

Можно делать сразу:

- `AnketaTemplateDto`, `AnketaTemplateVersionDto`, `AnketaTemplateStatus` enum.
- `JsonSchemaLikeDto`, `UiSchemaDto` (используем структуры RJSF).
- `RuleDto` — для типовых задач.
- Общий `LogicGraphDto` (узлы json-logic + связи между полями).
- DTO для админки: `CreateTemplateVersionDto`, `PublishVersionDto`, `RollbackVersionDto`.

---

## Этап 3. Админка — фронтенд (без зависимости от макетов v2-анкеты)

Структура `apps/react-client/src/features/admin` под atomic design:

```
features/admin/
├─ atoms/        StatusChip.tsx, VersionLabel.tsx, ...
├─ molecules/    TemplateListItem.tsx, RuleConditionRow.tsx, ...
├─ organisms/    TemplateTreeNav.tsx, RuleEditor.tsx, LogicEditor.tsx, LivePreviewPanel.tsx
├─ templates/    AdminLayout.tsx, EditorLayout.tsx
├─ pages/        AdminTemplatesListPage.tsx
                 AdminTemplateEditorPage.tsx
                 AdminTemplateHistoryPage.tsx
                 AdminTemplateDictionariesPage.tsx
└─ hooks/        useTemplateGraph.ts, useCycleDetector.ts
```

### 3.1 Хуки запросов

`apps/react-client/src/api/hooks/anketaTemplate.ts` (или `common/api/hooks/...` — следуя текущей конвенции `common/api/queries`).

Хуки:

- `useAnketaTemplatesList`
- `useAnketaTemplate(id)`
- `useAnketaTemplateVersions(templateId)`
- `useCreateDraftVersion`
- `usePublishVersion`
- `useRollbackToVersion`
- `useUpdateDraftSchema` (autosave, см. **Q-ADM-22**)

### 3.2 Конструктор схемы

Согласно ADMIN_IDEAS:

- **Палитра компонентов** (`@rjsf` стандартные + кастомные виджеты SmartAnketa).
- **Tree-структура** разделов/групп/полей.
- **Property panel** — атрибуты выбранного узла, редактируемые ярлыки/опции справочников.
- **Logic editor** — построитель условий (`react-querybuilder`-стиль) → json-logic; отдельный режим Monaco для prosumer-юзкейса.
- **Live preview** — `<Form schema/uiSchema/formData>` от `@rjsf/mui` для проверки.

### 3.3 История и откат

Отдельная страница: список версий, diff (recommend `react-diff-viewer` или `monaco-editor` diff), кнопки «откатиться» с обязательным подтверждением.

### 3.4 Безопасность UI

- В `RuleEditor` после каждого изменения — клиентская проверка циклов (Q-ADM-11) с подсветкой проблемного поля.
- На бэке аналогичная проверка перед сохранением.

### 3.5 Маршрутизация

Расширить `apps/react-client/src/routing/routes.ts`:

- `/admin` — список шаблонов
- `/admin/templates/:id` — редактор актуальной/draft-версии
- `/admin/templates/:id/history` — версии
- `/admin/templates/:id/dictionaries` — справочники

Включить `routes.admin.disabled = false` после готовности первой страницы.

---

## Этап 4. Что НЕ делаем сейчас

- UI самой v2-анкеты для конечного пользователя — другой разраб делает макеты.
- Миграция данных из v1 в v2 — после **Q-INT-02**.
- GraphQL — пока REST (если **Q-ADM-17** не пересмотрит).

---

## Порядок предлагаемых PR

1. **PR #1** — типы в `api-contract` + миграция БД + сущности + минимальный CRUD контроллер.
2. **PR #2** — валидация (AJV, циклы, дубликаты) + тесты.
3. **PR #3** — фронт: список шаблонов + история + базовый JSON-редактор (Monaco) без визуального конструктора.
4. **PR #4** — визуальный конструктор полей + property panel + live preview.
5. **PR #5** — конструктор правил (типовые задачи) + json-logic.
6. **PR #6** — calculation engine V2 + тесты + интеграция с фронтом анкеты (когда макеты готовы).

Каждый PR закрытым набором, чтобы можно было ревьюить независимо.
