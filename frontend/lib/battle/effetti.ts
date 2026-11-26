// Descrizioni leggibili degli effetti di mosse e passive (valori allineati al motore in backend/app/engine/simulate.py).
export const MOSSE_EFFETTO: Record<string, string> = {
  strike: "Colpo potente su un nemico (danno ×2,3)",
  pierce: "Colpo che ignora parte della difesa",
  heal: "Cura il compagno più ferito (42% della vita)",
  stun: "Colpo che stordisce: il bersaglio salta il turno",
  multi: "Tre colpi su bersagli a caso",
  aoe: "Colpisce tutti i nemici",
  execute: "Finisce chi è sotto metà vita (danno ×2,6)",
  haste: "Colpo veloce che aumenta la propria velocità",
  revive: "Rianima un caduto con il 40% della vita",
  snipe: "Colpisce il nemico con meno vita",
  healall: "Cura tutta la squadra (19% della vita)",
  drain: "Colpo che ruba vita: cura il 60% del danno",
  barrier: "Scudo del 14% della vita a tutta la squadra",
  debuff: "Colpo che indebolisce i nemici (−25% attacco per 2 turni)",
  buff: "Potenzia la squadra (+25% attacco per 2 turni)",
};

export const PASSIVA_EFFETTO: Record<string, string> = {
  aura_atk: "Aura: +7% attacco a tutta la squadra",
  crit: "Colpi critici molto più frequenti",
  firststrike: "Agisce per primo e +25% attacco al turno 1",
  armor: "Difesa +25%",
  energy: "Carica l'energia più in fretta",
  rage: "Sotto metà vita: +45% attacco",
  laststand: "Sopravvive una volta a un colpo mortale con 1 PV",
  dodge: "18% di probabilità di schivare",
  regen: "Recupera il 5% della vita a ogni turno",
  lifesteal: "Cura il 25% del danno inflitto",
  thorns: "Rimanda il 20% del danno a chi lo colpisce",
};
