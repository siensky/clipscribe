# Instruktioner för arbete i ClipScribe

Projektet är i planeringsfas. Implementera inte produkten om uppgiften bara gäller planering eller granskning.

Läs relevanta delar av följande innan ändringar:

- `uppgift.md`: examinationsunderlag.
- `plan.md`: beslutade produktkrav och öppna frågor.
- `projektregler.md`: gemensamma arbetssätt.
- `repostruktur.md`: bindande struktur, lageransvar, kodstil och felhantering.
- `teknisk-strategi.md`: beslut om idempotens, transaktioner, outbox, S3 och worker.
- `byggfaser.md` och `teststrategi.md`: arbetsordning och verifieringskrav.

Bevara uttryckliga användarbeslut. Gör inte öppna parametrar till tysta produktbeslut. Uppdatera berörda dokument tillsammans när ett beslut ändras.

API/worker har tunna index-entrypoints. Routes/controllers, services, repositories, schemas, mappers och types har separata ansvar enligt repostruktur.md. Använd BaseError och separat klass/fil per applikationsfelkod, med central HTTP-/workerhantering. Ingen affärslogik i routes eller entrypoints, ingen SQL i controllers och inga serverhemligheter i klient/kontrakt.

Bygg enkelt: inga tomma lager, generiska basrepositories eller nya tjänster utan konkret behov. Tester följer funktionens fas och ska bevisa beteende och felåterhämtning. Rapportera vad som faktiskt verifierats; en plan eller mock är inte bevis på fungerande produktionsintegration.
