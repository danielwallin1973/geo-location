# Geo Audio 🗺️🎧

En webbapp som följer din position och spelar upp ljud när du passerar utvalda
platser – som ett museum i det offentliga rummet.

## Stack

- **Monorepo:** pnpm workspaces
- **Frontend** (`apps/web`): Next.js 15 (App Router), TypeScript, Sass (modules), MapLibre GL
- **Backend** (`apps/api`): Fastify + TypeScript, `pg` (node-postgres)
- **Databas:** PostgreSQL 16 + PostGIS (lokalt via Docker)
- **Delade typer:** `packages/shared`

Geofencing sker i klienten – servern slipper få positionspingar och kan därmed
skala till många samtidiga användare.

## Komma igång

Förutsättningar: Node ≥ 20, pnpm 9, Docker.

```bash
# 1. Installera deps
pnpm install

# 2. Starta Postgres + PostGIS i bakgrunden
pnpm db:up

# 3. Konfigurera env-filer
cp apps/api/env.example apps/api/.env
cp apps/web/env.example apps/web/.env.local

# 4. Starta båda apparna parallellt
pnpm dev
```

- Webben: http://localhost:1234
- API: http://localhost:4000/health

> **Tips för dev:** modern browser kräver HTTPS för Geolocation på "riktiga" hostnames,
> men `localhost` räknas som säkert. För test på mobil i samma nätverk – använd
> ett verktyg som `mkcert` eller `next dev --experimental-https`.

## Mappstruktur

```
geo-audio/
├── apps/
│   ├── web/            # Next.js
│   └── api/            # Fastify
├── packages/
│   └── shared/         # Delade TS-typer
├── infra/
│   ├── docker-compose.yml
│   └── postgis/init.sql
├── pnpm-workspace.yaml
└── package.json
```

## Hur geofencing fungerar

1. Browsern ger oss kontinuerliga positioner via `navigator.geolocation.watchPosition`.
2. Vi hämtar POI:er inom 1.5 km en gång, och refetchar bara när vi rört oss > 200 m.
3. Klienten kollar för varje positionsuppdatering om vi är inom någon POI:s
   `triggerRadiusMeters` – om ja triggas ljuduppspelning.
4. En cooldown per POI hindrar att samma plats spelas om och om igen.

Resultat: backenden gör bara billiga, cachade läsningar – skalar enkelt horisontellt.

## Nästa steg (förslag)

- [ ] Autentisering (Auth.js) när det behövs.
- [ ] Admin-UI för att lägga till POI:er.
- [ ] PWA + service worker för offline-cache av ljudfiler.
- [ ] Object storage (R2/S3) för ljud + signerade URL:er.
- [ ] Redis-cache för POI-tiles framför Postgres.
- [ ] Rate-limiting i Fastify.
