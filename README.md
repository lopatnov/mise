# 🍽 Mise

> *mise en place* — "всё на своих местах"

Self-hosted personal recipe book. Store recipes with ingredients, steps, tags and photos. Scale servings, search by ingredient, filter by category.

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 24, NestJS 11, TypeScript |
| Database | MongoDB 8, Mongoose |
| Auth | JWT Bearer |
| Frontend | React 19, Vite 8, React Query 5, Zustand 5 |
| Infrastructure | Docker Compose |

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

**Prerequisites:** Docker Desktop, Node.js 20+

```bash
# 1. Clone
git clone https://github.com/lopatnov/mise.git
cd mise

# 2. Start MongoDB
docker compose up -d

# 3. Start API
cd api
npm install
npm run start:dev
# → http://localhost:3000
# → Swagger UI: http://localhost:3000/api/docs

# 4. Start frontend (new terminal)
cd ../web
npm install
npm run dev
# → http://localhost:4200
```

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

## Environment Variables

**api/.env**

```env
MONGODB_URI=mongodb://localhost:27017/mise
JWT_SECRET=change_me_in_production
JWT_EXPIRES_IN=7d
PORT=3000
```

**web/.env**

```env
VITE_API_URL=http://localhost:3000
```

## Development

```bash
# API — watch mode
cd api && npm run start:dev

# Frontend — HMR
cd web && npm run dev

# Build frontend
cd web && npm run build
```

---

Built with NestJS · React · MongoDB · TypeScript
