import { describe, expect, it } from "vitest";
import { canPick, minCompletion, type DraftOption } from "./draft";

const o = (id: string, cost: number): DraftOption => ({ id, cost });

describe("draft: nessun vicolo cieco", () => {
  // Tre ruoli; il secondo e il terzo hanno solo carte care.
  const options = [
    [o("a1", 1), o("a2", 9)],
    [o("b1", 8), o("b2", 9)],
    [o("c1", 7), o("c2", 12)],
  ];

  it("calcola il costo minimo per completare", () => {
    expect(minCompletion(options, 0, new Set())).toBe(1 + 8 + 7);
    expect(minCompletion(options, 1, new Set())).toBe(8 + 7);
    expect(minCompletion(options, 3, new Set())).toBe(0);
  });

  it("vieta la carta che lascerebbe i ruoli restanti senza budget", () => {
    // budget 20: prendere a2 (9) lascia 11, ma servono almeno 15
    expect(canPick(options, 0, [], options[0][1], 0, 20)).toBe(false);
    expect(canPick(options, 0, [], options[0][0], 0, 20)).toBe(true);
  });

  it("lascia sempre almeno una scelta se si parte da una squadra completabile", () => {
    const budget = 20;
    const picked: string[] = [];
    let spent = 0;
    for (let step = 0; step < options.length; step++) {
      const ok = options[step].filter((c) => canPick(options, step, picked, c, spent, budget));
      expect(ok.length).toBeGreaterThan(0);
      // sceglie la più cara consentita: il caso peggiore per restare senza mosse
      const pick = ok.sort((x, y) => y.cost - x.cost)[0];
      picked.push(pick.id);
      spent += pick.cost;
    }
    expect(spent).toBeLessThanOrEqual(budget);
  });

  it("non conta due volte lo stesso personaggio in ruoli diversi", () => {
    const dup = [
      [o("x", 1), o("y", 9)],
      [o("x", 1), o("z", 9)],
    ];
    // con x preso nel primo ruolo, il secondo costa 9
    expect(minCompletion(dup, 1, new Set(["x"]))).toBe(9);
    expect(canPick(dup, 0, [], dup[0][0], 0, 5)).toBe(false);
    expect(canPick(dup, 0, [], dup[0][0], 0, 10)).toBe(true);
  });

  it("senza completamento possibile restituisce Infinity", () => {
    expect(minCompletion([[o("x", 1)], [o("x", 1)]], 0, new Set())).toBe(Infinity);
  });
});
