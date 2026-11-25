"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import AuctionView from "@/components/auction/AuctionView";
import Lobby from "@/components/auction/Lobby";
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
  const socketRef = useRef<RoomSocket | null>(null);

  const socket = useMemo(
    () => new RoomSocket(code, () => ({ type: "join", name, token: getToken(code) })),
    // il nome serve solo al primo ingresso
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, started],
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

  if (errorCode === "room_not_found")
    return (
      <main className="mx-auto max-w-xl p-6" role="alert">
        {it.errori.stanzaScaduta}
      </main>
    );

  if (!started || (!room && errorCode && errorCode !== "room_not_found"))
    return (
      <main className="mx-auto max-w-md space-y-3 p-6">
        <h1 className="text-2xl font-black">
          {it.stanza.entra} {code}
        </h1>
        <input
          aria-label={it.home.tuoNome}
          placeholder={it.home.tuoNome}
          className="min-h-11 w-full rounded border px-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-rose-600">
            {error}
          </p>
        )}
        <button
          className="min-h-11 w-full rounded-xl bg-stone-900 font-bold text-amber-50"
          disabled={!name.trim()}
          onClick={() => {
            useRoom.getState().clearError();
            setStarted(true);
          }}
        >
          {it.stanza.entra}
        </button>
      </main>
    );

  if (!room || !me) return <main className="p-6">{it.stanza.connessione}</main>;

  return (
    <main className="mx-auto max-w-6xl p-4">
      {status === "closed" && (
        <p role="status" className="mb-2 rounded bg-amber-200 p-2 text-sm text-stone-900">
          {it.stanza.riconnessione}
        </p>
      )}
      {room.phase === "lobby" && <Lobby room={room} me={me} socket={socket} />}
      {room.phase === "auction" && <AuctionView room={room} me={me} socket={socket} />}
      {room.phase === "tournament" &&
        (tournament ? <Tournament room={room} t={tournament} /> : <p>{it.stanza.inAttesa}</p>)}
    </main>
  );
}
