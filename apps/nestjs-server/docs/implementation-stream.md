# Справочник `implementationStream` и фильтрация по стримам

Документ описывает поле **Стрим-исполнитель** анкеты v2 и то, как по нему фильтруется реестр для ролей со стрим-ограничением.

## 1. Назначение

`generalInfo.implementationStream` — справочное поле анкеты v2 («Стрим-исполнитель»).

| Слой | Что хранится |
|------|----------------|
| **formData / JSON Logic** | короткий **код** (`rb`, `kmbkcb`, …) |
| **UI (select)** | человекочитаемая **подпись** |
| **Реестр (грид)** | подпись (код резолвится в label) |

Это **не** то же самое, что `streamExecutor` у типовых работ / стрим-блоков конструктора (`V2_EXECUTOR_STREAM_LABELS`: ДАДМ, ПиРМ, …).  
`implementationStream` — атрибут **анкеты**; `streamExecutor` — привязка работ и блоков схемы.

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
- стримы `idsrc` / `mdlctl` / `pirm` / `strdat` / `digagt` пока не привязаны к департаментам: попадут в allow-list, если сами присутствуют в groups пользователя.

### Условия результата

1. Пользователь **не** из `STREAM_FILTERED_ROLES` → список без изменений.
2. Роль стрим-фильтруемая, но нет департаментов/стримов в groups → **пустой** список.
3. Есть разрешённые стримы → остаются анкеты, у которых `implementationStream` ∈ allow-list.
4. У анкеты нет `implementationStream` → она **не** проходит фильтр.

---

## 4. Ключевые файлы

| Файл | Содержание |
|------|------------|
| `packages/api-contract/src/v2-implementation-streams.util.ts` | коды, подписи, хелперы |
| `apps/nestjs-server/.../v2-default-organizational-dictionaries.ts` | seed справочника |
| `apps/nestjs-server/.../v2-default-anketa.snapshot.json` | enum / enumNames в схеме |
| `apps/react-client/.../dictionaryPreview.ts` | `storeCode` → code в formData |
| `apps/nestjs-server/src/shared/interceptors/stream-filter.interceptor.ts` | фильтр ответа |
| `apps/nestjs-server/src/shared/services/stream-mapping.service.ts` | роли → разрешённые стримы |
| `apps/nestjs-server/src/shared/utils/user-groups.util.ts` | разбор Keycloak groups |
| `apps/nestjs-server/.../v2-questionnaire.controller.ts` | `@StreamFilter()` на реестре |

---

## 5. Отличия v1 и v2

| | v1 | v2 |
|--|----|----|
| Поле | `streamExecutor` (колонка сущности) | `formData.generalInfo.implementationStream` |
| Типичное значение | длинная русская подпись | короткий код |
| Справочник UI | reference data / константы `STREAMS` | dictionary `v2.generalInfo.implementationStream` |
| Фильтр списка | `CalculationController` | `V2QuestionnaireController.findAll` |

Общий механизм: один `StreamFilterInterceptor` + `StreamMappingService`.
