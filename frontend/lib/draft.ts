export interface DraftOption {
  id: string;
  cost: number;
}

/**
 * Costo minimo per riempire i ruoli da `from` in poi scegliendo tra le opzioni offerte,
 * senza ripetere personaggi già presi. `Infinity` se non si può completare la squadra.
 */
export function minCompletion(
  options: DraftOption[][],
  from: number,
  used: ReadonlySet<string>,
): number {
  if (from >= options.length) return 0;
  let best = Infinity;
  for (const o of options[from]) {
    if (used.has(o.id) || o.cost >= best) continue;
    const next = new Set(used).add(o.id);
    const rest = minCompletion(options, from + 1, next);
    if (o.cost + rest < best) best = o.cost + rest;
  }
  return best;
}

/**
 * Una carta è scegliibile solo se, dopo averla presa, la squadra si può ancora completare
 * entro il budget: così non si resta mai senza mosse con spazi vuoti.
 */
export function canPick(
  options: DraftOption[][],
  step: number,
  pickedIds: readonly string[],
  candidate: DraftOption,
  spent: number,
  budget: number,
): boolean {
  if (pickedIds.includes(candidate.id)) return false;
  const used = new Set([...pickedIds, candidate.id]);
  return spent + candidate.cost + minCompletion(options, step + 1, used) <= budget;
}
