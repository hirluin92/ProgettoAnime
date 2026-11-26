"use client";

import { useCallback, useEffect, useState } from "react";
import QuickGame, { type Played } from "@/components/QuickGame";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import type { DraftOptions, PickIn } from "@/lib/draft";
import { getProfileId, useProfile } from "@/lib/profile";

interface Row {
  name: string;
  score: number;
  match_id: string;
}
interface Daily {
  day: string;
  draft: DraftOptions;
  leaderboard: Row[];
}
interface Result {
  play: Played;
  score: number;
  rank: number;
}

export default function Sfida() {
  const { profile } = useProfile();
  const [name, setName] = useState("");
  const [started, setStarted] = useState(false);
  const [board, setBoard] = useState<Row[]>([]);
  const [day, setDay] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (profile) setName((n) => n || profile.name);
  }, [profile]);

  const refresh = useCallback(async () => {
    const d = await api<Daily>("/api/daily");
    setBoard(d.leaderboard);
    setDay(d.day);
    return d;
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const load = useCallback(async () => (await refresh()).draft, [refresh]);
  const play = useCallback(
    async (
      _: DraftOptions,
      picks: PickIn[],
      swap: string[] | null,
      tattiche: string[],
      carica: string,
      formazione: string,
    ) => {
      const r = await api<Result>("/api/daily/play", {
        method: "POST",
        body: JSON.stringify({
          name,
          picks,
          swap,
          tattiche,
          carica,
          formazione,
          profile_id: getProfileId(),
        }),
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
