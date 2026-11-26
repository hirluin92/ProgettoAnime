# PROPOSTA V3 — draft libero con affinità, combattimento tattico

Stato: **proposta, da confermare**. Nessun codice scritto. Le cifre sono ipotesi da tarare con la simulazione (fase 1).
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
1. **Draft v3 base:** affinità, slot liberi, forme casuali, carta misteriosa, rilancio, scambio finale; simulatore di taratura; solo partita veloce e sfida del giorno. *(backend: scoring, dati forme, API; frontend: draft)*
2. **Tattiche segrete a fasi** (partita veloce, sfida, poi stanze).
3. **Arene, mosse finali a tempo, combo, stati, recupero, ultimo respiro.**
4. **Asta v3:** affinità visibile, missioni, rivalità, formazione.
5. **Social e progressione:** draft a specchio, tabellone, stagioni, XP e livelli, profilo, PWA, momenti migliori.
6. **Modalità da solo:** la Scala e i raid cooperativi contro il boss.

Ogni fase = un branch `milestone/<n>-<nome>`, test verdi, lint pulito, riepilogo con istruzioni.

## 6. Taratura e test
- Estendere `scripts/balance_v2.py` in un `balance_v3.py`: draft simulati con tre giocatori (casuale, che sceglie il migliore per potenza, che ottimizza anche lo slot).
- Obiettivi: il giocatore che ottimizza gli slot batte quello casuale di 8–12 punti percentuali; nessun archetipo oltre il 55% di vittorie; lato A/B entro 52%; nessuna scelta di slot dominante in più del 40% dei casi.
- Test: affinità come funzione pura (proprietà: monotona nei limiti, deterministica); regole di draft (nessun vicolo cieco con slot liberi, già coperto in parte da `lib/draft.ts`); scontri con tattiche (stesso seme → stesso risultato).

## 7. Domande aperte
1. Le forme: quante e per chi (serve contenuto nuovo, nomi e statistiche).
2. Le missioni segrete: che elenco iniziale (ne bastano 8–10).
3. Le arene: quali 5–6 per cominciare.
