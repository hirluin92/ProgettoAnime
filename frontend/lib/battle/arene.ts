// Arene (specchio di backend/app/engine/arene.py): nome e icona per replay e interfaccia.
export const ARENE_INFO: Record<string, { nome: string; icona: string; descrizione: string }> = {
  ghiaccio: {
    nome: "Arena di ghiaccio",
    icona: "❄️",
    descrizione: "Il gelo rallenta tutti: −15% velocità.",
  },
  torneo: {
    nome: "Torneo del potere",
    icona: "⚡",
    descrizione: "L'energia si carica il doppio più in fretta: più mosse speciali.",
  },
  vulcano: {
    nome: "Vulcano",
    icona: "🌋",
    descrizione: "La prima linea brucia a ogni turno: servono resistenza e cure.",
  },
  nebbia: { nome: "Nebbia fitta", icona: "🌫️", descrizione: "Il 12% degli attacchi va a vuoto." },
  gravita: {
    nome: "Gravità pesante",
    icona: "🪨",
    descrizione: "Tutti i danni +20%, ma i Tank hanno la difesa +25%.",
  },
  luna: {
    nome: "Luna rossa",
    icona: "🌕",
    descrizione: "I colpi critici sono molto più frequenti (+15%).",
  },
};

export const STATI_INFO: Record<string, { icona: string; nome: string; turni: number }> = {
  bruciatura: { icona: "🔥", nome: "Bruciatura", turni: 2 },
  veleno: { icona: "☠️", nome: "Veleno", turni: 3 },
  sigillo: { icona: "🔒", nome: "Sigillo", turni: 1 },
  corrosione: { icona: "☣️", nome: "Corrosione", turni: 2 },
};
