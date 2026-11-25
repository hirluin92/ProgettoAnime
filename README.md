# Arena Anime (nome provvisorio)

Gioco web d'asta e draft a tema anime: da 2 a 20 amici comprano all'asta i personaggi per 7 ruoli,
poi un torneo all'italiana mette in scena ogni scontro in modo animato. Specifica completa in
`PIANO_MVP.md`, regole di lavoro in `CLAUDE.md`.

## Cosa c'è
- **Asta live** con stanze a codice, rientro con token, fase di **ban** opzionale (0–3 per giocatore).
- **Torneo** a girone, classifica e replay condivisibile di ogni scontro (`/partita/{id}`).
- **Partita veloce** contro la CPU (`/veloce`) e **sfida del giorno** con classifica (`/sfida`).
- **Modalità streamer**: la chat di Twitch gioca come squadra (`!offro N`) e c'è l'overlay OBS `/overlay/{codice}`.
- Scontro animato con commento automatico, suono, Salta e velocità ×2.

## Requisiti
Python 3.12 + `uv`, Node 20+, Docker, `make` (su Windows: `winget install ezwinports.make`).

## Avvio
```
docker compose up -d db        # Postgres 16
cp .env.example .env           # poi adatta i valori se serve
make dev                       # backend su :8000, frontend su :3000
make lint                      # ruff, mypy, eslint, prettier
make test                      # pytest, Vitest, Playwright
```
Senza `DATABASE_URL` il backend usa un SQLite locale. Migrazioni: `cd backend && uv run alembic upgrade head`.

## Dati e tipi
- Personaggi, duo e counter sono in `backend/data/*.json` (solo testo, nessuna immagine).
  Controllo: `cd backend && uv run python ../scripts/validate_data.py`.
- I tipi TypeScript si generano dai modelli Pydantic: `cd backend && uv run python ../scripts/gen_schema.py`
  poi `cd frontend && npm run gen:types`.
- Report di bilanciamento: `backend/tests/balance_report.md` (rigenerato da `pytest`).

## Provare la modalità streamer senza Twitch
Avvia il backend con `DEV_TOOLS=1 TWITCH_READER=0`, crea una stanza streamer dalla home, avvia l'asta e lancia
`cd backend && uv run python ../scripts/fake_chat.py CODICE --rate 200`.

## Contenuti e immagini
Il repository non contiene immagini, loghi o artwork ufficiali: le carte usano iniziali e colore dell'anime.
Il campo opzionale `immagine_url` e la variabile `NEXT_PUBLIC_SHOW_IMAGES=false` (interruttore d'emergenza)
sono predisposti. Per la pubblicazione vedi `DEPLOY.md`.
