import { describe, expect, it } from "vitest";
import type { MatchResult } from "../types/match";
import { momentiMigliori } from "./momenti";

const stato = {
  hp: { A: [100, 100, 100, 100, 100, 100, 100], B: [100, 100, 100, 100, 100, 100, 100] },
  energia: { A: [], B: [] },
  scudo: { A: [], B: [] },
  hype: { A: 0, B: 0 },
};
const esito = (ko: boolean, delta: number, crit = false) => ({
  lato: "B" as const,
  idx: 0,
  delta,
  scudo: 0,
  ko,
  schivata: false,
  crit,
  stordito: false,
  effetto: null,
});
const unita = Array.from({ length: 7 }, () => ({
  hp: 100,
  atk: 10,
  dif: 10,
  vel: 10,
  adatto: true,
}));
const mem = Array.from({ length: 7 }, (_, i) => ({ nome: `P${i}`, anime: "naruto", id: `p${i}` }));

const result = {
  seed: 1,
  squadre: { A: { nome: "A", members: mem }, B: { nome: "B", members: mem } },
  unita: { A: unita, B: unita },
  eventi: [
    { tipo: "turno", n: 1 },
    {
      tipo: "azione",
      turno: 1,
      da: "A",
      idx: 0,
      mossa: "x",
      speciale: false,
      effetto: "base",
      esiti: [esito(false, -5)],
      stato,
    },
    { tipo: "turno", n: 2 },
    {
      tipo: "azione",
      turno: 2,
      da: "A",
      idx: 1,
      mossa: "Gran colpo",
      speciale: true,
      effetto: "strike",
      esiti: [esito(true, -100, true)],
      stato,
    },
    { tipo: "turno", n: 3 },
    {
      tipo: "azione",
      turno: 3,
      da: "A",
      idx: 2,
      mossa: "y",
      speciale: false,
      effetto: "base",
      esiti: [esito(false, -8)],
      stato,
    },
  ],
} as unknown as MatchResult;

describe("momenti migliori", () => {
  it("mette in cima il K.O. con mossa finale e critico", () => {
    const m = momentiMigliori(result, 1);
    expect(m).toHaveLength(1);
    expect(m[0].turno).toBe(2);
    expect(m[0].da).toBe(2); // riparte dall'inizio del turno 2
  });

  it("restituisce al massimo N momenti, in ordine cronologico, uno per turno", () => {
    const m = momentiMigliori(result, 3);
    expect(m.length).toBeLessThanOrEqual(3);
    expect(m.map((x) => x.da)).toEqual([...m.map((x) => x.da)].sort((a, b) => a - b));
    expect(new Set(m.map((x) => x.da)).size).toBe(m.length);
  });
});
