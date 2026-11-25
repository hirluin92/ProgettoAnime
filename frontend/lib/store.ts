import { create } from "zustand";
import type { PlayerView, RoomView, ServerMsg, TournamentView } from "./messages";

interface RoomStore {
  room: RoomView | null;
  me: string | null;
  tournament: TournamentView | null;
  status: "idle" | "connecting" | "open" | "closed";
  error: string | null;
  errorCode: string | null;
  offset: number; // orologio server - orologio client (secondi)
  feed: string[];
  apply: (m: ServerMsg) => void;
  setStatus: (s: RoomStore["status"]) => void;
  clearError: () => void;
  reset: () => void;
}

const patchPlayer = (room: RoomView, id: string, f: (p: PlayerView) => PlayerView): RoomView => ({
  ...room,
  players: room.players.map((p) => (p.id === id ? f(p) : p)),
});

export const useRoom = create<RoomStore>((set, get) => ({
  room: null,
  me: null,
  tournament: null,
  status: "idle",
  error: null,
  errorCode: null,
  offset: 0,
  feed: [],
  setStatus: (status) => set({ status }),
  clearError: () => set({ error: null, errorCode: null }),
  reset: () => set({ room: null, me: null, tournament: null, feed: [], error: null }),
  apply: (m) => {
    const { room } = get();
    const name = (id: string) => room?.players.find((p) => p.id === id)?.name ?? "?";
    const log = (t: string) => set((s) => ({ feed: [...s.feed.slice(-40), t] }));
    switch (m.type) {
      case "joined":
        set({ me: m.player_id });
        return;
      case "room_state":
        set({ room: m.room, offset: m.room.server_time - Date.now() / 1000 });
        return;
      case "error":
        set({ error: m.message, errorCode: m.code });
        return;
      case "tournament_result":
        set({ tournament: m.tournament });
        return;
      default:
    }
    if (!room) return;
    switch (m.type) {
      case "lot_started":
        set({
          offset: m.now - Date.now() / 1000,
          room: {
            ...room,
            lots_left: Math.max(0, room.lots_left - 1),
            lot: {
              number: m.number,
              character: m.character,
              current_bid: 0,
              bidder_id: null,
              deadline: m.deadline,
              passed: [],
              await_role: null,
            },
          },
        });
        log(`Lotto: ${m.character.nome}`);
        return;
      case "bid_placed":
        if (room.lot)
          set({
            offset: m.now - Date.now() / 1000,
            room: {
              ...room,
              lot: {
                ...room.lot,
                current_bid: m.amount,
                bidder_id: m.player_id,
                deadline: m.deadline,
              },
            },
          });
        log(`${name(m.player_id)} offre ${m.amount}`);
        return;
      case "player_passed":
        if (room.lot)
          set({
            room: { ...room, lot: { ...room.lot, passed: [...room.lot.passed, m.player_id] } },
          });
        return;
      case "lot_won":
        if (room.lot)
          set({
            room: {
              ...room,
              lot: {
                ...room.lot,
                await_role: {
                  player_id: m.player_id,
                  amount: m.amount,
                  deadline: m.role_deadline ?? 0,
                },
              },
            },
          });
        return;
      case "lot_assigned": {
        const r = patchPlayer(room, m.player_id, (p) => ({
          ...p,
          budget: p.budget - m.amount,
          slots: { ...p.slots, [m.role]: m.character },
          complete: Object.values({ ...p.slots, [m.role]: m.character }).every(Boolean),
        }));
        set({ room: { ...r, lot: r.lot ? { ...r.lot, await_role: null } : null } });
        log(`${name(m.player_id)} prende ${m.character.nome} (${m.role}) per ${m.amount}`);
        return;
      }
      case "lot_skipped":
        log(`Nessuna offerta per ${m.character.nome}`);
        return;
      case "auction_finished":
        set({ room: { ...room, lot: null } });
        return;
      default:
    }
  },
}));
