"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import CharacterCard, { rarity } from "@/components/battle/CharacterCard";
import it from "@/i18n/it.json";
import { ROLES, type RoomView } from "@/lib/messages";
import { useRoom } from "@/lib/store";
import type { RoomSocket } from "@/lib/ws";
import Countdown, { TimerRing } from "./Countdown";

export function maxOffer(budget: number, freeSlots: number): number {
  return Math.max(0, budget - (freeSlots - 1));
}

export default function AuctionView({
  room,
  me,
  socket,
}: {
  room: RoomView;
  me: string;
  socket: RoomSocket;
}) {
  const feed = useRoom((s) => s.feed);
  const error = useRoom((s) => s.error);
  const lot = room.lot;
  const mine = room.players.find((p) => p.id === me);
  const free = mine ? ROLES.filter((r) => !mine.slots[r]) : [];
  const awaiting = lot?.await_role ?? null;
  const myRoleTurn = !!awaiting && awaiting.player_id === me;
  const iPassed = !!lot && lot.passed.includes(me);
  const iLead = !!lot && lot.bidder_id === me;
  const canBid = !!lot && !awaiting && !!mine && free.length > 0 && !iPassed && !iLead;
  const limit = mine ? maxOffer(mine.budget, free.length) : 0;
  const bidder = room.players.find((p) => p.id === lot?.bidder_id);

  const bid = (amount: number) =>
    canBid && socket.send({ type: "bid", amount: Math.min(amount, limit) });
  const raise = (n: number) => bid((lot?.current_bid ?? 0) + n);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if (k === "1") raise(1);
      else if (k === "2") raise(2);
      else if (k === "5") raise(5);
      else if (k === "0") raise(10);
      else if (k === "m") bid(limit);
      else if (k === "p" && canBid) socket.send({ type: "pass" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const total = room.settings.timer;
  return (
    <section className="grid gap-6 pt-4 lg:grid-cols-[minmax(0,390px)_1fr]">
      <div className="space-y-3">
        {lot ? (
          <div className="panel relative overflow-hidden p-4 sm:p-5">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 -top-24 h-72 opacity-70"
              style={{
                background: `radial-gradient(ellipse at 50% 40%, ${rarity(lot.character.rating).glow}, transparent 65%)`,
              }}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <span className="eyebrow">{it.stanza.asta}</span>
                <div className="display text-3xl font-black leading-none" data-testid="lot-number">
                  {it.stanza.lotto} {lot.number}
                </div>
              </div>
              {!awaiting && (
                <TimerRing deadline={lot.deadline} total={total} label={it.stanza.tempo} />
              )}
            </div>
            <div className="relative mt-3 flex justify-center" data-testid="lot-card">
              <AnimatePresence mode="wait">
                <motion.div
                  key={lot.number}
                  initial={{ rotateY: 90, scale: 0.75, opacity: 0 }}
                  animate={{ rotateY: 0, scale: 1, opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 140, damping: 16 }}
                  style={{ perspective: 900 }}
                >
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-8 -z-10 rounded-full blur-2xl"
                    style={{ background: rarity(lot.character.rating).glow }}
                    initial={{ opacity: 0.9, scale: 0.6 }}
                    animate={{ opacity: [0.9, 0.45], scale: [0.6, 1.1] }}
                    transition={{ duration: 0.9 }}
                  />
                  <CharacterCard character={lot.character} />
                </motion.div>
              </AnimatePresence>
            </div>
            <motion.div
              key={lot.current_bid}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 14 }}
              className="relative mt-4 rounded-2xl border bg-black/40 py-2.5 text-center"
              style={bidder ? { boxShadow: `0 0 28px -6px ${bidder.color}` } : undefined}
            >
              <div className="text-[0.65rem] font-extrabold uppercase tracking-[0.25em] muted">
                {it.stanza.offertaAttuale}
              </div>
              <p className="display text-4xl font-black text-gold" data-testid="current-bid">
                {lot.current_bid > 0
                  ? `${lot.current_bid} · ${bidder?.name ?? ""}`
                  : it.stanza.nessunaOfferta}
              </p>
            </motion.div>
            <div className="relative mt-3 space-y-2">
              {awaiting ? (
                !myRoleTurn && (
                  <p data-testid="awaiting" className="text-center muted">
                    {room.players.find((p) => p.id === awaiting.player_id)?.name}{" "}
                    {it.stanza.scegliRuolo}
                  </p>
                )
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 5, 10].map((n) => (
                    <button
                      key={n}
                      disabled={!canBid || lot.current_bid + n > limit}
                      data-testid={`bid-${n}`}
                      className="btn btn-primary min-h-12 px-0 text-lg"
                      onClick={() => raise(n)}
                    >
                      +{n}
                    </button>
                  ))}
                  <button
                    disabled={!canBid || limit <= lot.current_bid}
                    data-testid="bid-max"
                    className="btn btn-gold col-span-2 min-h-12"
                    onClick={() => bid(limit)}
                  >
                    {it.stanza.tutto} ({limit})
                  </button>
                  <button
                    disabled={!canBid}
                    data-testid="pass"
                    className="btn col-span-2 min-h-12"
                    onClick={() => socket.send({ type: "pass" })}
                  >
                    {it.stanza.passa}
                  </button>
                </div>
              )}
              {myRoleTurn && (
                <div data-testid="role-picker" className="panel pulse-ring border-pink-500 p-3">
                  <p className="mb-2 font-bold">{it.stanza.scegliTuRuolo}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {free.map((r) => (
                      <button
                        key={r}
                        className="btn"
                        onClick={() => socket.send({ type: "assign_role", role: r })}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {awaiting && (
                    <p className="mt-2 text-sm">
                      <Countdown deadline={awaiting.deadline} />
                    </p>
                  )}
                </div>
              )}
              {error && (
                <p role="alert" className="text-sm text-rose-400">
                  {error}
                </p>
              )}
              <p className="text-center text-[0.7rem] muted">{it.stanza.scorciatoie}</p>
            </div>
          </div>
        ) : (
          <p>{it.stanza.inAttesa}</p>
        )}
      </div>
      <div className="min-w-0 space-y-4">
        <div className="panel p-4">
          <div className="mb-3 flex items-end justify-between">
            <h3 className="text-2xl font-extrabold">{it.stanza.laTuaSquadra}</h3>
            <p className="text-sm">
              {it.stanza.budget}:{" "}
              <b className="text-gold" data-testid="my-budget">
                {mine?.budget}
              </b>
            </p>
          </div>
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7"
            data-testid="my-team"
          >
            {ROLES.map((r) => {
              const c = mine?.slots[r];
              return (
                <div
                  key={r}
                  className={`rounded-xl border p-2 text-center text-xs transition ${
                    c
                      ? "border-transparent bg-gradient-to-b from-white/15 to-white/5"
                      : "border-dashed"
                  }`}
                >
                  <div className="display text-[0.7rem] font-extrabold tracking-wider muted">
                    {r}
                  </div>
                  <div className="min-h-8 pt-0.5 font-bold" data-testid={`slot-${r}`}>
                    {c?.nome ?? "+"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {room.players.map((p) => {
            const done = ROLES.filter((r) => p.slots[r]).length;
            const leading = lot?.bidder_id === p.id;
            return (
              <li
                key={p.id}
                className={`rounded-2xl border bg-white/[0.04] p-3 transition ${
                  leading ? "scale-[1.02] bg-white/10" : ""
                }`}
                style={
                  leading
                    ? { borderColor: p.color, boxShadow: `0 0 24px -6px ${p.color}` }
                    : undefined
                }
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3.5 rounded-full ring-2 ring-white/40"
                    style={{ background: p.color }}
                  />
                  <span className="font-bold">{p.name}</span>
                  {leading && <span className="chip text-gold">★</span>}
                  {lot?.passed.includes(p.id) && (
                    <span className="ml-auto text-xs opacity-60">{it.stanza.passato}</span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-1">
                  {ROLES.map((r) => (
                    <span
                      key={r}
                      className={`h-1.5 flex-1 rounded-full ${p.slots[r] ? "" : "bg-white/15"}`}
                      style={p.slots[r] ? { background: p.color } : undefined}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="muted">
                    {done}/7 · {it.stanza.budget} <b className="text-white">{p.budget}</b>
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400"
                    style={{ width: `${(p.budget / room.settings.budget) * 100}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <ol className="panel max-h-44 space-y-0.5 overflow-auto p-3 text-xs muted">
          {feed.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
