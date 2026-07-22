# Справочник `implementationStream` и фильтрация по стримам

Документ описывает единый справочник **Стрим-исполнитель** (`V2_IMPLEMENTATION_STREAM`): поле анкеты v2, стрим-блоки конструктора схемы, редактор логики типовых работ и фильтрацию реестра для ролей со стрим-ограничением.

**См. также:** [anketa-block-access.md](./anketa-block-access.md) — видимость стрим-блоков и типовых/нетиповых работ при **просмотре анкеты** и **экспорте XLSX** (роли `streamBlockRoles`, маскировка оценок для лидов). На расчёт `POST /calculate` не влияет.

## 1. Назначение

`generalInfo.implementationStream` — справочное поле анкеты v2 («Стрим-исполнитель»).

| Слой | Что хранится |
|------|----------------|
| **formData / JSON Logic** | короткий **код** (`rb`, `kmbkcb`, …) |
| **UI (select)** | человекочитаемая **подпись** |
| **Реестр (грид)** | подпись (код резолвится в label) |

Тот же справочник кодов используется для **стрим-блоков** в конструкторе схемы (`ui:options.streamExecutor`) и для **области стрима** в редакторе логики типовых работ. В этих местах в uiSchema тоже хранятся **коды**; подписи показываются только в UI.

| Контекст | Где лежит значение | Формат |
|----------|-------------------|--------|
| Поле анкеты | `formData.generalInfo.implementationStream` | код |
| Стримовый блок схемы | `uiSchema.*.ui:options.streamExecutor` | код |
| Область в логике типовых работ | scope / селекты редактора | код |
| Назначения типовых работ в БД | `streamExecutor` у норм/правил | **имя стрима в БД** (см. §4) |

Legacy-подписи executor-стримов (`ДАДМ`, `ПиРМ`, `Источники данных`, …) при **чтении** нормализуются в код через `normalizeStreamBlockExecutor` (`v2-stream-block-executor.util.ts`).

---

## 2. Справочник: коды и подписи

Источник истины: `packages/api-contract/src/v2-implementation-streams.util.ts`.

| Код (≤ 6 символов) | Подпись |
|--------------------|---------|
| `kmbkcb` | Разработка моделей КМБ и КСБ |
| `rb` | Моделирование РБ |
| `ptitpc` | AI-модели партнерств |
| `finmdl` | Финансовое моделирование |
| `rnd` | Моделирование RnD |
| `idsrc` | Источники данных |
| `mdlctl` | Контроль моделей |
| `dadm` | ДАДМ |
| `pirm` | Платформы и Решения для моделирования |
| `strdat` | Потоковые данные |
| `digagt` | Цифровые агенты |

Код справочника в БД / uiSchema:

```text
v2.generalInfo.implementationStream
```

Константа: `V2_IMPLEMENTATION_STREAM_DICTIONARY_CODE`.

### Где ещё живёт справочник

| Место | Роль |
|-------|------|
| `v2-default-anketa.snapshot.json` | `enum` = коды, `enumNames` = подписи |
| `v2-default-organizational-dictionaries.ts` | seed items (`code` / `label`, `payload.storeCode: true`) |
| `parseDictionaryJsonToEnumPair` (react-client) | для этого справочника в форму кладётся **code**, не label |

Хелперы:

- `isV2ImplementationStreamCode(value)`
- `resolveImplementationStreamLabel(code)`
- `buildImplementationStreamEnumPair()` → `{ enums, enumNames }`
- `V2_IMPLEMENTATION_STREAM` — именованные константы кодов (`V2_IMPLEMENTATION_STREAM.RB`, …)

### Логика анкеты

В правилах JSON Logic сравнивайте с **кодом**:

```json
{ "==": [{ "var": "generalInfo.implementationStream" }, "rb"] }
```

---

## 3. Фильтрация реестра (stream filter)

### Роли, для которых фильтр включён

`STREAM_FILTERED_ROLES` (`roles.constant.ts`), например: `ds`, `de`, `sarep`, `data_expert`, `mipm_stream`, `modelops`.

Остальные роли видят полный реестр без фильтрации по стриму.

### Как работает

```text
Keycloak groups
    → extractUserRoles / extractDepartmentsAndStreams
    → StreamMappingService.getGroupsAfterMapping
    → список разрешённых стримов (v1-лейблы + v2-коды + алиасы)
    → StreamFilterInterceptor отфильтровывает ответ списка
```

| Версия | Поле в элементе списка | Эндпоинт |
|--------|------------------------|----------|
| **v1** | `streamExecutor` | `GET /calculation/all`, `GET /calculation/all/list`, … |
| **v2** | `formData.generalInfo.implementationStream` | `GET /v2/questionnaires` (`@StreamFilter()`) |

Подключение v2:

- контроллер: `V2QuestionnaireController` + `@UseInterceptors(StreamFilterInterceptor)`
- метод реестра: `@StreamFilter()`
- провайдеры: `StreamMappingService`, `StreamFilterInterceptor` в `AnketaV2Module`

Одиночный `GET /v2/questionnaires/:id` **не** режется интерцептором (как и `GET /calculation/:id` в v1): фильтр действует на **массивы** и paginated-ответы.

### Маппинг департамент → стримы

`StreamMappingService` (`stream-mapping.service.ts`):

| Департамент (group) | v1 `streamExecutor` (примеры) | v2 код |
|---------------------|-------------------------------|--------|
| Управление моделирования КИБ и СМБ | Разработка моделей для КМБ и КСБ | `kmbkcb` |
| Управление моделирования РБ | Моделирование РБ | `rb` |
| Управление моделирования партнерств и ИТ-процессов | Модели партнерств…; Моделирование RnD | `ptitpc` |
| Управление перспективных алгоритмов машинного обучения | Моделирование RnD | `rnd` |
| Управление процессных и финансовых моделей | Финансовое моделирование | `finmdl` |

Дополнительно:

- в groups могут прийти **код** или **подпись** стрима напрямую — они тоже учитываются;
- `expandStreamAliases` добавляет пары **code ↔ label**, чтобы фильтр срабатывал независимо от формата значения в анкете;
- стримы `idsrc` / `mdlctl` / `dadm` / `pirm` / `strdat` / `digagt` (и остальные коды) также имеют
  identity-маппинг `code → [code]`: если код есть в groups пользователя, он попадает в allow-list
  (подпись добавит `expandStreamAliases`).

### Условия результата

1. Пользователь **не** из `STREAM_FILTERED_ROLES` → список без изменений.
2. Роль стрим-фильтруемая, но нет департаментов/стримов в groups → **пустой** список.
3. Есть разрешённые стримы → остаются анкеты, у которых `implementationStream` ∈ allow-list.
4. У анкеты нет `implementationStream` → она **не** проходит фильтр.

> **Отличие от ролевки блоков.** Stream filter режет **список анкет** в реестре. Скрытие полей внутри открытой анкеты и колонок в XLSX — отдельный механизм, см. [anketa-block-access.md §8](./anketa-block-access.md#8-связь-с-фильтром-реестра).

---

## 4. Стрим-блоки конструктора и логика типовых работ

### Стримовый блок в uiSchema

Корневой object-блок анкеты может быть помечен как платформенный/поддерживающий стрим:

```json
{
  "ui:options": {
    "streamBlock": true,
    "streamExecutor": "idsrc",
    "streamBlockRoles": ["ds", "de"],
    "sectionRole": "main"
  }
}
```

- **`streamExecutor`** — код из `V2_IMPLEMENTATION_STREAM` (не подпись); допускается массив кодов.
- **`streamBlockRoles`** — одна роль Keycloak или массив (`V2_STREAM_BLOCK_ROLE`); используется при просмотре анкеты и экспорте, см. [anketa-block-access.md §2](./anketa-block-access.md#2-настройки-в-uischema).
- Заголовок секции в UI: `resolveStreamBlockExecutorLabel(code)` → «Стрим «Источники данных»».
- Старые шаблоны с подписью (`"Источники данных"`, `"ДАДМ"`) или legacy-ключами (`streamDataSources`, `field_i8dL7QZa`) при чтении приводятся к коду.

UI конструктора: панель «Стримовый блок» в `SchemaPropertiesPanel` — мультиселект стримов и ролей (`StreamExecutorMultiSelect`, `StreamBlockRoleMultiSelect`), справочник `v2.generalInfo.implementationStream`. Аналогичные настройки — на блоках **типовых** и **нетиповых работ** и во вкладках логики «Типовые работы» / «Нетиповые работы» ([anketa-block-access.md §2](./anketa-block-access.md#2-настройки-в-uischema)).

### Просмотр анкеты: видимость блоков

Те же `streamExecutor` и `streamBlockRoles` определяют, видит ли пользователь секцию при открытии анкеты (не в конструкторе). Правила, лиды, маскировка оценок — [anketa-block-access.md §4–§5](./anketa-block-access.md#4-правила-видимости-блоков).

### Редактор логики типовых работ

Область (toolbar), матрица назначений и диалог создания работы оперируют **кодами** `V2_IMPLEMENTATION_STREAM`:

| UI | Константа / файл |
|----|------------------|
| Список стримов области | `LOGIC_EXECUTOR_STREAMS` = `V2_IMPLEMENTATION_STREAM_CODES` |
| Область по умолчанию | `DEFAULT_LOGIC_STREAM` = `idsrc` |
| Подпись в UI | `streamDisplayLabel` → `resolveStreamBlockExecutorLabel` |
| Фильтр работ в sidebar | `workMatchesLogicScope` + `resolveStreamBlockExecutorScopeStreams` |

Файл react-client: `typicalWorksAreas.ts`.

### Два слоя `streamExecutor`

| Слой | Формат | Пример |
|------|--------|--------|
| UI логики / uiSchema блока | код implementationStream | `idsrc`, `dadm` |
| БД типовых работ (нормы, правила, назначения) | каноническое **имя стрима** | `Источники данных`, `ИД. Внутренний`, `ДАДМ` |

При **создании** работы или **назначении** на стрим UI передаёт код, API получает DB-имя:

```text
код (idsrc)
  → resolveLogicStreamDbExecutor("idsrc")
  → "Источники данных"   // POST/PATCH typical work
```

При **отображении** и **фильтрации** DB-имя сопоставляется обратно с кодом:

```text
"ИД. Внутренний"
  → resolveLogicStreamForDbExecutor(...)
  → idsrc
```

Scope для сопоставления работ (`IMPLEMENTATION_STREAM_DB_SCOPE` в `v2-stream-block-executor.util.ts`) включает legacy-имена БД, подписи и сами коды — чтобы фильтр работал и для старых назначений.

### Хелперы `v2-stream-block-executor.util.ts`

| Функция | Назначение |
|---------|------------|
| `normalizeStreamBlockExecutor(value)` | код, подпись справочника или legacy executor-label → код или `null` |
| `resolveStreamBlockExecutorLabel(value)` | код / legacy → подпись для UI |
| `resolveStreamBlockExecutorScopeStreams(code)` | код → список имён для поиска назначений работ |
| `resolveLogicStreamForDbExecutor(dbStream)` | имя в БД → код |
| `resolveLogicStreamDbExecutor(code)` | код → каноническое имя для записи в БД |
| `inferLegacyStreamBlockExecutorCode(blockKey)` | `streamDataSources`, `field_i8dL7QZa`, … → код |

Связанные util в api-contract:

- `collectExecutorStreamBlocks`, `isExecutorStreamPresentInSchema` — стрим-блоки в uiSchema;
- `typicalWorkAssignedToExecutorStream` — работа назначена на стрим блока (с учётом scope);
- `V2_EXECUTOR_STREAM_LABELS` — **legacy**-метки для старых шаблонов и editor executor areas; новый код опирается на `V2_IMPLEMENTATION_STREAM`.

---

## 5. Ключевые файлы

| Файл | Содержание |
|------|------------|
| `apps/nestjs-server/docs/anketa-block-access.md` | ролевка блоков при просмотре и экспорте (см. также этот документ) |
| `packages/api-contract/src/v2-implementation-streams.util.ts` | коды, подписи, `V2_IMPLEMENTATION_STREAM`, хелперы |
| `packages/api-contract/src/v2-stream-block-executor.util.ts` | нормализация код↔label↔DB для блоков и логики |
| `packages/api-contract/src/v2-stream-block-role.util.ts` | коды ролей `streamBlockRoles` |
| `packages/api-contract/src/v2-anketa-block-access.util.ts` | `isBlockVisibleForUser`, маскировка оценок |
| `packages/api-contract/src/v2-user-stream-mapping.util.ts` | groups Keycloak → стримы пользователя |
| `packages/api-contract/src/v2-anketa-section-ui.util.ts` | `streamBlock`, `collectExecutorStreamBlocks`, заголовки |
| `apps/react-client/.../SchemaPropertiesPanel.tsx` | селект стрим-исполнителя стрим-блока |
| `apps/react-client/.../typicalWorksAreas.ts` | область и фильтры редактора логики |
| `apps/react-client/.../V2PreviewObjectFieldTemplate.tsx` | скрытие блоков при просмотре анкеты |
| `apps/nestjs-server/.../v2-default-organizational-dictionaries.ts` | seed справочника |
| `apps/nestjs-server/.../v2-default-anketa.snapshot.json` | enum / enumNames в схеме |
| `apps/react-client/.../dictionaryPreview.ts` | `storeCode` → code в formData |
| `apps/nestjs-server/src/shared/interceptors/stream-filter.interceptor.ts` | фильтр ответа |
| `apps/nestjs-server/src/shared/services/stream-mapping.service.ts` | роли → разрешённые стримы |
| `apps/nestjs-server/src/shared/utils/user-groups.util.ts` | разбор Keycloak groups |
| `apps/nestjs-server/.../v2-questionnaire.controller.ts` | `@StreamFilter()` на реестре; export/xlsx + block access |

---

## 6. Отличия v1 и v2

| | v1 | v2 |
|--|----|----|
| Поле | `streamExecutor` (колонка сущности) | `formData.generalInfo.implementationStream` |
| Типичное значение | длинная русская подпись | короткий код |
| Справочник UI | reference data / константы `STREAMS` | dictionary `v2.generalInfo.implementationStream` |
| Фильтр списка | `CalculationController` | `V2QuestionnaireController.findAll` |

Общий механизм: один `StreamFilterInterceptor` + `StreamMappingService`.

### Связанная документация

| Документ | Тема |
|----------|------|
| [anketa-block-access.md](./anketa-block-access.md) | видимость стрим-блоков и typical/atypical при просмотре и экспорте; `streamBlockRoles`; лиды |
| этот документ | справочник кодов, stream filter реестра, uiSchema `streamExecutor`, логика типовых работ |
