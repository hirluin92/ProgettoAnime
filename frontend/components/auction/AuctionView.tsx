"use client";

import { useEffect } from "react";
import CharacterCard from "@/components/battle/CharacterCard";
import it from "@/i18n/it.json";
import { ROLES, type RoomView } from "@/lib/messages";
import { useRoom } from "@/lib/store";
import type { RoomSocket } from "@/lib/ws";
import Countdown from "./Countdown";

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

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
      <div className="space-y-3">
        {lot ? (
          <>
            <div className="flex items-center justify-between">
              <span className="chip text-sm" data-testid="lot-number">
                {it.stanza.lotto} {lot.number}
              </span>
              {!awaiting && <Countdown deadline={lot.deadline} label={it.stanza.tempo} />}
            </div>
            <div className="flex justify-center" data-testid="lot-card">
              <CharacterCard character={lot.character} />
            </div>
            <p
              className="panel display py-2 text-center text-3xl font-bold text-gold"
              data-testid="current-bid"
            >
              {lot.current_bid > 0
                ? `${lot.current_bid} · ${bidder?.name ?? ""}`
                : it.stanza.nessunaOfferta}
            </p>
            {awaiting ? (
              <p data-testid="awaiting">
                {room.players.find((p) => p.id === awaiting.player_id)?.name}{" "}
                {it.stanza.scegliRuolo}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 5, 10].map((n) => (
                  <button
                    key={n}
                    disabled={!canBid || lot.current_bid + n > limit}
                    data-testid={`bid-${n}`}
                    className="btn btn-primary min-h-12 px-0"
                    onClick={() => raise(n)}
                  >
                    +{n}
                  </button>
                ))}
                <button
                  disabled={!canBid || limit <= lot.current_bid}
                  data-testid="bid-max"
                  className="btn col-span-2 min-h-12"
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
            <p className="text-xs muted">{it.stanza.scorciatoie}</p>
          </>
        ) : (
          <p>{it.stanza.inAttesa}</p>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 text-xl font-bold">{it.stanza.laTuaSquadra}</h3>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" data-testid="my-team">
            {ROLES.map((r) => (
              <div key={r} className="panel p-2 text-center text-xs">
                <div className="display font-bold tracking-wider muted">{r}</div>
                <div className="min-h-8 font-bold" data-testid={`slot-${r}`}>
                  {mine?.slots[r]?.nome ?? "+"}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-1 text-sm">
            {it.stanza.budget}: <b data-testid="my-budget">{mine?.budget}</b>
          </p>
        </div>
        <ul className="grid gap-1 text-sm">
          {room.players.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 rounded-full ring-2 ring-white/40"
                style={{ background: p.color }}
              />
              <span className="font-bold">{p.name}</span>
              <span>
                {it.stanza.budget} {p.budget}
              </span>
              <span>{Object.values(p.slots).filter(Boolean).length}/7</span>
              {lot?.passed.includes(p.id) && (
                <span className="opacity-60">{it.stanza.passato}</span>
              )}
            </li>
          ))}
        </ul>
        <ol className="panel max-h-40 overflow-auto p-3 text-xs muted">
          {feed.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
