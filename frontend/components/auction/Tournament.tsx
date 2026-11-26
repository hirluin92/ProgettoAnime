"use client";

import Link from "next/link";
import MissionCard from "@/components/MissionCard";
import it from "@/i18n/it.json";
import { ROLES, type RoomView, type TournamentView } from "@/lib/messages";

const MEDAL = ["🥇", "🥈", "🥉"];
// Ordine visivo del podio: secondo, primo, terzo.
const ORDER = [1, 0, 2];
const HEIGHT = ["h-36", "h-28", "h-20"];

function nomeTurno(i: number, tot: number): string {
  const manca = tot - 1 - i;
  if (manca === 0) return it.tabellone.finale;
  if (manca === 1) return it.tabellone.semifinali;
  if (manca === 2) return it.tabellone.quarti;
  return `${it.tabellone.turno} ${i + 1}`;
}

export default function Tournament({ room, t }: { room: RoomView; t: TournamentView }) {
  const player = (id: string) => room.players.find((p) => p.id === id);
  const name = (id: string) => player(id)?.name ?? "?";
  const top = t.classifica.slice(0, 3);
  return (
    <section className="space-y-10 pt-6" data-testid="tournament">
      <div className="space-y-1 text-center">
        <span className="eyebrow">{it.stanza.torneo}</span>
        <h2 className="text-5xl font-black leading-none sm:text-6xl">{it.stanza.classifica}</h2>
      </div>

      {top.length >= 2 && (
        <div className="mx-auto flex max-w-xl items-end justify-center gap-3" aria-hidden="true">
          {ORDER.filter((i) => top[i]).map((i) => {
            const r = top[i];
            const p = player(r.player_id);
            return (
              <div
                key={r.player_id}
                className="reveal flex flex-1 flex-col items-center"
                style={{ ["--i" as string]: i }}
              >
                <div className="text-3xl">{MEDAL[i]}</div>
                <div
                  className="grid size-14 place-items-center rounded-full text-2xl font-black text-black/70 ring-2 ring-white/60"
                  style={{ background: p?.color, boxShadow: `0 0 30px -4px ${p?.color}` }}
                >
                  {name(r.player_id).slice(0, 1).toUpperCase()}
                </div>
                <div className="mt-1 max-w-full truncate font-extrabold">{name(r.player_id)}</div>
                <div className="text-xs muted">{r.punti} pt</div>
                <div
                  className={`mt-2 w-full rounded-t-2xl border border-b-0 bg-gradient-to-b from-white/20 to-white/[0.03] ${HEIGHT[i]}`}
                  style={
                    i === 0 ? { boxShadow: "0 -10px 40px -10px rgb(255 212 90 / 0.55)" } : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      {t.formato === "eliminazione" && (
        <section className="space-y-3" data-testid="tabellone">
          <h3 className="eyebrow">{it.tabellone.titolo}</h3>
          {t.campione && (
            <p className="display text-grad text-center text-4xl font-black" data-testid="campione">
              🏆 {it.tabellone.campione}: {name(t.campione)}
            </p>
          )}
          <div className="flex gap-4 overflow-x-auto pb-2">
            {t.giornate.map((round, i) => (
              <div key={i} className="grid min-w-[15rem] flex-1 content-around gap-3">
                <div className="text-center text-xs font-extrabold uppercase tracking-widest text-cyan-200">
                  {nomeTurno(i, t.giornate.length)}
                </div>
                {round.map((m, k) => (
                  <div
                    key={`${m.a}-${m.b}-${k}`}
                    className="panel overflow-hidden text-sm"
                    data-testid="bracket-match"
                  >
                    {[m.a, m.b].map((pid, side) => (
                      <div
                        key={side}
                        className={`flex items-center gap-2 px-3 py-2 ${
                          pid && m.winner === pid ? "bg-white/10 font-extrabold" : "opacity-60"
                        } ${side === 0 ? "border-b" : ""}`}
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: player(pid)?.color ?? "transparent" }}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {pid ? name(pid) : it.tabellone.bye}
                        </span>
                        {!m.bye && (
                          <span className="display tabular-nums">
                            {side === 0 ? m.total_a : m.total_b}
                          </span>
                        )}
                      </div>
                    ))}
                    {m.match_id && (
                      <Link
                        href={`/partita/${m.match_id}`}
                        className="block border-t px-3 py-1 text-center text-[0.65rem] font-bold uppercase tracking-widest text-cyan-200 hover:bg-white/5"
                      >
                        {it.stanza.guardaScontro} →
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest muted">
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
              <tr key={r.player_id} data-testid="standing" className="border-t">
                <td className="display text-lg font-black text-gold">{i + 1}</td>
                <td className="font-bold">
                  <span
                    className="mr-2 inline-block size-3 rounded-full align-middle"
                    style={{ background: player(r.player_id)?.color }}
                  />
                  {name(r.player_id)}
                </td>
                <td className="font-extrabold">{r.punti}</td>
                <td>{r.vittorie}</td>
                <td>{r.pareggi}</td>
                <td>{r.sconfitte}</td>
                <td>{r.totale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-6">
        {t.formato !== "eliminazione" &&
          t.giornate.map((g, i) => (
            <div key={i} className="space-y-2">
              <h3 className="eyebrow">
                {it.stanza.giornata} {i + 1}
              </h3>
              <ul className="grid gap-3 md:grid-cols-2">
                {g.map((m) => (
                  <li key={m.match_id}>
                    <Link
                      className="panel panel-hover block p-4"
                      data-testid="match-link"
                      href={`/partita/${m.match_id}`}
                    >
                      <span className="sr-only">
                        {name(m.a)} {m.total_a} – {m.total_b} {name(m.b)}
                        {m.winner
                          ? ` (${it.stanza.vince} ${name(m.winner)})`
                          : ` (${it.stanza.pareggio})`}
                      </span>
                      <span className="flex items-center justify-between gap-3" aria-hidden="true">
                        <Side p={player(m.a)} total={m.total_a} win={m.winner === m.a} />
                        <span className="display text-xl font-black muted">VS</span>
                        <Side p={player(m.b)} total={m.total_b} win={m.winner === m.b} right />
                      </span>
                      <span
                        className="mt-3 block text-center text-xs font-bold uppercase tracking-widest text-cyan-200"
                        aria-hidden="true"
                      >
                        {it.stanza.guardaScontro} →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>

      {t.missioni.length > 0 && (
        <section className="space-y-2" data-testid="missioni">
          <h3 className="eyebrow">{it.missione.svelata}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {t.missioni.map((m) => (
              <div key={m.player_id} className="space-y-1">
                <p className="text-sm font-bold">{name(m.player_id)}</p>
                <MissionCard nome={m.nome} descrizione={m.descrizione} esito={m.riuscita} />
              </div>
            ))}
          </div>
        </section>
      )}

      <details className="panel p-4">
        <summary className="cursor-pointer text-lg font-extrabold">{it.stanza.squadre}</summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {room.players.map((p) => (
            <div key={p.id} className="rounded-2xl border bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <span className="size-3 rounded-full" style={{ background: p.color }} />
                {p.name}
              </div>
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {ROLES.map((r) => (
                  <li key={r} className="flex justify-between gap-2">
                    <span className="muted">{r}</span>
                    <span className="truncate font-bold">{p.slots[r]?.nome ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}

function Side({
  p,
  total,
  win,
  right,
}: {
  p?: { name: string; color: string };
  total: number;
  win: boolean;
  right?: boolean;
}) {
  return (
    <span
      className={`flex min-w-0 flex-1 flex-col ${right ? "items-end text-right" : "items-start"}`}
    >
      <span className="flex max-w-full items-center gap-2">
        {!right && (
          <span className="size-3 shrink-0 rounded-full" style={{ background: p?.color }} />
        )}
        <span className={`truncate font-extrabold ${win ? "text-gold" : ""}`}>
          {win ? "★ " : ""}
          {p?.name ?? "?"}
        </span>
        {right && (
          <span className="size-3 shrink-0 rounded-full" style={{ background: p?.color }} />
        )}
      </span>
      <span className="display text-3xl font-black tabular-nums">{total}</span>
    </span>
  );
}
