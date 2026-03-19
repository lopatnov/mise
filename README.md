# 🍽 Mise

> _mise en place_ — everything in its place

Self-hosted personal recipe book. Store recipes with ingredients, steps, tags and photos.
Scale servings, search by text, filter by category and tag, share recipes publicly.

## Stack

| Layer          | Technology                                    |
| -------------- | --------------------------------------------- |
| Backend        | Node.js 24, NestJS 11, TypeScript             |
| Database       | MongoDB 8, Mongoose                           |
| Auth           | JWT Bearer, bcrypt                            |
| Frontend       | React 19, Vite 8, React Query 5, Zustand 5   |
| i18n           | react-i18next · 18 languages                  |
| Infrastructure | Docker Compose                                |

## Features

- **Recipe management** — create, edit, delete with full details
- **Ingredients & steps** — dynamic lists with per-step photos
- **Photo upload** — main photo + photo per step, lightbox viewer
- **Categories** — pre-seeded (breakfast, lunch, dinner, dessert…)
- **Tags** — tag filter with autocomplete from existing tags
- **Search** — partial text search across title, description, and tags
- **Servings scaler** — ingredient amounts scale automatically
- **Sharing** — mark recipes as public, visible to anyone
- **Admin panel** — user management, invite links, SMTP, password reset
- **18 languages** — EN, UK, RU, DE, FR, ES, ZH, JA, KO, IT, PT, PL, CS, NL, RO, SV, HU, TR

---

## Running locally (development)

> **Run in this order:** MongoDB first → API → Frontend.

### Prerequisites

| Tool | Version | Download |
|---|---|---|
| Git | any | https://git-scm.com |
| Node.js | 20+ | https://nodejs.org (LTS) |
| Docker Desktop | any | https://www.docker.com/products/docker-desktop |

### Step 1 — Clone

```bash
git clone https://github.com/lopatnov/mise.git
cd mise
```

### Step 2 — Create environment files

**`api/.env`**

```env
MONGODB_URI=mongodb://localhost:27017/mise
JWT_SECRET=dev_secret_change_in_production
JWT_EXPIRES_IN=7d
PORT=3000
```

**`web/.env`**

```env
VITE_API_URL=http://localhost:3000
```

### Step 3 — Start MongoDB

```bash
docker compose up -d
```

MongoDB runs on `localhost:27017`. Data is stored in the Docker-managed volume
`mise_mongo_data` and **survives `docker compose down`** — only `docker compose down -v`
wipes it. You will never need to restart MongoDB unless you explicitly stop it.

### Step 4 — Start the API

```bash
cd api
npm install        # first time only
npm run start:dev  # watch mode — restarts on file changes
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs

### Step 5 — Start the frontend

```bash
cd web
npm install        # first time only
npm run dev        # Vite HMR — updates instantly on save
```

- App: http://localhost:4200

Open the app, go to `/setup` to create the first admin account, then register users.

---

## Full Docker demo (everything in one command)

Builds and runs MongoDB + API + Web in Docker. No local Node.js needed.
Code changes require a rebuild (`--build`).

```bash
docker compose -f docker-compose.demo.yml up --build
```

- App: http://localhost:5173
- API / Swagger: http://localhost:3000/api/docs

Stop:

```bash
docker compose -f docker-compose.demo.yml down
```

---

## Production deployment

### Requirements

- A Linux server with Docker and Docker Compose installed
- Ports **80** (web) and **3000** (API) open in the firewall
- The server IP or domain name

### Setup (one time)

```bash
# 1. Clone the repo on the server
git clone https://github.com/lopatnov/mise.git
cd mise

# 2. Create the production env file
cp .env.prod.example .env.prod
```

Edit `.env.prod`:

```env
# The public URL of the API — as seen from users' browsers
APP_URL=http://YOUR_SERVER_IP:3000

# Long random secret — generate with: openssl rand -hex 32
JWT_SECRET=replace_with_actual_secret
```

```bash
# 3. Create uploads directory
mkdir -p data/uploads

# 4. Start
docker compose -f docker-compose.prod.yml up -d
```

- App: `http://YOUR_SERVER_IP`
- API: `http://YOUR_SERVER_IP:3000`

Go to `/setup` to create the admin account on first run.

### Updating to a new release

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Stopping

```bash
# Stop containers (data is preserved)
docker compose -f docker-compose.prod.yml down

# Stop and wipe ALL data including database
docker compose -f docker-compose.prod.yml down -v
```

### Data and backups

| Data | Location | Notes |
|---|---|---|
| MongoDB | Docker volume `mise_mongo_data` | Managed by Docker, survives `down` |
| Uploaded photos | `./data/uploads/` on the host | Plain files, easy to copy |

**Back up MongoDB:**

```bash
docker run --rm \
  -v mise_mongo_data:/data/db \
  -v $(pwd)/backup:/backup \
  mongo:8 mongodump --out /backup
```

**Restore MongoDB:**

```bash
docker run --rm \
  -v mise_mongo_data:/data/db \
  -v $(pwd)/backup:/backup \
  mongo:8 mongorestore /backup
```

**Back up uploads:**

```bash
cp -r ./data/uploads /your/backup/location/
```

---

## Making a GitHub Release

```bash
# Tag the commit you want to release
git tag v1.0.0
git push origin v1.0.0
```

Then create a release on GitHub and attach nothing — users just clone the tag:

```bash
git clone --branch v1.0.0 https://github.com/lopatnov/mise.git
```

They then follow the Production deployment steps above.

---

## API

Swagger UI: http://localhost:3000/api/docs

```
POST /auth/register          Register (checks allowRegistration + inviteToken)
POST /auth/login             Login → JWT
GET  /auth/me                Current user
POST /auth/forgot-password   Request password reset link
POST /auth/reset-password    Set new password via token

GET    /admin/setup          Check if admin exists (public)
POST   /admin/setup          Create first admin (public)
GET    /admin/settings       App settings
PATCH  /admin/settings       Update settings (admin only)
GET    /admin/users          List users (admin only)
PATCH  /admin/users/:id      Update role/status (admin only)
DELETE /admin/users/:id      Delete user (admin only)
POST   /admin/invites        Create invite link (admin only)
GET    /admin/invites        List active invites (admin only)
DELETE /admin/invites/:id    Revoke invite (admin only)

GET    /recipes              List recipes (q, tag, category, mine, page, limit)
POST   /recipes              Create recipe
GET    /recipes/:id          Get recipe (public if isPublic=true)
PATCH  /recipes/:id          Update recipe
DELETE /recipes/:id          Delete recipe
POST   /recipes/:id/photo    Upload main photo
POST   /recipes/:id/steps/:order/photo  Upload step photo
GET    /recipes/public       Public recipes (no auth)
GET    /recipes/tags         All distinct tags (no auth)

GET  /categories             List categories
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Cannot connect to Docker daemon` | Docker Desktop not running | Open Docker Desktop and wait for the whale icon |
| API exits immediately | Missing `api/.env` | Create the file as shown in Step 2 |
| `MongoNetworkError` | MongoDB not started | `docker compose up -d` from repo root |
| Frontend network errors | Wrong `VITE_API_URL` | Check `web/.env` |
| 500 on login | User created before `isActive` field existed | `docker exec -it mise-mongodb mongosh mise --eval 'db.users.updateMany({isActive:{$exists:false}},{$set:{isActive:true}})'` |
| Images not loading in Docker | Old named volume for uploads | The volume should be a bind mount — see `docker-compose.prod.yml` |

---

## License

[GNU General Public License v3.0](LICENSE)

---

Built by [lopatnov](https://github.com/lopatnov) · [GitHub](https://github.com/lopatnov/mise) · [LinkedIn](https://www.linkedin.com/in/lopatnov/)
