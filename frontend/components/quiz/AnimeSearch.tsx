"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import it from "@/i18n/it.json";
import { api } from "@/lib/api";
import { caricaElenco, normalizza, type VoceAnime } from "@/lib/quiz";

// Campo di ricerca con suggerimenti: si scrive un titolo (anche in giapponese romanizzato o sigla)
// e si sceglie dall'elenco. Funziona con tastiera (frecce e Invio) e con il tocco.

export default function AnimeSearch({
  onScegli,
  esclusi,
  disabilitato,
  testId = "anime-ricerca",
}: {
  onScegli: (a: VoceAnime) => void;
  esclusi?: Set<number>;
  disabilitato?: boolean;
  testId?: string;
}) {
  const [elenco, setElenco] = useState<VoceAnime[]>([]);
  const [q, setQ] = useState("");
  const [aperto, setAperto] = useState(false);
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    caricaElenco(api)
      .then(setElenco)
      .catch(() => undefined);
  }, []);

  const risultati = useMemo(() => {
    const n = normalizza(q);
    if (n.length < 1) return [];
    const trovati = elenco.filter((a) => !esclusi?.has(a.id) && a.k.includes(n));
    // prima chi inizia con il testo, poi gli altri
    trovati.sort((x, y) => {
      const sx = x.k.startsWith(n) ? 0 : 1;
      const sy = y.k.startsWith(n) ? 0 : 1;
      return sx - sy;
    });
    return trovati.slice(0, 8);
  }, [q, elenco, esclusi]);

  const scegli = (a: VoceAnime) => {
    onScegli(a);
    setQ("");
    setAperto(false);
    setSel(0);
    ref.current?.focus();
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        role="combobox"
        aria-expanded={aperto && risultati.length > 0}
        aria-controls="anime-lista"
        aria-label={it.quiz.cerca}
        placeholder={it.quiz.cerca}
        autoComplete="off"
        disabled={disabilitato}
        className="field w-full text-lg"
        value={q}
        data-testid={testId}
        onChange={(e) => {
          setQ(e.target.value);
          setAperto(true);
          setSel(0);
        }}
        onFocus={() => setAperto(true)}
        onBlur={() => setTimeout(() => setAperto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSel((s) => Math.min(risultati.length - 1, s + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSel((s) => Math.max(0, s - 1));
          } else if (e.key === "Enter" && risultati[sel]) {
            e.preventDefault();
            scegli(risultati[sel]);
          } else if (e.key === "Escape") setAperto(false);
        }}
      />
      {aperto && risultati.length > 0 && (
        <ul
          id="anime-lista"
          role="listbox"
          className="panel absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto p-1"
        >
          {risultati.map((a, i) => (
            <li key={a.id} role="option" aria-selected={i === sel}>
              <button
                type="button"
                className={`flex w-full items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-left ${
                  i === sel ? "bg-white/15" : "hover:bg-white/10"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => scegli(a)}
                data-testid="anime-voce"
              >
                <span className="min-w-0">
                  <b className="block truncate">{a.nome}</b>
                  {a.alt && <span className="block truncate text-xs muted">{a.alt}</span>}
                </span>
                <span className="shrink-0 text-xs tabular-nums muted">{a.anno}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
