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
- Test: 179 pytest, 15 Vitest, 16 Playwright. `make lint`/`make test` puliti.

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

## Milestone 17 — Scala e raid (PROPOSTA_V3.md, fase 6)
Fatto: `backend/app/scala.py` (`/api/scala/start`, `/{id}/fight`, `/{id}`; corse in memoria con scadenza di 2 ore; `engine/assegnazione.py`; bonus di squadra nel motore: `Team.bonus_atk/hp/dif`, `energia_iniziale`, `scudo_iniziale`, `boss_hp/boss_atk`), colonna `profiles.best_scala` (migrazione `d4a8b6c2e915`), pagina `/scala` (`components/ScalaLadder.tsx`), raid (`RoomSettings.modalita = "raid"`, `boss`, `difficolta`, fase `raid_result`, `RoomView.raid`), `RaidResultView`. Gli e2e ripartono da un database pulito (`playwright.config.ts` cancella `e2e.db`: `create_all` non aggiorna le tabelle esistenti).
Non fatto: boss a fasi con punto debole, ricompense dei raid nel profilo, notifiche push, account veri.

## Milestone 18-19 — Duello a corsie (PROPOSTA_V4.md)
Nuova modalità `/duello` (stile Snap): 8 carte, 3 corsie con luogo, 6 turni, energia = turno, giocata segreta in contemporanea, vince chi prende 2 corsie su 3. Backend: `app/duello/{carte,luoghi,motore,ai}.py` (motore puro, 26 effetti, CPU facile/normale/difficile), `app/duello_api.py` (`/api/duello/draft|start|{id}|{id}/turno`, partite in memoria 2 h, premio XP al profilo via `assegna_premio_duello`). Frontend: `components/duello/*`, `lib/duello.ts`, regole mostrate la prima volta (localStorage). Taratura: `scripts/balance_duello.py` (euristico batte casuale ~77% a mazzo uguale, simulato batte euristico ~73-87%; carte forti vs deboli a pari bravura ~22%, bravura batte carte). Test: `tests/test_duello_motore.py`, `tests/test_duello_api.py`, `e2e/duello.spec.ts`.
Il vecchio 7v7 resta finché non lo si approva da togliere. Prossimi: M20 rompicapo del giorno + ELO, M21 asta -> torneo di duelli, M22 Scala roguelike, M23 raid a corsie, M24 rifinitura (suoni, mobile, rimozione 7v7). Tutorial interattivo vero e animazioni di rivelazione per corsia ancora da fare (ora: didascalia a ogni carta svelata).

## Milestone 20 — Rompicapo del giorno ed ELO (Duello)
`/duello/giorno`: stesso mazzo e stessa CPU (normale) per tutti, un tentativo a nome, stelle 0-3 (sconfitta/pareggio/vittoria/vittoria 3-0) e classifica per stelle poi margine (tabella `duello_giorno`). ELO nel profilo (`profiles.elo`, 1200; avversario CPU 1000/1250/1500, K=24), mostrato nel premio e nel profilo. Migrazione `e1f7a9b3c5d2`. Nel draft compare il costo totale del mazzo contro le 21 energie della partita: la CPU gioca più carte perché il suo mazzo ha una curva bassa (non è un bug del motore).

## Milestone 21 — Veloce migliorato
Tattiche scelte una fase alla volta (`POST /api/quick/fase` simula solo le prime fasi, deterministico, senza rivelare le scelte future della CPU; solo nella Veloce via `fasiLive`), resoconto di fase (`FaseReport`), riga di spiegazione per colpo (`engine/spiega.py`), «perché è andata così» nel risultato (`perche` in `PlayResponse`), scontro a ×2 di default, pulsante Condividi (`ShareButton`, replay `/partita/{id}`). Bonus/malus tattiche alzati a +25%/−15% (misurato con `scripts/balance_veloce_tattiche.py`: la lettura della CPU vale ~+6 punti di vittorie sul caso: l'abilità qui resta moderata, la profondità vera sta nel Duello). Carica, formazione e scambio si bloccano dopo la fase 1.

## Milestone 22 — Torneo a duelli (stanze)
Nelle stanze l'host sceglie «Combattimento: Duello a corsie» (`settings.regole = "duello"`, `turno_duello` 10-90 s). Dopo l'asta/draft il piano di battaglia si salta e parte la fase `duelli`: `app/rooms/duelli.py` (`TorneoDuelli`, puro, senza rete) fa giocare in parallelo tutti i duelli della giornata (girone o eliminazione con bye); il mazzo è fatto dai 7 acquistati; mosse segrete, turno risolto quando entrambi consegnano o allo scadere (gioca la CPU euristica); la chat e i bot giocano con la CPU. Messaggi: client `duello_mosse`, server `duello` (privato: plancia dal proprio punto di vista, mano, eventi). Frontend: `DuelliView`, `DuelloBoard` (estratto da `DuelloGame`, riusato). I duelli non hanno replay (`match_id` vuoto). Non ancora: voto della chat sulle mosse (la chat ora gioca la CPU), missioni nei duelli. Il combattimento «classico» resta il predefinito finché non si toglie il 7v7.

## Milestone 23 — Account
Registrazione con nome utente + password (`app/account.py`, hash scrypt con sale, limite di 5 tentativi falliti per 10 minuti per IP+utente, in memoria) e codice di recupero mostrato una sola volta; colonne `username`, `pw_hash`, `recovery_hash` su `profiles` (migrazione `f2a8c4d6e1b9`). Il profilo anonimo del dispositivo diventa un account (nessuna perdita); da un altro dispositivo si accede e si riceve lo stesso profilo. UI in `/profilo` (`AccountPanel`). Non c'è ancora Google né link via email: servono un client Google e un servizio email creati dall'utente (chiavi solo in `.env`). Limiti noti: il tetto ai tentativi è per processo (si azzera al riavvio); l'id del profilo resta un segreto portatore per le partite.

## Milestone 24 — Album e mazzi personali
`/album`: tutte le 123 carte con filtri (anime, rarità, solo possedute), possedute a colori e le altre in grigio, mazzi personali (fino a 5, 8 carte tue; tetti: max 2 leggendarie, 4 tra epiche e leggendarie, costo totale 30; colonna `profiles.mazzi`, migrazione `a1c3e5b7d9f2`). `app/album.py` (`errori_mazzo` valida lato server). `/duello` ha la scheda «Mazzo personale» (`POST /api/duello/start-personale`): dà XP e collezione ma NON cambia l'ELO (il ranked resta sempre a draft). La collezione si riempie giocando a draft. Strumento solo-sviluppo: `POST /api/dev/regala-carte/{profile_id}` (DEV_TOOLS=1) per i test e2e. Nav: Album aggiunto; sotto 640 px si nascondono Veloce, Sfida e Info.

## Milestone 25 — Crediti e pacchetti
Crediti SOLO guadagnati giocando (metà degli XP di ogni partita; mai acquistabili con denaro: vincolo AniList non commerciale e rischio legale per i minori). `app/pacchetti.py`: Base 100 (3 carte), Argento 250 (4, ≥1 Rara), Oro 600 (5, ≥1 Epica), Leggendario 1500 (5, ≥1 Leggendaria); probabilità per carta pubbliche in `GET /api/pacchetti` e mostrate in `/negozio`; leggendaria garantita ogni 30 pacchetti (`profiles.pity`); doppioni → crediti (10/25/60/150). Colonne `crediti`, `pity`, `pacchetti_aperti` (migrazione `b2d4f6a8c0e1`). Apertura carta per carta con animazione. Test statistici sulle probabilità e sulle garanzie. Il dev-endpoint `regala-carte` dà anche 1000 crediti.

## Milestone 26 — Ranked a leghe
`/ranked`: serve un account. Bronzo→Campione, 5 leghe × 4 divisioni da 50 punti (MMR da 700 a 1700), MMR iniziale 1000, 5 partite di piazzamento (K 48, poi 24), obiettivi settimanali (5/10/15 partite → 100/150/250 crediti, una volta a settimana), classifica degli account dopo il piazzamento. Ogni partita parte da un draft nuovo (stesso seme/mani del server); l'avversario è un «fantasma»: il mazzo draftato da un altro giocatore di MMR vicino (±250, i più recenti, max 6 per profilo), guidato dalla CPU (difficile da 1300 in su), o uno «Sfidante» generato se non ce ne sono. Il flusso usa le stesse API turno del Duello (`Partita.ranked`). Tabelle `ranked_ghosts`, `ranked_settimane` e colonne `profiles.mmr`, `ranked_partite` (migrazione `c3e5a7b9d1f3`). Non ancora: 1 contro 1 dal vivo, ricompense di fine stagione, anti-farming oltre all'obbligo di account. Il vecchio `elo` (contro livelli CPU) resta separato dall'MMR.

## Milestone 27 — La Scala roguelike (duelli)
`/scala` ora è la Scala a duelli (`app/scala_duelli.py`, `DuelloGame scala`): draft di 8 carte, poi fino a 12 gradini; dopo ogni vittoria si sceglie 1 premio su 3 (2 carte nuove, mazzo max 12: a mazzo pieno sostituisce la più debole; 1 rinforzo +1 potenza a una carta, max 13). Avversari: mazzo bilanciato + bonus potenza (+1 ogni 3 gradini, boss ogni 4 con +2), CPU facile→normale→difficile. La corsa è in memoria (2 h); XP, crediti e record `best_scala` si pagano a fine corsa con `assegna_premio_scala`. Il vecchio 7v7 (`app/scala.py`, `ScalaLadder`, `QuickGame` per /veloce e /sfida) resta ma la Scala non lo usa più: da rimuovere nella pulizia.

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
