Examination – Videotranskribering med AI
Backendutveckling, Linux och driftsättning
Bakgrund och uppgift
Du har fått i uppdrag att utveckla en webbtjänst som automatiskt genererar och lägger till undertexter
på videoklipp med hjälp av AI.
Användaren ska kunna ladda upp en video och därefter ladda ner både en separat undertextfil och en ny
version av videon där undertexterna är permanent inbrända.
Tjänsten ska köras på en egen Linux-server (VPS) som du själv ansvarar för att konfigurera och
driftsätta. AI-modellen ska köras lokalt, utan externa AI-API:er eller betalda transkriberingstjänster.
Du kan exempelvis använda Whisper för transkribering och FFmpeg för videobearbetning. Verktygen
kan anropas från en backend utvecklad med exempelvis Bun eller Node.js.
Syftet är att kombinera backendutveckling, Linux-administration, AI-integration, processhantering och
driftsättning i ett praktiskt projekt.
Obligatoriska krav
1. Backend och API
Utveckla ett HTTP-API som erbjuder följande funktionalitet:
Ladda upp videofiler i ett eller flera vanliga format.
Validera filformat, filstorlek och videolängd.
Acceptera videor som är högst 60 sekunder långa.
Transkribera videons tal med en lokalt installerad AI-modell.
Generera en nedladdningsbar undertextfil i .srt-format.
Använda FFmpeg för att bränna in undertexterna i videon.
Erbjuda nedladdning av den färdiga videon i .mp4-format.
Erbjuda en endpoint för att kontrollera bearbetningens status.
2. Samtidighet och resurshantering
Servern får endast bearbeta en video åt gången, inklusive transkribering och inbränning av undertexter.
Om flera användare skickar förfrågningar samtidigt ska systemet hantera detta kontrollerat, exempelvis
genom att neka nya jobb med ett tydligt meddelande.
Applikationen ska hantera fel och rensa temporära filer efter bearbetning. Serverns begränsade CPU,
RAM och lagringsutrymme ska beaktas.
3. Linux och driftsättning
Applikationen ska driftsättas på en egen Linux-VPS och vara tillgänglig via internet. Du ansvarar själv för
serverkonfiguration, installation av beroenden och att applikationen kan köras stabilt.
Lösningen ska fungera utan dedikerat grafikkort (GPU).
Bonusuppgifter – fördjupning
Följande funktioner är frivilliga:
Webbgränssnitt: Bygg en frontend där användare kan ladda upp videor, följa bearbetningen och
ladda ner resultatet.
Användarkonton och nedladdningsbegränsning: Implementera registrering och inloggning.
Besökare utan konto får göra högst en nedladdning per timme. För att kunna ladda ner fler filer
under samma timme måste användaren skapa ett konto och logga in. Begränsningen ska
kontrolleras på serversidan och inte kunna kringgås genom att exempelvis uppdatera sidan.
Jobbkö: Implementera en kö där flera uppladdningar väntar på bearbetning, men endast ett jobb
körs samtidigt.
Rate limiting: Begränsa antalet API-förfrågningar eller uppladdningar per användare eller IP-
adress för att motverka överbelastning.
Docker: Containerisera applikationen och använd Docker Compose för driftsättning.
Övervakning: Implementera loggning och mätvärden för CPU, minnesanvändning och bearbetningstider