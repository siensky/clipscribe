# Projektregler

## Fastställda arbetssätt

- Följ `repostruktur.md` för monorepo, tunna index-entrypoints, lageransvar, kodstil och central felhantering. Varje applikationsfelkod har en separat klass som ärver BaseError.

- Prioritera den enklaste robusta lösningen som uppfyller beslutade krav.
- Undvik spekulativ abstraktion, onödiga tjänster och överengineering.
- Dokumentera beslut, motiv och öppna frågor i Markdown.
- Skilj examinationskrav från egna produktkrav och frivilliga bonusfunktioner.
- Behandla preliminära teknikval som förslag tills de bekräftats.
- Använd amqpEasy för RabbitMQ-integrationen; verifiera bibliotekets faktiska kontrakt innan designen låses.
- Planera och bygg i avgränsade faser med verifierbara acceptanskriterier.
- Följ fasordning och överlämningskrav i `byggfaser.md`. Dokumentera verifieringsresultat innan en fas markeras klar; öppna produktbeslut får inte döljas som implementationsantaganden.
- Använd inte dagplanering eller kalenderschema; tid är inte styrande för omfattningen.
- Alla bonusfunktioner samt webb och mobil ingår. Föreslå stackbyten endast med konkreta skäl.
- Testa affärsregler, systemgränser och felåterhämtning med riskbaserade tester.
- Följ `teststrategi.md`: fokuserade enhets-, integrations- och komponenttester samt en sammanhållen E2E-svit med oberoende scenarier. Bygg tester i samma fas som funktionen, inte efter produktbygget.
- Mocka inte PostgreSQL/RabbitMQ i tester som ska bevisa transaktioner, constraints eller leverans. Märk ersatta AI-/externa beroenden tydligt och komplettera med verklig verifiering.
- Använd inga fasta sleeps eller automatiska omförsök för att dölja instabila tester. Kritiska skippade eller flaky tester blockerar fasöverlämning/release.
- Testdata och felinjektion ska vara isolerade från produktion; säkerställ att testhemligheter och signerade länkar inte läcker i rapporter.
- Utlova inte felfri produktion. Komplettera tester med driftskydd, övervakning och återställning.

## Återstår att precisera

Exakt felkatalog, pakethanterare/verktygsversioner, valideringskontrakt, säkerhetsdetaljer, SQL/migreringar, meddelandekontrakt och driftrutiner konkretiseras under planeringen. Struktur och kodstandard är dokumenterade i repostruktur.md.
