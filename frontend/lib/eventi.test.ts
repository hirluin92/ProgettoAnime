import { describe, expect, it } from "vitest";
import { pulisci } from "./eventi";

describe("eventi: pulizia delle proprietà", () => {
  it("accorcia chiavi e testi lunghi e tiene numeri e booleani", () => {
    const out = pulisci({ ["k".repeat(30)]: "x".repeat(80), n: 3, ok: true });
    expect(Object.keys(out)).toContain("k".repeat(20));
    expect(out["k".repeat(20)]).toBe("x".repeat(40));
    expect(out.n).toBe(3);
    expect(out.ok).toBe(true);
  });

  it("tiene al massimo otto proprietà", () => {
    const molte = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(pulisci(molte))).toHaveLength(8);
  });
});
