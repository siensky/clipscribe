# ClipScribe

Monorepo för en planerad tjänst som transkriberar, översätter och bränner in undertexter i korta videor.

## Status

Detta är grundsetup inför init-commit. Fas 1 är inte genomförd. API:t startar utan produktendpoints, workern skriver ett startmeddelande och avslutas, och Expo visar en enkel startsida. Ingen databas, RabbitMQ, S3, Auth0 eller AI-modell ansluts automatiskt.

## Förutsättningar

- Node.js 22.19 eller senare inom Node 22, npm 10. `.nvmrc` anger versionen som användes för setup.
- Kör kommandon från repots rot. npm workspaces använder en gemensam `package-lock.json`.
- iOS/Android kräver respektive utvecklingsmiljö. Native-byggen och signering hanteras under kommande faser.

## Kom igång

```sh
npm ci
npm run check
npm run dev:api
```

API:t lyssnar som standard på `127.0.0.1:3000`; det finns ännu inga routes. Kör klienten i en separat terminal:

```sh
npm run dev:web
```

Övriga kommandon:

| Kommando | Syfte |
| --- | --- |
| `npm run dev:client` | Starta Expo för val av plattform |
| `npm run dev:worker` | Köra workerns startfil; inga jobb konsumeras ännu |
| `npm run build` | Kompilera interna paket, API och worker |
| `npm run build:web` | Skapa Expo-webbexport |
| `npm run typecheck` | Typkontrollera samtliga workspaces |
| `npm run lint` | ESLint |
| `npm run format` | Formatera kod och konfiguration; befintliga planfiler undantas |
| `npm run format:check` | Kontrollera formatering |
| `npm test` | Jest, med förberedda server-/klientprojekt; ännu inga produkttester |
| `npm run check` | Typkontroll, lint, formatkontroll och Jest |

`npm test` tillåter tills vidare en tom testsvit. Ett grönt grundsetup-resultat är därför inte bevis på verifierad produktfunktionalitet. Testkraven i `teststrategi.md` införs tillsammans med funktionerna.

Serverpaket använder kompilerade exports i `dist`. Dev-kommandona bygger de delade paketen först; kör `npm run build:packages` igen efter ändringar i dem och starta om berörd app. Vi inför ingen extra monorepo-byggmotor för grundsetupen.

API-konfiguration kan ges som miljövariabler (`HOST`, `PORT`). `.env.example` visar variablerna; automatisk inläsning av `.env` är inte inkopplad. Lägg aldrig serverhemligheter i Expo-konfiguration eller Git.

## Struktur

- `apps/api`: Fastify, index-entrypoint och separat app-fabrik.
- `apps/worker`: separat Node-process med index-entrypoint.
- `apps/client`: Expo Router för webb, iOS och Android.
- `packages/backend`: reserverad offentlig ingång för delad serverkod.
- `packages/contracts`: reserverad offentlig ingång för klientkompatibla kontrakt.

Routes, controllers, services, repositories, schemas, mappers och felklasser skapas när respektive beteende implementeras. Vi lägger inte in tomma domänlager eller låtsasimplementationer inför fas 1.

## Beroenden och avgränsningar

Fastify, Zod, PostgreSQL-klient, AWS S3 SDK, amqpeasy 0.2.0 och loggning förbereds tillsammans med Expo och test-/kodverktygen. Auth0-SDK väljs efter auth-kontraktet. AI-runtime/modeller, FFmpeg, Docker-tjänster, Maestro CLI och native SDK:er är inte npm-bibliotek och installeras inte av denna grundsetup. Playwrights webbläsare hämtas när E2E-harness byggs.

## Plan och regler

Börja med [plan.md](plan.md), [byggfaser.md](byggfaser.md) och [AGENTS.md](AGENTS.md). Struktur och kodregler finns i [repostruktur.md](repostruktur.md); robusthet i [teknisk-strategi.md](teknisk-strategi.md); tester i [teststrategi.md](teststrategi.md).
