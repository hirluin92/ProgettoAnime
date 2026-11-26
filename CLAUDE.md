# CLAUDE.md

Gioco web d'asta e draft a tema anime. **Leggi prima `STATO.md`** (cosa è fatto, cosa resta da fare, trappole note, dove è online).
La specifica completa è in `PIANO_MVP.md`; il piano V2 in `PROPOSTA_V2.md`.

## Regole di lavoro

- Una milestone alla volta (sezione 10 di `PIANO_MVP.md`). Prima proponi il piano, poi aspetta
  conferma, poi implementa.
- Ogni milestone su un branch `milestone/<numero>-<nome>`, con commit piccoli e descrittivi.
- Niente funzioni fuori scope. Se una richiesta non è chiara, chiedi.
- Alla fine di ogni milestone: test verdi, lint pulito, riepilogo con istruzioni per provare a mano.

## Comandi

- `make dev` — avvia Postgres, backend e frontend
- `make test` — tutti i test (pytest, Vitest, Playwright)
- `make lint` — ruff, mypy, eslint, prettier

## Convenzioni

- Backend: Python 3.12, type hints ovunque, Pydantic v2, funzioni del motore pure e deterministiche.
- Il server è l'unica autorità su timer, offerte e risultati.
- Frontend: TypeScript strict, componenti piccoli, tipi dei messaggi generati dal backend.
- Testi dell'interfaccia in italiano, tutti in `frontend/i18n/it.json`.
- Mai segreti nel codice: usa `.env` e aggiorna `.env.example`.

## Vincoli da non violare

- Immagini dei personaggi: solo collegate (hotlink) dal servizio AniList, mai copiate né ospitate; credito in footer e in /info. Nessun logo o artwork ufficiale scaricato da altre fonti. L'API AniList è gratuita solo per uso non commerciale: finché usa le immagini, la pubblicità resta spenta (`NEXT_PUBLIC_ADS_ENABLED` non attivo).
- Il motore di gioco non legge né scrive file, rete o database: riceve dati e restituisce dati.
- `reference/scontro.html` è solo un riferimento: non va servito né importato.
