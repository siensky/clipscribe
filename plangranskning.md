# Oberoende plangranskning

Datum: 2026-10-22. Underlag: uppgift.md, prelplan.md, plan.md, byggfaser.md och projektregler.md.

En separat subagent granskade filerna utan samtalshistorik och utan att ändra planen. Huvudagenten har bedömt fynden nedan. Detta är en dokumentgranskning, inte en säkerhetsrevision av implementerad kod eller garanti att alla risker är identifierade.

Status: rekommendationer för diskussion. Inga produktbeslut har ändrats genom denna rapport. P1 betyder hög prioritet inför examinationskontraktet; P2 betyder en viktig precisering före beroende implementation.

Uppföljning: användaren har efter rapporten uttryckligen bekräftat befintlig gästkvot och vill inte återöppna den. Resursmätning/VPS-val behöver inte avgöras nu. Förslag till tekniska preciseringar finns i teknisk-strategi.md. Rapportens ursprungliga rekommendationer nedan är granskningshistorik, inte nya bindande beslut.

## 1. P1 – Gästkvoten skiljer sig från uppgiftens ordalydelse

Underlag: plan.md:47 och :64; uppgift.md:40–42.

Uppgiften säger en nedladdning per timme och att fler filer kräver konto. Planen tillåter MP4 och SRT samt nya versioner av samma jobb. Det är ett avsiktligt produktbeslut, men inte säkert samma regel som examinatorn avser.

Scenario: en gäst hämtar flera nyredigerade MP4-versioner under samma timme. Projektets kvot tillåter det, medan en bokstavlig filkvot inte gör det.

Rekommendation: behåll beslutet tills det diskuteras, men märk det som en uttrycklig examinationsavvikelse/tolkningsrisk. Stäm av om ett jobb med båda filerna och korrigerade versioner godtas. Annars krävs ett medvetet produktbeslut om ändrad kvot. Ett ZIP-paket löser inte automatiskt frågan om flera nya exportversioner.

När: fas 1 innan kvotkontraktet låses. Huvudagentens bedömning: håller med om risken; det är inte bevis för att examinationen kommer underkännas.

## 2. P2 – Tidigt resursprov behöver omfatta hela stacken

Underlag: byggfaser.md:40–42, :59 och :159–167.

Isolerad körning av AI/FFmpeg kan fungera trots att samma maskin inte har utrymme för PostgreSQL, RabbitMQ, API, Prometheus/Grafana och processernas toppminne tillsammans. Full driftverifiering ligger sent.

Rekommendation: komplettera fas 1 med total RAM-/CPU-/diskbudget samt ett resursbegränsat prov med beroendena igång. Mät basförbrukning, en operations topp, modellväxling och reserv. Behåll slutlig verifiering på VPS i fas 5. Ingen extra infrastrukturtjänst behövs.

När: fas 1. Huvudagentens bedömning: håller med; detta visar inte att vald stack är för tung, bara att det ännu inte är verifierat.

## 3. P2 – Validerad indata måste vara oföränderlig

Underlag: byggfaser.md:36 och :77–79.

Om direktuppladdning med signerad S3-URL väljs kan klienten i en felaktig design ersätta objektet efter validering men före workerhämtning. Då behandlas andra bytes än dem som kontrollerades.

Rekommendation: inför invarianten att validerade bytes är de som bearbetas. För vald uppladdningsväg används exempelvis en serverkontrollerad slutlig fil som klienten inte kan skriva över, eller en fixerad objektversion. Frys data före slutlig validering/köläggning eller validera den frysta kopian. En kopiering efter validering utan skydd mot byte däremellan räcker inte. Testa objektbyte och upprepad finalize.

När: kontrakt i fas 1, implementation/test i fas 2. Huvudagentens bedömning: håller med; villkorad risk eftersom uppladdningsvägen ännu inte är vald.

## 4. P2 – Åtkomststopp måste definieras för utfärdade länkar

Underlag: byggfaser.md:36, :110 och :137–138.

En redan utfärdad signerad S3-länk kan ge åtkomst utan ny applikationskontroll. En överföring som startat före utgången kan fortsätta efteråt. Därför är uttrycket att åtkomst upphör vid utgång/radering för absolut utan ett konkret kontrakt.

Rekommendation: skilj mellan nya beviljanden, nya överföringar och pågående överföringar. Bestäm maximal länklivslängd och vad manuell radering ska innebära. Eventuella länkar ska inte utfärdas för längre än återstående retention. Om omedelbar återkallelse krävs behöver leveransvägen stödja den. Lägg till test av redan utfärdad länk efter radering/utgång.

När: kontrakt i fas 1, implementation i fas 3 och livscykeltest i fas 4. Huvudagentens bedömning: håller med; detta kräver inte automatiskt proxyströmning genom API:t.

## 5. P2 – Lista alla operationer som omfattas av samtidighetsgränsen

Underlag: plan.md:44 och :105; byggfaser.md:53 och :77–79; uppgift.md:26.

Planen nämner transkribering, översättning och rendering, men uttrycket tung operation kan lämna utrymme för samtidig ljudextraktion, normalisering eller förhandsvisningsgenerering i uppladdningsflödet.

Rekommendation: lista uttryckligen vilka operationer som använder samma globala tillträde: avkodning, ljudextraktion, omkodning, AI och inbränning. Definiera separat om och hur begränsad metadataavläsning får ske; dra inte slutsatsen att ett verktyg är billigt enbart för att det kallas inspektion. Testa uppladdning/validering under pågående rendering.

När: fas 1, verifiering i fas 2–3. Huvudagentens bedömning: håller med. Den redan planerade globala mekanismen behålls; ingen ny schemaläggningsarkitektur krävs.

## Redan identifierade risker och kvarvarande begränsningar

Följande är redan bindande arbetsuppgifter eller uttryckliga begränsningar, inte nya missar: amqpeasy-versionens faktiska beteende, dubbletter och omstarter, retention under kö/körning, övertagande vid kapacitetsgräns, redigeringskonflikter, sammanhängande MP4/SRT-versioner, modellval och källspråk samt faktiska mobilbyggen. Dessa är fortfarande olösta tills fas 1:s kontrakt och efterföljande tester finns.

Gästsessionen garanterar inte en unik fysisk person. Ny session kan kringgå kvoten. Detta är ett redan accepterat produktval; granskningen är inte skäl att återinföra strikt IP-kvot eller e-postkrav för gäster.

## Samlad rekommendation

Behåll stacken och de fem faserna. Hantera examinationskvoten som ett separat produkt-/bedömningsbeslut och lägg till de fyra tekniska preciseringarna i fas 1 före implementation. Det finns inget underlag här för fler tjänster, mikrotjänster eller ett generellt arkitekturbyte.

Extern primärkälla för S3-fynden: https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html (granskad av subagenten). Signerade URL:er kan återanvändas under giltighetstiden, PUT kan ersätta objekt med samma nyckel och påbörjad hämtning kan fortsätta efter utgången.
