import { describe, expect, it } from "vitest";
import { avanzamento } from "./profile";

describe("profilo", () => {
  it("calcola l'avanzamento verso il livello successivo", () => {
    expect(avanzamento({ xp: 60, xp_livello: 60, xp_prossimo: 240 })).toBe(0);
    expect(avanzamento({ xp: 150, xp_livello: 60, xp_prossimo: 240 })).toBe(50);
    expect(avanzamento({ xp: 240, xp_livello: 60, xp_prossimo: 240 })).toBe(100);
  });

  it("non esce mai da 0-100", () => {
    expect(avanzamento({ xp: 0, xp_livello: 60, xp_prossimo: 240 })).toBe(0);
    expect(avanzamento({ xp: 999, xp_livello: 60, xp_prossimo: 240 })).toBe(100);
    expect(avanzamento({ xp: 5, xp_livello: 0, xp_prossimo: 0 })).toBe(100);
  });
});
