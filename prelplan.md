# Teknisk plan

## Arkitektur
Vi bygger en AI-baserad undertexttjänst med en modulär monolit och en separat worker. Användaren laddar upp en video som lagras i Amazon S3. Backend validerar videon, registrerar jobbet i PostgreSQL och skickar det till RabbitMQ.

## Videobearbetning
En separat worker hämtar jobb från kön och bearbetar en video åt gången. Whisper används för lokal AI-transkribering och FFmpeg för att generera en video med inbrända undertexter. Resultatet sparas i S3 och blir tillgängligt för nedladdning tillsammans med SRT-filen.

## Data och autentisering
PostgreSQL hanterar användardata, jobbstatus och nedladdningsbegränsningar. RabbitMQ används för tillförlitlig köhantering med återförsök och felhantering. Auth0 sköter autentisering och användarkonton.

## Klient och driftsättning
Frontend byggs med React Native och Expo, vilket gör det möjligt att erbjuda tjänsten både som webbapp och mobilapp. Hela backend-systemet containeriseras med Docker Compose och driftsätts på en Linux-VPS med Nginx som reverse proxy.

## Techstack
Område	Teknik
Frontend	React Native + Expo + TypeScript
Backend	Node.js + Fastify + TypeScript
Databas	PostgreSQL (rå SQL, ingen ORM)
Autentisering	Auth0
Jobbkö	RabbitMQ
Worker	Node.js + TypeScript
AI	Whisper (lokalt på CPU)
Videobearbetning	FFmpeg
Fillagring	Amazon S3
Containerisering	Docker + Docker Compose
Reverse proxy	Nginx + HTTPS
Övervakning	Prometheus + Grafana
Server	Ubuntu Linux VPS