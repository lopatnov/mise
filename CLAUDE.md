# CLAUDE.md — Context & Guidelines for Mise

## Как работает поддержка проекта (читать первым)

Проект **уже построен и работает** (self-hosted recipe manager, открытый исходный код) —
приоритет не «сгенерировать с нуля», а **поддерживать и осознанно развивать**: держать зелёный
билд, не давать модулям разрастаться за пределы устоявшегося стиля, регулярно подтягивать
зависимости и закрывать security-алерты, и параллельно — учиться у похожих open-source проектов,
а не изобретать фичи в вакууме.

Два независимых цикла, оба раз в две недели, со сдвигом на неделю друг относительно друга (в
сумме — касание проекта примерно раз в неделю, попеременно):

- [`/maintain`](.claude/commands/maintain.md) — **обновление**: зависимости, security-алерты,
  рефакторинг, верификация сборки, changelog, PR. Дирижёр + точечные специалисты-агенты — быстрый
  процедурный цикл, без группового обсуждения (решения здесь рутинные, дискуссия не нужна).
- [`/evolve`](.claude/commands/evolve.md) — **развитие**: изучение аналогичных open-source
  проектов, генерация и взвешивание новых идей через агентный паттерн **Group Chat** (см.
  [`.claude/skills/group-chat/SKILL.md`](.claude/skills/group-chat/SKILL.md)) — несколько
  агентов-персон реально видят реплики друг друга в общем транскрипте и спорят, а не просто
  докладывают дирижёру порознь. Результат — ранжированные предложения в GitHub Issues
  (`idea-radar`), **не** автоматические PR: решение о реализации — за пользователем.

Главная сессия Claude — дирижёр, делает большинство работы **сама**. Специалисты-агенты
(`.claude/agents/*`) вызываются точечно — не на каждую мелкую правку. Перед работой прочитай:
[`.claude/rules/index.md`](.claude/rules/index.md) →
[`.claude/rules/workflow.md`](.claude/rules/workflow.md) →
[`.claude/rules/team.md`](.claude/rules/team.md) →
[`.claude/rules/conventions.md`](.claude/rules/conventions.md).

Продуктовый бэклог, баги и находки радаров живут в **GitHub Issues**
(`lopatnov/mise/issues`) — не в локальных файлах `.claude/`. Метки:
`tech-radar` — устаревшие технологические решения самого проекта (см. `/maintain`, шаг 5);
`idea-radar` — идеи, подсмотренные у аналогичных проектов (см. `/evolve`).

**Разделение ответственности файлов:**

- **Процесс команды** (роли агентов, правила вызова, паттерн Group Chat) — в `.claude/`.
- **Специфика этого проекта** (стек, конвенции кода, команды сборки) — здесь, в CLAUDE.md.

---

## Project Overview

**Mise** (_mise en place_) — self-hosted recipe manager, GPLv3. Пользователи хранят и делятся
рецептами (фото, ингредиенты, шаги), масштабируют порции, ищут по тексту, фильтруют по тегам и
категориям, импортируют рецепт по URL (JSON-LD/OpenGraph). Есть публичные (community) рецепты,
избранное, админ-панель (пользователи, инвайты, SMTP, настройки приложения), верификация email,
тёмная/светлая тема, печатный вид, 33 локали.

Целевой пользователь — **самостоятельный хостинг для себя/семьи/небольшой группы**, не SaaS —
это существенно для оценки идей в `/evolve` (см. `agents/product-strategist.md`): фича, полезная
только в мультитенантном облачном продукте, может не подходить Mise даже если она хороша у
конкурента.

## Радар аналогов — источники для `/evolve`

Похожие self-hosted проекты управления рецептами/кухней, на которые ориентируется
`competitor-scout` (список стартовый, не исчерпывающий — агент может обосновать добавление
нового источника с ссылкой):

- [Mealie](https://github.com/mealie-recipes/mealie)
- [Tandoor Recipes](https://github.com/TandoorRecipes/recipes)
- [Grocy](https://github.com/grocy/grocy)
- [Nextcloud Cookbook](https://github.com/nextcloud/cookbook)
- [KitchenOwl](https://github.com/TomBursch/kitchenowl)
- [RecipeSage](https://github.com/julianpoy/RecipeSage)
- [Cooklang / cooklang-chef](https://cooklang.org)

## Tech Stack

| Layer          | Technology                                          |
| -------------- | ---------------------------------------------------- |
| Backend        | Node.js 24, NestJS 11, TypeScript                    |
| Database       | MongoDB 8, Mongoose                                  |
| Auth           | JWT Bearer (`@nestjs/jwt`, `passport-jwt`), bcrypt    |
| Frontend       | React 19, Vite 8, TanStack Query 5, Zustand 5         |
| i18n           | i18next / react-i18next, 33 локали                    |
| Lint / Format  | Biome (единый для `api/` и `web/`, см. `biome.json`)  |
| Reverse proxy  | nginx (single-port, CSP headers)                      |
| Infrastructure | Docker Compose (`docker-compose.yml` — dev, `docker-compose.prod.yml` — prod) |

## Architecture

### Backend — `api/src/`

Стандартная декомпозиция NestJS по фиче-модулям — партиал-классов, как в проектах на .NET, здесь
нет, роль декомпозиции играет сам модуль:

- `admin/`, `auth/`, `categories/`, `recipes/`, `seo/`, `uploads/`, `users/` — каждый:
  `*.module.ts`, `*.controller.ts`, `*.service.ts` (плюс `*.schema.ts` для Mongoose-моделей,
  `dto/` для request/response DTO с `class-validator`).
- `common/` — сквозное: `decorators/`, `guards/` (`jwt-auth.guard.ts`, `rate-limit.guard.ts`),
  `http-exception.filter.ts`.

Правило: если контроллер/сервис одного модуля разрастается за пределы того, что можно охватить
взглядом (см. «Дисциплина билдов» — сигнал `repo-scout`, порог >300 строк) — это повод для
`architect` рассмотреть выделение под-сервиса или отдельного модуля, а не автоматически резать
файл на части ради строк.

### Frontend — `web/src/`

- `pages/*.tsx` — страничные компоненты; в отличие от паттерна «page + один хук на страницу»,
  здесь страницы сами держат состояние через `@tanstack/react-query` (`useQuery`/`useMutation`) и
  локальный `useState`, без обязательного выноса в отдельный `useXxx`-хук на каждую страницу — это
  устоявшийся стиль проекта, не отклонение, которое нужно чинить.
- `hooks/` — только реально переиспользуемые сквозные хуки (`usePageTitle`, `useMetaTags`,
  `useStructuredData`, `useTheme`), не по одному на страницу.
- `store/` — Zustand: `authStore` (сессия/токен), `toastStore` (уведомления).
- `api/` — тонкие клиенты на `axios` по домену: `admin.ts`, `auth.ts`, `categories.ts`,
  `recipes.ts`, `client.ts` (общий инстанс).
- `components/` — переиспользуемые презентационные компоненты (`NavBar`, `Footer`, `Toast`,
  `ConfirmDialog`, `Lightbox`, `ImportUrlDialog`, `LanguageSwitcher`, `ErrorBoundary`).
- `i18n/locales/*.json` — 33 файла, `en.json` — эталон по ключам (`npm run check:locales`
  сверяет остальные 32 с ним, см. `web/scripts/check-locales.mjs`).

Правило: если `pages/*.tsx` разрастается так, что смешивает несколько презентационных
JSX-блоков/ответственностей — сигнал для `ui-developer` вынести под-компоненты в `components/`,
не обязательно выносить хук (в отличие от pressmark — другого проекта того же автора с похожим
процессом поддержки, — здесь это не единственный принятый паттерн).

---

## Code & Quality Guidelines

### Общие принципы (наследуются из `.claude/rules/`)

- **Простота важнее «умности».** Код пишется «как окружающий код» (стиль, нейминг).
- **Качество кода — по Robert C. Martin** (Clean Code / Clean Architecture / SOLID / Boy Scout
  Rule), не абстрактно: конкретная рубрика для рефакторинга и код-ревью — «Владение качеством
  кода» в [`.claude/agents/architect.md`](.claude/agents/architect.md), адаптированная под стек
  Mise. Применяется избирательно (файл/дифф, уже привлёкший внимание), не формальный чек-лист по
  всей кодовой базе.
- **Билд зелёный перед коммитом** — см. [`.claude/rules/index.md`](.claude/rules/index.md),
  «Дисциплина билдов».
- **Коммиты/ветки** — Conventional-подобный формат из `CONTRIBUTING.md` (`feat:`/`fix:`/`chore:`/
  `docs:`/`test:`/`refactor:`, без scope в скобках, императив, английский язык).
- **Весь код, комментарии, коммиты, issues и PR — на английском** (проект — публичный OSS на
  английском; корневой `CLAUDE.md` и `.claude/`-файлы процесса — на русском, языке рабочего диалога
  с пользователем — сознательное решение, не исключение по недосмотру: этот файл целиком, как и
  весь `.claude/`, описывает процесс работы с Claude Code над проектом, а не сам продукт Mise).

### Специфика стека

- **Backend:** `async`/`await`, DTO + `class-validator` на входе каждого эндпоинта, Mongoose-схемы
  в `*.schema.ts`. Чувствительные модули — `auth`, `admin`, `uploads`, `users` — see
  `security-engineer`.
- **Frontend:** только функциональные компоненты. Каждая видимая строка — через `t('key')`
  (`react-i18next`); добавляя/меняя UI-строку — обязателен ключ в `en.json` (эталон), остальные 32
  локали добивает `translator` (haiku) по точному списку ключей.
- **Доступ к данным:** MongoDB через Mongoose, схемы — `*.schema.ts` рядом с модулем; миграций в
  классическом смысле нет (schemaless), но breaking-изменения формы документа — через
  `architect` (см. `agents/architect.md`), с планом обратной совместимости для уже сохранённых
  данных.
- **Безопасность:** JWT (`JwtAuthGuard`), пароли — `bcrypt`, лимит запросов — `RateLimitGuard`.
  Инвайты/верификация email/сброс пароля/SMTP — чувствительная зона, ревью
  `security-engineer` при нетривиальных изменениях. `.env.prod` — только плейсхолдеры в
  репозитории, реальные секреты никогда не коммитятся.

### Frontend / UI

- Состояния loading/error/empty — обязательны на каждой странице со списком данных.
- Один файл — один экспортируемый компонент верхнего уровня, плюс тривиальные приватные
  под-компоненты, если это реально упрощает файл.
- Тема (`useTheme`) и печатный вид — не ломать при добавлении новых страниц/компонентов.

---

## Commands Reference

> ⚠️ На эти команды опираются `/build`, агент `build-validator` и скилл `testing`.

### Development

- `docker compose up -d` — поднять MongoDB локально (API и frontend запускаются отдельно, см.
  README — «Run in this order: MongoDB → API → Frontend»).
- `cd api && npm run start:dev` — backend с hot-reload (порт 3000).
- `cd web && npm run dev` — frontend (Vite dev server, порт 4200).

### Build

- `cd api && npm run build` — `nest build`, 0 ошибок обязательны.
- `cd web && npm run build` — `tsc -b && vite build`, 0 ошибок TypeScript.

### Format / Lint

- `cd api && npm run lint` — `biome ci src/ test/` (read-only проверка, не мутирует файлы).
- `cd api && npm run format` — `biome check --write src/ test/` (мутирует — применяет форматирование).
- `cd web && npm run lint` — `biome ci src/`.
- `cd web && npm run format` — `biome check --write src/`.
- `cd web && npm run check:locales` — сверка ключей 32 локалей с `en.json`.

> `build-validator` использует **только** read-only варианты (`lint`), не `format` — применение
> форматирования это работа автора правки, не read-only верификатора.

### Testing

- `cd api && npm test` — unit-тесты (Jest, `api/src/**/*.spec.ts`).
- `cd api && npm run test:e2e` — e2e-тесты (Jest, `api/test/*.e2e-spec.ts`, требует MongoDB —
  см. CI `services.mongodb`).
- `cd web && npm run test` — frontend-тесты (Vitest + Testing Library).

### Dependencies

- Патч/минорные обновления — обычный Dependabot-флоу (`.github/dependabot.yml`: npm для `api/` и
  `web/`, docker для `api/`, `web/`, корня, github-actions — все еженедельно).
- Обновление до **действительно последних** версий (включая мажорные) — скилл
  [`dependency-freshness`](.claude/skills/dependency-freshness/SKILL.md).
- Плановый проход поддержки — [`/maintain`](.claude/commands/maintain.md), раз в две недели.
- Изучение аналогичных проектов и новые идеи — [`/evolve`](.claude/commands/evolve.md), раз в две
  недели (сдвиг на неделю от `/maintain`).

### CI (для справки, ничего не запускать вручную без причины)

`.github/workflows/ci.yml`, две независимые job:

- **api** — `npm ci` → `lint` → `test` (unit) → `test:e2e` → `build`. Поднимает `mongo:8` как
  service-контейнер.
- **web** — `npm ci` → `lint` → `check:locales` → `build`.

> ⚠️ **Известное расхождение:** CI для `web` **не запускает** `npm run test` (Vitest), хотя
> команда существует и тесты в репозитории есть (напр. `RecipeFormPage.test.tsx`,
> `authStore.test.ts`). `build-validator`/`/build` всё равно прогоняют `npm run test` для `web`
> локально как часть верификации (см. `.claude/commands/build.md`) — не полагайся на то, что
> зелёный CI гарантирует зелёные frontend-тесты. Если расхождение станет источником регрессий —
> кандидат на `devops` в `/maintain` (добавить шаг в `ci.yml`), не самостоятельное решение
> дирижёра без внимания пользователя, если требует изменения workflow.

---

## Project-specific notes

- Перед правками в `.claude`/`CLAUDE.md` проверяй `git status` — не трогай чужие незакоммиченные
  изменения (могла работать параллельная сессия/ветка).
- `.env.prod` в репозитории содержит только плейсхолдеры (`APP_URL`, `JWT_SECRET` и т.п.) — при
  ревью не путать с реальными секретами; реальные значения — только на сервере пользователя.
- Локализация: базовая локаль — `en.json`. При добавлении/изменении UI-строки — обязателен ключ в
  `en.json`; остальные 32 локали (включая `ru`) добивает `translator`, не оставлять расхождение
  копиться без причины (`npm run check:locales` в CI это поймает).
- Загрузка файлов (`uploads/`) — multer, ограничения размера/типа — чувствительная зона, см.
  `security-engineer` при изменениях.
- `CONTRIBUTING.md` указывает на GitHub Issues как источник бэклога (не на этот файл) — не заводи
  повторно ссылку на `./CLAUDE.md` как на бэклог, если правишь `CONTRIBUTING.md`: этот файл
  описывает процесс и стек, не список задач.
