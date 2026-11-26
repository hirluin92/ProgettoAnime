"use client";

import it from "@/i18n/it.json";
import { BONUS, FASI, MALUS, TATTICA_INFO, TATTICHE, type Tattica } from "@/lib/battle/tattiche";

export default function TacticsPlanner({
  value,
  onChange,
}: {
  value: (Tattica | null)[];
  onChange: (fase: number, t: Tattica) => void;
}) {
  return (
    <div className="space-y-3" data-testid="tactics">
      <div>
        <h3 className="text-2xl font-extrabold">{it.tattiche.titolo}</h3>
        <p className="text-sm muted">{it.tattiche.descrizione}</p>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {TATTICHE.map((t) => (
            <span key={t}>
              <b>
                {TATTICA_INFO[t].icona} {TATTICA_INFO[t].nome}
              </b>{" "}
              <span className="muted">
                {it.tattiche.batte} {TATTICA_INFO[TATTICA_INFO[t].batte].nome}
              </span>
            </span>
          ))}
        </p>
        <p className="mt-1 text-xs muted">
          {it.tattiche.effetto.replace("{bonus}", String(BONUS)).replace("{malus}", String(MALUS))}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: FASI }, (_, f) => (
          <fieldset key={f} className="rounded-2xl border bg-white/[0.03] p-3">
            <legend className="px-1 text-xs font-extrabold uppercase tracking-widest text-cyan-200">
              {it.battle.fase} {f + 1} · {it.tattiche.turni[f]}
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {TATTICHE.map((t) => {
                const on = value[f] === t;
                return (
                  <button
                    key={t}
                    type="button"
                    data-testid={`tactic-${f}-${t}`}
                    aria-pressed={on}
                    onClick={() => onChange(f, t)}
                    className={`grid justify-items-center gap-0.5 rounded-xl border px-1 py-2 text-xs font-extrabold transition ${
                      on
                        ? "border-cyan-300 bg-cyan-300/20 text-cyan-50 shadow-[0_0_18px_rgb(53_224_255/0.4)]"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xl">{TATTICA_INFO[t].icona}</span>
                    {TATTICA_INFO[t].nome}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}
