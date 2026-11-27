"use client";

import Icon from "@/components/Icon";
import { useState } from "react";
import ArenaBanner from "@/components/ArenaBanner";
import ChatPlanVotes from "@/components/ChatPlanVotes";
import MissionCard from "@/components/MissionCard";
import TacticsPlanner, { type Carica } from "@/components/draft/TacticsPlanner";
import it from "@/i18n/it.json";
import type { Tattica } from "@/lib/battle/tattiche";
import { FASI } from "@/lib/battle/tattiche";
import type { RoomView } from "@/lib/messages";
import { useRoom } from "@/lib/store";
import type { RoomSocket } from "@/lib/ws";
import { useSecondsLeft } from "./Countdown";

export default function PlanView({
  room,
  me,
  socket,
}: {
  room: RoomView;
  me: string;
  socket: RoomSocket;
}) {
  const mission = useRoom((s) => s.mission);
  const [piano, setPiano] = useState<(Tattica | null)[]>(Array(FASI).fill(null));
  const [carica, setCarica] = useState<Carica>("subito");
  const [formazione, setFormazione] = useState("classica");
  const left = useSecondsLeft(room.plan_deadline);
  const mine = room.players.find((p) => p.id === me);
  const humans = room.players.filter((p) => !p.is_chat && p.complete);
  const send = () =>
    socket.send({
      type: "plan",
      tattiche: piano.every((t) => t !== null) ? (piano as string[]) : null,
      carica,
      formazione,
    });
  return (
    <section className="space-y-5 pt-6" data-testid="plan-view">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <span className="eyebrow">{room.arena?.nome}</span>
          <h2 className="text-5xl font-black leading-none">{it.piano.titolo}</h2>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest muted">{it.piano.tempo}</div>
          <div className="display text-4xl font-black tabular-nums text-cyan-100">
            {Math.ceil(left)}s
          </div>
        </div>
      </div>
      {room.arena && <ArenaBanner {...room.arena} />}
      {room.settings.modalita === "raid" && <p className="text-sm muted">{it.raid.pianoGruppo}</p>}
      {mission && <MissionCard nome={mission.nome} descrizione={mission.descrizione} />}
      {room.streamer_channel && <ChatPlanVotes voti={room.chat_plan ?? {}} />}
      <div className="panel space-y-4 p-4">
        <TacticsPlanner
          value={piano}
          onChange={(f, t) => setPiano((p) => p.map((x, i) => (i === f ? t : x)))}
          carica={carica}
          onCarica={setCarica}
          formazione={formazione}
          onFormazione={setFormazione}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="btn btn-primary flex-1 text-lg"
            data-testid="plan-ready"
            onClick={send}
          >
            {mine?.ready ? it.piano.modifica : it.piano.pronto}
          </button>
        </div>
        {mine?.ready && <p className="text-sm text-emerald-200">{it.piano.consegnato}</p>}
      </div>
      <ul className="flex flex-wrap gap-2" aria-label={it.piano.giocatori}>
        {humans.map((p) => (
          <li key={p.id} className="chip">
            <span className="size-2.5 rounded-full" style={{ background: p.color }} />
            {p.name} <Icon name={p.ready ? "check" : "dots"} />
          </li>
        ))}
      </ul>
    </section>
  );
}
