"use client";

import { useCallback, useEffect, useState } from "react";
import QuickGame, { type Options, type Played } from "@/components/QuickGame";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";

interface Row {
  name: string;
  score: number;
  match_id: string;
}
interface Daily {
  day: string;
  options: Options;
  leaderboard: Row[];
}
interface Result {
  play: Played;
  score: number;
  rank: number;
}

export default function Sfida() {
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [board, setBoard] = useState<Row[]>([]);
  const [day, setDay] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const refresh = useCallback(async () => {
    const d = await api<Daily>("/api/daily");
    setBoard(d.leaderboard);
    setDay(d.day);
    return d;
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const load = useCallback(async () => (await refresh()).options, [refresh]);
  const play = useCallback(
    async (_: Options, ids: string[]) => {
      const r = await api<Result>("/api/daily/play", {
        method: "POST",
        body: JSON.stringify({ name, picks: ids }),
      });
      setResult(r);
      void refresh();
      return r.play;
    },
    [name, refresh],
  );

  const leaderboard = (
    <section
      aria-label={it.sfida.classifica}
      data-testid="daily-board"
      className="panel p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-extrabold">{it.sfida.classifica}</h2>
        <span className="chip">{day}</span>
      </div>
      <ol className="mt-3 grid gap-1.5 text-sm">
        {board.map((r, i) => (
          <li
            key={r.match_id}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
              i === 0 ? "border-amber-300/50 bg-amber-300/10" : "bg-white/[0.03]"
            }`}
          >
            <span className="display w-7 text-xl font-black text-gold">
              {["🥇", "🥈", "🥉"][i] ?? `${i + 1}.`}
            </span>
            <span className="min-w-0 flex-1 truncate font-bold">{r.name}</span>
            <span className="display text-xl font-black tabular-nums">{r.score}</span>
          </li>
        ))}
        {board.length === 0 && <li className="opacity-70">{it.sfida.vuota}</li>}
      </ol>
    </section>
  );

  if (!started)
    return (
      <main className="mx-auto max-w-md space-y-4 px-5 pt-10">
        <span className="eyebrow">{it.sfida.eyebrow}</span>
        <h1 className="text-5xl font-black leading-none sm:text-6xl">{it.sfida.titolo}</h1>
        <p className="text-sm muted">{it.sfida.descrizione}</p>
        <input
          aria-label={it.home.tuoNome}
          placeholder={it.home.tuoNome}
          maxLength={24}
          className="field w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="btn btn-primary w-full"
          disabled={!name.trim()}
          onClick={() => setStarted(true)}
        >
          {it.sfida.gioca}
        </button>
        {leaderboard}
      </main>
    );

  return (
    <QuickGame
      title={it.sfida.titolo}
      load={load}
      play={play}
      header={leaderboard}
      after={
        result && (
          <p data-testid="daily-result" className="chip text-lg text-gold">
            {it.sfida.punteggio}: {result.score} · {it.sfida.posizione} {result.rank}
          </p>
        )
      }
    />
  );
}
