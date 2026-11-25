import type { MatchResult } from "../types/match";

type Ev = MatchResult["eventi"][number];

// Frasi originali. {a} = chi colpisce, {b} = chi subisce, {x} = squadra o dettaglio.
const PHRASES: Record<Ev["tipo"], string[]> = {
  ingresso: [
    "Si apre l'arena: {a} contro {b}, e il pubblico è già in piedi!",
    "Silenzio sulle tribune... poi il gong. Tocca a {a} e {b}!",
    "Due squadre, una sola pista di sabbia. Che vinca la più furba!",
  ],
  duello: [
    "Ruolo {x}: {a} contro {b}, sguardi di ghiaccio.",
    "Ora si sfidano per il ruolo {x}: {a} e {b} non si risparmieranno.",
    "È il turno del {x}. {a} prende posizione, {b} risponde.",
  ],
  attacco: [
    "{a} affonda il colpo e {b} barcolla!",
    "Che mossa di {a}! {b} incassa e stringe i denti.",
    "{a} non esita: il colpo arriva dritto su {b}.",
    "Scambio velocissimo, ma è {a} ad avere la meglio su {b}.",
  ],
  counter: [
    "COUNTER! {x}: la squadra di {a} ha letto il gioco avversario!",
    "Mossa preparata da tempo: {x} fa la differenza per {a}!",
    "Il vantaggio dei tag si vede: {x} pesa sul piatto di {a}.",
  ],
  combo: [
    "Combo! {x}: quei due insieme sono un'altra cosa!",
    "Intesa perfetta, {x} colpisce all'unisono per {a}!",
    "Il legame fa la forza: {x} scuote l'arena!",
  ],
  ko: [
    "K.O.! {a} chiude i conti, l'arena esplode!",
    "È finita! Il colpo finale è di {a}!",
    "Giù il sipario: {a} si prende la vittoria!",
  ],
};

function pick(list: string[], seed: number, index: number): string {
  // piccolo mescolamento deterministico: stesso seed e stesso evento, stessa frase
  const h = Math.imul(seed ^ (index * 2654435761), 2246822519) >>> 0;
  return list[h % list.length];
}

export function commentary(result: MatchResult, e: Ev, index: number): string {
  const { A, B } = result.squadre;
  let a = A.nome;
  let b = B.nome;
  let x = "";
  switch (e.tipo) {
    case "duello":
      a = A.members[e.idx].nome;
      b = B.members[e.idx].nome;
      x = e.ruolo;
      break;
    case "attacco": {
      const from = result.squadre[e.da].members[e.idx].nome;
      const to = result.squadre[e.da === "A" ? "B" : "A"].members[e.idx].nome;
      a = from;
      b = to;
      break;
    }
    case "counter":
      a = result.squadre[e.da].nome;
      x = e.rel;
      break;
    case "combo": {
      const m = result.squadre[e.da].members;
      a = result.squadre[e.da].nome;
      x = `${e.nome} (${m[e.duo[0]].nome} + ${m[e.duo[1]].nome})`;
      break;
    }
    case "ko":
      a = result.squadre[e.da].nome;
      break;
  }
  return pick(PHRASES[e.tipo], result.seed, index)
    .replace("{a}", a)
    .replace("{b}", b)
    .replace("{x}", x);
}
