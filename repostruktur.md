# Monorepo, lager och kodstandard

Status: bindande struktur- och kodregler inför implementation. Katalogträdet är målstruktur, inte redan skapade filer. Mappar och abstraktioner skapas när första verkliga behovet finns. Inga tomma lager eller genomkopplingsfiler skapas enbart för symmetri.

## 1. Övergripande struktur

Tre appar: HTTP-API, worker och gemensam Expo-klient för webb/iOS/Android. Delad serverkod ligger i ett internt backendpaket; transportkontrakt i ett separat klientkompatibelt paket. Inga ytterligare tjänster införs för att återspegla mappstrukturen.

```text
/
├── AGENTS.md
├── projektregler.md
├── plan.md
├── byggfaser.md
├── teknisk-strategi.md
├── teststrategi.md
├── repostruktur.md
├── package.json                   # workspace-kommandon
├── <pakethanterarens lockfil>      # en gemensam lockfil
├── tsconfig.base.json
├── eslint.config.mjs
├── prettier.config.mjs
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── index.ts           # start och kontrollerad nedstängning
│   │   │   ├── app.ts             # bygger Fastify-app utan listen()
│   │   │   ├── routes/            # t.ex. jobs.routes.ts
│   │   │   ├── controllers/       # t.ex. jobs.controller.ts
│   │   │   ├── plugins/           # auth, logging, beroendekoppling
│   │   │   ├── errors/            # global handler och HTTP-felmappning
│   │   │   └── config/            # API-specifik konfiguration
│   │   └── tests/integration/
│   ├── worker/
│   │   ├── src/
│   │   │   ├── index.ts           # start, consumer, shutdown
│   │   │   ├── consumers/        # validerat meddelande → use case
│   │   │   ├── handlers/         # central fel-/utfallshantering
│   │   │   └── config/
│   │   └── tests/integration/
│   └── client/
│       ├── index.ts               # minimal Expo-start enligt vald setup
│       ├── src/
│       │   ├── app/               # Expo Router: tunna routes/layouts
│       │   ├── features/
│       │   │   ├── jobs/          # screens, components, hooks efter behov
│       │   │   ├── subtitles/
│       │   │   └── auth/
│       │   ├── components/        # faktiskt återanvänd UI
│       │   ├── services/          # API-klient och klientintegrationer
│       │   ├── schemas/           # endast klientlokal formulärvalidering
│       │   ├── mappers/           # DTO → visningsmodell vid behov
│       │   ├── types/             # endast klientlokala typer
│       │   ├── platform/          # filval, lagring, dela/spara
│       │   └── config/
│       └── assets/                # typsnitt, bilder, ikoner
├── packages/
│   ├── contracts/
│   │   └── src/
│   │       ├── index.ts           # litet offentligt exportgränssnitt
│   │       ├── schemas/           # HTTP request/response per resurs
│   │       ├── events/            # versionssatta meddelandescheman
│   │       ├── errors/            # publika felkoder/felsvar, inga serverfel
│   │       └── types/             # typer som inte härleds ur scheman
│   └── backend/
│       └── src/
│           ├── index.ts           # uttryckligt publikt servergränssnitt
│           ├── modules/
│           │   ├── jobs/
│           │   │   ├── services/     # create-job.service.ts
│           │   │   ├── repositories/ # jobs.repository.ts
│           │   │   ├── schemas/      # interna runtime-scheman vid behov
│           │   │   ├── mappers/      # job-row.mapper.ts, job-dto.mapper.ts
│           │   │   └── types/        # job.ts, job-row.ts
│           │   ├── subtitles/
│           │   ├── operations/
│           │   ├── identity/
│           │   ├── quotas/
│           │   └── uploads/
│           ├── errors/            # base-error.ts och en fil per konkret fel
│           ├── database/          # pool, transaktionshelper, SQL-typer
│           ├── messaging/         # amqpeasy, outbox-dispatcher
│           ├── storage/           # S3, signerade länkar, frysning
│           ├── media/             # ffprobe, FFmpeg, AI och processkontroll
│           ├── maintenance/       # gallring och avstämning
│           ├── observability/     # logger och mätvärden
│           └── config/            # validerad serverkonfiguration
├── database/migrations/           # ordnade SQL-migreringar
├── tests/
│   ├── e2e/web/                   # Playwright
│   ├── e2e/mobile/                # Maestro
│   ├── fixtures/                  # små testdata + genereringsdefinitioner
│   ├── support/                   # testharness, barriärer, kontrollerad klocka
│   └── acceptance/                # gemensam rapport/profilorkestrering
├── infra/                        # Compose, Dockerfiles, nginx, monitoring
├── scripts/                      # konkreta repo-/driftkommandon
├── docs/                         # datamodell, API, auth, meddelanden, drift
└── .github/workflows/            # CI
```

Backendens moduler grupperar verksamhetsområden; inuti dem separeras services, repositories, schemas, mappers och types. Routes/controllers ligger i API:t eftersom de hör till HTTP. Detta undviker både jättestora globala mappar och att API/worker kopierar samma affärslogik.

Grundsetup före fas 1 använder npm 10 workspaces och en gemensam package-lock.json, Node 22 samt Expo Router med apps/client/index.ts som tunn entry. En workspace-konfiguration och en lockfil används för hela repot. Ingen separat webbapp skapas utöver Expo-klienten. Exakta installerade beroenden finns i respektive package.json och lockfilen.

## 2. Entrypoints och beroenden

- API och worker startas via respektive `src/index.ts`. Filen validerar konfiguration, kopplar beroenden, startar processen och registrerar shutdown. Ingen affärslogik, SQL eller routeimplementation där.
- API:ts `app.ts` kan importeras av tester utan att öppna port, ansluta automatiskt eller starta bakgrundsloopar. Start sker uttryckligen via composition/start-funktioner.
- Expo har en minimal `index.ts` om vald setup använder egen entry. Den lämnar över navigationen till Expo Router; entrykravet får inte kringgå ramverkets nödvändiga initiering.
- Paketens `index.ts` exporterar bara avsedd offentlig API. Vi skapar inte barrel-filer i varje undermapp och interna filer importerar inte via sitt eget index.
- Tillåtet beroendeflöde: API/worker → backend → contracts. Klient → contracts. Backend får aldrig importera apps; contracts får aldrig importera backend eller server-SDK:er.
- Appar importerar inte varandras filer. Delat beteende lyfts till ett befintligt lämpligt paket först när det faktiskt delas. Inga cirkulära beroenden eller djupimporter till andra pakets privata filer.
- Serverhemligheter, DB-typer och serverfelklasser får inte hamna i klientens bundle. Contracts innehåller endast transportdata, schemas och säkra publika konstanter.

## 3. Ansvar per lager

| Lager | Ska göra | Får inte göra |
| --- | --- | --- |
| Routes | Definiera URL/metod, schema, auth-hook och controller | SQL, affärsregler, S3-anrop |
| Controllers | Översätta validerad HTTP-input/principal till serviceanrop och svar/status | Äga transaktioner, rendera video, fånga alla fel lokalt |
| Consumers | Tolka validerade meddelanden och anropa operationstjänst | Duplicera affärsregler eller kvittera före beständigt utfall |
| Services | Use cases, affärsregler, behörighetsbeslut och transaktionsgränser | Bero på Fastify request/reply eller klientkomponenter |
| Repositories | Parametriserad SQL, DB-lås, läsning/skrivning och persistence | HTTP-status, S3, AI, egna dolda commits mitt i use case |
| Schemas | Runtime-validera externa data och definiera kontrakt | Utföra affärsändringar eller nätverksanrop |
| Mappers | Rena explicita omvandlingar mellan DB-rad, domän och publikt svar | I/O, auktorisering eller dold mutation |
| Types | Beskriva typer som inte redan kan härledas ur schema | Duplicera schemas manuellt eller köra runtime-logik |
| Integrationer | Avgränsa S3, RabbitMQ och processverktyg; översätta kända leverantörsfel | Besluta vilka användare som får vilka produktförmåner |

Services kontrollerar ägarskap även när de anropas från en annan transport. HTTP-auth verifierar identiteten; det ersätter inte resursbehörighet i use case.

Transaktioner ägs av service/use case. Repository får transaktionsklienten uttryckligen; alla deltagande repositoryanrop använder samma klient. Ingen implicit global pågående transaktion. Externa anrop körs utanför långa SQL-transaktioner enligt teknisk-strategi.md.

Mappers skapas när representationer faktiskt skiljer sig. Vi returnerar aldrig `SELECT *`-rader eller sprider interna objekt okontrollerat till ett publikt svar. En schemahärledd typ ska inte samtidigt handskrivas i types-mappen.

## 4. Global felmodell

### Klasser och filer

`packages/backend/src/errors/base-error.ts` definierar en abstrakt `BaseError extends Error`. Varje definierad publik/applikationsfelkod har exakt en konkret subklass i egen fil, exempelvis:

```text
errors/
  base-error.ts
  validation-error.ts
  unauthenticated-error.ts
  forbidden-error.ts
  job-not-found-error.ts
  job-expired-error.ts
  active-job-limit-error.ts
  download-quota-exceeded-error.ts
  idempotency-conflict-error.ts
  revision-conflict-error.ts
  invalid-media-error.ts
  storage-unavailable-error.ts
  internal-error.ts
```

Listan visar strukturen; slutlig felkatalog skapas tillsammans med API-/operationskontrakt. Skapa bara felkoder som har ett faktiskt fall att hantera. En felkod är exempelvis `JOB_EXPIRED`, inte HTTP-numret 410. Flera olika felklasser kan mappas till samma HTTP-status.

BaseError har en stabil `code`, intern `message`, valfri `cause` och uttryckligt typad säker metadata när det behövs. Kod och eventuella klassificeringar är readonly. Ingen godtycklig offentlig serialisering av hela Error-objektet. Ingen BaseController, BaseService eller generisk BaseRepository införs av detta skäl.

### Central API-hantering

- En global Fastify error handler registreras i app.ts. Den klassificerar BaseError, normaliserar kända schema-/ramverksfel och ger okända fel ett generiskt internt fel.
- HTTP-mappning och säkra publika meddelanden ligger centralt i API:ts errors-katalog. Services behöver inte känna till HTTP. Saknad mappning av en registrerad felkod ska upptäckas av typkontroll/test.
- Ett enhetligt felsvar: `error.code`, ett säkert `error.message`, `requestId` och endast uttryckligen tillåtna detaljer. Stack, cause, SQL, tokens, signerade länkar och interna filvägar lämnas aldrig ut.
- Rate limiting/pluginfel ska följa samma svarskontrakt. När svarström redan har börjat kan handlern inte skicka ett nytt JSON-svar; avbrottet loggas och anslutningen avslutas enligt transportreglerna.
- Controllers kastar/låter fel propagera. Inga duplicerade try/catch-block för samma HTTP-mappning. Fånga lokalt bara för faktisk återhämtning, cleanup eller meningsfull felöversättning.

### Worker och bakgrundsloopar

- Workern använder samma applikationsfelkoder men ett eget centralt utfallshanteringslager: terminalt fel, beständigt schemalagt återförsök eller okänt utfall utan ack.
- HTTP-status styr aldrig worker-retry. Kända fel klassificeras uttryckligen; okända fel ger säker, begränsad hantering och larm/logg, aldrig en obegränsad retry-loop.
- Leverantörsfel från S3, PostgreSQL och amqpeasy översätts vid integrationsgränsen när de är kända. Originalfelet bevaras som cause. Matcha inte fel med bräckliga textsträngar om leverantören har kod.
- Logga felet en gång vid ansvarig gräns med request-/job-/operation-/attempt-ID efter behov. Underlager ska inte både logga samma fel och kasta det igen utan skäl.
- Global processhantering är ett sista skydd för fatal startup/unhandled failure: kontrollerad nedstängning och återstart. Den får inte svälja fel och fortsätta i okänt tillstånd. Beständigt arbete och kvittenser följer outbox-/workerstrategin.

### Klient

Klienten tolkar det serialiserade felsvaret med contracts-schema och visar lämpligt meddelande utifrån code. Serverns klassinstanser överlever inte JSON; klienten använder inte `instanceof` för dem. Ett UI error boundary hanterar oväntade renderingsfel; vanliga nätverks-/valideringsfel visas i rätt skärm.

## 5. Enhetlig kodstil

- TypeScript strict i alla paket, ESM, samma grundkonfiguration. Hantera `unknown` vid osäkra gränser; inget slentrianmässigt `any`, `as` eller non-null assertion för att tysta kompilatorn.
- Engelska kodnamn och kommentarer. Kebab-case för vanliga filer; tydliga suffix som `.service.ts`, `.repository.ts`, `.schema.ts` och `.mapper.ts`. Klasser/komponenter/typer PascalCase; funktioner/variabler camelCase; felkoder UPPER_SNAKE_CASE. Frameworkstyrda routefilnamn följer ramverket.
- Namngivna exports som standard. Default exports endast där ramverket kräver det, exempelvis Expo routes. `import type` för rena typimporter.
- Funktioner/moduler är standard. Klasser används för Error-hierarkin och andra verkligt motiverade tillståndsbärande objekt. Ingen obligatorisk OOP för controllers/services.
- Små sammanhängande funktioner med ett tydligt ansvar. Tidiga returer, tydliga villkor och explicita sidoeffekter. Ingen hård radgräns som leder till onödiga filer.
- En fil innehåller en sammanhängande uppgift, inte flera orelaterade services. Varje konkret felklass har egen fil enligt kravet.
- Ingen samlingsmapp `utils`/`helpers`/`common` för osorterad kod. Namnge efter ansvar: time, subtitles, storage eller motsvarande när det behövs.
- Delade scheman är kontraktets källa; härled TypeScript-typer från dem. DB-radtyper hålls separata från publika DTO:er.
- Parametriserad SQL, explicita kolumner, inga användarstyrda identifierare utan allowlist. SQL ligger i repositories och migrationer, inte controllers.
- All konfiguration valideras vid start. Läs miljövariabler i config-moduler, inte utspritt genom affärskoden. Klientkonfiguration är offentlig och får aldrig innehålla serverhemligheter.
- Använd async/await konsekvent. Inga tappade promises; bakgrundsarbete har ägare, shutdown och felhantering. Resurser städas i finally där det behövs.
- Kommentarer förklarar motiv och svåra invariants, inte självklar syntax. Undvik stora JSDoc-block runt trivial kod. Förklara transaktions-/ackgränser där det förebygger fel.
- Gemensam Prettier-konfiguration: två mellanslag, semikolon, dubbla citattecken och avslutande kommatecken där verktyget stöder det. Formatering sköts av verktyg, inte manuell diskussion i varje fil.
- ESLint och typkontroll kontrollerar bland annat oanvänd kod, promises och otillåtna lagerimporter. Konfigurationerna hålls minimala och kompatibla med Expo/Node.

## 6. Testplacering och repo-resurser

Enhets-/komponenttester placeras nära det testade området som `*.test.ts`/`*.test.tsx` eller i dess `__tests__` när ramverket kräver det. Tests läggs aldrig i Expo Routers routekatalog. Integrationstester ligger i ansvarigt app-/pakets tests/integration. End-to-end och gemensamt testharness ligger i rotens tests. `teststrategi.md` styr beteende och omfattning.

Migrationer, Docker/nginx, assets, fixtures och scripts har egna avsedda kataloger. Genererade resultat, lokala videor, modeller, secrets, coverage och testartifacts ignoreras av Git; versionslåsta referenser och genereringsinstruktioner versionshanteras. En mall för miljövariabler innehåller bara ofarliga exempel.

## 7. Införande och färdigkriterier

- Fas 1: lås paketgränser, schema-/felkatalog och verktygskompatibilitet tillsammans med tekniska kontrakt. Dokumentera lagrens beroenden. Inga tomma produktfiler behövs ännu.
- Fas 2: skapa workspace, entrypoints, grundkonfiguration, BaseError och global API-/workerhantering samtidigt med första verkliga flödet. Lägg till lint/typecheck/formatcheck och tester av säkra felsvar, okända fel, felkodsmappning och workerklassificering.
- Fas 3–4: nya use cases följer samma lager; utöka felkatalogen bara för verkliga nya fel. Testa att fel och metadata inte läcker och att nya fel får rätt återförsöksbeteende.
- Fas 5: verifiera felkontrakt/loggning bakom riktig proxy och vid processavbrott. Fatalfel ska ge observerbar och återhämtningsbar drift, inte tyst fortsatt körning.

En ändring är inte klar om den introducerar lagerbrott, otypade genvägar, duplicerade kontrakt eller lokal felhantering som kringgår den gemensamma modellen. Granskningen ska kontrollera begriplighet och faktisk ansvarsfördelning, inte bara mappnamn.
