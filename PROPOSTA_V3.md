# PROPOSTA V3 — draft libero con affinità, combattimento tattico

Stato: **fase 1 fatta** (milestone 11: draft v3 base, vedi §5 e §6). Le fasi 2-6 restano da fare.
Vincoli invariati: motore puro e deterministico, il server è l'unica autorità, testi in italiano in `it.json`, immagini solo collegate da AniList, una milestone alla volta su un branch.

## 0. Cosa decidiamo di non fare
- **Blocco** di una carta per il giro dopo (scartato).
- **Panchina** con riserve (scartata).

## 1. Draft v3

### 1.1 Slot liberi + affinità (cuore della V3)
Oggi: a ogni giro 5 carte *per un ruolo prefissato* e le carte sono pescate a caso. Nel motore esiste già una versione "a due valori": `moltiplicatore_ruolo` dà +12% se l'archetipo è adatto, −8% se fuori ruolo, più un bonus "ruolo firma" (`backend/app/engine/scoring.py`).

Proposta: a ogni giro 5 carte pescate dall'intero mazzo, **senza ruolo**; il giocatore le mette in **qualsiasi slot libero**. L'affinità diventa continua:

```
affinità(c, ruolo) = base[arch(c)][ruolo] + firma(c, ruolo) + tratti(c, ruolo) + scarto(c, ruolo)
moltiplicatore    = clamp(1 + affinità / 100, 0.72, 1.35)      # sostituisce moltiplicatore_ruolo
```

- `base`: tabella archetipo × ruolo (valori di partenza, in punti %):

| | Capitano | Vice | Tank | Danno | Supporto | Supporto II | Guaritore |
|---|---|---|---|---|---|---|---|
| Lottatore | +25 | +15 | +8 | +10 | −10 | −10 | −25 |
| Assassino | +5 | +15 | −15 | +25 | −5 | −5 | −25 |
| Mago | +15 | 0 | −25 | +20 | +10 | +10 | −5 |
| Tank | +5 | +8 | +30 | −15 | −5 | −5 | −5 |
| Tiratore | 0 | 0 | −20 | +18 | +12 | +5 | −10 |
| Supporto | −5 | 0 | −5 | −10 | +25 | +25 | +10 |
| Guaritore | −15 | −10 | −5 | −25 | +10 | +10 | +30 |
| Evocatore | +20 | +5 | −10 | +5 | +15 | +15 | 0 |

- `firma`: +8 se il ruolo coincide con `ruolo_firma` del personaggio.
- `tratti`: piccoli ritocchi da tratti e passiva (leader → Capitano +5; Gigante → Tank +5; Rigenerazione/Cura → Guaritore +5; Velocità → Vice/Danno +3). Una passiva che pesa solo in un ruolo (aura, cura) vale doppio nel ruolo giusto.
- `scarto`: ±0–4 fisso per personaggio e ruolo, da hash dell'id, perché non esistano due personaggi identici.
- **Abilità di ruolo:** alcuni personaggi hanno un'abilità che scatta **solo nello slot giusto** (il leader come Capitano ottiene un'aura per tutta la squadra; il Guaritore con cura potenziata; il Tank con provocazione). Fuori ruolo la carta funziona, ma senza quell'abilità. È indicata sulla scheda con "Si attiva come: …".
- L'interfaccia mostra sullo slot sotto il mouse un **semaforo** (verde / giallo / rosso) con il valore esatto, e nella scheda dettagli la riga "Dove rende di più".
- Il numero grande sulla carta diventa la **potenza nello slot scelto** (già previsto da `potenza_ruolo`).

Rischio principale: se le percentuali sono sbagliate il draft si "risolve" (la scelta è sempre ovvia) o l'affinità non conta. Taratura: simulazione con giocatori "ottimi" contro "casuali" (vedi §6).

### 1.2 Il caso
- **Carta misteriosa:** una pesca a partita è coperta; costo ridotto (−40%); può essere una Leggendaria o una carta debole.
- **Forme casuali:** lo stesso personaggio può uscire in forme diverse (base, trasformazione, finale) con statistiche, mossa e costo diversi. Dati nuovi in `schede.json` (partire da ~20 personaggi con 2–3 forme). Le forme condividono l'immagine collegata e hanno un'etichetta di forma.
- **Rilancio:** 2 rilanci a partita della mano da 5 (la mano scartata torna nel mazzo).
- **Scambio finale:** prima dello scontro si scambiano di posto due carte, una sola volta.

### 1.3 Altre regole di squadra
- **Missioni segrete:** a inizio draft un obiettivo nascosto (es. "3 personaggi dello stesso universo", "nessuna Leggendaria", "tutti sotto 88") che dà un bonus (+3% a tutta la squadra) se completato. Rivelato a fine scontro.
- **Rivalità:** coppie di personaggi (es. Naruto/Sasuke) che, se si trovano su lati opposti, ricevono un bonus (+8% attacco l'uno contro l'altro). File dati come `duos.json`.
- **Formazione:** il giocatore sceglie chi sta in prima linea, al centro e nelle retrovie (oggi è fisso per ruolo, `FILA`). Le due formazioni si svelano insieme.
- **Draft a specchio (2 giocatori):** entrambi vedono le stesse 5 carte e scelgono a turno; ogni carta presa sparisce.

### 1.4 Budget e vicoli ciechi
Resta il budget. Vale la regola già scritta nel fix del draft (`lib/draft.ts`): una carta si sceglie solo se la squadra si può ancora completare. Con gli slot liberi il controllo si estende alla scelta dello slot.

## 2. Asta con gli amici (stanze)
Oggi il vincitore di un lotto sceglie lo slot. Nella V3, **durante l'asta si vede l'affinità del lotto con ogni slot**: il valore di una carta dipende da quanto serve a te. Questo crea rilanci veri e bluff. Bonus: missioni segrete e rivalità valgono anche qui.

## 3. Combattimento v3
Oggi: simulazione automatica a turni (max 10), 7 contro 7, mossa speciale a energia piena. Restano le garanzie: deterministico, calcolato dal server, replay condivisibile.

1. **Tattiche segrete a fasi.** Lo scontro ha 3 fasi (turni 1–3, 4–6, 7–10). Prima di ogni fase ogni lato sceglie in segreto una tattica:
   - Assalto batte Tecnica (la interrompe), Tecnica batte Guardia (la aggira), Guardia batte Assalto (contrattacco).
   - Chi vince il confronto: +15% danno nella fase; chi perde: −10%; pareggio neutro.
   - Contro la CPU: tattica scelta con il seme, quindi la sfida del giorno è uguale per tutti.
   - In stanza streamer: la chat vota la tattica di ogni fase.
2. **Mosse finali a tempo.** A energia piena il giocatore può scegliere quando lanciarla (finestra di pochi secondi); se non sceglie parte da sola.
3. **Arene con regole:** modificatore noto prima del draft (ghiaccio: −velocità; torneo del potere: energia ×2; …). Cambia cosa conviene draftare.
4. **Combo e assistenze:** i legami (`duos.json`) diventano mosse a due, con una finestra di contromossa.
5. **Stati e reazioni:** bruciatura, veleno, sigillo; combinazioni di elementi (fuoco + ghiaccio ecc.).
6. **Recupero:** chi è molto indietro carica energia più in fretta (contro lo snowball).
7. **Ultimo respiro:** l'ultimo superstite ottiene un bonus e una scena dedicata.
8. **Pubblico (hype):** barra che premia le azioni spettacolari con piccoli bonus; la cronaca si adatta.
9. **Momenti migliori:** a fine scontro 3 passaggi da rivedere e condividere (link già esistente).

## 4. Gioco e comunità
- Classifica a **stagioni**, leghe tra amici, classifica per canale streamer.
- **Progressione:** XP a ogni partita, livelli con ricompense (titoli, cornici, forme alternative), obiettivi giornalieri, collezione delle carte e delle forme sbloccate.
- **Profilo** con titoli, statistiche, squadra preferita.
- **Modalità da solo:**
  - **La Scala:** avversari CPU sempre più forti, un gradino alla volta; si prosegue finché non si perde. Ogni gradino ha una squadra e un'arena diverse.
  - **Raid cooperativi:** 2–4 amici contro un boss a fasi (vita enorme, mosse a tempo, punto debole che cambia). Il draft è condiviso e ognuno copre un ruolo.
- **App installabile** (PWA) con notifica "la sfida del giorno è pronta".
- **Tabellone a eliminazione** da 8 a 20 giocatori, con grafica dedicata.
- **Condivisione:** carta della squadra fatta solo di testo e illustrazioni originali. Un'immagine con le immagini AniList generata sul dispositivo è una zona grigia rispetto ai vincoli (niente copie né hosting): da non fare senza una verifica.

## 5. Fasi proposte
1. **Draft v3 base (FATTA, milestone 11):** affinità, slot liberi, forme casuali, carta misteriosa, rilancio, scambio finale; simulatore di taratura; solo partita veloce e sfida del giorno. *(backend: scoring, dati forme, API; frontend: draft)*
2. **Tattiche segrete a fasi (FATTA, milestone 12):** nel draft veloce e nella sfida si scelgono 3 tattiche prima dello scontro (una per fase); la CPU parte a caso e poi legge lo schema del giocatore (40% contrasta l'ultima tattica, 25% ripete, 35% a caso, tutto dal seme). Scelta *prima* dello scontro e non fase per fase: così non servono sessioni sul server e la sfida del giorno non si può «esplorare» provando le fasi una alla volta. Il voto a fasi *dal vivo* resta per le stanze streamer (fase 5). Vittoria nel confronto +15% danno, sconfitta −10%.
3. **Arene, mosse finali, combo, stati, recupero, ultimo respiro, hype, momenti migliori (FATTA, milestone 13):** 6 arene scelte dal seme e note prima del draft (`engine/arene.py`); stati alterati dai tratti (Elemento → bruciatura, Furtività → veleno, Psichico → sigillo; bruciatura + veleno = corrosione ×1,5); combo dei legami dopo la mossa finale; recupero (+50% energia se si è indietro di 20 punti %); ultimo respiro (ultimo superstite contro 2+: +30% attacco, scudo 15%, energia piena); barra del pubblico che dà fino a +8% attacco; momenti migliori con «Rivedi». La «mossa finale a tempo» è diventata una scelta prima dello scontro: *Subito* oppure *Trattieni* (dal turno 4, +30% danno): un vero tempo reale non è compatibile con il risultato calcolato dal server. La contromossa alle combo non è stata fatta.
4. **Asta v3 (FATTA, milestone 14):** nelle stanze, durante l'asta si vede l'affinità del lotto con ogni slot (e la potenza risultante) e nella scelta del ruolo; missione segreta privata per giocatore (10 missioni in `engine/missioni.py`, messaggio `mission` solo al diretto interessato, svelata a fine torneo, +3% attacco e vita se completata); 24 rivalità (`data/rivalita.json`, +8% di danno tra i due su lati opposti, valgono anche per le forme); 4 formazioni (`engine/formazioni.py`); nuova fase **piano di battaglia** nelle stanze dopo l'asta (tattiche, mossa finale, formazione, con scadenza impostabile in lobby, 0 = salta) e arena della stanza in ogni scontro del torneo. Partita veloce e sfida: missione (con quella della CPU), formazione e rivalità. Il voto dal vivo della chat Twitch per le tattiche non è stato fatto: la chat usa un piano predefinito deterministico.
5. **Social e progressione:** *5a FATTA (milestone 15):* profilo anonimo per dispositivo (id nel browser), XP e livelli (`60·(n−1)²`), 6 titoli, 3 obiettivi giornalieri (+20 XP), collezione di 123 carte (personaggi e forme), stagione mensile con classifica, app installabile (manifesto, icone, service worker con pagina offline). Le notifiche push («la sfida del giorno è pronta») non sono state fatte: servono chiavi VAPID e un invio programmato dal server. *5b FATTA (milestone 16):* draft a specchio per 2 giocatori (`rooms/specchio.py`: stesse 5 carte, sceglie prima uno e poi l'altro, giro alternato, tempo per scelta con scelta automatica; niente budget, missioni sul budget escluse); torneo a eliminazione diretta (teste di serie per potenza, bye alle migliori, tabellone con finale e campione) oltre al girone, per qualsiasi numero di giocatori da 2 a 20; voto della chat Twitch sul piano di battaglia (`!f1 assalto`, `!f2 tecnica`, `!f3 guardia`, `!carica`/`!subito`, `!form muro`) con conteggio in diretta nella stanza e nell'overlay OBS; nelle stanze streamer la fase piano dura sempre tutto il tempo. I momenti migliori sono nella milestone 13.
6. **Modalità da solo e cooperative (FATTA, milestone 17):** *La Scala* (`app/scala.py`, `/scala`): stesso draft della partita veloce, poi fino a 20 gradini contro avversari che crescono (7 carte da una finestra di forza che sale + bonus fino a +50%); dopo ogni vittoria si sceglie 1 potenziamento su 3 (8 disponibili); lo stato della corsa sta in memoria sul server per impedire di riprovare lo stesso gradino; XP, punti stagione e record nel profilo. Taratura (`scripts/balance_scala.py`): mediana 7 gradini, 24% supera il decimo, ~1% li completa tutti. *Raid cooperativo* (`rooms/raid_room.py`, `app/raid.py`, `data/bosses.json`): 2-4 giocatori costruiscono a turno una sola squadra e sfidano uno di 6 boss (squadra di 7, il Capitano è il boss con vita e attacco moltiplicati) in 3 difficoltà; il piano è la scelta più votata; arena decisa dal boss. Taratura (`scripts/balance_raid.py`): normale 43-67%, difficile 28-52%, epico 8-29% a seconda del boss. Non fatti: modalità raid con boss a fasi e punto debole che cambia; ricompense dei raid nel profilo.

Ogni fase = un branch `milestone/<n>-<nome>`, test verdi, lint pulito, riepilogo con istruzioni.

## 6. Taratura e test
Strumento: `scripts/balance_v3.py` (`cd backend && uv run python ../scripts/balance_v3.py [N]`) confronta tre modi di piazzare 7 carte: *casuale*, *avido* (ogni carta nello slot migliore al momento) e *ottimo* (assegnazione che massimizza la potenza). I prezzi si ricalcolano con `scripts/balance_v2.py --scrivi`.

**Risultati misurati (fase 1, tabella di §1.1 senza ritocchi):**
- ottimo contro avido: **59%** (obiettivo 8-12 punti: ok). È la distanza che conta, perché un giocatore reale ragiona almeno un poco.
- ottimo contro casuale: 89%; avido contro casuale: 83%. Piazzare a caso è un errore pesante, ma non dominante: una squadra forte piazzata a caso batte ancora una squadra debole piazzata perfettamente nel 79% dei casi. La qualità delle carte resta più importante dello slot.
- specchio ottimo/ottimo: 51%.
- vittorie per archetipo (piazzamento ottimo): ASS 57,5 · TAN 54,7 · BRU 51,6 · MAG 51,0 · EVO 46,8 · SUP 46,6 · GUA 39,8 · TIR 35,3. TIR e GUA sono deboli come unità, ma costano meno (i prezzi seguono le vittorie). ASS è appena sopra l'obiettivo del 55%.
- il criterio "nessuno slot dominante" è stato sostituito da: ogni archetipo ha almeno due slot con affinità >= +10 (test `test_every_archetype_has_two_good_slots`).
- prezzi ricalcolati: media 8,0 (prima 7,2), quindi il budget del draft veloce è **56**.

**Regole anti-blocco:** ogni mano contiene una carta da 6 punti o meno (verificato su 3000 semi) e una carta si può scegliere solo se `spesi + costo + 6 × giri rimasti <= budget`. La carta misteriosa costa al massimo 3.

**Test:** affinità come funzione pura (limiti, determinismo, forme), mazzo deterministico, mano sempre con carta economica, caso peggiore senza vicoli ciechi, validazione server (mano, ruolo, rilanci, misteriosa, scambio, budget), API e sfida del giorno; Vitest sulla logica del client; Playwright sul draft completo con rilancio e scambio.

## 7. Domande aperte
1. Le forme: quante e per chi (serve contenuto nuovo, nomi e statistiche).
2. Le missioni segrete: che elenco iniziale (ne bastano 8–10).
3. Le arene: quali 5–6 per cominciare.
