# STATO DEL PROGETTO

Aggiornato: 2026-11-26. **Leggi questo file all'inizio di ogni sessione.** Regole di lavoro in `CLAUDE.md`, specifica in `PIANO_MVP.md`, piano V2 in `PROPOSTA_V2.md`.

## Cos'è
Gioco web d'asta e draft di personaggi anime reali (5 anime, 100 personaggi). Concorrente da superare: Anime Auction Coliseum. L'utente è italiano, Windows 11, vuole che io faccia tutto da solo senza chiedere; tutto il testo in italiano.

## Dove sta online (nessun segreto qui)
| Parte | Dove | Note |
|---|---|---|
| Frontend | Vercel, https://progetto-anime.vercel.app | Si ridistribuisce da solo a ogni push su `main`. Variabili: `NEXT_PUBLIC_API_URL` (tipo Config), `NEXT_PUBLIC_CONTACT_EMAIL`. Modifiche alle variabili o redeploy manuali chiedono il codice 2FA all'utente. |
| Backend | Render piano free, https://arena-anime-backend.onrender.com | **NON si ridistribuisce da solo** (repo collegato come pubblico): dopo ogni push che tocca `backend/` fare Manual Deploy → Deploy latest commit dal pannello (srv-dc3mrgtg1s2s73c3clt0). Si addormenta dopo ~15 min; il risveglio dura ~1 minuto. Esegue `alembic upgrade head` all'avvio. |
| Database | Neon (progetto `arena-anime`, Francoforte) | La password è comparsa in chat: l'utente deve **resettarla** (Roles → neondb_owner) e aggiornare `DATABASE_URL` su Render → Environment. |
| Codice | https://github.com/hirluin92/ProgettoAnime (pubblico) | CI GitHub Actions: tutta verde finora. `gh` installato in `C:\Program Files\GitHub CLI`, già autenticato come hirluin92. |
| Fly.io | app `arena-anime-backend` | **Abbandonata** (serve una carta). Da cancellare. `flyctl` è installato; il login è fatto. |

Commit con identità `-c user.name=hirluin92 -c user.email=hirluin92@users.noreply.github.com` (git non ha identità configurata). Avvisi CRLF di Git su Windows: innocui.

## Fatto
- M1–M9 del `PIANO_MVP.md` + extra: motore, asta server-autorevole in tempo reale, stanze, torneo, Twitch (chat + overlay OBS), partita veloce vs CPU, sfida del giorno, fase di ban, pagine legali/cookie.
- Deploy completo (Vercel + Render + Neon) e funzionante.
- **Grafica V2:** tema arena neon; carte da collezione con rarità (Comune/Rara/Epica/Leggendaria), inclinazione 3D e riflesso; illustrazioni originali generate (`CardArt.tsx`) come ripiego; rivelazione animata dei lotti; recap squadra nel draft; errori leggibili.
- **Immagini vere:** collegate (hotlink, non copiate) dall'API AniList, 98/100 (mancano Obito Uchiha e Gotenks), via `scripts/fetch_images.py`. Credito in footer e `/info`. Condizioni: **solo uso non commerciale → pubblicità spenta**; il copyright resta degli studi. Aggiornato `CLAUDE.md`.
- **Motore v2** (`backend/app/engine/`): scontro 7 contro 7 a turni (max 10) fino al K.O.; statistiche da archetipo+rating+ruolo+sinergie; mossa speciale a energia piena; passive; legami (duo); sinergie/tratti; fila (prima linea/centro/retrovia). Dati: `backend/data/schede.json` (archetipo, mossa, passiva, tratti, **costo**) e `tratti.json`, generati da `scripts/gen_schede.py` (+ costi da `scripts/balance_v2.py --scrivi`).
- **Bilanciamento:** `cd backend && uv run python ../scripts/balance_v2.py 6000 [--scrivi]` (prezzi) e `balance_v3.py` (affinità). Ultimo esito: ~5,9 turni, K.O. totale 97%, lato A 52%, dev. standard dei residui oltre il rating 0,04. Prezzi 1–12, media 7,2 (budget 50).
- **Scena di combattimento v2:** `components/battle/{BattleScene,Fighter}.tsx`, `lib/battle/{usePlayer,schedule,commentary,labels}.ts`; taglio di scena per le mosse speciali; riepilogo con sinergie e migliore in campo.
- Test: 163 pytest, 15 Vitest, 14 Playwright. `make lint`/`make test` puliti.

## Milestone 10 — Grafica v3 (unita a `main` con la PR #1 il 2026-11-26, online su Vercel)
Fatto: sistema di stile in `globals.css` (aurora animata, grana, pannelli con bordo luminoso, pulsanti con riflesso, `.reveal`/`.float`), font Barlow Condensed + Plus Jakarta Sans (Big Shoulders faceva fallire la CI: `next/font/google queries have exactly one entry`; provare sempre `npm run build` dopo aver cambiato font), `SiteNav` e footer, home riprogettata (hero con carte vere da `/api/quick/options`), draft con barra dei passi e budget, scheda dettagli della carta (pannello al mouse + finestra con pulsante "i" anche su mobile; mosse/passive in italiano da `lib/battle/effetti.ts`, tratti/gruppi da `lib/battle/tratti.ts`), asta come palcoscenico (`TimerRing`, tabellone giocatori), lobby con copia-link, ingresso, 404, torneo con podio, sfida con classifica a medaglie, scontro con introduzione "VS" (Salta la interrompe), banner "Vittoria", suoni (whoosh e fanfara in `lib/battle/sound.ts`). Controllato a 390 px: nessuno scorrimento orizzontale.
Da fare: provare su un telefono vero; suoni ancora sintetici (Web Audio); vedere l'overlay OBS con il nuovo stile durante un'asta reale.

## Milestone 11 — Draft v3 base (PROPOSTA_V3.md, fase 1) — unita a `main` con la PR #3 il 2026-11-26, online (Vercel + Render ridistribuito a mano)
Fatto: affinità continue per ruolo (`backend/app/engine/affinita.py`: tabella archetipo × ruolo, firma, tratti, scarto; limitata a −28…+35 %), abilità legate al ruolo (aura del Capitano/Vice, rigenerazione del Guaritore), 23 forme alternative (`data/forme.json`, id `<base>--<forma>`), mazzo deterministico + mani da 5 senza ruolo + 2 rilanci + carta misteriosa + scambio finale (`backend/app/draft.py`, `quick.py`), regola anti-blocco (carta ≤ 6 in ogni mano; `lib/draft.ts`), API nuove `GET /api/quick/draft` e `POST /api/quick/play` (picks con `{id, role, hand}` + `swap`), sfida del giorno sulla stessa base (`/api/daily` → campo `draft`), prezzi ricalcolati (media 8,0, **budget 56**), `scripts/balance_v3.py`, interfaccia nuova (`components/QuickGame.tsx`, `components/draft/*`, semaforo di affinità sugli slot). Il vecchio `/api/quick/options` non esiste più.
Ricordare: ogni modifica a `backend/` richiede il Manual Deploy su Render (dashboard.render.com → arena-anime-backend → Manual Deploy → Deploy latest commit; la sessione di Chrome dell'utente è già collegata); il frontend nuovo funziona solo con il backend nuovo, quindi ridistribuire Render subito dopo il merge.
Non fatto di PROPOSTA_V3: tattiche segrete (fase 2), arene/mosse a tempo/combo/stati (3), asta con affinità, missioni, rivalità, formazione (4), draft a specchio, stagioni, XP, PWA (5), Scala e raid (6). L'asta in stanza usa già le nuove affinità nei calcoli, ma non le mostra.

## Milestone 12 — Tattiche segrete (PROPOSTA_V3.md, fase 2)
Fatto: `backend/app/engine/tattiche.py` (assalto > tecnica > guardia > assalto; fasi: turni 1-3, 4-6, 7-10; +15% / −10% di danno; CPU deterministica che legge lo schema), evento `fase` nel replay e campo `tattiche` nel risultato, `simulate(..., tattiche=...)`, API `POST /api/quick/play` e `/api/daily/play` con `tattiche` (3 valori obbligatori), interfaccia "Piano di battaglia" (`components/draft/TacticsPlanner.tsx`), banner e chip di fase nella scena. Le partite vecchie senza tattiche si leggono ancora.

## Milestone 13 — Arene, stati, combo (PROPOSTA_V3.md, fase 3)
Fatto: `engine/arene.py` (6 arene dal seme, mostrate prima del draft e nella scena), stati alterati (bruciatura/veleno/sigillo/corrosione) con eventi `effetti`, evento `respiro` (ultimo respiro), combo dei legami, recupero, hype nello `stato` di ogni evento, scelta *Subito/Trattieni* per la mossa finale (`carica` nell'API), momenti migliori con «Rivedi» (`lib/battle/momenti.ts`, `play(da)`), prezzi ricalcolati (media 7,7). Il simulatore resta equilibrato (6,1 turni, lato A 51%) e ogni arena è tra 40 e 60% per lato (test).
Non fatto: contromossa alle combo; reazioni elementali oltre alla corrosione.

## Milestone 14 — Asta v3 (PROPOSTA_V3.md, fase 4)
Fatto: affinità del lotto in `LotView`/`LotStarted` (stanza), missioni segrete (`engine/missioni.py`, private via messaggio `mission`, svelate nel torneo), rivalità (`data/rivalita.json`, `result.rivalita`), formazioni (`engine/formazioni.py`), fase **piano** delle stanze (`Plan` client→server, `RoomView.plan_deadline`, `RoomSettings.plan_timeout`, `components/auction/PlanView.tsx`), torneo con arena/tattiche/carica/formazione/missioni (`_run_tournament` in `rooms/manager.py`), partita veloce e sfida con missione e formazione. I test che simulano stanze devono mettere `room.settings.plan_timeout = 0` oppure consegnare i piani; gli e2e cliccano `plan-ready`.
Non fatto: voto della chat Twitch per le tattiche (la chat usa un piano predefinito).

## Milestone 15 — Profilo e app installabile (PROPOSTA_V3.md, fase 5a)
Fatto: `backend/app/profilo.py` (tabelle `profiles`, `profile_days`, `season_scores` + migrazione `c9e2f1a07b34`; XP e livelli, 8 obiettivi con 3 al giorno, collezione, stagione = mese; API `/api/profile`, `/api/collection`, `/api/season`; `profile_id` opzionale in `/api/quick/play` e `/api/daily/play` → campo `premio`), pagina `/profilo`, pannello ricompensa a fine scontro (mostrato solo a battaglia finita, per non svelare l'esito), chip del livello nella barra, nome della sfida precompilato, PWA (`app/manifest.ts`, `public/sw.js`, `public/offline.html`, icone generate da `scripts/gen_icons.py`). Il profilo è anonimo: chi cancella i dati del browser lo perde (nessun account). Nessuna notifica push.
Da fare: 5b (draft a specchio, tabellone a eliminazione, voto Twitch per le tattiche), fase 6 (Scala e raid).

## Milestone 16 — Specchio, tabellone, voto Twitch (PROPOSTA_V3.md, fase 5b)
Fatto: `RoomSettings.modalita` (`asta` | `specchio`), `formato` (`girone` | `eliminazione`), `pick_timeout`; fase `draft` con `rooms/specchio.py` (messaggio client `pick`, `RoomView.draft`); `tournament.primo_turno/build_eliminazione` (MatchRef con `bye`, `TournamentView.formato/campione`); `twitch/votes.py` con `ChatPlan` (comandi del piano), `RoomView.chat_plan`; interfaccia `SpecchioView`, tabellone nel `Tournament`, `ChatPlanVotes` (stanza e overlay). `PlayerView.slot_aff` per mostrare la potenza nello slot.
Non fatto: notifiche push; specchio con più di 2 giocatori; fase 6 (Scala e raid).

## Da fare (in ordine di valore)
1. **L'utente gioca e riporta:** una partita veloce, un'asta con amici, la sfida del giorno. Poi correggere schede/mosse/prezzi in base a cosa gli sembra sbagliato e rilanciare `balance_v2.py --scrivi`.
2. **Revisione grafica (2026-11-26, fatta):** rivisti nel browser sfida, partita veloce, lobby, ban, asta con 2 giocatori, torneo, replay e overlay OBS; simulato 360 px. Corretti: recap squadra, home mobile, badge voto fuori bordo, errori del server invisibili nella stanza, testo doppio "sta scegliendo il ruolo". **Resta:** provare su un telefono vero; la fase di ban dura sempre 30 s anche se tutti hanno già bannato solo se i ban non sono finiti (da verificare con 2 umani); torneo e classifica sono molto spartani (nessuna squadra visibile, solo i link alle partite).
3. **Grafica rimandata:** suoni migliori (oggi solo beep Web Audio), home con statistiche live (stanze attive, ultimi scontri), rifinitura asta e mobile, mostrare le statistiche/mossa/passiva leggibili nella carta o in un dettaglio.
4. **Asta v2:** mostrare sinergie e fila nell'asta e nel recap della squadra; il costo misurato oggi vale solo per partita veloce/sfida, l'asta in stanza resta a offerte libere.
5. **Revisione dei dati** (decisione dell'utente): le 100 schede e i rating sono miei, inventati. Obito e Gotenks senza immagine.
6. **Qualità:** la CI deve far girare i test anche su **Postgres** (i test usano SQLite: un bug `integer out of range` era sfuggito per questo). Aggiungere un servizio Postgres alla CI.
7. **Persistenza:** le stanze vivono in memoria (un riavvio le perde). Salvare lo stato su Postgres a ogni lotto.
8. **Contenuti:** 140+ personaggi per reggere 20 giocatori (oggi ~14). Nome e dominio definitivi ("Arena Anime" è provvisorio, un solo punto: `frontend/lib/constants.ts`).
9. **Crescita/legale:** contattare i primi streamer; se si vorrà guadagnare, chiedere il permesso ad AniList o togliere le immagini.
10. Cancellare l'app Fly.io; resettare la password Neon.
11. Idee mai fatte: asta a buste segrete, bluff, mercato tra giocatori, account/collezione.

## Trappole già incontrate (non rifarle)
- Le sostituzioni di testo via script Python con indentazione diversa falliscono **in silenzio** dopo Prettier: usare `Edit` o fare `assert` sul testo cercato.
- Gli escape `\n` dentro stringhe Python generate da heredoc si rompono: preferire `Edit`.
- Vercel rifiuta `NEXT_PUBLIC_*` come "Secret": usare "Config". Una variabile Secret già salvata non diventa Config: va cancellata e ricreata.
- Render legge `.env.example` e precompila `DATABASE_URL` con un segnaposto: controllare che il valore sia quello vero.
- Neon chiude le connessioni inattive: già risolto con `pool_pre_ping`. Il seme delle partite supera 2^31: colonna `BigInteger`.
- L'API AniList risponde 403 senza `User-Agent` e 429 se troppo veloce (limite ~30–90 richieste/min).
- Mai uccidere tutti i processi `node`/`python`: fermare solo le porte 3000/8000 (PowerShell `Get-NetTCPConnection`).
- Le password/stringhe di connessione non vanno mai in file o commit.
- Lo script e2e di Playwright avvia da solo backend e frontend: fermare prima i server locali sulle porte 3000/8000.
- I test automatici non vedono i problemi grafici: guardare sempre le schermate nel browser.
- Layout: dentro un `grid` senza colonne esplicite il contenuto largo allarga la colonna e fa traboccare le carte: usare `grid-cols-[minmax(0,1fr)]`. Per provare 360 px la finestra di Chrome non si restringe: incorporare la pagina in un `<iframe>` largo 360 px (`flex:none`); gli screenshot sono ridotti in scala.

## Comandi utili
- Dev: `docker compose up -d db`, poi backend `cd backend && uv run uvicorn app.main:app --port 8000` (con `DEV_TOOLS=1 TWITCH_READER=0`) e frontend `cd frontend && NEXT_PUBLIC_API_URL=http://127.0.0.1:8000 npm run dev`.
- Controlli: backend `uv run ruff check . && uv run ruff format --check . && uv run mypy && uv run pytest`; frontend `npx tsc --noEmit && npm run lint && npm test && npm run test:e2e`.
- Dopo modifiche ai modelli Pydantic: `cd backend && uv run python ../scripts/gen_schema.py` poi `cd frontend && npm run gen:types`.
- CI: `"/c/Program Files/GitHub CLI/gh.exe" run list`.
