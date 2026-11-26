import type { MatchResult } from "../types/match";

type Ev = MatchResult["eventi"][number];

// Durata base (ms) di ogni evento a velocità ×1, prima della scalatura.
// Le mosse speciali durano di più: sono i momenti forti dello scontro.
export function baseMs(e: Ev): number {
  switch (e.tipo) {
    case "ingresso":
      return 1500;
    case "turno":
      return 350;
    case "fase":
      return 1500;
    case "effetti":
      return 800;
    case "respiro":
      return 2200;
    case "azione":
      return e.speciale ? 2200 : 500;
    case "fine":
      return 3600;
  }
}
export const MIN_TOTAL_MS = 20_000;
export const MAX_TOTAL_MS = 30_000;

export function rawDuration(events: Ev[]): number {
  return events.reduce((sum, e) => sum + baseMs(e), 0);
}

/** Fattore che porta la durata complessiva dentro 20–30 s a velocità ×1. */
export function timeScale(events: Ev[]): number {
  const raw = rawDuration(events);
  if (raw === 0) return 1;
  const target = Math.min(MAX_TOTAL_MS, Math.max(MIN_TOTAL_MS, raw));
  return target / raw;
}

export function totalDuration(events: Ev[], speed = 1): number {
  return (rawDuration(events) * timeScale(events)) / speed;
}
