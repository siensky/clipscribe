# Teststrategi och verifieringsplan

Status: plan för implementation, inga tester är byggda eller körda ännu. Verktygen nedan är rekommenderad bas; kompatibla versioner låses i fas 1. Produktkrav i plan.md och garantier i teknisk-strategi.md styr förväntade resultat.

## 1. Mål och struktur

Bygg ett begränsat antal värdefulla enhets-, integrations- och komponenttester samt en omfattande sammanhållen E2E-svit. Sviten ska kunna köras som en samlad verifiering med en gemensam rapport, men scenarierna ska vara oberoende. Ett långt happy-path-scenario visar hela produktkedjan; negativa scenarier och felåterhämtning får egna tester så ett tidigt fel inte döljer resten.

Ingen bestämd testkvantitet eller generell procentsats är ett kvalitetsmål. Varje kritisk regel ska ha ett positivt test och relevanta negativa/gräns-/samtidighetsfall på lägsta lämpliga nivå. Samma regel upprepas i E2E endast när det verifierar att delarna faktiskt är ihopkopplade.

## 2. Testnivåer och verktyg

| Nivå | Testar | Verkligt/ersatt | Rekommenderat verktyg |
| --- | --- | --- | --- |
| Enhet | Rena affärsregler och beräkningar | Ingen DB, broker, nätverk eller process | Jest i Node-miljö |
| Integration | Transaktioner, SQL-constraints, API/DB, outbox, worker och lagring | Riktig PostgreSQL/RabbitMQ; verkliga relevanta gränser | Jest, Docker Compose; Fastify inject för API-tester utan HTTP-socket |
| Komponent | En UI-komponent eller sammanhängande skärm genom användarinteraktion | Verklig React/komponentlogik, kontrollerade API-/native-svar | Jest, jest-expo och React Native Testing Library |
| E2E webb | Användarflöden genom byggd webbapp och verkligt HTTP-API/worker | Körbar stack; externa beroenden deklareras per profil | Playwright |
| E2E mobil | Filval, navigation, auth-återgång, redigering, bakgrund/återgång och filhämtning | Installerat appbygge och API | Maestro på iOS-simulator/Android-emulator, kompletterat med fysisk enhetskontroll |

Komponenttest betyder här UI-beteendet, inte att mocka hela backenden och kalla resultatet E2E. Native-mockar verifierar inte verkligt filval eller delning. Vi behöver inte ytterligare en komponenttestrunner eller en egen generell testplattform.

## 3. Enhetstester – fokuserad omfattning

- Undertextregler: giltiga/ogiltiga tider, videogränser, segmentordning och SRT-format, inklusive svenska tecken och millisekundövergångar.
- Tillåtna statusövergångar och klassificering av återförsöksbart/terminalt fel.
- Beräkning av kvotfönster, retention och länkgiltighet precis före, vid och efter gränsen.
- Requestnormalisering/fingerprint för idempotens, utan att testerna bara kopierar implementationens algoritm.
- Koppling mellan källrevision och inaktuell översättning.

Ingen testning av triviala getters, rena ramverksfunktioner eller varje intern hjälpfunktion för täckningens skull. SQL-samtidighet kan aldrig bevisas med enhetsmockar.

## 4. Integrationstester – dataintegritet och återhämtning

Varje grupp nedan blir parametriserade, tydligt namngivna fall där det behövs, inte en enorm testfunktion.

| ID | Scenario | Bevis som krävs | Första fas |
| --- | --- | --- | --- |
| I01 | HTTP-idempotens: samma nyckel parallellt; annan payload; tappat svar | En operation/outbox-effekt, stabil resursidentitet, 409 för ändrad payload | 2 |
| I02 | Fel före/efter DB-commit | Före: inget delvis jobb/outbox. Efter: jobbet finns och kan återfås med samma nyckel | 2 |
| I03 | Broker nere; confirm saknas; publicerat men ej markerat | Beständigt väntande arbete, senare leverans, dubblett utan dubbelt slutresultat | 2 |
| I04 | Samma operation levereras flera gånger; omstart före/efter ack | Färdig operation utförs inte igen; ofärdigt försök återhämtas enligt kontrakt | 2–3 |
| I05 | Parallell reservation av aktiva jobb/kvot | Ett/tre aktiva jobb och en gästkvot hålls även när anrop överlappar | 2–3 |
| I06 | Stagingfil byts, finalize upprepas, kopiering avbryts | Endast skyddad, slutligt validerad kopia används; ingen otillåten filreferens | 2 |
| I07 | Försök skriva över skyddad nyckel eller använda annan ägares fil | Nekad åtkomst med verkliga lagringsbehörigheter i extern profil | 2 |
| I08 | Process avbryts mellan S3-write, DB-commit och ack | Inga synliga delresultat; gamla försök kan inte committa; städning hittar överblivna filer | 3 |
| I09 | Samtidig redigering/översättning/rendering | Konflikt i stället för överskrivning; MP4/SRT använder samma låsta revision | 3 |
| I10 | Radering/utgång konkurrerar med körning/åtkomst | Ingen återupplivning; inga nya länkar; accepterat beteende för redan utfärdade länkar | 4 |
| I11 | Gästövertagande parallellt, fel ägare, konto vid gräns | En giltig ägare och korrekta kvot-/retentionseffekter | 4 |
| I12 | DB/brokeranslutning bryts medan barnprocess lever; överlappande restart | Högst en faktisk medieprocesskedja körs; inga lås släpps för tidigt | 2–3 |
| I13 | Migrering från tom DB och föregående stödda schema | Constraints/data bevaras; migration fungerar på riktig PostgreSQL | Från 2 |
| I14 | Gallring misslyckas och försöks igen | Idempotent borttagning och uppföljningsbart restarbete | 2, fullt i 4 |

Använd separata anslutningar och explicita barriärer för samtidighet; `Promise.all` utan bevis att operationerna överlappar räcker inte. Worker-/dispatcherprov måste inkludera riktiga processavbrott vid relevanta gränser. Att bara kasta ett mockat fel bevisar inte att OS-lås eller barnprocesser beter sig rätt.

## 5. Komponenttester – få men beteendefokuserade

- Uppladdningsskärm: val av fil/språk, pågående uppladdning, begripligt fel och att dubbla tryck inte skapar nya logiska requests.
- Redigerare: ändra text/tider, lägg till/ta bort segment, valideringsfel, osparade ändringar och spar-konflikt.
- Översättningsval: separat redigerbar text, inaktuell källrevision, sent svar som inte skriver över nyare redigering.
- Jobb-/resultatvy: kö, körning, fel, färdigt, utgånget; nedräkning och kvotmeddelande.
- Kontosida: tom lista, återuppta och radera inklusive misslyckad radering.

Testa roller, etiketter, synlig text och användarhändelser. Test-ID används bara där semantiska selektorer inte räcker. Undvik stora snapshots och assertions på intern state eller antal funktionsanrop när användarbeteendet är det viktiga.

## 6. Den stora E2E-sviten

Varje scenario har egen data och kan köras ensamt. Delad helper-kod är tillåten, beroende på föregående tests tillstånd är det inte. Huvudresan går genom UI; API får användas för irrelevant setup och kompletterande kontroller, aldrig för att hoppa över beteendet som testas.

| ID | Scenario och viktigaste resultat | Första fas |
| --- | --- | --- |
| E01 | Huvudresa: gäst laddar upp → status → automatisk transkribering → redigerar text/tid → översätter till engelska/svenska → redigerar översättning → väljer spår → skapar video → hämtar MP4/SRT → spelar upp och verifierar filer | Börjar i 2, komplett i 3 |
| E02 | Gästkvot: båda filer och korrigerad version av samma jobb fungerar; nästa jobb blockeras; siduppdatering återställer inte kvot | 3 |
| E03 | Konto: registrering/inloggning → övertagande av eget gästjobb → fortsatt redigering → privat kontosida → nedladdning | 4 |
| E04 | Två användare: ingen åtkomst till varandras status, media, redigering, export eller övertagande; två gäster på samma IP får egna kvoter | 2, fullt i 4 |
| E05 | Ogiltig media: för lång/stor, fel upplösning, korrupt fil och falsk filtyp avvisas och städas | 2 |
| E06 | Kö och kapacitet: flera användare, ett/tre aktiva jobb, tydlig full kö; mediebearbetning är sekventiell inklusive validering | 2–3 |
| E07 | Tappat svar/nätverk: återförsök och återöppnad app hittar samma jobb, ingen dubbel rendering | 2–3 |
| E08 | Broker/workeravbrott: accepterat arbete återkommer till begripligt slutläge efter återställning, ingen tyst förlust | 2–3 |
| E09 | Redigering under rendering och samtidig sparning: tidigare export förblir sammanhängande, ny revision kan exporteras separat | 3 |
| E10 | Utgång/radering: nedräkning, nekade nya länkar, städning, inga sena resultat som återupplivar jobbet | 4 |
| E11 | Mobil: verkligt native-filval, auth-återgång, appbakgrund, återupptagen status, spara/dela fil på iOS och Android | Från 2, komplett i 4 |
| E12 | Drift: HTTPS/proxy, riktiga S3-länkar och Auth0, restart och övervakningssignal vid avbrott | 5 |

Webben kör huvudsviten i Chromium. Före release körs centrala flöden även i Firefox och WebKit; native iOS/Android testas separat. All backend-felinjektion behöver inte dupliceras i varje klient; det viktiga är gemensamma kontrakt plus varje plattforms kritiska användarflöden.

## 7. Tre körprofiler – tydligt vad som verkligen testas

### A. Snabb reproducerbar kontroll

Riktig applikation, PostgreSQL, RabbitMQ, worker och FFmpeg. AI kan använda en deterministisk testadapter och lagring en lokal S3-kompatibel testmiljö. Kontoflöden kan använda en separat testidentitetsutfärdare som fortfarande prövar normal tokenvalidering. Auth får inte stängas av.

Rapporten märker uttryckligen ersatta beroenden. Denna profil bevisar inte verklig AI-kvalitet, Auth0/Google-flöde eller AWS/IAM-beteende. Gästresan kan köras utan ersatt identitetsleverantör. Testadaptorer väljs vid processstart i isolerad testmiljö, aldrig via en användarstyrd HTTP-header.

### B. Verklig mediekedja

Valda lokala modeller och FFmpeg körs på CPU med låsta versioner. E01 körs med verklig transkribering och båda beslutade översättningsmålen på små representativa klipp. Snabba adaptrar är förbjudna här. Full felmatris behöver inte upprepa dyr inferens när det är transaktioner som testas.

### C. Externa integrationer och release

Dedikerad testbucket i riktig S3 och separat Auth0-testmiljö med avgränsade testkonton. Verifiera signerade uppladdningar, skyddad kopia, IAM, CORS, länkexpiry och båda inloggningsmetoderna. Använd samma releaserevision som ska driftsättas.

Google-inloggning/MFA/antibotskydd får inte kringgås för att göra CI grönt. Automatisera tillåten stabil del; om verklig provider kräver interaktion körs ett dokumenterat manuellt releaseprov. Markera det som manuellt, inte som automatiskt E2E-godkännande. Full releaseverifiering ska omfatta minst en komplett resa med riktiga tjänster och modeller tillsammans.

## 8. Testdata och resultatkontroll

- Små rättighetsklarerade syntetiska/inspelade klipp: tydligt svenskt/engelskt tal, tystnad, stående/liggande video, rotation och beslutade codecs. Inga privata användarvideor.
- Generera filer precis under/vid/över 60 sekunder, 100 MiB och upplösningsgränsen. Testa faktisk storlek och faktiskt medieinnehåll, inte enbart falska metadata. Stora fixtures genereras vid behov i stället för att läggas i Git.
- Modellprov har dokumenterade kvalitetskriterier och toleranser. Exakt identisk AI-text är inte enda sanningskälla. Testa meningsinnehåll på utvalda klipp och granska översättningskvalitet manuellt vid modellbyte.
- För redigerad text ska SRT däremot matcha vald revision exakt enligt normaliseringsregler. Kontrollera syntax och tidsstämplar med separat läsning, inte bara samma serializer igen.
- MP4 måste avkodas, ha korrekt längd/orientering/ljud och synlig inbränning. Ett deterministiskt fixture med känd redigerad text används för bildrutekontroll före/under/efter en cue med tolerans; ingen byte-för-byte-jämförelse av hela MP4. Komplettera med visuell kontroll av läsbarhet vid release.
- Testa verklig åtkomst till S3, inte bara att API:t returnerar en URL. Åtkomst utan behörighet och skrivning till skyddad nyckel måste nekas i profil C.

## 9. Regler för stabilitet, isolering och felsökning

1. Varje test får egna användare/job-ID:n och egen browser context. DB, RabbitMQ-köer och objektprefix separeras per körning. Destruktiva avbrottsprov körs seriellt i egen Compose-stack.
2. På en delad stack körs medie-E2E sekventiellt eftersom produktens globala lås är verkligt. Parallellisering kräver helt separata stackar. Samtidighetstest skapar medveten konkurrens inom ett scenario.
3. Vänta på observerbara villkor med bounded polling/verktygets väntemekanismer. Inga fasta sleeps som normal synkronisering. Timeout ger status, relevanta loggar och operations-ID:n.
4. Enhets-/komponenttester använder kontrollerad klocka. Integrationer använder explicit tidskälla eller seedade utgångstider. E2E använder separat kort TTL-konfiguration där relevant; verklig S3-signering testas med verklig kort TTL, inte enbart ändrad browserklocka. Vi väntar inte en timme/ett dygn i CI.
5. Felinjektion ska träffa exakta gränser: före commit, efter commit, efter publicering, efter S3-write, före ack. Använd testharness/barriärer och processkontroll. Inga publika kill/reset-/klockendpoints får finnas i produktionsbygget.
6. Säkerhets- och idempotensprov har inga automatiska retries som kan dölja fel. Högst ett diagnostiskt E2E-omförsök kan samla underlag; ett flaky resultat räknas inte som helt godkänt.
7. Spara redigerade loggar, testresultat, Playwright-trace och relevanta screenshots vid fel. Ta bort tokens, signerade URL:er och testhemligheter även ur nätverkstraces; lagra känsliga artifacts med begränsad åtkomst/livslängd.
8. Städning körs även vid fel, med run-ID och reservgallring. Rensa aldrig en godtycklig bucket/databas eller kör avbrottstester mot produktion. Testkonfiguration verifierar tillåtna resurser före destruktiva steg.
9. Kritiska tester får inte skippas/tyst märkas tillåtna att misslyckas för att få grönt. Miljöfel redovisas som blockerad verifiering. Bugfixar får ett regressionstest på relevant nivå.
10. Testbarhet motiverar små gränssnitt för klocka, modellkörning och lagring; det motiverar inte ett generellt pluginramverk eller omfattande abstraktioner.

## 10. Fasplan för testbygget

| Fas | Ska byggas/fastställas | Krav innan fasen är klar |
| --- | --- | --- |
| 1 | Lås verktyg/versioner, scenario-ID:n, fixtures, testmiljögränser, AI-toleranser, tidskontroll och felinjektionspunkter. Prova Maestro/auth/filåtkomst samt verkliga modell- och amqpeasy-kontrakt. | Verktygen fungerar med vald stack; alla kritiska garantier har testfall och ansvarig fas. Inga ofullständiga produktkrav får uppfunna testförväntningar. |
| 2 | Bygg CI och isolerad Compose-harness först. Lägg till enhetsregler, uppladdningskomponent och I01–I07/I12–I14 i tillämplig omfattning. Börja E01 fram till utkast plus E04–E08 och mobila grundflöden. | Databas/kö/ägarskap/uppladdning är verifierade; huvudresan till utkast fungerar med verklig inferens minst en gång. |
| 3 | Lägg till redigerar-/översättningskomponenter, SRT-regler, I04–I05/I08–I09 och export-/kvotdelar av E01–E02/E06–E09. | Full huvudresa, verkliga modellprov och matchande MP4/SRT är godkända. Krasch mellan filer/commit/ack är testad. |
| 4 | Lägg till kontosida, I10–I11/I14 och kompletta E03/E04/E10/E11; tidsgränser och konflikter i alla flöden. | Hela produktens E2E-svit och kritiska mobilflöden är godkända. En testmatris visar inga saknade kritiska krav. |
| 5 | Kör profil C, E12, resurs-/restart-/återställningsprov och slutlig plattformsverifiering. Samla releaseprotokoll för exakt revision. | Automatiska och nödvändiga manuella verifieringar är godkända; kvarvarande begränsningar redovisade. Inga kritiska fel eller oklara/skippade kontrollpunkter. |

## 11. Körning och leveransgrindar

Planerade kommandon är ett framtida gränssnitt, inte befintliga scripts:

- `test:unit`, `test:integration`, `test:component` för riktade kontroller.
- `test:e2e:web` och `test:e2e:mobile` för respektive klient.
- `test:acceptance` samlar verifiering och rapport med tydliga profiler/plattformsresultat. Det måste rapportera saknade externa hemligheter eller macOS-runner som ej körda/blockerade steg, inte godkänt.

På varje kod-PR: typkontroll, enhet, komponent, integration och snabb webb-E2E för befintlig funktionalitet. Vid medieändringar körs verklig mediekedja; vid auth/S3-ändringar körs relevanta externa kontraktsprov. Mobil-/nativeändringar kräver mobila kontroller. Före varje fasöverlämning körs dess färdigkriterier; före release körs hela acceptansmatrisen inklusive verkliga modeller, externa integrationer och båda mobilplattformar oavsett vilka filer som ändrats.

Tillgänglig macOS-runner/fysisk enhet och externa testresurser planeras i fas 1. Betald molntesttjänst är inte ett krav; kontroller kan köras lokalt och resultat kopplas till samma commit. Ingen schemalagd automation skapas av denna plan.

## 12. Definition av godkänt

Rapporten innehåller commit, dependency-/modellversioner, miljö/profil, scenario-ID, resultat och artifacts. Varje kritiskt produktkrav/invariant länkas till minst ett test eller uttrycklig manuell kontroll. Coverage används för att hitta luckor, inte som bevis för felfri produktion. Stabil grön svit krävs, men ersätter inte övervakning och återställning.

Primärkällor för verktygsval: https://playwright.dev/docs/browser-contexts, https://docs.expo.dev/develop/unit-testing/, https://docs.expo.dev/eas/workflows/examples/e2e-tests/.
