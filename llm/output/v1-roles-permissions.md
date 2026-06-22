# V1: роли, пермишены и правила доступа

Документ собран из кода бэкенда (`apps/nestjs-server`) и фронтенда (`apps/react-client`) для **калькулятора v1**.

> **Важно:** связь «роль → пермишен» **не хранится в репозитории** — она настраивается в Keycloak (realm roles + группы). Ниже — что проверяет приложение и откуда берутся данные. В конце — шаблон матрицы для заполнения по стенду.

---

## 1. Архитектура авторизации

### 1.1. Источники в JWT (Keycloak)

| Сущность | Поле токена | Enum в коде | Store на фронте |
|----------|-------------|-------------|-----------------|
| **Роли** (орг. роли) | `user.groups` | `Role` (`apps/react-client/src/types/roles.ts`) | `userStore.roles` |
| **Пермишены** (realm roles) | `user.realm_access.roles` | `Permission` (тот же файл + `apps/nestjs-server/src/shared/types/permissions.ts`) | `userStore.permissions` |

Загрузка на фронте (`apps/react-client/src/indexFederated.tsx`):

- `groups` → фильтр по значениям `Role`
- `realm_access.roles` → фильтр по значениям `Permission`

### 1.2. Проверки

| Слой | Механизм |
|------|----------|
| **Бэкенд** | `AuthGuard` + `RoleGuard` через `GodModeGuard`; методы помечены `@RealmRole(Permission.*)` → Keycloak `realm:anketa_*` |
| **Фронт (маршруты)** | `PermissionGuard` + `usePermissions()` |
| **Фронт (кнопки)** | Точечно `canEditCalculation`, `canCreateCalculation` на `AnketaPreviewPage` |

### 1.3. Dev / e2e

| Переменная | Где | Эффект |
|------------|-----|--------|
| `NO_ROLES=true` | бэкенд | `GodModeGuard` пропускает все запросы без проверки ролей |
| `NO_ROLES` (truthy) | фронт (`userStore`) | `hasRole` / `hasPermission` всегда `true` |

---

## 2. Справочник ролей (Keycloak groups)

Код роли = значение группы в JWT.

| Код | Enum |
|-----|------|
| `admin_it` | `Role.ADMIN_IT` |
| `admin_it_lead` | `Role.ADMIN_IT_LEAD` |
| `validator_lead` | `Role.VALIDATOR_LEAD` |
| `validator` | `Role.VALIDATOR` |
| `business_customer` | `Role.BUSINESS_CUSTOMER` |
| `bi_business_customer_broker` | `Role.BI_CUSTOMER_BROKER` |
| `ds` | `Role.DS` |
| `ds_lead` | `Role.DS_LEAD` |
| `de` | `Role.DE` |
| `de_lead` | `Role.DE_LEAD` |
| `modelops` | `Role.MODEL_OPS` |
| `modelops_lead` | `Role.MODEL_OPS_LEAD` |
| `mipm` | `Role.MIPM` |

**Использование в v1 UI:** роли объявлены в `useRoles()`, но **ни один экран v1 их не проверяет**. Ограничение для `ds` / `ds_lead` реализовано только на бэкенде (фильтр по стримам).

---

## 3. Справочник пермишенов (Keycloak realm roles)

| Код | Enum | Смысл |
|-----|------|-------|
| `anketa_view_all_calculations` | `ANKETA_VIEW_ALL_CALCULATIONS` | Просмотр реестра, анкеты, конфигурации, коэффициентов; экспорт Excel (API) |
| `anketa_create_calculation` | `ANKETA_CREATE_CALCULATION` | Создание анкеты, новой версии, клона |
| `anketa_edit_calculation` | `ANKETA_EDIT_CALCULATION` | Редактирование анкеты (PUT) |
| `anketa_export_reports` | `ANKETA_EXPORT_REPORTS` | Сравнение отчётов (только UI v1) |
| `anketa_admin_panel` | `ANKETA_ADMIN_PANEL` | Админ-панель v2 (`/admin/*`), не v1 |

---

## 4. Бэкенд v1: API → пермишен

Файл: `apps/nestjs-server/src/modules/calculation/controllers/calculation.controller.ts`

| HTTP | Путь | Пермишен | `@StreamFilter` |
|------|------|----------|-----------------|
| POST | `/calculation` | `anketa_create_calculation` | — |
| PUT | `/calculation/:id` | `anketa_edit_calculation` | да |
| GET | `/calculation/all` | `anketa_view_all_calculations` | да |
| GET | `/calculation/all/list` | `anketa_view_all_calculations` | да |
| GET | `/calculation/:id` | `anketa_view_all_calculations` | да |
| POST | `/calculation/export/excel` | `anketa_view_all_calculations` | да |
| POST | `/calculation/:id/new-version` | `anketa_create_calculation` | — |
| POST | `/calculation/:id/clone` | `anketa_create_calculation` | — |

Файлы: `questionnaire.controller.ts`, `coefficient.controller.ts`

| HTTP | Путь | Пермишен |
|------|------|----------|
| GET | `/questionnaire` | `anketa_view_all_calculations` |
| GET | `/questionnaire/coefficients` | `anketa_view_all_calculations` |
| GET | `/questionnaire/coefficients/:code` | `anketa_view_all_calculations` |

**Без `@RealmRole` (только JWT):**

- `task-tracker/*`
- `docs/*` — `@Public()`

---

## 5. Бэкенд: фильтрация по стримам (роли `ds`, `ds_lead`)

Файлы:

- `apps/nestjs-server/src/shared/constants/roles.constant.ts` — `STREAM_FILTERED_ROLES = ["ds", "ds_lead"]`
- `apps/nestjs-server/src/shared/services/stream-mapping.service.ts`
- `apps/nestjs-server/src/shared/interceptors/stream-filter.interceptor.ts`

### Логика

1. Если в `user.groups` есть `ds` или `ds_lead` → пользователь «stream-filtered».
2. Из groups извлекаются департаменты/стримы (`departments.constant.ts`, `streams.constant.ts`).
3. Департамент мапится в один или несколько стримов (`streamExecutor` анкеты).
4. На методах с `@StreamFilter()` **ответ-список** фильтруется: остаются анкеты, у которых `streamExecutor` ∈ разрешённые стримы.
5. Нет доступных стримов → пустой список / `total: 0`.
6. **GET `/calculation/:id` (один объект) не фильтруется** — объект возвращается целиком.

### Маппинг департамент → стримы

| Департамент (group) | Стримы |
|---------------------|--------|
| Управление моделирования КИБ и СМБ | Разработка моделей для КМБ и КСБ |
| Управление моделирования партнерств и ИТ-процессов | Модели партнерств и платформы больших данных; Моделирование RnD |
| Управление моделирования РБ | Моделирование РБ |
| Управление перспективных алгоритмов машинного обучения | Моделирование RnD |
| Управление процессных и финансовых моделей | Финансовое моделирование |

> В комментариях к `@StreamFilter` упоминаются DE/ModelOps, но в коде фильтруются только **`ds`** и **`ds_lead`**.

---

## 6. Фронтенд v1: маршруты

Файл: `apps/react-client/src/routing/version/v1/index.tsx`

| URL (`/v1/...`) | Страница | Пермишен |
|-----------------|----------|----------|
| `/`, `` | HomePage (реестр) | `anketa_view_all_calculations` |
| `calculation/create` | AnketaCreatePage | `anketa_create_calculation` |
| `calculation/preview/:id` | AnketaPreviewPage | `anketa_view_all_calculations` |
| `calculation/new_version/:id` | AnketaNewVersionPage | `anketa_create_calculation` |
| `calculation/clone/:id` | AnketaClonePage | `anketa_create_calculation` |
| `calculation/compare` | CompareReportsPage | `anketa_export_reports` |

При отсутствии пермишена — компонент `AccessDenied`.

---

## 7. Фронтенд v1: элементы UI

### AnketaPreviewPage

| Действие | Пермишен |
|----------|----------|
| Редактировать / сохранить | `anketa_edit_calculation` |
| Новая версия / шаблон | `anketa_create_calculation` |

### HomePage (реестр)

| Элемент | Проверка на UI |
|---------|----------------|
| Кнопка «+» (создать) | **нет** (маршрут create защищён) |
| «Экспорт в xlsx» | **нет** (бэк требует `anketa_view_all_calculations`) |
| AG Grid client export | **нет** |
| «Сравнить» | закомментировано |

### Меню (MenuContent)

Пункты v1 в сайдбаре **не скрываются** по пермишенам — блокировка только при переходе на защищённый маршрут.

---

## 8. Расхождения фронт ↔ бэк

| Тема | Фронт | Бэк |
|------|-------|-----|
| Сравнение отчётов | `anketa_export_reports` | пермишен **не проверяется** (страница client-only) |
| Экспорт Excel | кнопка без guard | `anketa_view_all_calculations` |
| Админка | `anketa_admin_panel` для `/admin/*` | v2-контроллеры **без** `@RealmRole` — только JWT |
| Роли DS/DE/… | не используются в v1 UI | `ds`/`ds_lead` → stream filter на списках |

---

## 9. Матрица «роль → пермишен» (Keycloak)

**В репозитории матрицы нет.** Заполните по Admin Console Keycloak или по документации стенда.

### 9.1. Шаблон

Обозначения: ✓ — пермишен выдан группе/роли в Keycloak, — — нет, ? — уточнить на стенде.

| Роль (group) | view | create | edit | export_reports | admin_panel |
|--------------|:----:|:------:|:----:|:--------------:|:-----------:|
| `admin_it` | ? | ? | ? | ? | ? |
| `admin_it_lead` | ? | ? | ? | ? | ? |
| `validator_lead` | ? | ? | ? | ? | ? |
| `validator` | ? | ? | ? | ? | ? |
| `business_customer` | ? | ? | ? | ? | ? |
| `bi_business_customer_broker` | ? | ? | ? | ? | ? |
| `ds` | ? | ? | ? | ? | ? |
| `ds_lead` | ? | ? | ? | ? | ? |
| `de` | ? | ? | ? | ? | ? |
| `de_lead` | ? | ? | ? | ? | ? |
| `modelops` | ? | ? | ? | ? | ? |
| `modelops_lead` | ? | ? | ? | ? | ? |
| `mipm` | ? | ? | ? | ? | ? |

Сокращения колонок: `view` = `anketa_view_all_calculations`, `create` = `anketa_create_calculation`, `edit` = `anketa_edit_calculation`, `export_reports` = `anketa_export_reports`, `admin_panel` = `anketa_admin_panel`.

### 9.2. Дополнительно для `ds` / `ds_lead`

Даже при наличии `view`/`create`/… пользователь видит в **реестре** только анкеты своих стримов (см. §5). Нужны groups с департаментом и/или стримом в JWT.

### 9.3. Как снять матрицу со стенда

1. Keycloak Admin → Realm → **Groups** → для каждой группы из §2 посмотреть **Role Mappings** (realm roles).
2. Либо взять JWT тестового пользователя и сравнить `groups` + `realm_access.roles`.
3. Заполнить таблицу §9.1 и сохранить обновление этого файла.

---

## 10. Сводка: «что даёт пермишен» (независимо от роли)

| Пермишен | V1: разрешено |
|----------|----------------|
| `anketa_view_all_calculations` | Реестр, просмотр анкеты, GET questionnaire/coefficients, POST export/excel |
| `anketa_create_calculation` | POST calculation, new-version, clone; UI: create / new_version / clone |
| `anketa_edit_calculation` | PUT calculation/:id; UI: редактирование на preview |
| `anketa_export_reports` | UI: `/v1/calculation/compare` |
| `anketa_admin_panel` | UI: `/admin/*` (v2 admin, не v1 API) |

---

## 11. Ключевые файлы

| Назначение | Путь |
|------------|------|
| Роли и пермишены (фронт) | `apps/react-client/src/types/roles.ts` |
| Хук пермишенов | `apps/react-client/src/hooks/usePermissions.ts` |
| Store пользователя | `apps/react-client/src/common/store/userStore.ts` |
| Маршруты v1 | `apps/react-client/src/routing/version/v1/index.tsx` |
| Guard маршрутов | `apps/react-client/src/common/primitives/PermissionGuard.tsx` |
| Пермишены (бэк) | `apps/nestjs-server/src/shared/types/permissions.ts` |
| Декоратор API | `apps/nestjs-server/src/shared/decorators/realm-role.decorator.ts` |
| Stream filter roles | `apps/nestjs-server/src/shared/constants/roles.constant.ts` |
| Stream mapping | `apps/nestjs-server/src/shared/services/stream-mapping.service.ts` |
| Calculation API | `apps/nestjs-server/src/modules/calculation/controllers/calculation.controller.ts` |

---

*Сгенерировано из кодовой базы smart_anketa_ui. Дата: 2026-06-19.*
