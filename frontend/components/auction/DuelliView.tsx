"use client";

import { useEffect, useRef, useState } from "react";
import ChatDuelloVoti from "@/components/ChatDuelloVoti";
import DuelloBoard, { fmt } from "@/components/duello/DuelloBoard";
import it from "@/i18n/it.json";
import type { DuelloAggiornamento, RoomView } from "@/lib/messages";
import { useRoom } from "@/lib/store";
import type { RoomSocket } from "@/lib/ws";
import type { StatoView } from "@/lib/types/server";

/** La fase «duelli» del torneo: il tuo duello a turni e lo stato degli altri. */
export default function DuelliView({ room, socket }: { room: RoomView; socket: RoomSocket }) {
  const duello = useRoom((s) => s.duello);
  const offset = useRoom((s) => s.offset);
  const nome = (id: string | null) => room.players.find((p) => p.id === id)?.name ?? "?";
  const [vista, setVista] = useState<StatoView | null>(null);
  const [caption, setCaption] = useState<string | null>(null);
  const [animando, setAnimando] = useState(false);
  const [resto, setResto] = useState(0);
  const ultimo = useRef<DuelloAggiornamento | null>(null);

  // nuovo messaggio: rivela le carte una alla volta, poi mostra la plancia aggiornata
  useEffect(() => {
    if (!duello || duello === ultimo.current) return;
    ultimo.current = duello;
    let vivo = true;
    const rivela = duello.eventi.filter((e) => e.t === "rivela" && e.carta_view);
    if (rivela.length === 0) {
      // anche se una rivelazione precedente è stata interrotta: la plancia torna giocabile
      setVista(duello.vista);
      setCaption(null);
      setAnimando(false);
      return;
    }
    setAnimando(true);
    (async () => {
      for (const e of rivela) {
        if (!vivo) return;
        const c = e.carta_view as { nome: string; mossa: string; testo_mossa: string };
        setCaption(
          fmt(e.lato === 0 ? it.duello.rivelaTu : it.duello.rivela, {
            chi: nome(duello.avversario),
            carta: c.nome,
            n: (e.corsia as number) + 1,
          }) + (c.mossa !== "-" ? ` — ${c.testo_mossa}` : ""),
        );
        await new Promise((r) => setTimeout(r, 700));
      }
      if (!vivo) return;
      setCaption(null);
      setVista(duello.vista);
      setAnimando(false);
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duello]);

  useEffect(() => {
    const t = setInterval(() => {
      if (duello) setResto(Math.max(0, Math.ceil(duello.scadenza - (Date.now() / 1000 + offset))));
    }, 500);
    return () => clearInterval(t);
  }, [duello, offset]);

  const finito = !!vista?.finita;
  const mio = duello && vista;
  return (
    <section className="space-y-4 pt-4" data-testid="duelli">
      <header className="space-y-1">
        <span className="eyebrow">{it.stanza.duelliTitolo}</span>
        {room.duelli && (
          <h2 className="display text-3xl font-black">
            {fmt(it.stanza.giornataN, { n: room.duelli.giornata })}
          </h2>
        )}
      </header>

      {mio ? (
        <>
          <p className="text-sm muted">
            {fmt(it.stanza.scontroContro, { nome: nome(duello.avversario) })}
          </p>
          <DuelloBoard
            stato={vista}
            avversario={nome(duello.avversario)}
            occupato={animando || duello.inviate || finito}
            caption={caption}
            onConferma={(mosse) => socket.send({ type: "duello_mosse", mosse })}
            attesa={
              !finito && (
                <p className="text-center text-sm font-bold" data-testid="duello-stato">
                  {duello.inviate
                    ? fmt(it.duello.inAttesaAvv, { nome: nome(duello.avversario) })
                    : duello.avversario_pronto
                      ? fmt(it.duello.avvPronto, { nome: nome(duello.avversario) })
                      : ""}{" "}
                  <span className="muted">{fmt(it.duello.tempo, { s: resto })}</span>
                </p>
              )
            }
          />
          {finito && <p className="text-center font-bold">{it.stanza.aspettoAltri}</p>}
        </>
      ) : (
        <p className="panel p-4 text-center">{it.stanza.aspettoAltri}</p>
      )}

      {room.chat_duello && <ChatDuelloVoti voto={room.chat_duello} />}

      {room.duelli && (
        <div className="panel space-y-2 p-4">
          <h3 className="eyebrow">{it.stanza.altriDuelli}</h3>
          <ul className="space-y-1 text-sm">
            {room.duelli.duelli.map((d) => (
              <li key={d.a + (d.b ?? "")} className="flex justify-between gap-3">
                <span>
                  {nome(d.a)} {d.b ? `– ${nome(d.b)}` : `(${it.stanza.riposo})`}
                </span>
                <span className="muted">
                  {d.b
                    ? `${d.corsie_vinte[0]}–${d.corsie_vinte[1]} · ${d.finito ? "fine" : `T${d.turno}`}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
