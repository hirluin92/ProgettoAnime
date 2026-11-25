import { expect, test } from "vitest";
import { commentary } from "./commentary";
import type { MatchResult } from "../types/match";

const ch = (n: string) => ({
  id: n,
  nome: n,
  anime: "x",
  ruolo_firma: "Tank",
  tags: ["MELEE"],
  rating: 70,
  immagine_url: null,
});
const team = (n: string) => ({
  nome: n,
  members: Array.from({ length: 7 }, (_, i) => ch(`${n}${i}`)),
});
const result = {
  seed: 42,
  squadre: { A: team("Alfa"), B: team("Beta") },
  eventi: [],
} as unknown as MatchResult;

test("il commento è deterministico e usa i nomi giusti", () => {
  const e = { tipo: "attacco", da: "A", idx: 2, danno: 9 } as const;
  const one = commentary(result, e, 3);
  expect(one).toBe(commentary(result, e, 3));
  expect(one).toContain("Alfa2");
  expect(one).toContain("Beta2");
  expect(one).not.toMatch(/\{[abx]\}/);
});

test("ogni tipo di evento produce una frase senza segnaposto", () => {
  const events = [
    { tipo: "ingresso" },
    { tipo: "duello", ruolo: "Tank", idx: 2 },
    { tipo: "counter", da: "B", rel: "AURA > BARRIER", bonus: 8, danno: 5 },
    { tipo: "combo", da: "A", duo: [0, 1], nome: "Rivali", bonus: 12, danno: 6 },
    { tipo: "ko", da: "B", danno: 10 },
  ] as MatchResult["eventi"];
  for (const [i, e] of events.entries()) {
    const text = commentary(result, e, i);
    expect(text.length).toBeGreaterThan(10);
    expect(text).not.toMatch(/\{[abx]\}/);
  }
});
