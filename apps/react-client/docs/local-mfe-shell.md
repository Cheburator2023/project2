# Локальный MFE Smart Anketa + shell (localhost:8080)

## Симптом

```
GET http://localhost:8080/proxy/smart-anketa-frontend/remoteEntry.js 404
Модуль SmartAnketa недоступен
```

при том что `http://localhost:8004/remoteEntry.js` открывается.

**Причина:** shell на `:8080` не проксирует `/proxy/smart-anketa-frontend` на локальный webpack/vite. Это настройка **хоста (СУМ shell)**, не баг remoteEntry на 8004.

Ошибки `sum-rm-frontend` / `sum-frontend` / `data-lineage-frontend` — то же самое для других MFE (их тоже нет за proxy).

---

## Vite: remoteEntry vs React Router

В `vite serve` Module Federation **включён** — `http://localhost:8004/remoteEntry.js` должен отдавать JS, а не `index.html`/роутер.

Проверка:

```bash
curl -sI http://localhost:8004/remoteEntry.js | head
# content-type: …javascript (не text/html)
```

Для shell с CORS/origin:

```bash
npm run dev:vite:shell
# MF_SHELL=1 → server.origin=http://localhost:8004 + CORS *
```

> Webpack-host shell обычно ждёт **var**-контейнер. Надёжный вариант под СУМ shell — `npm run dev:webpack:shell`. Vite remoteEntry — ESM (удобно для MF/vite-host).

---

## Вариант A (предпочтительно): прямой URL remote

1. Запуск Smart Anketa:

```bash
cd apps/react-client
npm run dev:webpack:shell
# → http://localhost:8004/remoteEntry.js + CORS + publicPath http://localhost:8004/

# или vite (ESM remote):
npm run dev:vite:shell
```

2. В конфиге remotes shell (локальный override / `IS_LOCAL_START`) указать:

```js
smartAnketa: "http://localhost:8004/remoteEntry.js"
```

(имя ключа может отличаться — как в shell registry).

3. Открыть `http://localhost:8080/smartAnketa`.

---

## Вариант B: proxy-префикс как на стенде

1. Запуск с publicPath под proxy:

```bash
npm run dev:webpack:shell:proxy
# PUBLIC_PATH=/proxy/smart-anketa-frontend/
```

2. В **webpack/vite shell на 8080** добавить proxy:

```js
// пример
"/proxy/smart-anketa-frontend": {
  target: "http://localhost:8004",
  pathRewrite: { "^/proxy/smart-anketa-frontend": "" },
  changeOrigin: true,
}
```

Либо без rewrite, если shell форвардит полный path — тогда remote должен слушать с тем же PUBLIC_PATH (вариант `shell:proxy`).

3. Проверка:  
`http://localhost:8080/proxy/smart-anketa-frontend/remoteEntry.js` → 200 (JS), не 404.

---

## MIME `text/plain`

404/ошибка proxy отдаётся как `text/plain` → браузер: «Refused to execute script… MIME type text/plain». После рабочего proxy/прямого URL уходит само.

---

## Чеклист

| Проверка | Ожидание |
|----------|----------|
| `curl -I http://localhost:8004/remoteEntry.js` | 200, `content-type: …javascript` |
| `Access-Control-Allow-Origin` на 8004 | `*` (dev:webpack:shell / dev:vite:shell) |
| Запрос remote из Network на странице 8080 | 200, не `/proxy/...` 404 (если вариант A) |
| Backend API | Nest на `:3000` / как в urlConfig shell |
