# Geo Audio 🗺️🎧

En webbapp som följer din position och spelar upp ljud när du passerar utvalda
platser – som ett museum i det offentliga rummet.

## Stack

- **Monorepo:** pnpm workspaces
- **App** ([apps/web](apps/web)): Next.js 15 (App Router), TypeScript, Sass modules, MapLibre GL
- **API:** Next.js Route Handlers under [apps/web/src/app/api](apps/web/src/app/api)
- **Databas:** PostgreSQL + PostGIS (lokalt: Docker, prod: Supabase)
- **TTS:** OpenAI text-to-speech via [apps/web/scripts/generate-audio.ts](apps/web/scripts/generate-audio.ts)
- **Delade typer:** [packages/shared](packages/shared/src/index.ts)

Geofencing sker i klienten – servern slipper få positionspingar, vilket gör att
samma serverless-funktion klarar tusentals samtidiga användare.

## Lokal utveckling

Förutsättningar: Node ≥ 20, pnpm 9, Docker.

```bash
pnpm install
pnpm db:up                                       # Postgres+PostGIS via Docker
cp apps/web/env.example apps/web/.env.local      # Fyll i OPENAI_API_KEY
pnpm audio:generate                              # Generera mp3:er (~$0.05)
pnpm dev
```

Öppna http://localhost:1234 → tryck "Starta resa" → tillåt plats.

## Produktion: Vercel + Supabase

### 1. Sätt upp Supabase

1. Skapa konto på https://supabase.com → nytt projekt
2. Vänta tills DB är klar
3. Gå till **SQL Editor** → kör innehållet i [infra/postgis/init.sql](infra/postgis/init.sql)
   (PostGIS-extensionen finns förinstallerad)
4. Gå till **Project Settings → Database → Connection string → Transaction Pooler**
   - Kopiera URL:en (port 6543)
   - **Använd just Transaction Pooler** – serverless-funktioner kan inte hålla
     vanliga DB-connections.

### 2. Deploy till Vercel

Snabbast via GitHub-integration:

1. Pusha repot till GitHub
2. Importera på https://vercel.com/new
3. **Root Directory:** `apps/web`
4. **Framework Preset:** Next.js (autodetect)
5. **Environment Variables:**
   - `DATABASE_URL` = Supabase Transaction Pooler URL
6. Deploy

### 3. Generera ljud lokalt → committa till repo

Audio-filerna ligger i [apps/web/public/audio/](apps/web/public/audio) och
servas som statiska filer av Vercel. Sätt `DATABASE_URL` i
`apps/web/.env.local` till **Supabase**-URL:en, kör:

```bash
pnpm audio:generate
git add apps/web/public/audio
git commit -m "Add audio for new POIs"
git push
```

## Mobiltest – så funkar det utomhus

1. Deploya till Vercel → du får en HTTPS-URL (krävs för Geolocation på mobil).
2. Öppna URL:en på mobilen.
3. Tryck **"Starta resa"** → tillåt plats → skärmen hålls vaken.
4. Gå mot en POI → ljud spelas automatiskt när du kommer inom radien.

> **Tips:** Använd hörlurar. Om du sparar URL:en på hemskärmen får du
> en helskärmsupplevelse utan browser-chrome.

## Viktiga begränsningar

- **Förgrundstracking only.** När browsern inte är i förgrunden pausar GPS.
  För riktig bakgrunds-tracking behövs nativ wrapper (Capacitor/React Native).
- **iOS Safari + audio:** därför finns "Starta resa"-overlay – en användargest
  krävs för att låsa upp ljud-autoplay.

## Mappstruktur

```
geo-audio/
├── apps/web/
│   ├── src/
│   │   ├── app/                 # Sidor + Route Handlers (/api/...)
│   │   ├── components/          # React-komponenter
│   │   ├── hooks/               # useGeolocation, useGeofence, useWakeLock
│   │   ├── lib/                 # api-klient, geo-utils, db
│   │   └── styles/              # Sass tokens + mixins
│   ├── scripts/                 # generate-audio.ts
│   └── public/audio/            # mp3:er (genererade)
├── packages/shared/             # Delade TS-typer
├── infra/
│   ├── docker-compose.yml       # Lokal Postgres+PostGIS
│   └── postgis/init.sql         # Schema + demo-POIer
└── pnpm-workspace.yaml
```

## Nästa steg

- [ ] PWA + service worker för offline-cache av ljud
- [ ] Object storage (R2/S3) istället för git-checkade mp3:er
- [ ] Admin-UI för att lägga till POI:er via karta
- [ ] Klick-på-karta för att simulera position (dev-läge)
- [ ] POI-lista i UI:et med avstånd
