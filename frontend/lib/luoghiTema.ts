// Aspetto di ogni luogo del Duello: colori, simbolo grande sullo sfondo e nome breve del tema.
export interface TemaLuogo {
  da: string;
  a: string;
  accento: string;
  simbolo: string;
}

export const TEMI_LUOGO: Record<string, TemaLuogo> = {
  vulcano: { da: "#3a0f0a", a: "#1a0707", accento: "#ff6a3d", simbolo: "volcano" },
  ghiaccio: { da: "#0b2a3d", a: "#08131f", accento: "#6fd8ff", simbolo: "snowflake" },
  gravita: { da: "#241a3f", a: "#0d0a1c", accento: "#a98bff", simbolo: "planet" },
  luna: { da: "#3d0a1f", a: "#14060e", accento: "#ff4d7e", simbolo: "moon" },
  torneo: { da: "#3a2a07", a: "#150f04", accento: "#ffd21f", simbolo: "trophy" },
  nebbia: { da: "#1b2a2e", a: "#0a1113", accento: "#9fd8d0", simbolo: "fog" },
};

export const temaLuogo = (id: string): TemaLuogo =>
  TEMI_LUOGO[id] ?? { da: "#1a1538", a: "#0c0a1c", accento: "#9a86ff", simbolo: "swords" };
