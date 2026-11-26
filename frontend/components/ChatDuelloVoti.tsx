"use client";

import it from "@/i18n/it.json";
import type { RoomView } from "@/lib/messages";

/** Opzioni e voti della chat sulle mosse del suo duello (stanze streamer). */
export default function ChatDuelloVoti({
  voto,
  compact,
}: {
  voto: NonNullable<RoomView["chat_duello"]>;
  compact?: boolean;
}) {
  const totale = voto.opzioni.reduce((t, o) => t + o.voti, 0) || 1;
  return (
    <section className={compact ? "space-y-2" : "panel space-y-2 p-4"} data-testid="chat-duello">
      <h3 className={compact ? "text-2xl font-black" : "text-lg font-extrabold"}>
        {it.stanza.chatVota} · {it.stanza.chatTurno.replace("{n}", String(voto.turno))}
      </h3>
      <ul className="space-y-1.5">
        {voto.opzioni.map((o) => (
          <li key={o.id} className="space-y-0.5">
            <div className={`flex justify-between gap-3 ${compact ? "text-lg" : "text-sm"}`}>
              <span>
                <b className="uppercase">!{o.id}</b> {o.testo}
              </span>
              <b>{o.voti}</b>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{ width: `${(100 * o.voti) / totale}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
