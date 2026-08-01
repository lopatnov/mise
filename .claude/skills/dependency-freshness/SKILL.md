---
name: dependency-freshness
description: Чек-лист обновления зависимостей Mise до ДЕЙСТВИТЕЛЬНО последних версий — включая мажорные, Node.js LTS, Docker-образы и GitHub Actions — а не только то, что молча подтянет npm install, и не только то, что предложит Dependabot патчами. Применяй по запросу пользователя на плановое обновление зависимостей, или когда npm outdated показывает устаревшие мажоры.
---

# Dependency Freshness — обновление до реально последних версий

> Стек-специфичный скилл (в отличие от `.claude/rules/*`, которые веб-нейтральны). Команды ниже —
> для Mise: `api/` (NestJS/npm), `web/` (React/Vite/npm), плюс Docker-образы и GitHub Actions
> (зона `devops`, но чек-лист тот же по духу — registry/CI не гарантируют «последнее» так же, как
> package-менеджеры не гарантируют).

## Когда применять

- Пользователь просит «обнови зависимости до последних», плановый `/maintain`.
- `npm outdated` показывает разрыв между `Wanted` и `Latest` (особенно MAJOR).
- Раз в квартал стоит явно сверить Node.js LTS и мажоры NestJS/React, даже если ничего не «красное».

## Когда НЕ применять

- Точечный security-патч одного пакета (это делает обычный Dependabot-флоу, см.
  `security-engineer`).
- `npm install <pkg>@latest` без дальнейшей сверки диапазона в `package.json` — этого
  **недостаточно**: он ставит последнюю версию в `node_modules`, но если диапазон в `package.json`
  (`^`) уже её не покрывает, следующий `npm ci` откатит на старую при переустановке — именно
  поэтому этот скилл существует отдельным чек-листом.

## Почему обычные команды обновления не гарантируют «последнее»

- `npm outdated` — колонки `Current` / `Wanted` / `Latest`. `Wanted` — то, что возьмёт обычный
  `npm update` в пределах текущего `^`/`~`-диапазона в `package.json`; `Latest` — реально самая
  новая опубликованная версия. Расхождение `Wanted` ≠ `Latest` = потенциальный мажорный апдейт,
  который сам `npm update` не сделает.
- `npm install <pkg>` без версии — ставит `latest` **тег**, но не поправляет диапазон в
  `package.json` автоматически так, как ожидается для строгого пиннинга.
- Dependabot (`.github/dependabot.yml`) по умолчанию поднимает PR на минимальный набор, закрывающий
  security-алерт или minor/patch — не всегда доводит до самого нового major.

## Backend (`api/`, npm)

1. `cd api && npm outdated` — current/wanted/latest по каждому пакету.
2. Для каждого пакета с разрывом `Wanted` ≠ `Latest` (особенно MAJOR, напр. будущий NestJS 12) —
   `npm view <pkg> versions --json` + читать release notes/changelog пакета: breaking changes,
   минимальная поддерживаемая версия Node.js.
3. Обновлять поштучно (`npm install <pkg>@<latest>`), не пачкой — после каждого мажорного апдейта:
   `npm run build && npm test && npm run test:e2e` (см. Commands Reference в `CLAUDE.md`).
4. **NestJS major** (`@nestjs/common`, `@nestjs/core`, `@nestjs/*` — обновлять синхронно, версии
   должны совпадать между собой) — самостоятельная задача через `architect` при мажорном апдейте
   (breaking changes DI/декораторов), не мешать в один PR с рутинным bump'ом остальных пакетов.
5. **Mongoose major** — сверять отдельно: изменения в API схем/запросов между мажорами бывают
   breaking; прогонять `test:e2e` (реальная MongoDB) обязательно после апдейта, не только unit.
6. Проверить актуальность **Node.js LTS** отдельно от npm-пакетов (см. «Docker-образы» ниже —
   версия должна совпадать между `Dockerfile`, `ci.yml` (`node-version: 24`) и `package.json`
   engines, если он есть).

## Frontend (`web/`, npm)

1. `cd web && npm outdated`.
2. Для каждого пакета, где `Latest` выше `Wanted` (особенно MAJOR): `npm view <pkg> versions --json`
   — полный список опубликованных версий, чтобы увидеть pre-release/RC и настоящий последний
   стабильный тег.
3. Для MAJOR-апдейтов — `npm install <pkg>@latest` (для уже объявленной зависимости `npm install
   <pkg>` без версии переиспользует существующий диапазон в `package.json` и **не** перепрыгнет
   через несовместимый major сам по себе — именно поэтому нужен явный тег `@latest`). После этого
   **не полагайся молча** на то, что диапазон, который npm сам запишет в `package.json`, совпадает
   с политикой проекта — сверь явно: в Mise нет `.npmrc` с `save-exact`/`save-prefix`, и оба
   `package.json` (`api/`, `web/`) без исключений используют `^`-диапазоны — значит после `@latest`
   в `package.json` должен остаться `^<новая версия>`, не точная пиновка и не `~`. Если npm записал
   что-то другое — поправь вручную, чтобы не выбиться из принятого в проекте стиля. Для minor/patch
   внутри уже объявленного диапазона обычно достаточно `npm update`, без ручной правки
   `package.json`.
4. После каждого мажорного апдейта прогонять весь набор проверок: `npm run lint`, `npm run
   check:locales`, `npm run test`, `npm run build` — мажоры чаще всего ломают типы или рантайм-
   поведение незаметно для линтера.
5. **React major** — сверять отдельно и явно: `npm view react versions --json` /
   <https://react.dev/versions>. Апдейт React major (синхронно `react-dom`, `@types/react`,
   `@types/react-dom`) — самостоятельная задача через `architect` (новые API, deprecations), не в
   одном PR с рутинными bump'ами остальных пакетов.
6. **Vite major** — аналогично, сверять с <https://vite.dev>, конфиг (`vite.config.ts`) может
   требовать правок при мажорном апдейте.
7. **Biome** (`@biomejs/biome`, общий для `api`/`web`/корня) — обновлять во всех трёх
   `package.json` синхронно (корневой `package.json` + `api/package.json` + `web/package.json`),
   расхождение версий линтера между пакетами — источник несогласованных предупреждений.

## Docker-образы

Роль: `devops` (не покрывается `repo-scout` — тот смотрит только npm, не registry).

1. Для базовых образов (`api/Dockerfile`, `web/Dockerfile`, `mongo:8` в `docker-compose.yml`/
   `docker-compose.prod.yml`) сверь тег с реально доступными в registry (`docker manifest inspect
   <image>:<tag>` или страница тегов на Docker Hub), не полагайся на то, что тег вида `24-alpine`
   сам «подтянется» — он пиновый, Dependabot по нему молчит, пока паттерн совпадает.
2. **Node — сверяй LTS-статус, не только номер версии**: <https://nodejs.org/en/about/previous-releases>
   — берём Active LTS, не «Current»/pre-LTS и не затухающую «Maintenance».
3. **MongoDB** — сверять поддерживаемую мажорную линию (`mongo:8`) с текущим EOL-статусом на
   <https://www.mongodb.com/legal/support-policy/lifecycles>; апдейт мажора MongoDB — самостоятельная
   задача через `architect` (возможные breaking changes в query API/Mongoose-совместимости), не
   рутинный bump тега.
4. При апдейте Node — меняй **оба места одним PR**: `Dockerfile` (`api/`, `web/`) и `ci.yml`'s
   `node-version` — расхождение означает, что прод собирается на версии, которую CI не тестирует.

## GitHub Actions

Роль: `devops`. `.github/dependabot.yml` уже покрывает `github-actions` ecosystem еженедельно —
Dependabot **не всегда берёт мажоры** сам (держится совместимой версии) — для мажорного апдейта
action, который Dependabot не предложил:

1. Для каждого action в `.github/workflows/*.yml` (`actions/checkout`, `actions/setup-node`) —
   сверь закреплённую версию с последним релизом на странице action на GitHub.
2. Мажорный апдейт action — читай `Releases`/`CHANGELOG` на breaking changes во входных/выходных
   параметрах (`with:`/`outputs:`), не просто меняй номер версии в `uses:`.
3. После апдейта — обязательный прогон workflow (push в ветку) до мержа, не полагайся на то, что
   синтаксис не изменился.

## Итоговый чек-лист

- [ ] `npm outdated` прогнан для `api/` и `web/`.
- [ ] Каждый MAJOR-разрыв (`Wanted` ≠ `Latest`) сверен с release notes, апдейт сделан отдельно,
      билд+тесты зелёные после каждого.
- [ ] NestJS-пакеты (`@nestjs/*`) обновлены синхронно; апгрейд мажора — отдельная задача через
      `architect`.
- [ ] React/react-dom major сверен отдельно с react.dev/versions; апгрейд — отдельная задача.
- [ ] Biome-версия синхронна между корневым, `api/` и `web/` `package.json`.
- [ ] После апдейтов: `npm run lint && npm run test && npm run test:e2e && npm run build` (`api`)
      и `npm run lint && npm run check:locales && npm run test && npm run build` (`web`) — всё
      зелёное (делегировать `build-validator`).
- [ ] Базовые Docker-образы (Node, MongoDB) сверены с registry и LTS-статусом, версии Node
      совпадают между Dockerfile и `ci.yml` (`devops`).
- [ ] Версии GitHub Actions сверены с последними релизами; мажоры, которые Dependabot не поднял
      сам — апдейчены вручную с проверкой breaking changes (`devops`).

## Связанные роли и правила

- `repo-scout` — read-only снимок устаревших/уязвимых npm-пакетов одним проходом в начале
  `/maintain`, отправная точка для этого чек-листа вместо повторного запуска команд вручную.
  Docker-образы и GitHub Actions `repo-scout` не покрывает — это делает `devops` вручную.
- `build-validator` — прогон проверок после каждого апдейта, без замусоривания контекста.
- `architect` — решение по мажорным/фреймворк-апдейтам с breaking changes.
- `security-engineer` — если апдейт закрывает Dependabot security alert, свериться, что версия
  действительно патчит advisory (не просто «новее»).
- `devops` — владелец разделов «Docker-образы» и «GitHub Actions» выше.

## Definition of Done

Все пакеты сверены с реально последними опубликованными версиями (не только с тем, что подтянул бы
`npm install` вслепую), мажорные апдейты и апдейт Node.js LTS/React/NestJS обособлены в свои
задачи с обоснованием, билд/линт/тесты зелёные после каждого шага.
