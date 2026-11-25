import type { MatchResult } from "../types/match";

type Ev = MatchResult["eventi"][number];

// Durata base (ms) di ogni evento a velocità ×1, prima della scalatura.
export const BASE_MS: Record<Ev["tipo"], number> = {
  ingresso: 1400,
  duello: 700,
  attacco: 1000,
  counter: 1700,
  combo: 1900,
  ko: 4600,
};
export const MIN_TOTAL_MS = 20_000;
export const MAX_TOTAL_MS = 30_000;

export function rawDuration(events: Ev[]): number {
  return events.reduce((sum, e) => sum + BASE_MS[e.tipo], 0);
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
