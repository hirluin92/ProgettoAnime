import type { MatchResult } from "../types/match";
import { commentary } from "./commentary";

export interface Momento {
  /** indice dell'evento da cui far ripartire il replay (l'inizio del turno) */
  da: number;
  turno: number;
  punteggio: number;
  testo: string;
}

type Ev = MatchResult["eventi"][number];

function punti(e: Ev, vitaMedia: number): number {
  switch (e.tipo) {
    case "azione": {
      const ko = e.esiti.filter((x) => x.ko).length;
      const crit = e.esiti.filter((x) => x.crit).length;
      const danno = e.esiti.reduce((t, x) => t + (x.delta < 0 ? -x.delta : 0), 0);
      return (
        ko * 6 +
        crit * 2 +
        (e.speciale ? 3 : 0) +
        (e.effetto === "combo" ? 4 : 0) +
        (danno / vitaMedia) * 3
      );
    }
    case "respiro":
      return 8;
    case "effetti":
      return e.esiti.some((x) => x.ko) ? 4 : 0;
    default:
      return 0;
  }
}

/** I passaggi più spettacolari dello scontro (K.O., critici, mosse finali, combo, ultimo respiro). */
export function momentiMigliori(result: MatchResult, quanti = 3): Momento[] {
  const tutte = [...result.unita.A, ...result.unita.B];
  const vitaMedia = tutte.reduce((t, u) => t + u.hp, 0) / Math.max(1, tutte.length);
  let inizioTurno = 0;
  const cand: Momento[] = [];
  result.eventi.forEach((e, i) => {
    if (e.tipo === "turno") inizioTurno = i;
    const p = punti(e, vitaMedia);
    if (p <= 0) return;
    const turno = "turno" in e ? e.turno : 0;
    cand.push({ da: inizioTurno, turno, punteggio: p, testo: commentary(result, e, i) });
  });
  const scelti: Momento[] = [];
  for (const m of cand.sort((a, b) => b.punteggio - a.punteggio)) {
    if (scelti.length === quanti) break;
    if (scelti.some((s) => s.da === m.da)) continue; // un momento per turno
    scelti.push(m);
  }
  return scelti.sort((a, b) => a.da - b.da);
}
