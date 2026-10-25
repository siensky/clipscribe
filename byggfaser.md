# ClipScribe – byggfaser och färdigkriterier

Status: planerad arbetsordning. Ingen byggfas är genomförd.

## Hur dokumentet används

`uppgift.md` innehåller examinationskraven. `plan.md` innehåller beslutade produktkrav och öppna frågor. `projektregler.md` innehåller arbetssätt. Detta dokument styr ordningen och definierar vad som måste vara klart innan nästa fas börjar.

`teststrategi.md` är den konkreta verifieringsplanen. Dess scenario-ID:n, testnivåer och fasmatris ingår i färdigkriterierna nedan. Testharness byggs i fas 2; funktionernas tester byggs samtidigt med funktionerna. Den stora E2E-sviten börjar med uppladdning till utkast i fas 2, får hela mediekedjan i fas 3, fulla produktflöden i fas 4 och verklig driftverifiering i fas 5.

- En fas är klar först när dess leveranser finns, dess tester har körts och resultatet har dokumenterats. En checklista utan bevis är inte ett godkännande.
- Öppna produktbeslut avgörs med användaren. Tekniska förslag dokumenteras med motiv; de får inte behandlas som redan godkända produktändringar.
- Tester, säkerhet och dokumentation ingår i varje fas. Fas 5 är inte första tillfället att testa eller lägga till behörighetskontroll.
- Gränser som kan behöva justeras efter mätning är konfiguration med validerade värden. Funktioner som inte ingår läggs inte till som spekulativ förberedelse.
- Börja med minsta fungerande flöde inom varje fas och komplettera sedan dess felvägar innan överlämning. Ingen tillfällig genväg för ägarskap, kvoter eller köleverans får följa med som färdig lösning.
- Utvecklingsmiljön i fas 2–4 är privat. Publik drift börjar först när fas 5:s kontrollpunkter är uppfyllda.
- Om en senare upptäckt ändrar ett kontrakt uppdateras berörda dokument, migreringar och tester innan beroende implementation fortsätter.

## Översikt

| Fas | Resultat vid överlämning | Ingår inte ännu |
| --- | --- | --- |
| 1. Kontrakt och riskverifiering | Beslutade kontrakt och mätningar som visar att tekniken kan uppfylla kraven | Komplett produktimplementation |
| 2. Säker grund och transkribering | Gäst eller konto kan ladda upp och få ett privat, beständigt undertextutkast | Full redigerare, översättning och export |
| 3. Redigering och export | Text kan redigeras, översättas och exporteras till matchande MP4/SRT | Full kontosida och komplett produktlivscykel |
| 4. Komplett produkt | Alla beslutade användarflöden fungerar på webb, iOS och Android | Godkänd publik produktionsdrift |
| 5. Drift och slutverifiering | Verifierad tjänst på VPS, återställningsrutiner och testbyggen | Appbutikspublicering och nya funktioner |

## Fas 1 – Lås kontrakt och verifiera tekniska risker

### Syfte och ingång

Utgå från befintliga krav. Lös osäkerheter som annars kan tvinga fram omskrivningar av databas, worker eller klient. Små isolerade experiment ingår i denna fas; de är inte produktkod som automatiskt tas vidare.

### Leveranser

1. **Datamodell och tillstånd:** specificera användare, gästsessioner, jobb, bearbetningsoperationer, undertextversioner, resultatfiler och kvotbeviljanden. Ange nycklar, constraints, index, ägarskap, transaktionsgränser, migrationer och gallring. Skilj ett användarjobb från dess transkriberingar, översättningar och renderingar.
2. **API-kontrakt:** dokumentera anrop, validering, svar, felkoder, återförsök och statusövergångar för hela det beslutade flödet. Ange hur dubbla klientanrop och samtidiga redigeringar hanteras. Välj uppladdningsväg och nedladdningsväg inklusive serverkontroll och privat S3-åtkomst.
3. **Autentiseringskontrakt:** välj konkret Auth0-flöde för webb respektive mobil, session/token-lagring, utloggning, verifierad e-post för kontofördelar och säkert övertagande av gästjobb. Jobbägarskap får aldrig baseras på IP eller enbart ett publikt jobb-ID.
4. **RabbitMQ-kontrakt:** specificera exchange, köer, versionssatta meddelanden, identifierare, kvittenser, publiceringsbekräftelser, persistens, routningsfel, återförsök, terminala fel och hantering av dead-letter-kö. Välj hur databasskrivning och köpublicering samordnas samt hur bortglömda jobb hittas.
5. **amqpeasy-underlag:** skriv det beteende och de acceptanstester som biblioteket måste uppfylla. Uppdateringen är publicerad som 0.2.0 och API-underlaget kontrollerat; projektet ska nu verifiera den faktiska paketerade versionen mot riktig broker, inklusive kastade handlerfel, AbortSignal och återanslutning. Ingen parallell egen RabbitMQ-klient införs för att kringgå biblioteket.
6. **CPU-prov:** testa vald Whisper-runtime och lokal översättningsmotor samt FFmpeg på representativa klipp. Mät körtid, toppminne och temporär diskåtgång. Kontrollera svenska/engelska, valda källspråk, stående video, rotation, tystnad och felaktiga filer. Specificera modellversioner, licenser och reproducerbar installation. Översättning till svenska får inte antas ingå i Whisper.
7. **Plattformsprov:** verifiera filval, Auth0-återgång och spara/dela filer i en minimal Expo-app på webb, iOS och Android. Fastställ praktisk distribution av iOS/Android-testbyggen och eventuella signeringskrav.
8. **Test- och driftunderlag:** välj verktyg, testdata och vilka tester som körs i CI respektive med verkliga modeller. Ange mätbara prestanda-/resursmål och ett preliminärt VPS-behov. Välj inte server enbart utifrån ett obekräftat RAM-antagande.

### Beslut som måste stängas före fas 2

- Exakta codecs, bildfrekvenser, upplösningsregler inklusive rotation och hantering av video utan tal/ljud. 60 sekunder, 100 MiB, MP4/MOV och högst 1080p är redan beslutade.
- Stödda källspråk för översättning till svenska/engelska och vad som händer om ett språk inte stöds.
- När gästkvoten börjar, omförsök och hur tillgång till samma jobb fungerar när timfönstret löper ut. Skilj kvotens tidsfönster från filernas livslängd.
- Lagringsstart vid inloggning innan transkribering är färdig, maxlivslängd för ofullständiga uppladdningar/feljobb samt vad som händer om lagringstiden tar slut i kö eller under körning.
- Vad som händer om ett gästjobb tas över av ett konto som redan har tre aktiva jobb.
- Globala kö-/lagringsgränser, begränsning av omrenderingar/översättningar och timeouts. Värden ska vara motiverade av mätningar och kunna justeras.
- Sparbeteende i redigeraren, konflikthantering, vilka äldre exportversioner som behålls och hur borttagning av pågående jobb fungerar.
- En konkret mekanism för globalt högst en tung operation, även vid anslutningsavbrott, omstart och driftsättning. Prefetch 1 ensam är inte hela lösningen.

### Färdigkriterier

- Kontrakten finns i Markdown, exempelvis `docs/datamodell.md`, `docs/api.md`, `docs/autentisering.md` och `docs/rabbitmq.md`. Dessa dokument skapas under fasen; de finns inte ännu. Befintlig `teststrategi.md` konkretiseras med låsta verktygsversioner, testdata och slutliga förväntningar från kontrakten.
- Besluten ovan är lösta och går att omsätta i testfall utan att utvecklaren behöver gissa produktbeteendet.
- Mätprotokoll visar ett realistiskt CPU-alternativ och redovisar kvarvarande kvalitetsbegränsningar. Exakta prestandamål är satta inför verifiering på den slutliga VPS:en.
- Den valda amqpeasy-versionen klarar publicering, dubbletter, begränsad samtidighet, återanslutning och kontrollerad nedstängning enligt kontraktet, med tydlig ansvarsfördelning mellan bibliotek och applikation.
- De tre plattformarnas kritiska integrationsprov är genomförda. Ingen verklig integration ersätts enbart av en mock i detta underlag.

### Avgränsning

Ingen färdig UI-design, full backend eller publik driftsättning. Inga nya produktfunktioner och ingen omläggning till mikrotjänster. Om ett avgörande prov misslyckas justeras beslutet innan nästa fas.

## Fas 2 – Bygg en säker kedja från uppladdning till undertextutkast

### Ingång

Fas 1:s kontrakt och kompatibla amqpeasy-version är klara.

### Leveranser och intern ordning

1. Sätt upp TypeScript-projekt, Fastify-API, separat worker och Expo-app. Lägg till lokal Docker Compose för beroenden, konfigurationsvalidering, SQL-migreringar, strukturerad loggning och CI för typkontroll och relevanta tester.
   Följ repostruktur.md: tunna index-entrypoints, separata lager och delade paket. Inför BaseError med konkreta felklasser, central HTTP-/workerhantering och gemensam lint-/formatkonfiguration. Verifiera säkra felsvar och felklassificering innan fler endpoints tillkommer.
2. Implementera verklig gästsession och Auth0-inloggning med båda beslutade metoderna. Kontrollera ägarskap på alla jobb- och filanrop från början. Databasen och S3 använder privata resurser och minsta nödvändiga åtkomst.
3. Implementera uppladdning med storleksgräns under överföringen, faktisk medieinspektion och de beslutade format-/längd-/upplösningsgränserna. MIME-typ och filändelse räcker inte som verifiering. Avbrutna och ogiltiga uppladdningar städas enligt kontraktet.
4. Skapa jobb och schemalägg transkribering beständigt via amqpeasy. Implementera den beslutade lösningen för databas/kö-samordning, dubbletter, återförsök och global sekventiell bearbetning nu, inte som senare påbyggnad.
5. Kör lokal transkribering med process-timeout och resursgränser. Lagra undertextutkast och status. Medieverktyg anropas med separata argument, utan shell-kommandon byggda av användartext.
6. Bygg ett enkelt verkligt flöde på webb/iOS/Android: välj fil, välj språk, ladda upp, följ status och visa undertextutkast. Visa tydliga fel och återhämta status efter att appen åter öppnas.
7. Inför aktiva jobbgränser, grundläggande rate limiting och globala resursgränser för de operationer som redan finns. Schemalägg gallring; ingen fas får lämna temporära filer utan en definierad livslängd.

### Obligatorisk verifiering

- Gränsvärden kring 60 sekunder och 100 MiB, liggande/stående upplösning, falsk filändelse, korrupt fil och avbruten uppladdning.
- En annan gäst eller ett annat konto kan inte läsa, ändra eller hämta jobbet. Utgången/ogiltig autentisering nekas.
- Samtidiga uppladdningar kan inte överskrida den atomiskt kontrollerade gränsen ett/tre aktiva jobb.
- Flera accepterade jobb köas men tunga processer överlappar aldrig, även vid den beslutade omstarts-/anslutningsmodellen.
- Dubbla meddelanden och processavbrott kring publicering/kvittens lämnar varken förlorade accepterade jobb eller dubbla beständiga resultat.
- Workerfel ger ett definierat återförsök eller ett begripligt terminalt fel. Timeout avslutar också barnprocessen och dess resurser.
- Integrationstester körs med riktig PostgreSQL och RabbitMQ. Minst ett verkligt transkriptionsprov ingår utöver snabba tester med kontrollerade ersättningar.

### Färdigkriterium och gräns

På samtliga tre plattformar kan både gäst och konto nå ett privat undertextutkast från en giltig uppladdning. API, kö och worker klarar ovanstående feltester. UI får vara enkelt men får inte förlita sig på fejkade statusar. Full redigerare, översättning, rendering och nedladdningskvot byggs i senare faser; inga ofärdiga exportendpoints exponeras.

## Fas 3 – Färdigställ redigering, översättning och export

### Ingång

Fas 2 ger säkra, beständiga jobb och undertextutkast samt fungerande kö och worker.

### Leveranser och intern ordning

1. Implementera redigerbara segment: text, start/slut samt tillägg och borttagning. Validera tider mot videolängd, textstorlek och beslutade överlappsregler på servern. Använd versionskontroll så samtidiga sparningar inte tyst skriver över varandra.
2. Visa video med undertexter i förhandsvisning. Granskning håller inte workern upptagen. Fast läsbar stil används; ingen stilredigerare eller avancerad tidslinje.
3. Översätt en bestämd sparad version lokalt till svenska eller engelska. Bevara originalet och gör översättningen redigerbar. En ändrad källa markerar tidigare översättning som potentiellt inaktuell; manuella ändringar får inte skrivas över tyst.
4. Låt användaren välja undertextspår och uttryckligen begära Skapa video. Rendering använder en oföränderlig ögonblicksbild; ändringar i redigeraren under körning får inte ändra den pågående exporten.
5. Generera en korrekt SRT och en MP4 med permanent inbrända undertexter från samma version. Publicera resultat som färdigt först när båda filerna är verifierade och tillgängliga. Delresultat får inte visas som lyckad export.
6. Implementera privat nedladdning med den beslutade atomiska gästkvoten. MP4/SRT, omförsök och nya versioner av samma jobb delar den beslutade rättigheten. Kopiera inte en offentlig S3-länk som ersättning för behörighetskontroll.
7. Låt översättning och rendering använda samma globala begränsning av tung bearbetning som transkriberingen. Tillämpa resursgränser även för upprepade export-/översättningsanrop.

### Obligatorisk verifiering

- Ogiltiga tider, tom/otillåten text enligt kontraktet, specialtecken och samtidiga sparningar.
- Översättning från rätt källversion och skydd mot att ett sent översättningsresultat skriver över en nyare manuell ändring.
- MP4 och SRT motsvarar samma språk och version; ändringar under rendering påverkar först nästa export.
- Verklig FFmpeg-export av stående och liggande klipp, svenska tecken och vald textlayout. Kontrollera tidsstämplar, uppspelning, ljud och synlig inbränning.
- Parallella nedladdningsanrop för två jobb kan inte bevilja båda utanför kvoten. Båda filer och omförsök för det beviljade jobbet fungerar.
- Fel mellan skapande/uppladdning av de två resultatfilerna ger kontrollerad återhämtning och städning.
- Minst ett verkligt prov av varje vald översättningsriktning och en full kedja från uppladdning till MP4/SRT. AI-kvalitet bedöms på dokumenterade exempel, inte enbart med exakt textmatchning.

### Färdigkriterium och gräns

Det kompletta medieflödet fungerar i ett enkelt UI på webb/iOS/Android för gäst och konto. Säker nedladdning och gästkvot finns innan resultat exponeras. Kontosidans fullständiga arbetsflöde och livscykelns alla gränsfall slutförs i fas 4. Ingen publik delning, översättning till andra målspråk eller automatisk första inbränning införs.

## Fas 4 – Slutför produktflöden och livscykel på alla plattformar

### Ingång

Det faktiska medieflödet och dess säkerhets-/kvotregler fungerar från fas 3.

### Leveranser

- Komplett privat kontosida med aktuella jobb, fortsatt redigering, nedladdning och manuell radering.
- Säkert och atomiskt övertagande av gästjobb vid registrering/inloggning enligt fas 1:s regler, inklusive redan använda kvoter och aktiva jobbgränser.
- Fullständig gallring: gästens timme, kontots 24 timmar, övergivna uppladdningar, misslyckade operationer, gamla resultatversioner och temporära filer. Nya åtkomstbeviljanden upphör vid den beslutade tidpunkten även om fysisk radering behöver försöka igen. Redan utfärdade signerade länkar och pågående överföringar följer det accepterade kontraktet i teknisk-strategi.md.
- Synlig nedräkning, tydligt utgångna/raderade jobb och avtalat beteende vid pågående bearbetning när tiden tar slut. Raderade jobb får inte återuppstå genom sena meddelanden eller processresultat.
- Återhämtning efter siduppdatering, appbakgrund, nätverksavbrott, utloggning och utgången autentisering. Uppladdningsomförsök följer kontraktet; återupptagbara multipart-uppladdningar införs inte utan ett separat behov.
- Genomarbetade laddnings-, tom-, fel- och kölägen; tangentbordsanvändning på webb, läsbara etiketter och användbar layout på små skärmar.
- Fullständigt missbruksskydd för sessioner, uppladdningar, översättningar och renderingar. Ingen strikt nedladdningskvot per IP och ingen e-postverifiering för gäster införs.

### Obligatorisk verifiering

- Gäst → inloggning → samma jobb; försök att överta någon annans jobb nekas. Dubbla övertaganden och konto vid kapacitetsgräns följer kontraktet.
- Tidsstyrda tester för alla utgångsgränser utan verklig timslång väntan, inklusive konkurrens mellan gallring, nedladdning och pågående operation.
- Radering och gallring är säkra att köra flera gånger; tillfälligt S3-/databasfel lämnar spårbar städning som kan återupptas.
- Två gäster på samma nät har skilda nedladdningskvoter och saknar åtkomst till varandras jobb.
- End-to-end-flöden för gäst, e-postkonto och Google-konto, inklusive ett nekat flöde och ett återhämtningsflöde. Kritiska mobilflöden verifieras i faktiska iOS-/Android-testbyggen; en webbläsarsimulering räknas inte som mobiltest.

### Färdigkriterium och gräns

Alla beslutade produktkrav har en implementation och ett dokumenterat verifieringsresultat. Inga platshållare återstår i användarflödet. Kvarvarande arbete är driftsättning och verifiering i produktionsmiljön, inte nya produktfunktioner. Inga appbutiksflöden, betalningar, publik delning eller avancerad redigering ingår.

## Fas 5 – Verifiera och driftsätt på Linux-VPS

### Ingång

Fas 4 är klar. VPS väljs utifrån fas 1:s mätningar; slutliga värden verifieras på den köpta servern. Serverköp och andra externa kostnader hanteras som separata beslut.

### Leveranser och intern ordning

1. Konfigurera Linux, administrativ åtkomst, brandvägg, Docker Compose, Nginx och HTTPS. PostgreSQL, RabbitMQ och administrativa övervakningsgränssnitt ska inte exponeras öppet på internet.
2. Installera låsta beroenden/modeller, hemligheter och persistenta volymer. Dokumentera start, migrering, uppgradering, rollback och hur gamla processer avslutas innan nya får bearbeta jobb.
3. Inför Prometheus/Grafana med begränsad datalagring. Följ CPU, minne, disk, bearbetningstider, köläge, fel, dead letters och misslyckad gallring. Loggar ska kunna kopplas till jobb/operation utan att innehålla tokens, videoinnehåll eller full undertext.
4. Dokumentera och prova backup/återställning av nödvändiga data och konfiguration. Backupretention får inte oavsiktligt återinföra utgångna användarfiler. Beskriv vilka pågående jobb som kan återställas och hur övriga blir tydligt misslyckade.
5. Kör ett avgränsat belastnings- och felprov på VPS:en med fastställda gränser. Kontrollera CPU, toppminne, disk och svarstider medan en video bearbetas och andra väntar.
6. Bygg och dokumentera användbara iOS-/Android-testbyggen samt webbdistribution. Skriv README med arkitektur, lokal start, testkommandon, drift och kända begränsningar.

### Slutliga färdigkriterier

- En extern klient når tjänsten via HTTPS och kan genomföra hela flödet. Ingen extern AI-tjänst eller GPU används.
- Samtliga obligatoriska krav och alla beslutade bonusfunktioner har en spårbar kontrollpunkt med resultat och hänvisning till test eller manuell verifiering.
- På den verkliga VPS:en hålls gränsen en tung operation även vid restart/deploy. Brokeravbrott, workeravbrott, lagringsfel och resursgränser ger dokumenterat beteende utan tyst jobbförlust.
- Alla produktgränser, sessions-/behörighetsregler, kvoter och gallringsregler fungerar även i den verkliga proxy- och lagringskonfigurationen.
- Backup har faktiskt återställts i en separat testmiljö. Återställning/rollback är inte enbart kommandon i ett dokument.
- Webben samt båda mobilbyggena har klarat slutligt smoke-test mot driftsatt API. Kvarvarande begränsningar är tydligt dokumenterade; inga kritiska fel är öppna.

## Gemensamt överlämningsformat

Vid slutet av varje fas dokumenteras: implementerade krav, ändrade kontrakt, körda tester och deras resultat, relevanta mätningar, kända begränsningar samt om nästa fas kan börja. Fasstatus får inte sättas till klar om dess färdigkriterier saknar verifiering.
