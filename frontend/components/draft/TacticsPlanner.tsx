"use client";

import Icon from "@/components/Icon";
import FormationPicker from "@/components/draft/FormationPicker";
import it from "@/i18n/it.json";
import { BONUS, FASI, MALUS, TATTICA_INFO, TATTICHE, type Tattica } from "@/lib/battle/tattiche";

export type Carica = "subito" | "carica";

export interface FasiLive {
  giocate: number; // fasi già giocate in anteprima (0-2)
  busy: boolean;
  onGioca: (n: number) => void; // gioca le prime n fasi
}

export default function TacticsPlanner({
  live,
  value,
  onChange,
  carica,
  onCarica,
  formazione,
  onFormazione,
}: {
  live?: FasiLive;
  value: (Tattica | null)[];
  onChange: (fase: number, t: Tattica) => void;
  carica: Carica;
  onCarica: (c: Carica) => void;
  formazione?: string;
  onFormazione?: (id: string) => void;
}) {
  return (
    <div className="space-y-3" data-testid="tactics">
      <div>
        <h3 className="text-3xl">{it.tattiche.titolo}</h3>
        <p className="text-sm muted">{it.tattiche.descrizione}</p>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {TATTICHE.map((t) => (
            <span key={t}>
              <b>
                <Icon name={TATTICA_INFO[t].icona} /> {TATTICA_INFO[t].nome}
              </b>{" "}
              <span className="muted">
                {it.tattiche.batte} {TATTICA_INFO[TATTICA_INFO[t].batte].nome}
              </span>
            </span>
          ))}
        </p>
        {live && <p className="mt-1 text-xs text-cyan-100">{it.tattiche.fasiLive}</p>}
        <p className="mt-1 text-xs muted">
          {it.tattiche.effetto.replace("{bonus}", String(BONUS)).replace("{malus}", String(MALUS))}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: FASI }, (_, f) => (
          <fieldset
            key={f}
            disabled={!!live && (f > live.giocate || f < live.giocate)}
            className={`rounded-2xl border bg-black/20 p-3 ${
              live && f > live.giocate ? "opacity-50" : ""
            }`}
          >
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
                        ? "border-carta bg-white/10 shadow-[4px_4px_0_var(--rosso)]"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <Icon name={TATTICA_INFO[t].icona} className="size-6" />
                    {TATTICA_INFO[t].nome}
                  </button>
                );
              })}
            </div>
            {live && f === live.giocate && f < FASI - 1 && (
              <button
                type="button"
                className="btn btn-primary mt-2 w-full text-sm"
                disabled={!value[f] || live.busy}
                onClick={() => live.onGioca(f + 1)}
                data-testid={`gioca-fase-${f + 1}`}
              >
                {it.tattiche.giocaFase.replace("{n}", String(f + 1))}
              </button>
            )}
            {live && f > live.giocate && (
              <p className="mt-2 text-xs muted">{it.tattiche.faseBloccata}</p>
            )}
          </fieldset>
        ))}
      </div>
      <fieldset
        disabled={!!live && live.giocate > 0}
        className="rounded-2xl border bg-black/20 p-3 disabled:opacity-60"
      >
        <legend className="px-1 text-xs font-extrabold uppercase tracking-widest text-cyan-200">
          {it.tattiche.carica.titolo}
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["subito", "carica"] as const).map((c) => (
            <button
              key={c}
              type="button"
              data-testid={`carica-${c}`}
              aria-pressed={carica === c}
              onClick={() => onCarica(c)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                carica === c
                  ? "border-carta bg-white/10 shadow-[4px_4px_0_var(--rosso)]"
                  : "border-white/15 bg-white/5 hover:bg-white/10"
              }`}
            >
              <b>{c === "subito" ? it.tattiche.carica.subito : it.tattiche.carica.trattieni}</b>
              <span className="block text-xs muted">
                {c === "subito" ? it.tattiche.carica.subitoDesc : it.tattiche.carica.trattieniDesc}
              </span>
            </button>
          ))}
        </div>
      </fieldset>
      {formazione !== undefined && onFormazione && (
        <fieldset disabled={!!live && live.giocate > 0} className="disabled:opacity-60">
          <FormationPicker value={formazione} onChange={onFormazione} />
        </fieldset>
      )}
    </div>
  );
}
