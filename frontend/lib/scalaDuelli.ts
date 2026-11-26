import type { CartaView } from "./duello";
import type { Premio } from "./profile";

// Tipi dell'API della Scala a duelli (specchio di backend/app/scala_duelli.py).
export interface OffertaScala {
  tipo: "carta" | "rinforzo";
  carta: CartaView;
  testo: string;
}
export interface AvversarioScala {
  gradino: number;
  boss: boolean;
  livello: string;
  bonus: number;
  mazzo: CartaView[];
}
export interface RunView {
  run_id: string;
  gradino: number;
  max_gradini: number;
  mazzo: CartaView[];
  max_mazzo: number;
  avversario: AvversarioScala;
  vinti: number;
  finita: boolean;
}
export interface ScalaEsito {
  gradino: number;
  vinto: boolean | null;
  finita: boolean;
  completata: boolean;
  vinti: number;
  offerte: OffertaScala[];
  premio: Premio | null;
}
