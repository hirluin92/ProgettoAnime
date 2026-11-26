# PROPOSTA V4 — il Duello a corsie

Stato: **decisa**. Prima milestone (18) in costruzione. Questo documento spiega perché si cambia il cuore del gioco, come funziona il nuovo e come si arriva fin lì senza buttare via il lavoro fatto.

## 1. Diagnosi onesta del gioco di oggi

Il gioco ha tante parti e una sola davvero divertente da vivere. Dopo la V3 le **decisioni** sono tutte *prima* dello scontro (draft, slot, tattiche, formazione, arena, carica) e lo scontro è uno spettacolo di ~30 secondi in cui **non si fa niente**. I problemi veri, dal punto di vista di chi gioca:

1. **Non si capisce.** 7 contro 7, numeri che volano, regole a strati (affinità, sinergie, stati, hype, combo, arene…). Chi gioca non lega mai una propria scelta a un risultato. È il difetto più grave: un gioco che non si capisce non si impara, e un gioco che non si impara non si padroneggia.
2. **Si aspetta invece di giocare.** Il tempo "morto" è la maggior parte dello scontro.
3. **La bravura pesa poco.** Le scelte sono alla cieca e il caso (critici, schivate, varianza) decide troppi scontri.
4. **Troppa complessità per il valore che dà.** Molti sistemi, nessuno con un momento memorabile.

Cosa invece **funziona** ed è raro: i personaggi veri e amati, l'**asta in tempo reale con gli amici**, il fatto che sia sul web senza installare nulla, il lavoro su profilo/stagioni/Twitch.

## 2. Alternative valutate

| Idea | Pro | Contro | Verdetto |
|---|---|---|---|
| Tenere il 7v7 e aggiungere ordini a ogni turno | Meno lavoro | Resta illeggibile; partite lunghe; molta complessità | No: cura il sintomo |
| Auto-battler a 8 giocatori (stile TFT) | Profondo, sociale | Serve una stanza piena di umani, sessioni di 25 minuti, combattimento comunque passivo | No: richiede una community che ancora non c'è |
| Quiz/party sugli anime | Facile da capire | Poca profondità, poco rigiocabile, già fatto dai concorrenti | No come cuore (forse come contorno) |
| **Duello a corsie (stile Marvel Snap)** | Si capisce in 10 secondi, decisioni a ogni turno, partite da 3 minuti, bluff in contemporanea, funziona contro la CPU e in asincrono, leggibile per gli spettatori | Va riscritto il motore di combattimento e costruita l'interfaccia | **Sì** |

**Perché il duello a corsie è la scelta giusta:** è il formato che oggi riesce meglio a unire semplicità e abilità. Ogni turno c'è una decisione chiara (quale carta e in quale corsia), l'avversario sceglie in segreto e si svela insieme (lettura, bluff), nessuna partita è lunga, e il giocatore forte vince costantemente anche con carte più deboli. E soprattutto **riusa quasi tutto quello che abbiamo**: 123 carte con mosse e passive, archetipi, tratti, legami, rivalità, forme, arene, asta, stanze, profilo, stagioni, Twitch.

## 3. Le regole del Duello (versione 1)

**Prima di giocare:** hai un **mazzo di 8 carte**. Si costruisce con il draft (5 carte per mano, scegli 1, due rilanci) oppure con l'asta con gli amici. Nessun budget: sono i costi in energia a frenare le carte più forti.

**La plancia:** 3 **corsie** (luoghi), ognuna con una regola nota fin dall'inizio (Vulcano, Ghiaccio, Gravità, Luna rossa, Torneo del potere…, riprese dalle arene). Ogni lato ha 4 posti per corsia.

**Una partita:** 6 turni. Hai 3 carte in mano all'inizio e ne peschi 1 a turno. Al turno *t* hai *t* punti di **energia** (non si accumulano). Ogni carta ha un **costo** (energia) e una **potenza**.

**Un turno:** scegli *in segreto* quali carte giocare e in quale corsia (entro l'energia). Quando entrambi avete finito, le carte si **girano**: prima chi è in vantaggio, poi l'altro (che ha l'ultima parola). Gli effetti «**Al rivelarsi**» scattano in ordine, con animazioni brevi.

**Fine:** dopo il turno 6, in ogni corsia vince chi ha più potenza. **Chi vince 2 corsie su 3 vince il duello.** Parità: conta la potenza totale.

**Durata:** circa 3 minuti, quasi tutti passati a decidere, non a guardare.

### Le carte (derivate da quelle che già esistono)
- **Potenza** = dal voto del personaggio (60 → 2, 80 → 7, 99 → 11).
- **Costo** = da 1 a 6 energia, in proporzione alla potenza: le carte più forti si possono giocare solo tardi e poche alla volta.
- **Al rivelarsi** = la *mossa speciale* del personaggio, tradotta in un effetto semplice (es. «−2 a tutte le carte nemiche in questa corsia»).
- **Continuo** = la *passiva* (es. «+1 a ogni altra tua carta in questa corsia»).
- **Sinergie** (le stesse di oggi, ma leggibili): due personaggi *legati* nella stessa corsia +2 ciascuno; due *rivali* di fronte nella stessa corsia +2 a entrambi (si scontrano!); 3 dello stesso universo nella stessa corsia +1 ciascuno.
- **Affinità con la corsia:** ogni archetipo ha una corsia in cui rende di più (la tua idea, ridotta a ±2 di potenza, cioè ±30%).
- Le **forme** restano carte alternative dello stesso personaggio.

I 15 effetti delle mosse e gli 11 delle passive diventano **26 modelli di effetto** con intensità che scala con il costo. Nessuna carta ha testi unici da scrivere a mano.

## 4. Perché qui la bravura conta davvero

- **Informazione e lettura:** vedi cosa ha giocato l'avversario nei turni passati e quanta energia ha; decidi se puntare su una corsia, difenderne un'altra, o bluffare lasciandola vuota.
- **Tempo e risorse:** giocare tutto subito o tenere carte per l'ultimo turno (quando un'unica carta può ribaltare una corsia).
- **Sequenza:** l'ordine con cui giri le carte cambia il risultato.
- **Poco caso:** l'unico caso è la pesca. Niente critici né schivate.
- **Carte e abilità separate, misurabili:** con il simulatore faccio giocare tre «giocatori virtuali» (a caso, euristico, con ricerca) a carte uguali. Obiettivo: il più bravo batte il meno bravo ≥ 70% a parità di carte; a parità di bravura, mazzo forte contro mazzo debole sposta al massimo di 10-15 punti. Se i numeri non tornano, si ritara.

## 5. Come cambiano le modalità

| Modalità | Oggi | Con il Duello |
|---|---|---|
| Partita veloce | draft + 7v7 passivo | draft di 8 carte + **duello contro la CPU** (3 livelli) |
| Sfida del giorno | stesso draft per tutti | **rompicapo**: stesso mazzo e stessa CPU per tutti, classifica per stelle |
| Asta con gli amici | asta + torneo di 7v7 | asta (resta uguale) + **torneo di duelli** |
| La Scala | 20 scontri automatici | **roguelike**: dopo ogni duello scegli 1 carta su 3 per migliorare il mazzo |
| Raid | squadra comune contro un boss | **ogni giocatore comanda una corsia** contro un boss: ci si coordina |
| Streamer | la chat vota il piano | la chat **vota dove giocare** a ogni turno |
| Classificata | non c'è | **ELO** a duelli 1 contro 1: misura chi è più bravo, non chi ha più carte |

## 6. Cosa si tiene, cosa si sostituisce

- **Si tiene:** personaggi, schede, prezzi, forme, rivalità, legami, arene (diventano luoghi), asta, stanze, Twitch, profilo, XP, stagioni, collezione, app installabile, grafica.
- **Si sostituisce (a modalità finite):** il motore 7v7 e il piano di battaglia. Nel frattempo il Duello è una modalità in più, affiancata alle attuali, così si può confrontare.
- **Si semplifica:** tattiche, formazioni, hype, stati alterati e combo escono dal flusso principale.

## 7. Roadmap

1. **Milestone 18 — Motore e CPU:** regole, traduzione delle 123 carte, intelligenza artificiale a 3 livelli, simulatori di taratura, test. *(in corso)*
2. **Milestone 19 — Duello giocabile:** draft di 8 carte, plancia a corsie con animazioni, spiegazioni in una riga, tutorial interattivo da 1 minuto.
3. **Milestone 20 — Rompicapo del giorno e classifica ELO.**
4. **Milestone 21 — Asta con gli amici → torneo di duelli**, voto della chat.
5. **Milestone 22 — La Scala come roguelike** (scelta di carte tra un duello e l'altro).
6. **Milestone 23 — Raid a corsie.**
7. **Milestone 24 — Rifinitura:** suoni, animazioni, mobile, rimozione del vecchio 7v7.

## 8. Rischi e come li gestisco

- **Complessità dei testi di effetto:** uso 26 modelli e un solo punto dove si definiscono. Il simulatore trova gli effetti troppo forti o troppo deboli.
- **Illeggibilità:** ogni carta ha al massimo due righe; durante la rivelazione si evidenzia solo la carta che agisce, con la causa in una riga.
- **Equilibrio:** si tara con i simulatori prima di toccare l'interfaccia.
- **Tempo reale e AFK:** ogni turno ha un limite (25 s) e, se scade, si gioca la mossa predefinita.
- **Nuovi giocatori:** il tutorial è obbligatorio la prima volta (1 minuto); il resto si spiega giocando.

## 9. Aggiornamento roadmap (dopo M20)

Decisioni: **Veloce resta** come modalità «spettacolo» e si migliora; il ranked è a leghe; si aggiungono account, album, crediti e pacchetti.

**Ordine:** (a) migliorie Veloce, (b) torneo di duelli dopo l'asta + voto chat, (c) registrazione, (d) album e mazzi personali, (e) crediti e pacchetti, (f) ranked a leghe asincrono (poi 1 contro 1 dal vivo), (g) Scala roguelike e Raid a corsie, (h) pulizia (rimozione di ciò che non serve, suoni, mobile).

**Migliorie Veloce (5):** 1) tattica scelta a ogni fase vedendo la fase precedente (lo scontro è deterministico: si simula con le tattiche già scelte e ci si ferma a fine fase); 2) una riga di spiegazione per evento e riepilogo «perché hai vinto/perso» coi 3 fattori principali; 3) scontro di 15-20 s, risultato prima e replay opzionale; 4) misura della bravura con simulatori a più livelli di abilità; 5) condivisione del risultato (immagine/link).

**Registrazione:** link via email e accesso con Google, senza password; il profilo anonimo attuale si collega senza perdere nulla. Servono un servizio email e un client Google: account da creare dall'utente, chiavi mai in chat né nel codice (`.env`).

**Album e mazzi:** 123 carte con filtri (anime, archetipo, rarità), mazzi salvati. Equilibrio: ranked sempre con draft fresco; il mazzo personale vale solo nelle modalità libere e nella Scala, con tetti (es. max 2 leggendarie, costo totale limitato). I doppioni danno crediti o cornici, mai potenza.

**Crediti e pacchetti:** crediti SOLO guadagnati giocando (vittorie, rompicapo, obiettivi, stagioni), mai acquistabili con denaro (AniList è gratuito solo per uso non commerciale; le probabilità casuali a pagamento sono rischiose per i minori). Pacchetti: Base 100 (3 carte), Argento 250 (4, ≥1 Rara), Oro 600 (5, ≥1 Epica), Leggendario 1500 (5, ≥1 Leggendaria). Probabilità calcolate sul numero reale di carte per rarità e mostrate in chiaro; garanzia di una leggendaria ogni ~30 pacchetti; doppioni convertiti in crediti.

**Ranked:** Bronzo → Campione con divisioni, 5 partite di piazzamento, stagioni con reset morbido, obiettivi settimanali. Prima asincrono (mazzo di un altro giocatore comandato dalla CPU), poi 1 contro 1 dal vivo con le stanze esistenti.
