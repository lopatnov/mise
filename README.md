# 🍽 Mise

> _mise en place_

Self-hosted personal recipe book. Store recipes with ingredients, steps, tags and photos. Scale servings, search by ingredient, filter by category.

## Stack

| Layer          | Technology                                 |
| -------------- | ------------------------------------------ |
| Backend        | Node.js 24, NestJS 11, TypeScript          |
| Database       | MongoDB 8, Mongoose                        |
| Auth           | JWT Bearer                                 |
| Frontend       | React 19, Vite 8, React Query 5, Zustand 5 |
| Infrastructure | Docker Compose                             |

## Features

- **Recipe management** — create, edit, delete recipes with full details
- **Ingredients & steps** — dynamic lists, add/remove rows
- **Categories** — breakfast, lunch, dinner, dessert, drink and more (pre-seeded)
- **Tags** — free-form tagging, filter by tag
- **Photo upload** — attach a photo to any recipe
- **Search** — full-text search across title and tags
- **Auth** — JWT-based registration and login, each user has private recipes
- **Pagination** — server-side, 20 recipes per page

## Quick Start

### Option A — Docker (one command)

> Requires [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.

```bash
git clone https://github.com/lopatnov/mise.git
cd mise
docker compose up --build
```

- App: **http://localhost:5173**
- API / Swagger: http://localhost:3000/api/docs

To stop: `docker compose down`

---

### Option B — Manual (for development)

> **Run in this order:** MongoDB first → API second → Frontend third.
> The API won't connect if MongoDB isn't already running.

### Step 0 — Install prerequisites

You need three tools installed before starting. Check if you already have them:

```bash
git --version      # need 2.x or later
node --version     # need v20 or later
docker --version   # need Docker Desktop running
```

If anything is missing:

| Tool | Download | Notes |
|---|---|---|
| **Git** | https://git-scm.com/downloads | Included in Xcode CLT on macOS |
| **Node.js** | https://nodejs.org (LTS) | Choose v20 or v22 |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop | After installing, **open the app and wait for it to start** before running any `docker` commands |

> **Windows / macOS:** Docker requires the Docker Desktop app to be running in the background (you'll see the whale icon in the system tray / menu bar). Just having it installed is not enough.

### Step 1 — Clone and create environment files

```bash
git clone https://github.com/lopatnov/mise.git
cd mise
```

The `.env` files are not committed to git. Create them once before the first run.

**`api/.env`** — copy from `api/.env.example`, or create manually:

```env
MONGODB_URI=mongodb://localhost:27017/mise
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=7d
PORT=3000
```

**`web/.env`** — create in the `web/` directory:

```env
VITE_API_URL=http://localhost:3000
```

### Step 2 — Start MongoDB (Docker)

```bash
# Run from the repo root
docker compose up -d
```

MongoDB is now running on `localhost:27017`. Categories are seeded automatically when the API starts.

### Step 3 — Start the API

```bash
cd api
npm install        # first time only
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api/docs`
- The `api/uploads/` folder is created automatically on first start.

### Step 4 — Start the frontend (new terminal)

```bash
cd web
npm install        # first time only
npm run dev
```

- App: `http://localhost:4200`

Open the app, register a new account, and start adding recipes.

## API

Swagger UI available at `http://localhost:3000/api/docs` when running locally.

```
POST /auth/register        Register new user
POST /auth/login           Login, returns JWT
GET  /auth/me              Current user

GET    /recipes            List recipes (q, tag, category, page, limit)
POST   /recipes            Create recipe
GET    /recipes/:id        Get recipe
PATCH  /recipes/:id        Update recipe
DELETE /recipes/:id        Delete recipe
POST   /recipes/:id/photo  Upload photo

GET  /categories           List categories
POST /categories           Create category
```

## Project Structure

```
mise/
├── api/                  NestJS backend
│   └── src/
│       ├── auth/         JWT auth, register/login
│       ├── users/        User schema, bcrypt
│       ├── recipes/      CRUD, photo upload, search
│       ├── categories/   Category CRUD + seed
│       └── uploads/      Static file serving
├── web/                  React frontend
│   └── src/
│       ├── api/          Axios clients
│       ├── store/        Zustand auth store
│       └── pages/        Login, Register, List, Detail, Form
└── docker-compose.yml    MongoDB
```

## Stopping

```bash
# Stop MongoDB container (run from repo root)
docker compose down
```

## Development

```bash
# API — watch mode
cd api && npm run start:dev

# Frontend — HMR
cd web && npm run dev

# Build frontend for production
cd web && npm run build
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `docker: command not found` or `Cannot connect to Docker daemon` | Docker Desktop not running | Open Docker Desktop app and wait for the whale icon to appear in the tray |
| API exits immediately | Missing `api/.env` | Create the file as shown in Step 1 |
| `MongoNetworkError` in API logs | MongoDB container not started | Run `docker compose up -d` from the repo root |
| Frontend shows network errors | `web/.env` missing or wrong URL | Create `web/.env` with `VITE_API_URL=http://localhost:3000` |
| Login fails with 401 | Wrong credentials or token expired | Register a new account or clear `localStorage` in browser DevTools |

## License

[GNU General Public License v3.0](LICENSE)

---

Built by [lopatnov](https://github.com/lopatnov) · [GitHub](https://github.com/lopatnov/mise) · [LinkedIn](https://www.linkedin.com/in/lopatnov/)
