// Tattiche a fasi (specchio di backend/app/engine/tattiche.py).
export const TATTICHE = ["assalto", "tecnica", "guardia"] as const;
export type Tattica = (typeof TATTICHE)[number];

export const TATTICA_INFO: Record<Tattica, { nome: string; icona: string; batte: Tattica }> = {
  assalto: { nome: "Assalto", icona: "swords", batte: "tecnica" },
  tecnica: { nome: "Tecnica", icona: "sparkles", batte: "guardia" },
  guardia: { nome: "Guardia", icona: "shield", batte: "assalto" },
};

export const FASI = 3;
export const BONUS = 25;
export const MALUS = 15;

export function nomeTattica(t: string): string {
  return TATTICA_INFO[t as Tattica]?.nome ?? t;
}

export function iconaTattica(t: string): string {
  return TATTICA_INFO[t as Tattica]?.icona ?? "";
}
