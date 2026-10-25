# Teknisk strategi – beslut inför implementation

Status: strategierna nedan är godkända av användaren. Ingen implementation eller slutligt SQL-schema finns ännu. Exakta parametrar, SQL-kontrakt och processlåsimplementation återstår där detta anges. Ett godkänt strategival är inte ett påstående om verifierad implementation.

## Låsta strategibeslut

- HTTP-idempotensnycklar med payloadkontroll och beständigt resultat.
- Korta PostgreSQL-transaktioner för affärsändring, idempotens och transactional outbox tillsammans.
- Beständig RabbitMQ-publicering med confirms och routningskontroll; dubbletter hanteras via operation-ID.
- Filer sparas före resultatcommit; MP4/SRT publiceras tillsammans i DB. Consumer-ack sker efter beständigt utfall.
- Radlås och constraints för kapacitet/kvoter; revisionsnummer för redigering.
- En ansvarig mekanism för begränsade verksamhetsåterförsök; applikationen håller försöksstatus i DB/outbox.
- Försöks-ID och villkorad commit för sena resultat; avstämning/gallring för föräldralösa filer och fastnade arbeten.
- En worker med skydd även mot efterlevande barnprocesser; hela medieflödet omfattas av samma globala exekveringsgräns.
- Direktuppladdning till tillfällig S3-plats, därefter skyddad kopia som valideras och bearbetas.
- Kortlivade signerade nedladdningslänkar. Nya länkar stoppas vid radering/utgång; tidigare länkar kan leva till sin utgång/objektradering och pågående överföring får avslutas.

## Bekräftat efter granskningen

- Behåll gästkvoten: ett jobb med MP4, SRT och korrigerade versioner. Examinationsordalydelsen ändrar inte detta medvetna produktbeslut.
- VPS-storlek och resursmätning behöver inte avgöras nu. Mätning måste ske före godkänd driftsättning.
- Tillfälliga signerade S3-länkar används för filåtkomst; uppladdningens och nedladdningens exakta kontrakt hålls isär.

## 1. Grundmodell och garantier

PostgreSQL är sanningskälla för ägarskap, jobb, undertextversioner, operationer, resultat och kvoter. RabbitMQ transporterar arbetsorder, inte det enda exemplaret av att ett accepterat arbete ska utföras. S3 lagrar privata filer.

Ett jobb är användarens video. En operation är exempelvis validering/transkribering, översättning eller rendering av en bestämd version. Ett försök är en körning av operationen. Dessa identiteter får inte blandas ihop.

Målet är beständig acceptans och idempotenta effekter trots minst-en-gång-leverans. Vi lovar inte att en CPU-operation aldrig behöver köras om efter krasch, eller att data överlever total diskförlust utan återställning. Om en request aldrig når servern måste klienten försöka igen. Accepterat betyder att databastransaktionen har committats, inte att videon redan är validerad eller färdig.

## 2. Idempotens för HTTP

Beslut: klienten skapar en slumpmässig `Idempotency-Key` per logisk mutation och återanvänder den vid timeout/omförsök. Ett medvetet nytt exportförsök får en ny nyckel.

- Tabell `idempotency_keys`: unik kombination av principal, åtgärd och nyckel; hash av normaliserad request; resurs-/operations-ID och stabilt svar.
- Samma nyckel och samma payload återger samma resurs/operation. Samma nyckel med annan payload ger 409.
- Nyckelregistrering, affärsändring och outbox-rad sker i samma korta transaktion. Unik constraint och låsning hanterar parallella identiska anrop.
- Autentisering och aktuell behörighet kontrolleras även vid replay. Idempotens får inte återöppna ett raderat jobb eller återge en gammal signerad länk.
- HTTP-idempotens gäller framför allt skapa jobb/uppladdningsavsikt, färdigställ uppladdning, begär översättning och begär rendering. Filströmmen i sig är ingen lång databastransaktion.
- Nedladdningsrättighet dedupliceras i databasen; länkar kan förnyas efter ny behörighetskontroll utan ny kvotdebitering enligt produktregeln.
- Retention för nycklar, replay efter jobbets utgång och principalbyte vid gäst→konto måste fastställas i API-kontraktet. Förslag: behåll nycklar/tombstones minst hela jobbets livstid plus dokumenterad omförsöksmarginal.

## 3. Korta transaktioner och constraints

Exempel för renderingsbegäran:

1. Börja transaktion och registrera/kontrollera idempotensnyckeln.
2. Lås ägarens kvotrad och jobbet i konsekvent ordning; kontrollera ägarskap, utgångstid och kapacitet.
3. Referera en oföränderlig undertextversion. Skapa operation och ett outbox-meddelande med stabila ID:n.
4. Spara idempotensresultatet och committa. Först därefter svarar API:t 202 med operationens ID.

Varken S3-anrop, RabbitMQ-publicering eller AI/FFmpeg får hållas inne i denna transaktion. Fel före commit rullar tillbaka hela databasändringen. Fel efter commit hanteras genom samma requestnyckel och beständigt lagrat arbete.

Använd foreign keys, unika constraints och villkorade statusuppdateringar som sista försvar. Kontroll följd av INSERT utan låsning räcker inte för jobbgränser eller kvoter. Välj en konsekvent låsordning och begränsade omförsök för deadlocks. Fullständigt schema kommer efter att tillstånd och kontrakt fastställts.

## 4. Transactional outbox

Integrationsunderlag 2026-10-25: amqpeasy 0.2.0 finns på npm. Dokumentation och publicerade typer har verifierats för `publish: { confirms: true, persistent: true, mandatory: true, timeoutMs }`, `subscribe.durable`, `subscribe.prefetch`, `disconnect({ timeoutMs })`, statuslyssnare och handlerns AbortSignal. Detta är inte ett genomfört runtime-/brokerprov. Stabilt messageId och operationId placeras i vår payload; bibliotekets interna publicerings-ID är inte vår idempotensidentitet.

Beslut: tabell `outbox_messages` med ID, typ/schemaversion, operation-ID, payload, skapad tid, tillgänglig tid, publiceringstid, försöksantal och senaste fel. Endast identifierare och nödvändig metadata i meddelandet, inte video, tokens eller signerade länkar. Exakt SQL-schema fastställs separat.

En liten dispatcher-loop i API-processen läser väntande rader. En dispatcher räcker för den beslutade enserverdriften; separat tjänst behövs inte. Den publicerar via amqpeasy med persistent meddelande, publisher confirms och kontrollerad mandatory routing. Köerna måste finnas före publicering.

Markera publicerat först efter godkänd bekräftelse och utan routningsfel. Timeout/okänt utfall lämnar meddelandet för nytt försök med samma ID. Om processen kraschar efter publicering men före databasuppdatering blir det en dubblett; det är förväntat.

Outbox löser inte permanent brokerförlust ensam. En avstämningsloop hittar väntande operationer som saknar framsteg och schemalägger kontrollerad återleverans genom outbox. Den får inte blint skapa nya CPU-försök för ett arbete som fortfarande körs. Ålder är en varningssignal, inte bevis att en process har dött.

## 5. Worker, idempotenta resultat och återförsök

- Meddelandet innehåller `messageId`, `operationId` och schemaversion. Workern hämtar gällande data från PostgreSQL och kontrollerar status, ägarskapets livscykel och utgångstid.
- En redan färdig/terminal operation utförs inte igen. Meddelandet kvitteras efter kontroll. `operations` fungerar som dedupliceringsregister; separat inbox behövs inte för dessa arbetsorder.
- Ett nytt försök får ett unikt attempt-ID. Resultat lagras under nycklar som inkluderar operation/försök och får inte skriva över en annan körnings filer.
- Efter verklig bearbetning och lyckad S3-lagring publiceras resultatet genom en kort DB-transaktion. Den måste fortfarande matcha aktuellt försök och tillåten jobbstatus. En sen worker får inte återuppliva ett raderat jobb.
- MP4 och SRT görs tillgängliga tillsammans genom samma databascommit. Kvittera RabbitMQ först efter beständigt slutresultat eller beständigt schemalagt återförsök.
- Krasch före commit kan lämna föräldralösa S3-filer; gallring tar bort dem. Krasch efter commit före ack ger dubblett som hittar färdig operation och inte kör om.
- Beslut: applikationen äger verksamhetsåterförsök med försökstal och nästa tid i DB/outbox. Tillfälliga fel får begränsad backoff; ogiltig media eller otillåtet språk ger terminalt fel. Bibliotek och applikation får inte oberoende multiplicera retryförsök.
- Felaktiga meddelanden går till en avgränsad dead-letter-hantering. Förlust av databasanslutning innebär att arbete inte får kvitteras som färdigt. Exakta retrygränser och beteende vid kanalavbrott behöver låsas med amqpeasy-kontraktet.

## 6. Global gräns: en bearbetning på en VPS

All avkodning, ljudextraktion, normalisering, AI-översättning, transkribering och inbränning omfattas. Även ffprobe körs inom samma sekventiella medieflöde. HTTP kan hantera uppladdningskontroll medan workern är upptagen; media är preliminärt mottagen tills workern har validerat den.

En worker med prefetch 1 är första nivån. Den skyddar inte ensam mot att en gammal barnprocess fortsätter efter att RabbitMQ återlevererat ett meddelande.

För en enda VPS rekommenderas en hostgemensam OS-låsning för hela medieoperationen, kombinerad med kontrollerad processgrupp/containerlivscykel. Exakt helper/låsimplementation ska provas: inga efterlevande barn får köra utan att tillträdet fortfarande är låst, och ingen ersättare får starta innan gammalt arbete faktiskt avslutats. Alla workerinstanser på värden måste dela samma låsresurs. Detta är uttryckligen inte en flerserverlösning.

DB-försöks-ID skyddar resultatcommit men stoppar inte fysisk CPU-körning. Ett DB-lås med tappad anslutning eller en utgången lease räcker därför inte ensamt som global exekveringsgaranti. Testa SIGKILL, kanalavbrott, DB-avbrott, containerrestart och överlappande deploy innan mekanismen godtas.

## 7. Oföränderlig uppladdning

Beslut: klienten laddar upp direkt till en tillfällig S3-nyckel. Vid finalize reserveras en enda operation atomiskt. Servern fryser en kopia under en ny serverkontrollerad nyckel och workern validerar just den frysta kopian, aldrig bara det ändringsbara originalet. Kopiering/frysning sker utanför DB-transaktionen och har egna återhämtningsregler.

Garantins avgränsning: användarens byte av den tillfälliga filen får aldrig ändra innehållet i ett redan validerat arbetsunderlag. Denna invariant täcker just glappet mellan validering och användning, inte alla risker med uppladdningar.

Villkor som måste uppfyllas:

1. Klientens signering tillåter endast dess tillfälliga nyckel; ingen klient kan skriva till skyddade kopior eller välja godtyckliga objekt som indata.
2. Varje frysningsförsök får en unik destinationsnyckel. En destination får aldrig återanvändas/skrivas över vid omförsök. Endast ett försök kan bindas som jobbets valda indata genom villkorad DB-uppdatering.
3. Kopieringen måste vara fullständigt lyckad innan underlaget markeras klart för validering. Fel lämnar ingen godkänd filreferens. Samtidiga finalize-anrop dedupliceras.
4. Workern validerar den bundna skyddade kopian, inklusive storlek, format, längd och upplösning. All efterföljande bearbetning använder samma referens, aldrig den tillfälliga filen igen.
5. Ett byte under kopiering kan påverka vilken version som kopieras, men den kopian är ännu inte godkänd. Oavsett vad som kopierats kontrolleras det därefter. Ingen tidig kontroll av stagingfilen räknas som slutlig validering.
6. Behörigheter och applikationskod måste hindra överskrivning även från oavsiktliga interna kodvägar. Workern behöver läsåtkomst till indata, inte skrivåtkomst där. Radering kan göra jobbet misslyckat men får aldrig leda till fallback till annan fil.

Verifiering: försök ersätta stagingfilen före/under/efter frysning, återanvänd uppladdningslänken, kör finalize parallellt, krascha efter kopiering före DB-commit och försök skriva till skyddad nyckel. Bearbetad indata ska alltid motsvara den slutligt validerade kopian. Om det inte kan bevisas för en körning ska den stoppas.

Idempotent finalize, avbrutna uppladdningar och byte-/kostnadsgräns måste konkretiseras. ETag får inte generellt antas vara en innehållshash. Ingen garanti lämnas för felfri kod, komprometterade serverbehörigheter eller alla typer av skadlig media enbart genom kopieringsstrategin.

## 8. Tillfälliga S3-länkar för hämtning

Beslut: privat bucket och kortlivade signerade GET-länkar efter kontroll av ägare, jobbstatus, utgångstid och atomiskt beviljad kvot. Exempel på giltighet: högst fem minuter och aldrig längre än återstående retention. Exakt antal minuter fastställs i API-kontraktet.

Nya länkar nekas direkt vid radering/utgång. Redan utfärdade länkar kan fungera tills de löper ut eller objektet raderas. En redan påbörjad överföring kan slutföras. Detta beteende är accepterat; vi utlovar inte omedelbar återkallelse av redan utfärdade länkar eller pågående överföringar.

En länk är en bearer-hemlighet och kan återanvändas eller delas under sin giltighet. Den är inte en engångsbiljett. Logga inte länkar och lagra dem inte i outbox. Kvoten gäller beviljad åtkomst till ett jobb, inte varje GET mot S3. Servern kan inte veta att användaren faktiskt sparat en komplett fil.

## 9. Gallring, återhämtning och versioner

- Radering markerar först jobbet otillgängligt i DB och schemalägger beständig städning. S3-radering kan upprepas säkert. Resultat från gamla försök kan inte bli synliga igen.
- Håll tillfälliga filer, original, resultat och föräldralösa försök åtskilda genom servergenererade nycklar. Avstämning ska hitta delvis färdigställda uploads/exports och städning som misslyckats.
- Redigering använder revisionsnummer/optimistisk låsning; gammal revision ger konflikt, inte tyst överskrivning. Rendering refererar en låst revision. Översättning sparar vilken källrevision den kom från.
- Automatiska omförsök måste upphöra vid radering/utgång/terminalt fel. Outbox, nycklar och loggar har egna begränsade retentionregler utan att användarinnehåll sparas obegränsat.
- Resursgränser och processisolering gäller också ogiltig media: begränsad disk/minne/tid, egen arbetskatalog, icke-root, inga onödiga fil-/nätverksrättigheter och inga användarstyrda shellkommandon. Detaljer specificeras i drift-/säkerhetskontrakt.

## 10. Tester som binder ihop strategin

1. Commit lyckas men HTTP-svaret tappas → samma nyckel ger samma jobb/operation.
2. DB commit lyckas när RabbitMQ är nere → outbox levererar senare, ingen tyst förlust.
3. Publicering lyckas men dispatcher kraschar före markering → dubblett ger högst ett synligt resultat.
4. Worker kraschar efter S3-write, före DB commit → återhämtning och städning utan offentlig delprodukt.
5. Worker kraschar efter DB commit, före ack → ingen ombearbetning av färdig operation.
6. Parallella kvot- och jobbskapanden → constraints/låsning håller gränserna.
7. Fil byts efter finalize → fryst validerad indata påverkas inte.
8. Radering konkurrerar med rendering → gamla resultat blir inte tillgängliga.
9. DB/RabbitMQ-anslutning tappas medan FFmpeg lever → ingen annan medieprocess överlappar.
10. Länk utfärdas strax före utgång → beteendet följer det uttryckligen valda länkkontraktet.

## Nästa specifikationssteg

Strategierna är låsta. Specificera därefter operationernas tillståndstabell, SQL-schema med constraints/transaktioner, API-kontrakt och amqpeasy-meddelanden. Exakta retrytal, retention för idempotens, länkgiltighet och OS-låsimplementation måste fortfarande konkretiseras och verifieras. Fasplanen beskriver byggordning och ersätter inte dessa kontrakt.

Primärkällor: https://www.rabbitmq.com/docs/confirms, https://www.postgresql.org/docs/current/explicit-locking.html, https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html.
