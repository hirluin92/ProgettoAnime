"use client";

import { use, useEffect, useMemo, useState } from "react";
import BattleScene from "@/components/battle/BattleScene";
import CharacterCard from "@/components/battle/CharacterCard";
import ChatDuelloVoti from "@/components/ChatDuelloVoti";
import ChatPlanVotes from "@/components/ChatPlanVotes";
import Countdown from "@/components/auction/Countdown";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { ROLES } from "@/lib/messages";
import { useRoom } from "@/lib/store";
import type { MatchResult } from "@/lib/types/match";
import { RoomSocket } from "@/lib/ws";

// Pagina per OBS: sfondo trasparente, 1920×1080, nessun controllo cliccabile.
export default function Overlay({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = use(params);
  const code = raw.toUpperCase();
  const { room, tournament } = useRoom();
  const [index, setIndex] = useState(0);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const socket = useMemo(() => new RoomSocket(code, () => ({ type: "spectate" })), [code]);

  useEffect(() => {
    document.body.classList.add("overlay-mode");
    document.body.style.background = "transparent";
    document.documentElement.style.background = "transparent";
    useRoom.getState().reset();
    socket.connect();
    return () => socket.close();
  }, [socket]);

  const matches = useMemo(() => (tournament ? tournament.giornate.flat() : []), [tournament]);
  const current = matches[index];
  useEffect(() => {
    setMatch(null);
    if (!current) return;
    api<MatchResult>(`/api/matches/${current.match_id}`)
      .then(setMatch)
      .catch(() => setIndex((i) => i + 1));
  }, [current]);

  const lot = room?.lot ?? null;
  const bidder = room?.players.find((p) => p.id === lot?.bidder_id);

  return (
    <main
      data-testid="overlay"
      className="relative overflow-hidden text-white"
      style={{ width: 1920, height: 1080, background: "transparent" }}
    >
      {room?.phase === "auction" && lot && (
        <div className="absolute left-10 top-10 flex items-center gap-6 border-[3px] border-[#f3ecdd] bg-[#0e0d10] p-6 shadow-[8px_8px_0_#e0301f]">
          <CharacterCard character={lot.character} />
          <div>
            <div className="text-2xl font-bold opacity-80">
              {it.stanza.lotto} {lot.number}
            </div>
            {!lot.await_role && <Countdown deadline={lot.deadline} />}
            <div className="num mt-2 text-5xl text-[#ffd21f]" data-testid="overlay-bid">
              {lot.current_bid > 0
                ? `${lot.current_bid} · ${bidder?.name}`
                : it.stanza.nessunaOfferta}
            </div>
            <div className="mt-2 text-xl opacity-80">{it.overlay.votaInChat}</div>
          </div>
        </div>
      )}
      {room?.phase === "duelli" && room.chat_duello && (
        <div className="absolute left-10 top-10 w-[900px] border-[3px] border-[#f3ecdd] bg-[#0e0d10] p-6 shadow-[8px_8px_0_#e0301f]">
          <ChatDuelloVoti voto={room.chat_duello} compact />
        </div>
      )}
      {room?.phase === "plan" && (
        <div className="absolute left-10 top-10 w-[760px] border-[3px] border-[#f3ecdd] bg-[#0e0d10] p-6 shadow-[8px_8px_0_#e0301f]">
          <ChatPlanVotes voti={room.chat_plan ?? {}} compact />
        </div>
      )}
      {room && room.phase !== "lobby" && !match && (
        <div className="absolute bottom-6 left-6 right-6 grid grid-cols-4 gap-3">
          {room.players.map((p) => (
            <div
              key={p.id}
              className="border-2 border-[#f3ecdd] bg-[#0e0d10] p-3 shadow-[4px_4px_0_#000]"
              data-testid="overlay-team"
            >
              <div className="font-black" style={{ color: p.color }}>
                {p.name} · {p.budget}
              </div>
              <ul className="text-sm">
                {ROLES.map((r) => (
                  <li key={r} className="flex justify-between">
                    <span className="opacity-70">{r}</span>
                    <span>{p.slots[r]?.nome ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {room?.phase === "lobby" && (
        <div className="absolute left-10 top-10 border-[3px] border-[#f3ecdd] bg-[#0e0d10] p-6 shadow-[8px_8px_0_#e0301f] text-4xl font-black">
          {it.overlay.inAttesa} {code}
        </div>
      )}
      {match && (
        <div className="absolute inset-x-40 top-10">
          <BattleScene
            key={current.match_id}
            result={match}
            autoplay
            hideChrome
            onDone={() => setTimeout(() => setIndex((i) => i + 1), 4000)}
          />
        </div>
      )}
    </main>
  );
}
