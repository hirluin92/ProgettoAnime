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
      className="rounded-xl border p-3"
    >
      <h2 className="font-black">
        {it.sfida.classifica} · {day}
      </h2>
      <ol className="mt-1 text-sm">
        {board.map((r, i) => (
          <li key={r.match_id} className="flex justify-between">
            <span>
              {i + 1}. {r.name}
            </span>
            <span className="font-bold">{r.score}</span>
          </li>
        ))}
        {board.length === 0 && <li className="opacity-70">{it.sfida.vuota}</li>}
      </ol>
    </section>
  );

  if (!started)
    return (
      <main className="mx-auto max-w-md space-y-3 p-6">
        <h1 className="text-3xl font-black">{it.sfida.titolo}</h1>
        <p className="text-sm opacity-80">{it.sfida.descrizione}</p>
        <input
          aria-label={it.home.tuoNome}
          placeholder={it.home.tuoNome}
          maxLength={24}
          className="min-h-11 w-full rounded border px-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          className="min-h-11 w-full rounded-xl bg-rose-600 font-bold text-white disabled:opacity-40"
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
          <p data-testid="daily-result" className="font-black">
            {it.sfida.punteggio}: {result.score} · {it.sfida.posizione} {result.rank}
          </p>
        )
      }
    />
  );
}
