# Справочник формы и реестр стримов

Документ описывает **два независимых источника**:

| Источник | Назначение |
|----------|------------|
| Словарь `v2.generalInfo.implementationStream` | Только select формы анкеты (1:1 с активными items) |
| Таблица `v2_stream` | Реестр для конструктора, runtime типовых работ, stream filter |

Справочники **не** являются source of truth для кода конструктора/расчёта.

**См. также:** [anketa-block-access.md](./anketa-block-access.md) — видимость стрим-блоков при просмотре анкеты и экспорте XLSX.

## 1. Поле анкеты

`generalInfo.implementationStream` — справочное поле анкеты v2 («Стрим-исполнитель»).

| Слой | Что хранится |
|------|----------------|
| **formData / JSON Logic** | короткий **код** (`rb`, `kmbkcb`, …) |
| **UI (select)** | активные items словаря `v2.generalInfo.implementationStream` |

Заводской seed словаря — **только 5 модельных** стримов (`kmbkcb`, `rb`, `ptitpc`, `finmdl`, `rnd`). Список в админке «Справочники» = список в форме (без скрытой фильтрации).

## 2. Реестр стримов (`v2_stream`)

**Source of truth для кода:** таблица `v2_stream`
(админка → **Стримы** `/admin/streams`, API `GET/POST/PUT/DELETE /v2/streams`).

**Factory defaults:** `buildFactoryImplementationStreamCatalog()` в
`packages/api-contract/src/v2-implementation-stream-catalog.util.ts`.

Seed реестра — soft-sync: добавляет отсутствующие factory-коды, не перетирает
label/payload и не удаляет стримы, созданные в UI.

| Код (≤ 6 символов) | Подпись (factory) |
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
| `mdls` | Модельный стрим (зонтик, `isActive=false`) |

### Payload item (`v2_stream.payload`)

| Поле | Назначение |
|------|------------|
| `dbNames[]` | имена в БД типовых работ; первое — канон при назначении |
| `legacyLabels[]` | старые UI-подписи (`ДАДМ`, …) |
| `keycloakAliases[]` | dept/group → allow-list stream filter |
| `isModelStream` | участие в umbrella «Модельный стрим» |
| `isUmbrellaStream` | зонтичный стрим |
| `v1Labels[]` | aliases v1 `streamExecutor` |

`isActive` на строке реестра = «в списках» конструктора / runtime / filter.

### Где используется реестр

| Место | Роль |
|-------|------|
| `/admin/streams` | CRUD реестра |
| `GET /v2/streams` | resolved catalog для клиента |
| Конструктор / логика типовых работ | `useV2ImplementationStreamCatalog` |
| Runtime типовых работ | `V2StreamCatalogService.getCatalog` |
| Stream filter / Keycloak aliases | `getFilterAliasMap` |

Хелперы:

- `isV2ImplementationStreamCode(value)` — factory-коды
- `buildFactoryImplementationStreamCatalog()` / `parseImplementationStreamPayload`
- `buildFactoryAnketaFormStreamDictionaryItems()` — seed словаря формы
- `resolveStreamBlockExecutorScopeStreams(code, catalog?)`
- `V2_IMPLEMENTATION_STREAM` — именованные константы factory-кодов

### Логика анкеты

В правилах JSON Logic сравнивайте с **кодом**:

```json
{ "==": [{ "var": "generalInfo.implementationStream" }, "rb"] }
```

---

## 3. Фильтрация реестра (stream filter)

### Роли, для которых фильтр включён

`STREAM_FILTERED_ROLES` (`roles.constant.ts`), например: `ds`, `de`, `data_expert`, `mipm_stream`, `modelops`, `da_stream`.

Alias-map строится из **активных** строк `v2_stream` (`keycloakAliases` + code/label/dbNames).

---

## 4. Миграция

`CreateV2StreamTable1764600000000`:

1. Создаёт `v2_stream`
2. Копирует бывшие items словаря implementationStream в `v2_stream`
3. Оставляет в словаре формы только 5 модельных кодов

После деплоя: рестарт Nest (seed словаря + soft-sync реестра).
