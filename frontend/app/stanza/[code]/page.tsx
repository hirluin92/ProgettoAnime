"use client";

import Caricamento from "@/components/Caricamento";
import QuizRoomView from "@/components/quiz/QuizRoomView";
import { use, useEffect, useMemo, useRef, useState } from "react";
import AuctionView from "@/components/auction/AuctionView";
import BanView from "@/components/auction/BanView";
import DuelliView from "@/components/auction/DuelliView";
import Lobby from "@/components/auction/Lobby";
import PlanView from "@/components/auction/PlanView";
import RaidResultView from "@/components/auction/RaidResultView";
import SpecchioView from "@/components/auction/SpecchioView";
import Tournament from "@/components/auction/Tournament";
import it from "@/i18n/it.json";
import { useRoom } from "@/lib/store";
import { clearToken, getToken, RoomSocket } from "@/lib/ws";

export default function StanzaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = use(params);
  const code = raw.toUpperCase();
  const { room, me, tournament, status, error, errorCode } = useRoom();
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  // ogni pressione di «Entra» crea una connessione nuova con il nome scritto in quel momento
  const [tentativo, setTentativo] = useState(0);
  const socketRef = useRef<RoomSocket | null>(null);

  const socket = useMemo(
    () => new RoomSocket(code, () => ({ type: "join", name, token: getToken(code) })),
    // il nome serve solo al primo ingresso
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, started, tentativo],
  );
  socketRef.current = socket;

  useEffect(() => {
    useRoom.getState().reset();
    if (getToken(code)) setStarted(true);
  }, [code]);

  useEffect(() => {
    if (!started) return;
    socket.connect();
    return () => socket.close();
  }, [socket, started]);

  useEffect(() => {
    if (errorCode === "bad_token") {
      clearToken(code);
      setStarted(false);
      useRoom.getState().clearError();
    }
  }, [errorCode, code]);

  // errore all'ingresso (nome già usato, stanza piena, partita iniziata): si smette di riprovare
  // con lo stesso nome e si torna al modulo, così se ne può scegliere un altro
  useEffect(() => {
    if (
      !room &&
      started &&
      errorCode &&
      errorCode !== "room_not_found" &&
      errorCode !== "bad_token"
    )
      setStarted(false);
  }, [room, started, errorCode]);

  useEffect(() => {
    if (!error || !room) return;
    const t = setTimeout(() => useRoom.getState().clearError(), 5000);
    return () => clearTimeout(t);
  }, [error, room]);

  if (errorCode === "room_not_found")
    return (
      <main className="mx-auto max-w-xl p-6 pt-14" role="alert">
        <div className="vuoto">
          <span className="onoma text-5xl">?!</span>
          <p className="font-bold text-carta">{it.errori.stanzaScaduta}</p>
        </div>
      </main>
    );

  if (!started || (!room && errorCode && errorCode !== "room_not_found"))
    return (
      <main className="mx-auto max-w-md px-5 pt-14">
        <div className="panel-vivo reveal space-y-4 p-6 sm:p-8">
          <div className="space-y-1">
            <span className="eyebrow">{it.stanza.lobby}</span>
            <h1 className="text-4xl leading-none">
              {it.stanza.entra} <span className="num not-italic text-[var(--accent)]">{code}</span>
            </h1>
          </div>
          <input
            aria-label={it.home.tuoNome}
            placeholder={it.home.tuoNome}
            className="field w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && (
            <p
              role="alert"
              className="border-2 border-rose-400 bg-rose-400/10 p-2 text-sm font-bold text-rose-300"
            >
              {error}
            </p>
          )}
          <button
            className="btn btn-primary min-h-14 w-full text-xl"
            disabled={!name.trim()}
            onClick={() => {
              useRoom.getState().clearError();
              setTentativo((t) => t + 1);
              setStarted(true);
            }}
          >
            {it.stanza.entra}
          </button>
        </div>
      </main>
    );

  if (!room || !me) return <Caricamento />;

  return (
    <main className="mx-auto max-w-7xl p-4">
      {status === "closed" && (
        <p
          role="status"
          className="mb-3 border-2 border-black bg-[#ffd21f] p-2 text-center text-sm font-bold text-black shadow-[3px_3px_0_#000]"
        >
          {it.stanza.riconnessione}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mb-3 border-2 border-rose-400 bg-[#2a1210] p-2 text-center text-sm font-bold text-rose-300 shadow-[3px_3px_0_#000]"
        >
          {error}
        </p>
      )}
      {room.phase === "lobby" && <Lobby room={room} me={me} socket={socket} />}
      {room.phase === "ban" && <BanView room={room} me={me} socket={socket} />}
      {room.phase === "auction" && <AuctionView room={room} me={me} socket={socket} />}
      {room.phase === "draft" && <SpecchioView room={room} me={me} socket={socket} />}
      {room.phase === "raid_result" && <RaidResultView room={room} />}
      {room.phase === "plan" && <PlanView room={room} me={me} socket={socket} />}
      {room.phase === "duelli" && <DuelliView room={room} socket={socket} />}
      {room.phase === "quiz" && room.quiz && <QuizRoomView room={room} me={me} socket={socket} />}
      {room.phase === "tournament" &&
        (tournament ? <Tournament room={room} t={tournament} /> : <p>{it.stanza.inAttesa}</p>)}
    </main>
  );
}
