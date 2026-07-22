# Keycloak: выравнивание групп и ролей Смарт-Анкеты (F-05)

Скрипты в репо:

| Скрипт | Назначение |
|--------|------------|
| `scripts/keycloak-remap-anketa-group-roles.mjs` | Создать недостающие realm roles **и группы** (`/mntranlst`, `/da`, `/auditorib`, `/project_office`) и выставить group→role по матрице F-05 (редакция 2026-07, только канонические lowercase path) |
| `scripts/keycloak-merge-case-duplicate-groups.mjs` | **ОТКЛЮЧЁН** — раньше склеивал `/DE`→`/de`; дубли с разным регистром **не трогаем** |

**Не трогают:**
- кириллические `/departament/*` (стрим-маппинг);
- Latin-дубли с другим регистром (`/DE` vs `/de`, `/MIPM` vs `/mipm`, …) — оставляем как есть, роли вешаем только на канон из матрицы.

Целевая матрица: `llm/output/keycloak-vs-f05-gaps.md`.  
Сверка стендов: `llm/output/keycloak-sumd-vs-sumcore-vs-matrix.json`.

---

## Контуры

| URL | Назначение |
|-----|------------|
| `https://keycloak-sumd.sumd.dk1-sumd01.innodev.local/auth/` | **SUMD** — основной стенд (сюда целиться remap) |
| `https://keycloak-sumcore.sumd.dk1-sumd01.innodev.local/auth/` | **sumcore** — тестовый (уже выровнен под F-05) |

---

## Dev / стенд с Admin API

```bash
cd /path/to/smart_anketa_ui

export NODE_TLS_REJECT_UNAUTHORIZED=0
export KC_URL='https://keycloak-sumd….innodev.local/auth'   # без хвостового /
export KC_REALM=cym
export KC_ADMIN_REALM=master
export KC_ADMIN=admin
export KC_ADMIN_PASS='…'

# dry-run → apply (только роли; без merge групп)
node scripts/keycloak-remap-anketa-group-roles.mjs
node scripts/keycloak-remap-anketa-group-roles.mjs --apply
```

Проверка: у канонических групп Realm roles = из gaps.md. Uppercase-дубли, если есть, не удалять.

---

## ИФТ: кнопка в UI

1. В values/env ИФТ Nest: `KEYCLOAK_ADMIN_SYNC_ENABLED=true` (**на проде не ставить**).
2. Pod Nest должен достучаться до Keycloak Admin API (`KEYCLOAK_URL` = нужный контур).
3. Пользователь с `anketa_admin_panel` → **Админка → Настройки** → «Keycloak · роли F-05».
4. Сначала **«Создать бекап Keycloak»**, затем dry-run → apply.
5. Креды **не сохраняются**; без флага кнопка скрыта, POST → 403.
6. Sync делает **только remap** ролей — без склейки/удаления case-дублей.

---

## Прод (заявка поддержке Keycloak)

Команда разработки скрипты против прода **не** гоняет.

### Что приложить

1. `llm/output/keycloak-vs-f05-gaps.md` — спецификация ролей + mapping.
2. Этот runbook.
3. Формулировка: создать `anketa_*` roles и назначить **каноническим** группам по §2; Latin-дубли с другим регистром **не удалять**.

### Чеклист Admin Console

**A. Дубли групп** — **не удалять**. Роли вешать только на lowercase path из матрицы.

**B. Создать realm roles** (если нет): все 9 `anketa_*` из gaps.md §1.

**C. Role mapping** — Groups → каноническая группа → полный целевой набор из §2.

**D. После выката** — re-login; смоук по матрице.
