"use client";

import it from "@/i18n/it.json";
import { FORMAZIONI, SIGLE } from "@/lib/battle/formazioni";

export default function FormationPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset className="rounded-2xl border bg-black/20 p-3" data-testid="formations">
      <legend className="px-1 text-xs font-extrabold uppercase tracking-widest text-cyan-200">
        {it.formazione.titolo}
      </legend>
      <p className="mb-2 text-xs muted">{it.formazione.descrizione}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {FORMAZIONI.map((f) => (
          <button
            key={f.id}
            type="button"
            data-testid={`formation-${f.id}`}
            aria-pressed={value === f.id}
            onClick={() => onChange(f.id)}
            className={`rounded-xl border p-2 text-left transition ${
              value === f.id
                ? "border-carta bg-white/10 shadow-[4px_4px_0_var(--rosso)]"
                : "border-white/15 bg-white/5 hover:bg-white/10"
            }`}
          >
            <b className="text-sm">{f.nome}</b>
            <div className="mt-1.5 grid grid-cols-3 gap-1 text-[0.6rem]">
              {[0, 1, 2].map((riga) => (
                <div key={riga} className="grid content-start gap-0.5">
                  <span className="text-center font-extrabold uppercase opacity-60">
                    {it.formazione.file[riga]}
                  </span>
                  {f.fila.map((x, i) =>
                    x === riga ? (
                      <span
                        key={i}
                        className="rounded bg-white/15 px-1 py-px text-center font-bold"
                      >
                        {SIGLE[i]}
                      </span>
                    ) : null,
                  )}
                </div>
              ))}
            </div>
            <span className="mt-1.5 block text-[0.65rem] muted">{f.descrizione}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
