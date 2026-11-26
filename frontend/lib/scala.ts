import type { Premio } from "./profile";
import type { Character, MatchResult } from "./types/match";

export interface OffertaView {
  id: string;
  nome: string;
  descrizione: string;
}
export interface AvversarioView {
  gradino: number;
  nome: string;
  forza: number;
  forza_tua: number;
  arena: string;
  arena_nome: string;
  membri: Character[];
}
export interface ScalaState {
  run_id: string;
  gradino: number;
  max_gradini: number;
  avversario: AvversarioView;
  squadra: Character[];
  potenziamenti: OffertaView[];
}
export interface ScalaResult {
  run_id: string;
  match_id: string;
  result: MatchResult;
  vinto: boolean;
  gradino: number;
  gradini_vinti: number;
  finita: boolean;
  completata: boolean;
  offerte: OffertaView[];
  prossimo: AvversarioView | null;
  premio: Premio | null;
}
export interface Piano {
  tattiche: string[];
  carica: "subito" | "carica";
  formazione: string;
}
