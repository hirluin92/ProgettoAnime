import type { Character } from "@/lib/types/match";

// Tipi dell'API del draft (specchio di backend/app/quick.py).
export interface Option {
  character: Character;
  cost: number;
  affinita: Record<string, number>;
}
export interface Hand {
  cards: Option[];
  mystery_cost: number;
}
export interface ArenaInfo {
  id: string;
  nome: string;
  descrizione: string;
}
export interface DraftOptions {
  seed: number;
  arena: ArenaInfo;
  budget: number;
  roles: string[];
  rerolls: number;
  mystery_round: number;
  cheap: number;
  hands: Hand[];
}
export interface PickIn {
  id: string;
  role: string;
  hand: number;
}
export interface Placed {
  option: Option;
  role: string;
  hand: number;
  cost: number;
}

export type Tone = "ottimo" | "buono" | "neutro" | "debole";

export function toneOf(aff: number): Tone {
  if (aff >= 20) return "ottimo";
  if (aff >= 10) return "buono";
  if (aff >= 0) return "neutro";
  return "debole";
}

/** Potenza mostrata sulla carta nello slot: come `potenza_ruolo` del motore. */
export function potenza(rating: number, aff: number): number {
  return Math.round(rating * (1 + aff / 100));
}

export function signed(n: number): string {
  return n > 0 ? `+${n}%` : `${n}%`;
}

/**
 * Regola anti-blocco (specchio di `allowed` in backend/app/draft.py): dopo la carta deve restare
 * il minimo per riempire gli slot rimasti. Il server garantisce una carta economica in ogni mano.
 */
export function allowed(
  spent: number,
  cost: number,
  roundsLeftAfter: number,
  budget: number,
  cheap: number,
): boolean {
  return spent + cost + cheap * roundsLeftAfter <= budget;
}

/** Gli slot in cui la carta rende di più, in ordine. */
export function bestRoles(aff: Record<string, number>, n = 2): [string, number][] {
  return Object.entries(aff)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}
