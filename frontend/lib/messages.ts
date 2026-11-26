import type {
  AuctionFinished,
  BidPlaced,
  ErrorMsg,
  Joined,
  LotAssigned,
  LotSkipped,
  LotStarted,
  LotWon,
  Mission,
  PlayerPassed,
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
  | ErrorMsg;

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
  | { type: "update_settings"; settings: import("./types/server").RoomSettings };

export const ROLES = ["Capitano", "Vice", "Tank", "Danno", "Supporto", "Supporto II", "Guaritore"];
