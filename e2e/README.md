# UI E2E (Playwright)

Симуляция действий админа по типовым работам и сверка с новой анкетой.

Playwright ставится **глобально** (не в `node_modules` репозитория).

## Требования

1. БД и сервисы как для локальной разработки.
2. God mode на UI и API:

```bash
# из корня репозитория
npm run dev:fullstack:god
```

3. Playwright один раз на машине (user prefix, без sudo):

```bash
mkdir -p ~/.npm-global
npm install -g @playwright/test@1.51.1 --prefix ~/.npm-global
export PATH="$HOME/.npm-global/bin:$PATH"
export NODE_PATH="$HOME/.npm-global/lib/node_modules${NODE_PATH:+:$NODE_PATH}"
playwright install chromium
```

В `~/.zshrc` уже можно прописать `PATH` / `NODE_PATH` на `~/.npm-global` (см. установку выше).

## Запуск

Серверы уже запущены (`reuseExistingServer` по умолчанию):

```bash
cd e2e && playwright test
# или из корня:
npm run test:e2e:ui
```

С UI Playwright:

```bash
cd e2e && playwright test --ui
```

Headed:

```bash
cd e2e && playwright test --headed
```

Переменные:

| Env | Default | Meaning |
|-----|---------|---------|
| `E2E_UI_BASE_URL` | `http://localhost:8004` | Vite UI |
| `E2E_API_BASE_URL` | `http://localhost:3000` | Nest API |
| `E2E_REUSE_SERVERS` | `1` (не `0`) | не поднимать webServer |

## Сценарии

### `specs/admin-typical-works-to-anketa.spec.ts`

Минимальный цикл: схема **без** сида → одна работа (модельный стрим) → always-trigger → анкета → сверка часов.

### `specs/full-factory-schema-to-anketa.spec.ts`

Полная **заводская схема** со всеми типовыми работами:

1. Создать схему «Заводская схема», дождаться сида (≥113 работ)  
2. Админка: список работ в UI + карточки (формула, норма, параметры) + `POST /preview`  
3. Сделать актуальной  
4. Новая анкета → `POST /calculate` → арифметика строк (норма × коэфф = итог) и сверка норм с карточками  
5. UI: «Диагностика расчёта» → «Вклад типовых работ» + имена в «Итоговой оценке»

Запуск только полного сценария:

```bash
cd e2e && playwright test specs/full-factory-schema-to-anketa.spec.ts
```

> Создание полной схемы и сид работ могут занять **несколько минут** (таймаут suite 20 мин).
