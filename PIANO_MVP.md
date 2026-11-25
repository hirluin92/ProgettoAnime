# Piano MVP — Gioco d'asta anime (nome provvisorio)

> File di specifica per Claude Code. Va messo nella root del repository insieme a `CLAUDE.md`
> e a `reference/scontro.html` (il prototipo dello scontro animato).

---

## 0. Come lavorare su questo piano (istruzioni per Claude Code)

1. Leggi tutto il file prima di scrivere codice.
2. Lavora **una milestone alla volta** (sezione 10), nell'ordine indicato.
3. All'inizio di ogni milestone: proponi un piano di implementazione breve (file da creare o
   modificare, scelte tecniche) e **aspetta conferma** prima di scrivere codice.
4. Alla fine di ogni milestone: test verdi, `ruff` e `eslint` puliti, riepilogo di cosa è stato
   fatto e di come provarlo a mano, poi commit sul branch `milestone/<numero>-<nome>`.
5. Non aggiungere funzioni elencate in "Fuori scope" (sezione 2). Se qualcosa non è chiaro,
   chiedi invece di inventare.
6. Le regole di gioco della sezione 5 sono la fonte di verità: se il codice e il piano
   divergono, segnalalo.

---

## 1. Obiettivo dell'MVP

Un gioco web, giocabile da telefono e PC senza installare nulla, in cui:

- da 2 a 20 amici entrano in una stanza con un codice e **comprano all'asta** personaggi anime
  per formare una squadra di 7 ruoli;
- finita l'asta parte un **torneo all'italiana** e ogni scontro è mostrato come
  **scontro animato** (stile prototipo in `reference/scontro.html`);
- uno **streamer** può aprire una stanza in cui **la chat di Twitch** partecipa all'asta come
  squadra, con una **pagina overlay** da aggiungere in OBS;
- chi gioca da solo può fare una **partita veloce** (draft contro la CPU).

Il successo dell'MVP si misura così: 10 streamer che lo usano in live e 1.000 partite giocate.

---

## 2. Fuori scope per l'MVP

Da NON implementare ora (arriveranno in fasi successive):

- account utente, login, profili
- modalità AUT (carte, bustine, collezione, lega del weekend)
- pagamenti, abbonamenti, valuta virtuale
- sfida del giorno, scalata a 10 livelli
- traduzioni (solo italiano, ma tutte le stringhe in un file `i18n/it.json`)
- immagini ufficiali, loghi o screenshot degli anime: **vietati** (vedi sezione 9)

---

## 3. Stack

| Parte | Scelta |
| --- | --- |
| Backend | Python 3.12, FastAPI, WebSocket nativi di FastAPI, Pydantic v2, gestione dipendenze con `uv` |
| Database | PostgreSQL 16 con SQLAlchemy 2 + Alembic (solo per salvare partite e risultati) |
| Stato delle stanze | In memoria nel processo backend, dietro un'interfaccia `RoomStore`, così in futuro si sostituisce con Redis senza toccare la logica |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind, Framer Motion, Zustand |
| Test | `pytest` (backend), Vitest (frontend), Playwright (end-to-end con più browser nella stessa stanza) |
| Qualità | `ruff` + `mypy` sul backend, `eslint` + `prettier` sul frontend |
| Locale | `docker compose` con Postgres; backend e frontend avviati con comandi in `Makefile` |
| Deploy | Frontend su Vercel; backend su Fly.io o Railway (un'istanza sola); Postgres gestito (Neon) |

Un'istanza backend sola è una scelta voluta per l'MVP: lo stato delle stanze sta in memoria.

---

## 4. Struttura del repository

```
/backend
  /app
    main.py              # FastAPI, rotte HTTP e WebSocket
    /engine              # motore di gioco PURO, senza I/O
      roles.py           # ruoli e tag voluti
      scoring.py         # calcolo punteggio
      simulate.py        # simulate(team_a, team_b, seed) -> MatchResult con copione
      rng.py             # RNG deterministico con seed
    /rooms               # logica stanze e asta
      models.py          # stato stanza (Pydantic)
      auction.py         # macchina a stati dell'asta
      tournament.py      # calendario e classifica
      store.py           # interfaccia RoomStore + implementazione in memoria
      protocol.py        # messaggi WebSocket (Pydantic, discriminated union)
    /twitch
      chat.py            # lettura chat Twitch (IRC anonimo)
    /db                  # modelli SQLAlchemy, sessioni
  /data
    characters.json
    duos.json
    counters.json
  /tests
/frontend
  /app                   # pagine Next.js
  /components
    /battle              # scontro animato (port del prototipo)
    /auction
  /lib                   # client WebSocket, tipi condivisi
/reference
  scontro.html           # prototipo, solo riferimento
/e2e                     # test Playwright
docker-compose.yml
Makefile
CLAUDE.md
PIANO_MVP.md
```

I tipi dei messaggi WebSocket e del copione vanno generati da Pydantic in JSON Schema e da lì
in TypeScript con `json-schema-to-typescript`, così
backend e frontend non divergono.

---

## 5. Regole di gioco (fonte di verità)

### 5.1 Personaggi

Un personaggio in `characters.json`:

```json
{
  "id": "naruto-uzumaki",
  "nome": "Naruto Uzumaki",
  "anime": "naruto",
  "ruolo_firma": "Capitano",
  "tags": ["MELEE", "AURA", "SUMMON"],
  "rating": 92
}
```

- `rating` da 55 a 99.
- `tags`: da 1 a 3, presi da: `MELEE, RANGE, AURA, BARRIER, GIANT, ELEMENT, MOBILITY, SPEED,
  PSYCHIC, ENERGY, STEALTH, SUMMON, TRANSFORM, HEAL, REGEN`.
- Contenuto MVP: **80–100 personaggi da 4–5 anime** (lista anime da confermare con l'utente).
  Prepara uno script `scripts/validate_data.py` che controlla lo schema e la distribuzione dei
  rating (non più di 10 personaggi sopra 95).
- Solo dati testuali: niente URL di immagini.

`duos.json`: coppie con una storia insieme, `{"a": "id1", "b": "id2", "nome": "Squadra 7"}`.

### 5.2 Ruoli

Sette ruoli, ognuno con i tag che preferisce:

| Ruolo | Tag voluti |
| --- | --- |
| Capitano | MELEE, AURA, RANGE |
| Vice | AURA, MELEE, MOBILITY |
| Tank | GIANT, BARRIER, MELEE |
| Danno | RANGE, ELEMENT, MELEE |
| Supporto | SUMMON, MOBILITY, BARRIER |
| Supporto II | SUMMON, MOBILITY, SPEED |
| Guaritore | HEAL, AURA, REGEN |

### 5.3 Punteggio di una squadra contro un'altra

Per ogni personaggio:

- **base** = `rating`
- **ruolo**: tag in comune con il ruolo occupato ≥ 2 → +12; = 1 → +4; = 0 → −8
- **ruolo firma**: +6 se il personaggio occupa il suo `ruolo_firma`
- **forma del giorno**: intero casuale 0–12 dal RNG con seed

Per la squadra:

- **counter**: per ogni relazione in `counters.json` (es. `BARRIER > ELEMENT`), se la squadra ha
  `nw ≥ 1` personaggi con il tag vincente, l'avversario ha `nl ≥ 1` con il tag perdente e
  `nw ≥ nl`, bonus = `min(20, 8 + 4·(nw − nl) + 2·nl)`. Si contano **al massimo i 2 counter
  migliori** per squadra.
- **duo**: +12 per ogni coppia di `duos.json` presente nella stessa squadra (massimo 2 duo).

Totale = somma di tutto. Vince il totale più alto; a parità vince chi ha la somma dei `rating`
più alta, poi sorteggio con il seed.

Relazioni iniziali in `counters.json`:
`MOBILITY>RANGE, BARRIER>ELEMENT, SPEED>GIANT, PSYCHIC>SPEED, RANGE>MELEE, MELEE>MOBILITY,
AURA>BARRIER, ENERGY>BARRIER, TRANSFORM>STEALTH, STEALTH>SUMMON, REGEN>ELEMENT, HEAL>REGEN`.

### 5.4 Motore e copione dello scontro

`simulate(team_a, team_b, seed) -> MatchResult` è una **funzione pura e deterministica**:
stesso input e stesso seed → stesso output, sempre. Restituisce:

- `totali` e `dettaglio` per voce (base, ruolo, firma, forma, counter, duo) per ogni squadra
- `vincitore`
- `eventi`: il copione che il frontend mette in scena

Tipi di evento (stessi del prototipo):

| tipo | campi | significato |
| --- | --- | --- |
| `ingresso` | – | inizio scontro |
| `duello` | `ruolo`, `idx` | si affrontano i due personaggi del ruolo `idx` |
| `attacco` | `da`, `idx`, `danno` | colpo semplice |
| `counter` | `da`, `rel`, `bonus`, `danno` | counter tra tag |
| `combo` | `da`, `duo`, `nome`, `bonus`, `danno` | combo di un duo |
| `ko` | `da`, `danno` | colpo finale |

Costruzione del copione: come in `reference/scontro.html`, funzione `simulate`. I danni sono
normalizzati: la squadra vincente infligge in totale 100 (porta l'avversario a 0); la perdente
infligge `100 − rimanente`, con `rimanente = clamp(round((Tv − Tp) / Tv · 400), 8, 70)`.
Durata di uno scontro animato: **20–30 secondi** a velocità ×1.

Test obbligatori del motore:

- determinismo (stesso seed → stesso JSON)
- somma dei danni corretta per entrambe le squadre
- nessun danno negativo
- simulazione di 10.000 scontri tra squadre casuali: nessun personaggio presente in più del 70%
  delle squadre vincenti (report in `tests/balance_report.md`)

---

## 6. Asta live

### 6.1 Stanza

- Codice di 5 caratteri (lettere maiuscole senza ambigue: niente O, I, 0, 1).
- 2–20 giocatori. Il primo è l'host.
- Impostazioni dell'host: budget (default 50), durata del timer (default 10 s), anime inclusi.
- Ogni giocatore ha nome, colore, budget, 7 slot (uno per ruolo).
- La stanza scade dopo 30 minuti di inattività.

### 6.2 Flusso dell'asta

1. Il server estrae un personaggio casuale non ancora assegnato (il **lotto**).
2. Timer del lotto: 10 s. Ogni offerta valida porta il timer a `max(rimanente, 5 s)`.
3. Offerta valida: maggiore dell'offerta corrente; il giocatore ha almeno uno slot libero;
   dopo l'offerta deve restargli almeno 1 per ogni altro slot libero.
4. Un giocatore può **passare** su quel lotto (non può più offrire per quel lotto).
5. Allo scadere del timer: il miglior offerente paga e ha 8 s per scegliere in quale **ruolo
   libero** mettere il personaggio; se non sceglie, il server lo mette nel ruolo libero dove
   rende di più (`ruolo` + `ruolo firma`).
6. Nessuna offerta: il lotto viene scartato e si passa al successivo.
7. Un giocatore con la squadra completa non partecipa più alle aste.
8. Se resta un solo giocatore con slot liberi, i lotti successivi gli vengono assegnati a 1
   finché non completa la squadra.
9. L'asta finisce quando tutte le squadre sono complete.

Il **server è l'unica autorità**: timer, validazione offerte e ordine degli eventi sono tutti
lato server. Il client mostra solo lo stato ricevuto. Offerte quasi simultanee: vale l'ordine
di arrivo al server, gestito con un lock per stanza.

### 6.3 Protocollo WebSocket

Endpoint: `/ws/rooms/{code}`. Messaggi JSON con campo `type`.

Client → server:

| type | payload |
| --- | --- |
| `join` | `name`, `token?` (per rientrare) |
| `start` | – (solo host) |
| `bid` | `amount` |
| `pass` | – |
| `assign_role` | `role` |
| `update_settings` | impostazioni (solo host, solo in lobby) |

Server → client:

| type | payload |
| --- | --- |
| `room_state` | snapshot completo della stanza (inviato a ogni join e rientro) |
| `lot_started` | personaggio, scadenza del timer (timestamp server) |
| `bid_placed` | giocatore, importo, nuova scadenza |
| `player_passed` | giocatore |
| `lot_won` | giocatore, importo, in attesa di scelta ruolo |
| `lot_assigned` | giocatore, personaggio, ruolo |
| `lot_skipped` | personaggio |
| `auction_finished` | squadre finali |
| `tournament_result` | calendario, classifica, `match_id` di ogni scontro |
| `error` | `code`, `message` |

Rientro: il `token` è salvato in `localStorage`; chi si disconnette può rientrare entro 60 s e
ritrova il suo posto. Durante l'assenza il server lo fa passare automaticamente.

Scorciatoie da tastiera nella pagina d'asta: `1` `2` `5` `0` rilanciano di 1/2/5/10, `M`
offre tutto il possibile, `P` passa.

### 6.4 Torneo

- Tutti contro tutti, calendario a giornate con il metodo del girone (es. 8 squadre:
  giornata 1 = 1-8, 2-7, 3-6, 4-5).
- Seed di ogni scontro derivato dal seed della stanza e dalla coppia di squadre.
- Vittoria 3 punti, pareggio (stesso totale) 1, sconfitta 0; a parità di punti conta la somma
  dei totali.
- Ogni scontro è salvato in Postgres con il suo copione e ha un link
  `/partita/{match_id}` per rivederlo e condividerlo.
- Con 2 giocatori: un solo scontro, mostrato subito animato.

---

## 7. Modalità streamer

- Lo streamer crea una stanza scegliendo "Stanza streamer" e inserisce il nome del canale Twitch.
- Il backend si collega alla chat in **sola lettura** con connessione IRC anonima
  (`justinfan<numero>`), senza OAuth: per leggere la chat non serve autenticazione.
- La **chat** è un giocatore della stanza ("Chat di <canale>").
- Durante un lotto gli spettatori scrivono `!offro N`. Ogni secondo il server calcola l'offerta
  della chat: il valore N più alto che ha ricevuto almeno `soglia` voti (default 3,
  configurabile dallo streamer). Se è valida secondo le regole 6.2, viene registrata come
  offerta della chat. Un voto per utente per lotto (vale l'ultimo).
- La chat sceglie il ruolo in automatico (miglior ruolo libero).
- `!squadra` non risponde in chat (sola lettura): la squadra della chat è visibile nell'overlay.
- **Overlay OBS**: pagina `/overlay/{code}` con sfondo trasparente, dimensione 1920×1080, che
  mostra lotto corrente, timer, offerte, squadre e scontri animati. Nessun controllo cliccabile.
- Limite: massimo 1 stanza streamer per canale alla volta.

---

## 8. Frontend

### Pagine

| Percorso | Contenuto |
| --- | --- |
| `/` | Crea stanza, entra con codice, partita veloce, stanza streamer |
| `/stanza/[code]` | Lobby → asta → torneo, nella stessa pagina con stati diversi |
| `/partita/[id]` | Replay di uno scontro animato, condivisibile |
| `/overlay/[code]` | Overlay per OBS |
| `/veloce` | Partita veloce contro la CPU |
| `/info` | Regole, disclaimer, richieste di rimozione |

### Scontro animato

Porta il prototipo `reference/scontro.html` in componenti React con Framer Motion:
carte grandi che si scontrano, barre vita, numeri di danno, scritte COUNTER / COMBO DUO / K.O.,
scossa dello schermo, effetti sonori brevi (con pulsante per disattivarli), pulsanti
Salta e Velocità ×2. Deve rispettare `prefers-reduced-motion`.

### Carte senza immagini

Ogni carta: colore dell'anime (palette in `frontend/lib/animePalette.ts`), iniziali del
personaggio dentro un'icona del ruolo, nome, tag, rating. Nessuna immagine esterna.

### Mobile first

Tutto deve funzionare su uno schermo da 360 px. Pulsanti di offerta grandi (almeno 44 px),
raggiungibili con il pollice.

### Partita veloce

Draft da solo: per ogni ruolo il giocatore sceglie tra 5 personaggi estratti, con budget 50 e
costo per personaggio in base al rating. La CPU fa il suo draft con lo stesso budget. Poi
scontro animato.

---

## 9. Vincoli legali e di contenuto

- Nessuna immagine, logo, screenshot o artwork ufficiale degli anime. Solo nomi e dati testuali.
- Footer in ogni pagina: "Progetto non ufficiale creato da fan. I personaggi appartengono ai
  rispettivi titolari dei diritti."
- Pagina `/info` con indirizzo email per le richieste di rimozione.
- Banner cookie con rifiuto facile; nessuno script di analisi o pubblicità prima del consenso.
- Spazi per la pubblicità predisposti (componente `AdSlot`) ma disattivati di default.
- Il nome del gioco è provvisorio: usa la costante `APP_NAME` in un solo punto.

---

## 10. Milestone

Ogni milestone ha criteri di accettazione verificabili. Non iniziare la successiva finché la
precedente non li soddisfa tutti.

### M1 — Repository e strumenti
- Struttura della sezione 4, `docker-compose.yml` con Postgres, `Makefile` con `make dev`,
  `make test`, `make lint`.
- CI su GitHub Actions: lint e test di backend e frontend.
- ✅ `make dev` avvia tutto; `make test` passa; la CI è verde.

### M2 — Dati e motore di gioco
- Schema dei dati, script di validazione, `characters.json` con almeno 20 personaggi di prova.
- `engine/` completo secondo la sezione 5, con i test obbligatori.
- Endpoint `POST /api/simulate` per provare il motore.
- ✅ Test di determinismo, danni e bilanciamento verdi; report generato.

### M3 — Scontro animato
- Componenti React dello scontro, pagina `/partita/[id]` che legge un copione salvato.
- Pagina di prova `/dev/scontro` con due squadre casuali.
- ✅ Lo scontro dura 20–30 s, Salta e ×2 funzionano, gira fluido su un telefono di fascia media.

### M4 — Stanze e lobby
- Creazione stanza, codice, ingresso, lobby con lista giocatori, impostazioni dell'host,
  rientro con token.
- ✅ Test Playwright: 3 browser entrano nella stessa stanza e si vedono a vicenda; uno chiude
  e rientra ritrovando il suo posto.

### M5 — Asta completa
- Tutte le regole 6.2, scorciatoie da tastiera, interfaccia mobile.
- ✅ Test unitari per ogni regola 6.2 (offerta non valida, riserva di 1 per slot, passaggio,
  lotto senza offerte, ultimo giocatore con slot liberi).
- ✅ Test Playwright con 4 browser che completano un'asta intera.
- ✅ Test di carico: 20 client simulati che offrono in contemporanea per 50 lotti senza errori
  né stati incoerenti.

### M6 — Torneo e risultati
- Calendario, classifica, salvataggio in Postgres, link condivisibili degli scontri.
- ✅ Partita completa da 8 giocatori: classifica corretta e ogni scontro rivedibile dal suo link.

### M7 — Partita veloce
- Draft da solo contro la CPU, secondo la sezione 8.
- ✅ Una partita veloce si completa in meno di 3 minuti.

### M8 — Modalità streamer
- Lettura chat Twitch, offerte della chat, overlay OBS.
- Un simulatore di chat (`scripts/fake_chat.py`) per testare senza un canale vero.
- ✅ Con il simulatore che invia 200 messaggi `!offro` al minuto, la chat compra personaggi e
  completa la squadra; l'overlay si vede correttamente in OBS a 1920×1080.

### M9 — Rifinitura e pubblicazione
- Pagina `/info`, footer, banner cookie, `AdSlot`, gestione errori e stanze scadute,
  pagina 404.
- Deploy su Vercel e Fly.io (o Railway) con Postgres su Neon; variabili in `.env.example`.
- ✅ Una partita da 6 persone su telefoni diversi, in produzione, senza errori.

---

## 11. Decisioni ancora aperte (chiedi all'utente quando servono)

- Nome del gioco e dominio.
- Quali 4–5 anime per i primi 80–100 personaggi.
- Hosting definitivo del backend (Fly.io o Railway).
- Soglia di voti di default per le offerte della chat.
