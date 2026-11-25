"use client";

import { useEffect, useState } from "react";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import type { RoomView } from "@/lib/messages";
import { useRoom } from "@/lib/store";
import type { RoomSocket } from "@/lib/ws";
import Countdown from "./Countdown";

interface Char {
  id: string;
  nome: string;
  anime: string;
  rating: number;
}

export default function BanView({
  room,
  me,
  socket,
}: {
  room: RoomView;
  me: string;
  socket: RoomSocket;
}) {
  const [chars, setChars] = useState<Char[]>([]);
  const [q, setQ] = useState("");
  const error = useRoom((s) => s.error);
  useEffect(() => {
    api<Char[]>("/api/characters")
      .then(setChars)
      .catch(() => setChars([]));
  }, []);

  const mine = room.bans[me];
  const taken = new Set(Object.values(room.bans).flatMap((l) => l.map((c) => c.id)));
  const left = mine ? room.settings.bans_per_player - mine.length : 0;
  const shown = chars.filter((c) => c.nome.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? "?";

  return (
    <section className="space-y-4" data-testid="ban-phase">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">{it.stanza.fasBan}</h2>
        {room.ban_deadline && <Countdown deadline={room.ban_deadline} />}
      </div>
      <p className="text-sm muted">{it.stanza.banDescrizione}</p>
      <p>
        {it.stanza.banRimasti}: <b data-testid="bans-left">{left}</b>
      </p>
      {mine && (
        <>
          <input
            aria-label={it.stanza.cerca}
            placeholder={it.stanza.cerca}
            className="field w-full"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((c) => (
              <li key={c.id}>
                <button
                  data-testid="ban-option"
                  disabled={left <= 0 || taken.has(c.id)}
                  className="btn w-full justify-start px-3 text-left text-sm"
                  onClick={() => socket.send({ type: "ban", character_id: c.id })}
                >
                  {c.nome} <span className="opacity-60">· {c.rating}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {error && (
        <p role="alert" className="text-rose-400">
          {error}
        </p>
      )}
      <div>
        <h3 className="text-xl font-bold">{it.stanza.bannati}</h3>
        <ul className="text-sm" data-testid="ban-list">
          {Object.entries(room.bans).flatMap(([pid, list]) =>
            list.map((c) => (
              <li key={c.id}>
                {name(pid)}: {c.nome}
              </li>
            )),
          )}
        </ul>
      </div>
    </section>
  );
}
