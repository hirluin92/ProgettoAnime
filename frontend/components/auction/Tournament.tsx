"use client";

import Link from "next/link";
import it from "@/i18n/it.json";
import type { RoomView, TournamentView } from "@/lib/messages";

export default function Tournament({ room, t }: { room: RoomView; t: TournamentView }) {
  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? "?";
  return (
    <section className="space-y-6" data-testid="tournament">
      <h2 className="text-2xl font-black">{it.stanza.classifica}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>#</th>
            <th>{it.stanza.giocatore}</th>
            <th>Pt</th>
            <th>V</th>
            <th>P</th>
            <th>S</th>
            <th>{it.stanza.totale}</th>
          </tr>
        </thead>
        <tbody>
          {t.classifica.map((r, i) => (
            <tr key={r.player_id} data-testid="standing" className="border-b">
              <td>{i + 1}</td>
              <td className="font-bold">{name(r.player_id)}</td>
              <td>{r.punti}</td>
              <td>{r.vittorie}</td>
              <td>{r.pareggi}</td>
              <td>{r.sconfitte}</td>
              <td>{r.totale}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {t.giornate.map((g, i) => (
        <div key={i}>
          <h3 className="font-black">
            {it.stanza.giornata} {i + 1}
          </h3>
          <ul className="grid gap-1">
            {g.map((m) => (
              <li key={m.match_id}>
                <Link
                  className="underline"
                  data-testid="match-link"
                  href={`/partita/${m.match_id}`}
                >
                  {name(m.a)} {m.total_a} – {m.total_b} {name(m.b)}
                  {m.winner
                    ? ` (${it.stanza.vince} ${name(m.winner)})`
                    : ` (${it.stanza.pareggio})`}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
