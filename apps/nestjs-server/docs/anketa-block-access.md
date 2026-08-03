# Ролевка и стрим-фильтрация блоков анкеты (просмотр и экспорт)

Документ описывает видимость **стрим-блоков**, **типовых** и **нетиповых работ** при просмотре анкеты v2 и при выгрузке реестра в XLSX. Настройки задаются в конструкторе схемы (`uiSchema`).

**См. также:** [implementation-stream.md](./implementation-stream.md) — справочник кодов `V2_IMPLEMENTATION_STREAM`, `streamExecutor` в uiSchema, фильтр **списка** анкет в реестре (`StreamFilterInterceptor`), редактор логики типовых работ.

## 1. Назначение

| Задача | Где применяется |
|--------|-----------------|
| Скрыть блок, если роль/стрим пользователя не подходят | Просмотр анкеты (RJSF), экспорт XLSX |
| Показать блок лидам, но скрыть **оценки чужих стримов** | Просмотр анкеты (таблицы typical/atypical), экспорт XLSX |
| Полный расчёт по всей схеме | **`POST /calculate`** — **без** фильтрации |

Ограничения **не** действуют в конструкторе схемы и в превью шаблона в админке (`debouncePreviewInputs` / `schemaEditorPreview`).

### Какие блоки участвуют

| Тип блока | Маркер в uiSchema | Dot-путь для проверки |
|-----------|-------------------|------------------------|
| Стрим-блок | `streamBlock: true` | корневой ключ секции (`streamDataSources`, …) |
| Типовые работы | `archComponent: "typicalWork"` | путь массива (`streamDataSources.sourceTypicalTasks`, …) |
| Нетиповые работы | `archComponent: "atypicalWork"` | путь массива (`streamDataSources.atypicalTasks`, …) |

Наследование стримов и ролей от родительского стрим-блока — через те же резолверы, что и в конструкторе:

- `resolveStreamExecutorForTypicalWorkOutputPath`
- `resolveStreamBlockRolesForTypicalWorkOutputPath`

---

## 2. Настройки в uiSchema

### Стрим-блок

```json
{
  "ui:options": {
    "streamBlock": true,
    "streamExecutor": ["idsrc", "dadm"],
    "streamBlockRoles": ["ds", "de"]
  }
}
```

- **`streamExecutor`** — один код или массив кодов `V2_IMPLEMENTATION_STREAM`.
- **`streamBlockRoles`** — одна роль Keycloak или массив (коды из `V2_STREAM_BLOCK_ROLE` / `RoleStreamBlock`).

UI конструктора: панель «Стримовый блок» в `SchemaPropertiesPanel` — `StreamExecutorMultiSelect` + `StreamBlockRoleMultiSelect`.

### Типовые / нетиповые работы

На узле массива (или с наследованием от корневого streamBlock):

```json
{
  "ui:options": {
    "archComponent": "typicalWork",
    "streamExecutor": "pirm",
    "streamBlockRoles": ["ds"]
  }
}
```

| Контекст | UI |
|----------|-----|
| Свойства блока на холсте | секции «Типовые работы» / «Нетиповые работы» в `SchemaPropertiesPanel` |
| Редактор логики | вкладки «Типовые работы» / «Нетиповые работы», toolbar области (стрим + роли) |

Если **ни стрим, ни роль** не заданы (после резолва) — блок **виден всем**.

---

## 3. Контекст пользователя

### Роли

Из Keycloak `groups` → `userStore.roles` (react-client) или нормализация groups на бекенде.

| Enum (react-client) | Назначение |
|---------------------|------------|
| `RoleStreamBlock` | все 16 ролей Keycloak для проверки доступа к блокам |
| `RoleLead` | `ds_lead`, `de_lead`, `modelops_lead` — исключение для лидов |

Правила доступа применяются только если у пользователя есть **хотя бы одна** роль из `RoleStreamBlock` (`userHasV2AnketaStreamBlockFilteredRole`). Пользователь без таких ролей (например, только `validator` без stream-block роли) видит **все** блоки.

### Стримы пользователя

Коды `implementationStream` из groups Keycloak — тот же маппинг департаментов, что для фильтра реестра:

```text
Keycloak groups
    → normalizeV2UserGroups
    → extractDepartmentsAndStreamGroups
    → DEPARTMENT_TO_V2_STREAM_CODES
    → resolveV2UserImplementationStreamsFromGroups
    → V2AnketaViewerAccessContext.streams
```

Роли, для которых стримы резолвятся из groups: `V2_USER_STREAM_FILTERED_ROLE_CODES` (`ds`, `de`, `data_expert`, `mipm_stream`, `modelops`) — синхронно с `STREAM_FILTERED_ROLES` на бекенде. `sarep` в этот список **не** входит: реестр ему не режется, стрим берётся из AD-группы `sum_sarep_<stream>`.

Достаточно **одного** совпадения: если у пользователя несколько ролей или несколько стримов, блок виден при пересечении **хотя бы по одной** роли **или** одному стриму.

---

## 4. Правила видимости блоков

### Обычный пользователь уровня A (только свой стрим в **реестре**)

Роли: `ds`, `de`, `modelops`, `da_stream`, `mipm_stream`, `data_expert` — и **нет** роли уровня B/C.

F-05 §2: жёсткий фильтр действует на **список анкет** (и 403 на чужие).  
В **карточке** доступной анкеты — полная детализация: **все стрим-вкладки видны** (как у лида по составу блоков). Оценки у Level A не маскируются.

Для кнопки «Завершить заполнение анкеты» обязательны только блоки своего стрима/роли (`isBlockInViewerOwnStreamScope`).

### Уровни B/C и лиды (`userSeesAllAnketaStreamBlocks`)

Все стрим-блоки и typical/atypical **видны** (как у лида). Маскировка оценок:

| Роли | Оценки |
|------|--------|
| Лиды, architect, mntranlst, da, sarep | чужие стримы скрыты |
| validator / validator_lead | все оценки скрыты |
| mipm, sacfg, saprg, appadmin, auditor* | полная детализация |

### Представитель стрима вне ЖЦМ (`sarep`)

Видимость — как у уровня B: все вкладки открыты, чужие оценки скрыты. Дополнительно ограничены правка и статусы (`V2_ANKETA_EDIT_ONLY_OWN_STREAM_ROLE_CODES`):

| Раздел | Просмотр | Правка | «Завершить заполнение» |
|--------|----------|--------|------------------------|
| Свой стрим | да, с оценками | да | да |
| Чужой стрим | да, без оценок и нормативов (названия работ видны) | нет | нет |
| `generalInfo`, `detailInfo` | да | да | нет |
| Анкета целиком | — | — | нет, всегда |

`generalInfo` и `detailInfo` перечислены в `V2_ANKETA_SHARED_SECTION_KEYS`: `detailInfo` помечен стрим-блоком модельных стримов, поэтому по общему правилу попал бы в «чужие» и стал бы read-only.

Реализация: `isV2AnketaPathEditableForViewer` (поля и арх-панели), `canViewerCompleteAnketaSection` (кнопка раздела), `canViewerCompleteWholeAnketa` (глобальная кнопка). Право `anketa_complete_anketa` у `/sarep` снято в `v2-keycloak-f05-sync.ts`; `anketa_workflow_approve` оставлено — оно нужно для закрытия своего раздела.

В 1-й итерации у `sarep` также нет создания и удаления анкет: в F-05 у `/sarep` нет `anketa_create_calculation` / `anketa_delete_calculation`; дополнительно доменный запрет в `userCanCreateV2Questionnaire` / `userHasV2QuestionnaireDeleteRole` (UI + API), чтобы остаточные KK-роли не открывали кнопки.

Сервер (`V2QuestionnaireService.update`) сверяет переходы workflow через `collectForbiddenV2AnketaWorkflowChanges` и **логирует** нарушения, не блокируя сохранение. Правки данных на сервере не сверяются: клиент сохраняет `displayFormData` целиком, включая пересчитанные движком типовые работы, поэтому дифф поддеревьев давал бы ложные срабатывания на автосохранении.

### Примеры

| Блок: стримы | Блок: роли | Пользователь | Просмотр |
|--------------|------------|--------------|----------|
| `[idsrc]` | `[ds]` | `de`, стрим `dadm` | Скрыт |
| `[idsrc, dadm]` | `[]` | `de`, стрим `dadm` | Виден |
| `[idsrc]` | `[de, ds]` | `ds`, стрим `pirm` | Виден (роль) |
| `[]` | `[]` | любой | Виден |
| Стрим-блок `pirm`, без работ | — | `ds_lead`, `idsrc` | Блок полностью виден |
| typicalWork `pirm` | — | `ds_lead`, `idsrc` | Блок виден; оценки скрыты |

---

## 5. Где применяется логика

| Слой | Видимость блоков | Маскировка оценок | Расчёт |
|------|------------------|-------------------|--------|
| Просмотр анкеты (RJSF) | Да | Да (лиды) | — |
| `POST /v2/templates/:id/calculate` | **Нет** | **Нет** | Полный |
| `GET/POST …/export/xlsx` | Да (колонки) | Да (значения) | — |
| Конструктор / превью шаблона | **Нет** | **Нет** | — |

### Просмотр анкеты (react-client)

```text
useUserStore (groups, roles)
    → useAnketaViewerAccess / buildAnketaViewerAccessFromStore
    → AnketaFormContext.viewerAccess { roles, streams, applyAccessRules }
    → V2PreviewObjectFieldTemplate — filter root / nested / array paths
    → AnketaModalArrayTable — mask estimate columns for leads
```

`applyAccessRules: true` только в реальной анкете (`AnketaFormShell` без `debouncePreviewInputs`).

### Экспорт реестра (nestjs-server)

```text
@CurrentUser().groups
    → buildV2AnketaViewerAccessFromUser
    → buildV2QuestionnaireRegistryXlsx({ viewerAccess, applyAccessRules })
    → buildV2QuestionnaireRegistryColumnTree — пропуск скрытых root-секций
    → buildV2QuestionnaireRegistryExportColumns — фильтр leaf-колонок + maskV2AnketaExportFormValue
```

Эндпоинты: `GET /v2/questionnaires/export/xlsx`, `POST /v2/questionnaires/export/xlsx`.

---

## 6. API-contract: хелперы

Файл: `packages/api-contract/src/v2-anketa-block-access.util.ts`

| Функция | Назначение |
|---------|------------|
| `resolveV2AnketaBlockAccessRestrictionsForOutputPath(uiSchema, path)` | стримы + роли блока по dot-пути |
| `shouldApplyV2AnketaBlockAccessAtPath(uiSchema, path)` | нужна ли проверка (streamBlock / typicalWork / atypicalWork) |
| `isBlockVisibleForUser(viewer, restrictions)` | видимость: уровень A — фильтр; B/C/лиды → always true |
| `collectRequiredWorkflowTargetsForViewer(...)` | обязательные секции для «Завершить анкету» **без скрытых** ролевкой блоков |
| `isV2AnketaBlockVisibleForViewer(viewer, uiSchema, path, opts)` | обёртка для UI/экспорта |
| `shouldMaskWorkEstimatesForUser(viewer, blockStreamExecutors)` | маскировка оценок для лидов |
| `shouldMaskWorkEstimatesForViewerAtPath(...)` | маскировка по пути массива работ |
| `isV2AnketaFormPathVisibleForViewer(...)` | видимость formPath для колонок экспорта |
| `maskV2AnketaExportFormValue(formPath, raw, viewer, uiSchema, opts)` | пустое значение для скрытых/замаскированных полей |

Стримы пользователя: `packages/api-contract/src/v2-user-stream-mapping.util.ts`

| Функция | Назначение |
|---------|------------|
| `normalizeV2UserGroups` | разбор Keycloak groups |
| `resolveV2UserImplementationStreamsFromGroups` | коды стримов пользователя |
| `isV2UserStreamFilteredByGroups` | нужно ли резолвить стримы из groups |

Роли блока: `packages/api-contract/src/v2-stream-block-role.util.ts` — `V2_STREAM_BLOCK_ROLE`, `normalizeStreamBlockRoles`.

---

## 7. Ключевые файлы

| Файл | Содержание |
|------|------------|
| `packages/api-contract/src/v2-anketa-block-access.util.ts` | правила видимости и маскировки |
| `packages/api-contract/src/v2-anketa-block-access.util.test.ts` | unit-тесты |
| `packages/api-contract/src/v2-user-stream-mapping.util.ts` | groups → стримы пользователя |
| `packages/api-contract/src/v2-questionnaire-registry-columns.util.ts` | фильтр колонок и значений экспорта |
| `apps/react-client/src/types/roles.ts` | `RoleStreamBlock`, `RoleLead` |
| `apps/react-client/.../anketaViewerAccess.ts` | сбор `viewerAccess` из userStore |
| `apps/react-client/.../anketaFormContext.ts` | `viewerAccess` в formContext |
| `apps/react-client/.../AnketaFormShell.tsx` | передача контекста в форму |
| `apps/react-client/.../V2PreviewObjectFieldTemplate.tsx` | скрытие секций и массивов |
| `apps/react-client/.../AnketaModalArrayTable.tsx` | маскировка колонок оценок |
| `apps/react-client/.../SchemaPropertiesPanel.tsx` | настройка stream/roles в конструкторе |
| `apps/react-client/.../AtypicalWorksLogicPanel.tsx` | вкладка «Нетиповые работы» в логике |
| `apps/nestjs-server/.../v2-anketa-viewer-access.util.ts` | viewerAccess из `@CurrentUser` |
| `apps/nestjs-server/.../v2-questionnaire-registry-export.util.ts` | XLSX с учётом доступа |
| `apps/nestjs-server/.../v2-questionnaire.controller.ts` | export + CurrentUser |

---

## 8. Связь с фильтром реестра

| Механизм | Что фильтрует | Когда |
|----------|---------------|-------|
| `StreamFilterInterceptor` ([implementation-stream.md §3](./implementation-stream.md#3-фильтрация-реестра-stream-filter)) | **список анкет** по `generalInfo.implementationStream` | `GET /v2/questionnaires` |
| **Block access** (этот документ) | **поля внутри анкеты** при просмотре и в XLSX | UI + export |

Одиночный `GET /v2/questionnaires/:id` по-прежнему отдаёт полный `formData`; видимость секций накладывается на **клиенте** при рендере. Расчёт `POST /calculate` всегда использует полные данные.

---

## 9. Добавление роли или стрима

1. **Роль блока** — код в `V2_STREAM_BLOCK_ROLE` / `RoleStreamBlock` (`v2-stream-block-role.util.ts`, `roles.ts`), подпись в `V2_STREAM_BLOCK_ROLE_LABELS`, пункт в `StreamBlockRoleMultiSelect` / `LogicWorksToolbar`.
2. **Стрим** — по [implementation-stream.md §2](./implementation-stream.md#2-справочник-коды-и-подписи); при необходимости строка в `DEPARTMENT_TO_V2_STREAM_CODES` (`v2-user-stream-mapping.util.ts`) и в `StreamMappingService` на бекенде.
3. **Лид** — код в `V2_ANKETA_LEAD_ROLE_CODES` и `RoleLead`.

Потребители берут `@smart-anketa/api-contract` из `src/` напрямую (Vite/Webpack/Nest+tsx) — отдельный `npm run build` в пакете не нужен.

### Связанная документация

| Документ | Тема |
|----------|------|
| [implementation-stream.md](./implementation-stream.md) | коды стримов, stream filter реестра, `streamExecutor`, логика типовых работ |
| этот документ | ролевка блоков при просмотре и экспорте, `streamBlockRoles`, лиды |
