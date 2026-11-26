"use client";

import { useState } from "react";
import it from "@/i18n/it.json";
import { BOSSES } from "@/lib/raid";
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
  const [copied, setCopied] = useState(false);
  const upd = (patch: Partial<RoomSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    socket.send({ type: "update_settings", settings: next });
  };
  const num = (v: string, d: number) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);
  return (
    <section className="space-y-5 pt-6">
      <div className="panel reveal relative overflow-hidden p-6 text-center sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 h-48 w-[26rem] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl"
        />
        <span className="eyebrow relative">{it.stanza.lobby}</span>
        <h2 className="relative mt-2">
          <span
            data-testid="room-code"
            className="display text-grad text-7xl font-black tracking-[0.18em] sm:text-8xl"
          >
            {room.code}
          </span>
        </h2>
        <p className="relative mt-1 text-sm muted">{it.stanza.condividi}</p>
        <button
          className="btn relative mt-4"
          onClick={() => {
            void navigator.clipboard?.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? it.stanza.copiato : it.stanza.copiaLink}
        </button>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={it.stanza.giocatori}>
        {room.players.map((p, i) => (
          <li
            key={p.id}
            data-testid="player"
            className="panel reveal flex items-center gap-3 p-3.5"
            style={{ ["--i" as string]: i }}
          >
            <span
              className="grid size-11 shrink-0 place-items-center rounded-full text-lg font-black text-black/70 ring-2 ring-white/50"
              style={{ background: p.color }}
            >
              {p.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-bold">{p.name}</span>
              <span className="block text-xs muted">
                {p.id === room.host_id && <>👑 {it.stanza.host} </>}
                {!p.connected && <>({it.stanza.assente})</>}
              </span>
            </span>
          </li>
        ))}
        {room.players.length < 4 &&
          Array.from({ length: 4 - room.players.length }, (_, i) => (
            <li
              key={`vuoto-${i}`}
              aria-hidden="true"
              className="flex items-center gap-3 rounded-[1.4rem] border border-dashed p-3.5 text-sm text-white/35"
            >
              <span className="grid size-11 place-items-center rounded-full border border-dashed text-xl">
                +
              </span>
              {it.stanza.postoLibero}
            </li>
          ))}
      </ul>
      {isHost ? (
        <div className="panel grid gap-3 p-5 sm:grid-cols-3">
          <h3 className="text-2xl font-extrabold sm:col-span-3">{it.stanza.regole}</h3>
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.budget}
            <input
              aria-label={it.stanza.budget}
              className="field"
              type="number"
              value={s.budget}
              onChange={(e) => upd({ budget: num(e.target.value, 50) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.timer}
            <input
              aria-label={it.stanza.timer}
              className="field"
              type="number"
              value={s.timer}
              onChange={(e) => upd({ timer: num(e.target.value, 10) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.timerRuolo}
            <input
              aria-label={it.stanza.timerRuolo}
              className="field"
              type="number"
              value={s.role_timeout}
              onChange={(e) => upd({ role_timeout: num(e.target.value, 8) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.timerPiano}
            <input
              aria-label={it.stanza.timerPiano}
              className="field"
              type="number"
              min={0}
              max={180}
              value={s.plan_timeout}
              onChange={(e) => upd({ plan_timeout: num(e.target.value, 45) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.modalita}
            <select
              aria-label={it.stanza.modalita}
              className="field"
              value={s.modalita}
              onChange={(e) => upd({ modalita: e.target.value as RoomSettings["modalita"] })}
            >
              <option value="asta">{it.stanza.modAsta}</option>
              <option value="specchio">{it.stanza.modSpecchio}</option>
              <option value="raid">{it.raid.modRaid}</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.formato}
            <select
              aria-label={it.stanza.formato}
              className="field"
              value={s.formato}
              onChange={(e) => upd({ formato: e.target.value as RoomSettings["formato"] })}
            >
              <option value="girone">{it.stanza.fmtGirone}</option>
              <option value="eliminazione">{it.stanza.fmtElim}</option>
            </select>
          </label>
          {s.modalita === "raid" && (
            <>
              <label className="grid gap-1 text-sm font-bold">
                {it.raid.boss}
                <select
                  aria-label={it.raid.boss}
                  className="field"
                  value={s.boss}
                  onChange={(e) => upd({ boss: e.target.value })}
                >
                  {BOSSES.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-bold">
                {it.raid.difficoltaTitolo}
                <select
                  aria-label={it.raid.difficoltaTitolo}
                  className="field"
                  value={s.difficolta}
                  onChange={(e) =>
                    upd({ difficolta: e.target.value as RoomSettings["difficolta"] })
                  }
                >
                  {(["normale", "difficile", "epico"] as const).map((d) => (
                    <option key={d} value={d}>
                      {it.raid.difficolta[d]}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {s.modalita !== "asta" && (
            <label className="grid gap-1 text-sm font-bold">
              {it.stanza.tempoScelta}
              <input
                aria-label={it.stanza.tempoScelta}
                className="field"
                type="number"
                min={5}
                max={120}
                value={s.pick_timeout}
                onChange={(e) => upd({ pick_timeout: num(e.target.value, 20) })}
              />
            </label>
          )}
          <label className="grid gap-1 text-sm font-bold">
            {it.stanza.ban}
            <input
              aria-label={it.stanza.ban}
              className="field"
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
            className="btn btn-primary text-lg sm:col-span-3"
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
