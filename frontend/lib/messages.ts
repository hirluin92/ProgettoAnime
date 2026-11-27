import type {
  AuctionFinished,
  BidPlaced,
  DuelloAggiornamento,
  ErrorMsg,
  Joined,
  LotAssigned,
  LotSkipped,
  LotStarted,
  LotWon,
  Mission,
  PlayerPassed,
  QuizEsito,
  RoomState,
  TournamentResult,
} from "./types/server";

export type ServerMsg =
  | Joined
  | RoomState
  | Mission
  | LotStarted
  | BidPlaced
  | PlayerPassed
  | LotWon
  | LotAssigned
  | LotSkipped
  | AuctionFinished
  | TournamentResult
  | DuelloAggiornamento
  | QuizEsito
  | ErrorMsg;

export type { DuelloAggiornamento, QuizEsito, QuizView } from "./types/server";
export type { RoomView, PlayerView, LotView, TournamentView, RoomSettings } from "./types/server";

export type ClientMsg =
  | { type: "join"; name?: string; token?: string | null }
  | { type: "spectate" }
  | { type: "start" }
  | { type: "ban"; character_id: string }
  | { type: "bid"; amount: number }
  | { type: "pass" }
  | { type: "assign_role"; role: string }
  | { type: "pick"; character_id: string; role: string }
  | { type: "plan"; tattiche: string[] | null; carica: "subito" | "carica"; formazione: string }
  | { type: "quiz_risposta"; risposta_id: number; tipo?: "anime" | "brano" | "artista" }
  | { type: "quiz_lobby" }
  | { type: "duello_mosse"; mosse: { carta: string; corsia: number }[] }
  | { type: "update_settings"; settings: import("./types/server").RoomSettings };

export const ROLES = ["Capitano", "Vice", "Tank", "Danno", "Supporto", "Supporto II", "Guaritore"];
