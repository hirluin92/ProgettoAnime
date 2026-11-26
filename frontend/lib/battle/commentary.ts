import type { MatchResult } from "../types/match";

type Ev = MatchResult["eventi"][number];
type Azione = Extract<Ev, { tipo: "azione" }>;

// Frasi originali. {a} = chi agisce, {b} = bersaglio, {m} = mossa, {n} = valore.
const BASE = [
  "{a} colpisce {b}: −{n}.",
  "Scambio rapido: {a} mette a segno su {b} (−{n}).",
  "{a} non perde tempo, {b} incassa −{n}.",
  "Affondo di {a}! {b} barcolla per −{n}.",
];
const SPECIALE = [
  "{a} scatena {m}! {risultato}",
  "È il momento di {a}: {m}! {risultato}",
  "{m}! {a} gioca la carta migliore. {risultato}",
];
const INGRESSO = [
  "Si apre l'arena: {a} contro {b}, e il pubblico è già in piedi!",
  "Silenzio sulle tribune... poi il gong. Tocca a {a} e {b}!",
  "Due squadre, sette combattenti a testa. Che vinca la più furba!",
];
const FINE = [
  "K.O.! {a} chiude i conti, l'arena esplode!",
  "È finita! La vittoria è di {a}!",
  "Giù il sipario: {a} si prende lo scontro!",
];

function pick(list: string[], seed: number, index: number): string {
  // piccolo mescolamento deterministico: stesso seed e stesso evento, stessa frase
  const h = Math.imul(seed ^ (index * 2654435761), 2246822519) >>> 0;
  return list[h % list.length];
}

function nomeDi(result: MatchResult, lato: string, idx: number): string {
  return result.squadre[lato].members[idx].nome;
}

function descriviAzione(result: MatchResult, e: Azione, index: number): string {
  const a = nomeDi(result, e.da, e.idx);
  if (e.effetto === "stordito") return `${a} è stordito e salta l'azione.`;
  const danni = e.esiti.filter((x) => x.delta < 0 && x.lato !== e.da);
  const cure = e.esiti.filter((x) => x.delta > 0);
  const ko = e.esiti.filter((x) => x.ko && x.lato !== e.da);
  let risultato = "";
  let b = "";
  let n = 0;
  if (danni.length === 1) {
    b = nomeDi(result, danni[0].lato, danni[0].idx);
    n = -danni[0].delta;
    risultato = `${b} perde ${n}.`;
  } else if (danni.length > 1) {
    n = -danni.reduce((s, x) => s + x.delta, 0);
    risultato = `${danni.length} bersagli colpiti per ${n} in tutto.`;
    b = `${danni.length} avversari`;
  } else if (cure.length > 0) {
    const tot = cure.reduce((s, x) => s + x.delta, 0);
    risultato =
      cure.length === 1
        ? `${nomeDi(result, cure[0].lato, cure[0].idx)} recupera ${tot}.`
        : `La squadra recupera ${tot} punti vita.`;
  } else if (e.esiti.some((x) => x.scudo > 0)) {
    risultato = "Uno scudo avvolge la squadra.";
  } else if (e.esiti.some((x) => x.schivata)) {
    risultato = "Colpo schivato!";
  }
  if (ko.length > 0) risultato += ` ${nomeDi(result, ko[0].lato, ko[0].idx)} è K.O.!`;
  const frase = e.speciale ? pick(SPECIALE, result.seed, index) : pick(BASE, result.seed, index);
  if (!e.speciale && danni.length === 0) {
    return e.esiti.some((x) => x.schivata) ? `${a} manca il bersaglio.` : `${a} prende fiato.`;
  }
  return (
    frase + (e.speciale ? "" : ko.length ? ` ${nomeDi(result, ko[0].lato, ko[0].idx)} è K.O.!` : "")
  )
    .replace("{a}", a)
    .replace("{b}", b)
    .replace("{m}", e.mossa)
    .replace("{n}", String(n))
    .replace("{risultato}", risultato);
}

export function commentary(result: MatchResult, e: Ev, index: number): string {
  const { A, B } = result.squadre;
  switch (e.tipo) {
    case "ingresso":
      return pick(INGRESSO, result.seed, index).replace("{a}", A.nome).replace("{b}", B.nome);
    case "turno":
      return `Turno ${e.n}`;
    case "azione":
      return descriviAzione(result, e, index);
    case "fine":
      return pick(FINE, result.seed, index).replace("{a}", result.squadre[e.vincitore].nome);
  }
}
