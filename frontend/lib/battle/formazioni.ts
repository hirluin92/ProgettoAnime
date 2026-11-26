// Formazioni (specchio di backend/app/engine/formazioni.py).
export interface FormazioneInfo {
  id: string;
  nome: string;
  descrizione: string;
  fila: number[]; // per slot: 0 prima linea, 1 centro, 2 retrovia
}

export const FORMAZIONI: FormazioneInfo[] = [
  {
    id: "classica",
    nome: "Classica",
    descrizione: "Capitano e Tank davanti, cure al sicuro.",
    fila: [0, 1, 0, 1, 2, 2, 2],
  },
  {
    id: "muro",
    nome: "Muro",
    descrizione: "Tre in prima linea: dura di più, colpisce meno.",
    fila: [0, 0, 0, 1, 1, 2, 2],
  },
  {
    id: "assalto",
    nome: "Assalto",
    descrizione: "Anche il Danno davanti: più pressione, più rischi.",
    fila: [0, 0, 1, 0, 1, 1, 2],
  },
  {
    id: "guerriglia",
    nome: "Guerriglia",
    descrizione: "Solo il Tank davanti, gli altri da lontano.",
    fila: [1, 1, 0, 2, 2, 2, 2],
  },
];

export const SIGLE = ["Cap", "Vice", "Tank", "Dan", "Sup", "Sup2", "Gua"];
