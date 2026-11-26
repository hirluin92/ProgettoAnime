import { describe, expect, it } from "vitest";
import { allowed, bestRoles, potenza, signed, toneOf } from "./draft";

describe("draft v3", () => {
  it("l'affinità diventa un colore", () => {
    expect(toneOf(34)).toBe("ottimo");
    expect(toneOf(12)).toBe("buono");
    expect(toneOf(0)).toBe("neutro");
    expect(toneOf(-3)).toBe("debole");
  });

  it("la potenza segue l'affinità come nel motore", () => {
    expect(potenza(90, 30)).toBe(117);
    expect(potenza(90, -10)).toBe(81);
    expect(potenza(70, 0)).toBe(70);
  });

  it("mostra il segno", () => {
    expect(signed(12)).toBe("+12%");
    expect(signed(-5)).toBe("-5%");
    expect(signed(0)).toBe("0%");
  });

  it("regola anti-blocco: dopo la carta resta il minimo per finire", () => {
    // budget 56, 7 giri, minimo 6 per giro
    expect(allowed(0, 20, 6, 56, 6)).toBe(true); // 20 + 36 = 56
    expect(allowed(0, 21, 6, 56, 6)).toBe(false);
    expect(allowed(48, 8, 0, 56, 6)).toBe(true); // ultimo giro
    expect(allowed(49, 8, 0, 56, 6)).toBe(false);
  });

  it("nel caso peggiore si arriva sempre in fondo scegliendo la carta più cara consentita", () => {
    // mani con una carta economica (<= 6) e una cara: la regola non lascia mai senza scelte
    const budget = 56;
    const cheap = 6;
    let spent = 0;
    for (let r = 0; r < 7; r++) {
      const options = [3, 6, 9, 12, 14].filter((c) => allowed(spent, c, 6 - r, budget, cheap));
      expect(options.length).toBeGreaterThan(0);
      spent += Math.max(...options);
    }
    expect(spent).toBeLessThanOrEqual(budget);
  });

  it("ordina gli slot migliori", () => {
    expect(bestRoles({ Capitano: 34, Vice: 17, Tank: 10, Danno: -5 }, 2)).toEqual([
      ["Capitano", 34],
      ["Vice", 17],
    ]);
  });
});
