"use client";

import { useState } from "react";
import it from "@/i18n/it.json";
import type { RoomSettings, RoomView } from "@/lib/messages";
import type { RoomSocket } from "@/lib/ws";

export default function Lobby({
  room,
  me,
  socket,
}: {
  room: RoomView;
  me: string;
  socket: RoomSocket;
}) {
  const isHost = room.host_id === me;
  const [s, setS] = useState<RoomSettings>(room.settings);
  const upd = (patch: Partial<RoomSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    socket.send({ type: "update_settings", settings: next });
  };
  const num = (v: string, d: number) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-black">
        {it.stanza.lobby}{" "}
        <span
          data-testid="room-code"
          className="rounded bg-stone-200 px-2 font-mono dark:bg-stone-800"
        >
          {room.code}
        </span>
      </h2>
      <p className="text-sm opacity-70">{it.stanza.condividi}</p>
      <ul className="grid gap-2 sm:grid-cols-2" aria-label={it.stanza.giocatori}>
        {room.players.map((p) => (
          <li
            key={p.id}
            data-testid="player"
            className="flex items-center gap-2 rounded-xl border p-3"
          >
            <span className="h-4 w-4 rounded-full" style={{ background: p.color }} />
            <span className="font-bold">{p.name}</span>
            {p.id === room.host_id && <span className="text-xs">👑 {it.stanza.host}</span>}
            {!p.connected && <span className="text-xs opacity-60">({it.stanza.assente})</span>}
          </li>
        ))}
      </ul>
      {isHost ? (
        <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.budget}
            <input
              aria-label={it.stanza.budget}
              className="min-h-11 rounded border px-2"
              type="number"
              value={s.budget}
              onChange={(e) => upd({ budget: num(e.target.value, 50) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.timer}
            <input
              aria-label={it.stanza.timer}
              className="min-h-11 rounded border px-2"
              type="number"
              value={s.timer}
              onChange={(e) => upd({ timer: num(e.target.value, 10) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.timerRuolo}
            <input
              aria-label={it.stanza.timerRuolo}
              className="min-h-11 rounded border px-2"
              type="number"
              value={s.role_timeout}
              onChange={(e) => upd({ role_timeout: num(e.target.value, 8) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.ban}
            <input
              aria-label={it.stanza.ban}
              className="min-h-11 rounded border px-2"
              type="number"
              min={0}
              max={3}
              value={s.bans_per_player}
              onChange={(e) =>
                upd({ bans_per_player: Math.min(3, Math.max(0, num(e.target.value, 0))) })
              }
            />
          </label>
          <button
            className="min-h-11 rounded-xl bg-stone-900 px-5 font-bold text-amber-50 sm:col-span-3"
            onClick={() => socket.send({ type: "start" })}
          >
            {it.stanza.avvia}
          </button>
        </div>
      ) : (
        <p>{it.stanza.attendiHost}</p>
      )}
    </section>
  );
}
