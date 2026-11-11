# Hallaien

Talebaserte KI-assistenter for skolen. Lærere lager en assistent med navn, beskrivelse,
systeminstruks og stemme, og deler den med elevene med en kode. Elevene logger inn,
taster koden og snakker med assistenten.

## Slik er det bygget

| Del | Tjeneste |
| --- | --- |
| Nettside | Next.js 16 med egen Node-server (`server.ts`) |
| Innlogging | Google (Workspace) via Auth.js. `vlfk.no` blir lærer, `iskule.no` blir elev, alle andre avvises |
| Database | Firestore (`lib/db`). Nettleseren snakker aldri direkte med databasen |
| Tale | Gemini Live. Lyden går nettleser ⇄ `/api/live` på serveren ⇄ Google |

Talen går via serveren av to grunner: Google-nøklene og lærerens systeminstruks forlater
aldri serveren, og serveren kan bruke Vertex AI i EU-regionen.

Delekoder er på 6 tegn og varer i 24 timer. Når en elev løser inn en kode, får eleven
tilgang til assistenten i 24 timer.

## Oppsett i Google Cloud (én gang)

Alt gjøres i ett Google Cloud-prosjekt med fakturering.

1. **Firestore**: Opprett en database i *Native mode* med plassering i EU (f.eks. `eur3`
   eller `europe-north1`). Sikkerhetsreglene kan stå på «nekt alt», siden bare serveren
   leser og skriver.
2. **Vertex AI**: «Agent Platform API» (Vertex AI) må være slått på.
3. **Tjenestekonto**: Lag en tjenestekonto med rollene *Cloud Datastore User* og
   *Vertex AI User* (Agent Platform User). Last ned en JSON-nøkkel og legg den på serveren.
   Nøkkelen skal ikke sjekkes inn i git.
4. **OAuth-klient**: Under *APIs & Services > Credentials*, lag en *OAuth client ID* av
   typen *Web application* med redirect-adressen
   `https://DITT-DOMENE/api/auth/callback/google`
   (og `http://localhost:3000/api/auth/callback/google` for lokal utvikling).
   På *OAuth consent screen* kan brukertypen være *External*. Appen slipper uansett bare
   inn kontoer fra domenene i `TEACHER_DOMAINS` og `STUDENT_DOMAINS`.

## Kjøre appen

```bash
cp .env.example .env.local   # fyll inn verdiene
npm install
npm run dev                  # utvikling, http://localhost:3000
```

Produksjon:

```bash
npm install
npm run build
npm start
```

Appen må stå bak en omvendt proxy med HTTPS (Caddy, nginx, Traefik). Proxyen må slippe
gjennom WebSocket til `/api/live`, og `AUTH_URL` må være den offentlige adressen.
Mikrofon i nettleseren virker bare over HTTPS (eller på localhost).

### Lokalt uten Google

Sett `AUTH_DEV_LOGIN=true` for å logge inn ved å skrive en e-postadresse
(`noe@vlfk.no` gir lærer, `noe@iskule.no` gir elev). Dette er avslått i produksjon.
Firestore kan kjøres lokalt med emulatoren (`FIRESTORE_EMULATOR_HOST`), og talen kan
testes med `GEMINI_API_KEY` i stedet for Vertex.

## Talemodell og EU

Standard er `gemini-3.8-live` på Vertex AI med `GOOGLE_CLOUD_LOCATION=eu`. Hvis prosjektet
ikke har tilgang til den modellen i EU, sett `GEMINI_LIVE_MODEL` til en annen Live-modell
som er tilgjengelig der.

## Videre arbeid

- Filer som kontekst for assistentene (PDF, Word, tekst). Planen er å lagre filene i
  Cloud Storage og legge innholdet ved systeminstruksen.
- Tilgang via utdanningsprogram er tatt ut i denne versjonen. Bare delekoder gir tilgang.
