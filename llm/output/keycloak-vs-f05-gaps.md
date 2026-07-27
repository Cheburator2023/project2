# Keycloak · роли Смарт-Анкеты 2.0 (F-05) — с нуля

**Контекст для прода:** в продовом Keycloak **нет** готовой ролевой модели Смарт-Анкеты 2.0.  
Все realm roles ниже и все привязки к группам считать **новыми** — создать и назначить целиком по этой спецификации.

Источники: `llm/F-05. Ролевая модель Смарт-Анкеты 2.0-9.md`, `llm/матрица-ролей.csv`.  
Группы пользователей СУМ (`/ds`, `/de`, …) на проде уже есть; **новые** — только `anketa_*` permissions и их mapping на группы.

Логины пользователей не важны — смотрим **группы → realm roles**.

---

## 1. Создать все realm roles (новые)

Realm → Roles → Create role. Имена **точно** как в таблице (их ждёт код).

| Realm role (новое) | Колонка матрицы | Описание для KK |
|--------------------|-----------------|-----------------|
| `anketa_view_all_calculations` | view_list / view_card | Просмотр реестра и карточки анкет |
| `anketa_create_calculation` | create | Создание анкеты / новой версии |
| `anketa_edit_calculation` | edit | Редактирование блоков анкеты |
| `anketa_delete_calculation` | delete | Удаление анкет |
| `anketa_export_reports` | export | Выгрузка / экспорт |
| `anketa_workflow_approve` | approve | Завершение заполнения блока |
| `anketa_hold` | hold | Утверждение / блокировка среза (только saprg) |
| `anketa_admin_panel` | admin | Админ-панель / конструктор |
| `anketa_audit_view` | audit | Журнал аудита |

Итого: **9 новых** realm roles. Пока их нет в JWT — соответствующие кнопки и API в приложении не откроются.

---

## 2. Назначить роли группам (целевая матрица)

Канон path групп: **lowercase**, лиды **top-level** (`/ds`, `/ds_lead`, `/de`, `/de_lead`, `/modelops`, `/modelops_lead`).  
Nested `/ds/ds_lead`, `/de/de_lead`, `/modelops/modelops_lead` — не использовать.  
Если на стенде есть и `/DS`, и `/ds` — роли вешать **только на lowercase**; uppercase-дубли **не удалять и не склеивать**.

| Группа KK | Роли, которые нужно **назначить** группе (все новые) | Роль в F-05 |
|-----------|------------------------------------------------------|-------------|
| `/ds` | `anketa_view_all_calculations`, `anketa_export_reports` | DS |
| `/ds_lead` | `anketa_view_all_calculations`, `anketa_create_calculation`, `anketa_edit_calculation`, `anketa_delete_calculation`, `anketa_export_reports`, `anketa_workflow_approve` | Руководитель DS |
| `/de` | `anketa_view_all_calculations`, `anketa_export_reports` | DE |
| `/de_lead` | `anketa_view_all_calculations`, `anketa_edit_calculation`, `anketa_export_reports`, `anketa_workflow_approve` | Руководитель DE |
| `/modelops` | `anketa_view_all_calculations`, `anketa_export_reports` | ModelOps |
| `/modelops_lead` | `anketa_view_all_calculations`, `anketa_create_calculation`, `anketa_edit_calculation`, `anketa_delete_calculation`, `anketa_export_reports`, `anketa_workflow_approve` | Руководитель ModelOps |
| `/business_customer` | _(пусто — доступ не выдаём)_ | Бизнес-заказчик |
| `/mipm` | `anketa_view_all_calculations`, `anketa_export_reports` | Бизнес-партнёр / Бизнес-партнёр стрима |
| `/validator` | `anketa_view_all_calculations`, `anketa_export_reports` | Валидатор |
| `/validator_lead` | `anketa_view_all_calculations`, `anketa_export_reports` | Руководитель группы валидации |
| `/architect` | `anketa_view_all_calculations`, `anketa_edit_calculation`, `anketa_export_reports`, `anketa_workflow_approve` | Архитектор данных ML |
| `/mntranlst` **(новая группа)** | `anketa_view_all_calculations`, `anketa_edit_calculation`, `anketa_export_reports`, `anketa_workflow_approve` | Аналитик качества работы моделей ДАДМ |
| `/da` **(новая группа)** | `anketa_view_all_calculations`, `anketa_edit_calculation`, `anketa_export_reports` | Аналитик качества модельных данных |
| `/admin_it` | `anketa_view_all_calculations`, `anketa_admin_panel`, `anketa_audit_view` | Прикладной администратор |
| `/admin_it/admin_it_lead` | то же, что `/admin_it` | Прикладной администратор (lead) |
| `/auditor` | `anketa_view_all_calculations`, `anketa_export_reports`, `anketa_audit_view` | Аудитор |
| `/auditor/auditor_lead` | то же, что `/auditor` | |
| `/auditorib` **(новая группа)** | `anketa_view_all_calculations`, `anketa_export_reports`, `anketa_audit_view` | Аудитор ИБ |
| `/project_office` | _(пусто — доступ не выдаём)_ | Сотрудник Проектного офиса |
| `/sacfg` | `anketa_view_all_calculations`, `anketa_create_calculation`, `anketa_edit_calculation`, `anketa_delete_calculation`, `anketa_export_reports`, `anketa_workflow_approve`, `anketa_admin_panel` | Конфигуратор Смарт-Анкеты |
| `/saprg` | `anketa_view_all_calculations`, `anketa_export_reports`, `anketa_hold` | Руководитель программ ДАДМ |
| `/sarep` | `anketa_view_all_calculations`, `anketa_create_calculation`, `anketa_edit_calculation`, `anketa_delete_calculation`, `anketa_export_reports`, `anketa_workflow_approve` | Представитель стрима вне ЖЦМ |

Подрепки `/sarep/dev_sum_sarep_*` наследуют членство через родительскую `/sarep` **только если** так настроено в KK; иначе те же роли повесить на используемые подгруппы или убедиться, что юзеры состоят в `/sarep`.

### Чего **не** давать (частые ошибки)

| Группа | Не назначать |
|--------|----------------|
| `/ds_lead` | `anketa_admin_panel`, `anketa_audit_view` |
| `/de_lead` | `anketa_create_calculation`, `anketa_delete_calculation`, `anketa_admin_panel` |
| `/mipm` | `anketa_edit_calculation`, `anketa_workflow_approve` (Бизнес-партнёр — только просмотр+экспорт) |
| `/da` | `anketa_workflow_approve` (не завершает модельные блоки) |
| `/admin_it*` | `anketa_export_reports` (сознательно по матрице) |
| `/saprg` | create / edit / delete / approve / admin / audit |
| `/business_customer`, `/project_office` | любые `anketa_*` |

---

## 3. Матрица полномочий (шпаргалка)

| Роль F-05 | view | create | edit | delete | export | approve | hold | admin | audit |
|-----------|:----:|:------:|:----:|:------:|:------:|:-------:|:----:|:-----:|:-----:|
| DS | ✓ | | | | ✓ | | | | |
| DS Lead | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| DE | ✓ | | | | ✓ | | | | |
| DE Lead | ✓ | | ✓ | | ✓ | ✓ | | | |
| ModelOps | ✓ | | | | ✓ | | | | |
| ModelOps Lead | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| Бизнес-заказчик | | | | | | | | | |
| Validator (+ Lead) | ✓ | | | | ✓ | | | | |
| Архитектор ML | ✓ | | ✓ | | ✓ | ✓ | | | |
| Аналитик ДАДМ (mipm) | ✓ | | ✓ | | ✓ | ✓ | | | |
| Прикладной админ | ✓ | | | | | | | ✓ | ✓ |
| Аудитор | ✓ | | | | ✓ | | | | ✓ |
| Руководитель программ (saprg) | ✓ | | | | ✓ | | ✓ | | |
| Конфигуратор (sacfg) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
| Представитель стрима (sarep) | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |

Фильтрация по стримам (реестр / блоки) — в **коде** приложения по groups, не отдельными realm roles.

---

## 4. Порядок работ на проде (для поддержки)

1. Partial export / снимок realm (бекап).
2. Создать **все 9** realm roles из §1.
3. Для каждой группы из §2: Role mapping → Assign realm roles (ровно список из таблицы).
4. Проверить: у группы нет лишних `anketa_*`.
5. Пользователям — re-login (обновить JWT).
6. Смоук по ролям из матрицы.

Детали UI / ИФТ-кнопка / скрипты: `llm/output/keycloak-ift-prod-runbook.md`.

---

## 5. Автоматизация (не прод разработки)

Если есть Admin API (ИФТ / SUMD / sumcore):

```bash
# только назначение ролей (без склейки/удаления case-дублей)
node scripts/keycloak-remap-anketa-group-roles.mjs --apply
```

Или UI: Админка → Настройки → «Keycloak · роли F-05» (доступ appadmin / sacfg).

`keycloak-merge-case-duplicate-groups.mjs` **отключён** — дубли `/DE` vs `/de` не трогаем.

На **проде** скрипты/кнопку команда разработки **не** запускает — только заявка поддержке по этому документу.

Сверка SUMD ↔ sumcore ↔ матрица: `llm/output/keycloak-sumd-vs-sumcore-vs-matrix.json`.
