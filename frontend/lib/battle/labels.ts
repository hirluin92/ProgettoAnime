export const ROLES = ["Capitano", "Vice", "Tank", "Danno", "Supporto", "Supporto II", "Guaritore"];

/** Posizioni in campo: indici dei ruoli per fila (0 = prima linea, 1 = centro, 2 = retrovia). */
export const FILE: number[][] = [
  [0, 2],
  [1, 3],
  [4, 5, 6],
];

export const ARCH_NOMI: Record<string, string> = {
  BRU: "Lottatore",
  ASS: "Assassino",
  MAG: "Mago",
  TAN: "Tank",
  TIR: "Tiratore",
  SUP: "Supporto",
  GUA: "Guaritore",
  EVO: "Evocatore",
};

export const STAT_NOMI: Record<string, string> = {
  atk: "attacco",
  def: "difesa",
  hp: "vita",
  spd: "velocità",
  energy: "energia",
  tutto: "tutte le statistiche",
};
