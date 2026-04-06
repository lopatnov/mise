# syntax=docker/dockerfile:1
FROM node:24-alpine AS builder
RUN apk upgrade --no-cache && npm install -g npm@latest && npm cache clean --force
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY . .
RUN npm run build

FROM node:24-alpine
RUN apk upgrade --no-cache && npm install -g npm@latest && npm cache clean --force
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
