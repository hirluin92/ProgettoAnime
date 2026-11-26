"use client";

import it from "@/i18n/it.json";
import { iconaTattica, nomeTattica } from "@/lib/battle/tattiche";
import type { FaseOut } from "@/lib/draft";

function Barra({ pct, lato }: { pct: number; lato: "A" | "B" }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
      <div
        className={`h-full rounded-full ${lato === "A" ? "bg-emerald-400" : "bg-red-400"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Come è andata una fase: confronto delle tattiche, vita delle squadre, momenti chiave. */
export default function FaseReport({ r, n }: { r: FaseOut; n: number }) {
  const i = n - 1;
  return (
    <section
      className="space-y-3 rounded-2xl border bg-white/[0.04] p-4"
      data-testid={`fase-report-${n}`}
    >
      <h4 className="text-lg font-extrabold">
        {it.tattiche.fasiRisultato.replace("{n}", String(n))}
      </h4>
      <p className="text-sm">
        {it.tattiche.tue}: {iconaTattica(r.tue[i])} {nomeTattica(r.tue[i])} · {it.tattiche.cpu}:{" "}
        {iconaTattica(r.cpu[i])} {nomeTattica(r.cpu[i])} — <b>{r.confronti[i]}</b>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["A", "B"] as const).map((l) => (
          <div key={l} className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span>{l === "A" ? it.tattiche.tue : it.tattiche.cpu}</span>
              <span>{r.percento[l]}%</span>
            </div>
            <Barra pct={r.percento[l]} lato={l} />
            <ul className="grid grid-cols-1 gap-0.5 text-xs">
              {r.membri[l].map((m) => (
                <li key={m.nome} className={m.vivo ? "" : "text-white/40 line-through"}>
                  {m.nome} · {m.hp_pct}%
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {r.righe.length > 0 && n === r.fase && (
        <div>
          <h5 className="eyebrow">{it.tattiche.momenti}</h5>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
            {r.righe.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
