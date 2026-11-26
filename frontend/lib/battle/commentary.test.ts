import { expect, test } from "vitest";
import { commentary } from "./commentary";
import type { MatchResult } from "../types/match";

const ch = (nome: string) =>
  ({
    id: nome,
    nome,
    anime: "naruto",
    ruolo_firma: "Vice",
    tags: ["MELEE"],
    rating: 80,
    immagine_url: null,
    arch: "BRU",
    mossa: { nome: "Colpo", effetto: "strike" },
    passiva: { nome: "P", effetto: "armor" },
    gruppi: [],
    costo: 6,
  }) as unknown as MatchResult["squadre"][string]["members"][number];

const team = (n: string) => ({
  nome: `Squadra ${n}`,
  members: Array.from({ length: 7 }, (_, i) =>
    ch(`${n}${i}`),
  ) as MatchResult["squadre"][string]["members"],
});
const stato = { hp: { A: [], B: [] }, energia: { A: [], B: [] }, scudo: { A: [], B: [] } };
const result = {
  seed: 7,
  squadre: { A: team("a"), B: team("b") },
} as unknown as MatchResult;

const esito = (lato: "A" | "B", idx: number, delta: number, ko = false) => ({
  lato,
  idx,
  delta,
  scudo: 0,
  ko,
  schivata: false,
  crit: false,
  stordito: false,
});

test("ogni tipo di evento ha una frase non vuota e deterministica", () => {
  const eventi: MatchResult["eventi"] = [
    { tipo: "ingresso", stato },
    { tipo: "turno", n: 2 },
    {
      tipo: "azione",
      turno: 1,
      da: "A",
      idx: 0,
      mossa: "Attacco",
      speciale: false,
      effetto: "base",
      esiti: [esito("B", 1, -40)],
      stato,
    },
    {
      tipo: "azione",
      turno: 1,
      da: "A",
      idx: 3,
      mossa: "Rasengan",
      speciale: true,
      effetto: "strike",
      esiti: [esito("B", 2, -120, true)],
      stato,
    },
    { tipo: "fine", vincitore: "A", motivo: "ko" },
  ];
  eventi.forEach((e, i) => {
    const t = commentary(result, e, i);
    expect(t.length).toBeGreaterThan(3);
    expect(t).not.toMatch(/\{[a-z]+\}/);
    expect(commentary(result, e, i)).toBe(t);
  });
});

test("la mossa speciale nomina mossa, bersaglio e K.O.", () => {
  const t = commentary(
    result,
    {
      tipo: "azione",
      turno: 1,
      da: "A",
      idx: 3,
      mossa: "Rasengan",
      speciale: true,
      effetto: "strike",
      esiti: [esito("B", 2, -120, true)],
      stato,
    },
    0,
  );
  expect(t).toContain("Rasengan");
  expect(t).toContain("b2");
  expect(t).toContain("K.O.");
});
