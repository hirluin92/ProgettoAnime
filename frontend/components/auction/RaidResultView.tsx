"use client";

import { useEffect, useState } from "react";
import ArenaBanner from "@/components/ArenaBanner";
import BattleScene from "@/components/battle/BattleScene";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import type { RoomView } from "@/lib/messages";
import type { MatchResult } from "@/lib/types/match";

export default function RaidResultView({ room }: { room: RoomView }) {
  const raid = room.raid;
  const [result, setResult] = useState<MatchResult | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!raid) return;
    api<MatchResult>(`/api/matches/${raid.match_id}`)
      .then(setResult)
      .catch(() => undefined);
  }, [raid]);
  if (!raid) return <p className="p-6">{it.stanza.inAttesa}</p>;
  return (
    <section className="space-y-5 pt-6" data-testid="raid-result">
      <div className="space-y-1">
        <span className="eyebrow">
          {it.raid.titolo} ·{" "}
          {it.raid.difficolta[raid.difficolta as keyof typeof it.raid.difficolta]}
        </span>
        <h2 className="text-5xl font-black leading-none">{raid.boss_nome}</h2>
        <p className="text-sm muted">{raid.boss_descrizione}</p>
      </div>
      {room.arena && <ArenaBanner {...room.arena} />}
      {result && <BattleScene result={result} autoplay onDone={() => setDone(true)} />}
      {done && (
        <div
          data-testid={raid.vinto ? "raid-vittoria" : "raid-sconfitta"}
          className={`panel space-y-2 p-6 text-center ${
            raid.vinto ? "border-emerald-300/50" : "border-rose-400/50"
          }`}
        >
          <div className="display text-grad text-6xl font-black leading-none">
            {raid.vinto ? it.raid.vittoria : it.raid.sconfitta}
          </div>
          <p className="muted">{raid.vinto ? it.raid.vittoriaTesto : it.raid.sconfittaTesto}</p>
        </div>
      )}
      <ul className="flex flex-wrap gap-1.5 text-xs">
        {raid.boss.map((m, i) => (
          <li key={m.id} className={`chip ${i === 0 ? "text-gold" : ""}`}>
            {i === 0 ? "👑 " : ""}
            {m.nome} · {m.rating}
          </li>
        ))}
      </ul>
    </section>
  );
}
