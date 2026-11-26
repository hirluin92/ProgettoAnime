# Proposta V2 — combattimento, personaggi, grafica

Stato: **bozza da approvare**. Niente di questo è implementato.

## 1. Perché cambiare

Oggi il motore calcola `potenza = rating + adattamento_ruolo (+12 / +4 / −8) + firma (+6) + forma (0–12)`,
somma la squadra, aggiunge counter e duo, e vince il totale più alto. L'animazione recita un risultato già deciso.

- Il rating (60–98) pesa quasi tutto: all'asta conviene solo comprare i rating più alti.
- 15 tag generici, ripetuti (`MELEE` nel 64%): i personaggi si somigliano.
- Nessuna abilità, nessuna sinergia vera, nessuna scelta tattica dopo l'asta.
- Un risultato "casuale" non è mai spiegabile al giocatore: «ho perso perché?».

## 2. Nuovo combattimento: scontro a squadre a turni (auto-battler)

Le due squadre di 7 stanno in tre file e si combattono **fino al K.O. di una squadra**. Tutto è deterministico dal seed,
quindi replay e condivisione restano come oggi.

**Statistiche (4):** Vita, Attacco, Difesa, Velocità. L'ordine dei turni segue la Velocità.

**Energia e abilità:** ogni personaggio ha

- **1 attacco base** che carica l'energia;
- **1 abilità speciale** (la mossa celebre) che si lancia a energia piena;
- **1 passiva** (tratto del personaggio).

Le abilità sono composte da una libreria di ~25 effetti: danno singolo, area, perforante, stordimento, scudo,
cura, cura di area, rianimazione, provocazione, schivata, furto vita, contrattacco, bonus alleati, malus nemici, esecuzione
dei bersagli deboli, ecc. I nomi delle mosse sono testo, come i nomi dei personaggi.

**Archetipi** (la base delle statistiche): Bruiser, Assassino, Mago, Tank, Tiratore, Supporto, Guaritore, Evocatore.
Le statistiche nascono da archetipo + rating, poi le ritocchiamo a mano per i casi speciali.

**Perché è meglio:** il giocatore capisce *perché* ha vinto (il Guaritore è morto per primo, il Tank ha tenuto,
l'assassino ha chiuso il combattimento), e lo spettacolo è reale.

## 3. Ruoli come posizioni con un effetto

Le 7 caselle diventano posizioni con un compito meccanico:

| Posizione | Caselle | Effetto |
|---|---|---|
| Prima linea | Tank, Capitano | Bersagli preferiti dai nemici. Il Capitano dà un'aura alla squadra. |
| Centro | Vice, Danno | Danno medio, finiscono i bersagli. |
| Retrovia | Supporto, Supporto II, Guaritore | Protetti finché la prima linea regge. Buff e cure. |

Mettere un personaggio fuori ruolo non è più un −8 sulla somma: cambia come combatte (un mago in prima linea muore).

## 4. Sinergie vere (tratti)

Al posto dei tag generici e dei duo: **tratti di gruppo** come nei giochi auto-battler.
Esempi: «3 Squadra 7», «2 Pilastri», «Saiyan», «Ciurma di Cappello di Paglia». Avere 2/3/4 membri dello stesso
tratto dà bonus crescenti. Ne derivano due scelte nuove all'asta: **costruire** un gruppo oppure **negarlo** a un avversario.

## 5. Prezzi dal bilanciamento, non dall'opinione

Un simulatore giocherà centinaia di migliaia di scontri con squadre casuali. Il costo all'asta e il rating mostrato
derivano da quanto un personaggio **fa vincere davvero**. Così il valore sulla carta è onesto, nessuno è sempre il migliore,
e le squadre "tutte rating alto" non sono più la strategia ovvia.

## 6. Grafica

**Carte**
- Inclinazione 3D e riflesso olografico che segue il mouse o il dito.
- Apertura del lotto all'asta con animazione di rivelazione, diversa per rarità.
- Cornici, glow ed effetti per Comune, Rara, Epica, Leggendaria.
- Illustrazione: vedi la domanda sulle immagini.

**Combattimento**
- Palco con due file di carte, barre di Vita ed Energia.
- Ogni abilità speciale ha una scena (zoom, taglio di scena, particelle, numeri di danno, scossa).
- Telecamera e musica che salgono con il combattimento. Durata sempre 20–30 secondi.

**Asta e interfaccia**
- Lotto sul palco con riflettore, timer a barra, offerte che compaiono in tempo reale, coriandoli all'acquisto.
- Recap della squadra con posizioni, tratti attivi e punti deboli.
- Home da prodotto vero: statistiche live, ultimi scontri, accesso rapido alle modalità.
- Suoni e vibrazione su telefono.

## 7. Dati: lavoro da fare insieme

Per ognuno dei 100 personaggi servono archetipo, statistiche, abilità speciale (con nome), passiva e tratti.
Li preparo io come prima bozza e li rivedi tu: è dove si decide se il gioco convince i fan.

## 8. Piano a milestone

1. **Dati e regole.** Archetipi, libreria di effetti, 100 schede, tratti. Tu rivedi.
2. **Motore v2.** Scontro a turni, test, simulatore di bilanciamento, prezzi derivati.
3. **Scena di combattimento v2.** Animazioni delle abilità, particelle, suoni.
4. **Asta e draft v2.** Carte 3D, rivelazione dei lotti, recap con tratti, mobile.
5. **Home e sistema grafico.** Rifinitura, prestazioni, accessibilità.

Per ogni milestone: un branch, commit piccoli, test verdi, lint pulito, istruzioni per provarla.

## 9. Rischi e limiti

- Il motore v2 è un lavoro grande: cambiano partite salvate e test. Le partite vecchie restano leggibili con il motore v1 (campo `versione`).
- Con il combattimento a turni il bilanciamento è il vero lavoro; non è una cosa che si indovina.
- Senza illustrazioni il "fighissimo" ha un tetto: l'arte conta molto più degli effetti.
- 100 personaggi bastano per circa 14 giocatori; servono 140+ per 20.
