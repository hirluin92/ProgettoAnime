"use client";

import { useState } from "react";
import ArenaBanner from "@/components/ArenaBanner";
import CharacterCard from "@/components/battle/CharacterCard";
import MissionCard from "@/components/MissionCard";
import { AffinityChip, AffinityLegend } from "@/components/draft/Affinity";
import it from "@/i18n/it.json";
import { potenza, toneOf } from "@/lib/draft";
import { ROLES, type RoomView } from "@/lib/messages";
import { useRoom } from "@/lib/store";
import type { RoomSocket } from "@/lib/ws";
import { TimerRing } from "./Countdown";
import { TONE_CLASS } from "@/components/draft/Affinity";

export default function SpecchioView({
  room,
  me,
  socket,
}: {
  room: RoomView;
  me: string;
  socket: RoomSocket;
}) {
  const d = room.draft;
  const mission = useRoom((s) => s.mission);
  const [sel, setSel] = useState<string | null>(null);
  const mine = room.players.find((p) => p.id === me);
  const other = room.players.find((p) => !p.is_chat && p.id !== me);
  if (!d || !mine) return <p className="p-6">{it.stanza.inAttesa}</p>;
  const myTurn = d.turn_player_id === me;
  const turnName = room.players.find((p) => p.id === d.turn_player_id)?.name ?? "";
  const card = d.hand.find((c) => c.character.id === sel);
  const place = (role: string) => {
    if (!card || !myTurn || mine.slots[role]) return;
    socket.send({ type: "pick", character_id: card.character.id, role });
    setSel(null);
  };
  return (
    <section className="space-y-5 pt-6" data-testid="specchio">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="eyebrow">
            {it.specchio.giro} {d.round + 1}/{d.rounds}
          </span>
          <h2 className="text-5xl font-black leading-none">{it.specchio.titolo}</h2>
          <p className="text-sm muted">{it.specchio.descrizione}</p>
        </div>
        <div className="flex items-center gap-3">
          <div
            data-testid={myTurn ? "specchio-turn-me" : "specchio-turn-other"}
            className={`rounded-2xl border px-4 py-2 text-lg font-extrabold ${
              myTurn
                ? "border-cyan-300 bg-cyan-300/15 text-cyan-50 shadow-[0_0_24px_rgb(53_224_255/0.4)]"
                : "bg-white/[0.04]"
            }`}
          >
            {myTurn ? it.specchio.tuoTurno : it.specchio.turnoDi.replace("{nome}", turnName)}
          </div>
          <TimerRing
            key={`${d.round}-${d.turn_player_id}`}
            deadline={d.deadline}
            total={room.settings.pick_timeout}
            label={it.specchio.tempo}
          />
        </div>
      </div>
      {room.arena && <ArenaBanner {...room.arena} />}
      {mission && <MissionCard nome={mission.nome} descrizione={mission.descrizione} />}

      <ul className="grid grid-cols-2 justify-items-center gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {d.hand.map((c) => {
          const taken = c.taken_by !== null;
          const owner = room.players.find((p) => p.id === c.taken_by)?.name;
          const on = sel === c.character.id;
          return (
            <li key={c.character.id} className="relative w-full min-w-0">
              <button
                data-testid="spec-card"
                disabled={taken || !myTurn}
                aria-pressed={on}
                onClick={() => setSel(c.character.id)}
                aria-label={c.character.nome}
                className={`relative grid w-full grid-cols-[minmax(0,1fr)] justify-items-center gap-2 rounded-2xl p-1 transition duration-150 hover:z-20 hover:-translate-y-2 disabled:hover:translate-y-0 ${
                  taken ? "opacity-30" : !myTurn ? "opacity-70" : ""
                } ${on ? "z-20 -translate-y-3 scale-105 ring-2 ring-cyan-300" : ""}`}
              >
                <CharacterCard character={c.character} fluid />
                {taken && owner && (
                  <span className="chip text-gold">
                    {it.specchio.scelta.replace("{nome}", owner)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <section className="panel space-y-3 p-4" data-testid="spec-team">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-2xl font-extrabold">{it.stanza.laTuaSquadra}</h3>
          {myTurn && card && (
            <p className="text-sm text-cyan-100">
              {it.specchio.scegliSlot.replace("{nome}", card.character.nome)}
            </p>
          )}
        </div>
        <AffinityLegend />
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {ROLES.map((role) => {
            const c = mine.slots[role];
            const aff = card?.affinita[role];
            const placing = !c && !!card && myTurn;
            return (
              <li key={role} className="min-w-0">
                <button
                  type="button"
                  data-testid={c ? "spec-slot-filled" : "spec-slot-free"}
                  disabled={!placing}
                  onClick={() => place(role)}
                  className={`grid h-full w-full grid-cols-[minmax(0,1fr)] justify-items-center gap-1.5 rounded-2xl border p-2 text-center transition ${
                    placing && aff !== undefined
                      ? `${TONE_CLASS[toneOf(aff)]} hover:-translate-y-1`
                      : c
                        ? "border-transparent"
                        : "border-dashed border-white/20"
                  }`}
                >
                  <span className="display text-sm font-extrabold tracking-wider">{role}</span>
                  {c ? (
                    <div className="w-full max-w-[200px]">
                      <CharacterCard
                        character={c}
                        role={role}
                        power={potenza(c.rating, mine.slot_aff[role] ?? 0)}
                        fluid
                      />
                    </div>
                  ) : (
                    <div className="grid aspect-[3/4.2] w-full max-w-[200px] place-items-center rounded-xl">
                      {placing && aff !== undefined && card ? (
                        <div className="space-y-1">
                          <AffinityChip aff={aff} big />
                          <div className="display text-3xl font-black">
                            {potenza(card.character.rating, aff)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-white/35">{it.veloce.vuoto}</span>
                      )}
                    </div>
                  )}
                  {c && <AffinityChip aff={mine.slot_aff[role] ?? 0} />}
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {other && (
        <details className="panel p-4">
          <summary className="cursor-pointer text-lg font-extrabold">
            {it.specchio.avversario.replace("{nome}", other.name)}
          </summary>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            {ROLES.map((r) => (
              <li key={r} className="flex justify-between gap-2">
                <span className="muted">{r}</span>
                <span className="truncate font-bold">{other.slots[r]?.nome ?? "—"}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
