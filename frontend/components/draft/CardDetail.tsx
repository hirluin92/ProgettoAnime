"use client";

import Icon from "@/components/Icon";
import { useEffect } from "react";
import CharacterCard from "@/components/battle/CharacterCard";
import it from "@/i18n/it.json";
import { paletteFor } from "@/lib/animePalette";
import { MOSSE_EFFETTO, PASSIVA_EFFETTO } from "@/lib/battle/effetti";
import { ARCH_NOMI } from "@/lib/battle/labels";
import { GRUPPI_NOMI, TRATTI_NOMI } from "@/lib/battle/tratti";
import { bestRoles, type Option } from "@/lib/draft";
import { AffinityChip } from "./Affinity";

export function CardDetail({ o, cost, bare }: { o: Option | null; cost?: number; bare?: boolean }) {
  const c = o?.character;
  return (
    <div
      className={`grid gap-3 text-sm ${bare ? "" : "panel min-h-[7.5rem] p-4 sm:grid-cols-[1fr_1fr_auto]"}`}
      aria-live="polite"
      data-testid="card-detail"
    >
      {!c || !o ? (
        <p className="muted sm:col-span-3">
          <span className="[@media(hover:none)]:hidden">{it.veloce.passaSopra}</span>
          <span className="hidden [@media(hover:none)]:inline">{it.veloce.passaSopraTocco}</span>
        </p>
      ) : (
        <>
          <div className="min-w-0">
            <div className="display truncate text-2xl font-black leading-none">
              {c.nome}
              {c.forma && <span className="ml-2 text-base text-amber-200">· {c.forma}</span>}
            </div>
            <div className="mt-1 text-xs muted">
              {ARCH_NOMI[c.arch ?? ""] ?? c.arch} · {paletteFor(c.anime).label}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(c.tags ?? []).map((t) => (
                <span key={t} className="chip">
                  {TRATTI_NOMI[t] ?? t}
                </span>
              ))}
              {(c.gruppi ?? []).map((g) => (
                <span key={g} className="chip text-cyan-200">
                  {GRUPPI_NOMI[g] ?? g}
                </span>
              ))}
            </div>
          </div>
          <div className="min-w-0 space-y-1.5">
            {c.mossa && (
              <p>
                <b className="text-amber-200">
                  <Icon name="bolt" /> {c.mossa.nome}
                </b>
                {c.mossa.effetto && (
                  <span className="muted">
                    {" "}
                    — {MOSSE_EFFETTO[c.mossa.effetto] ?? c.mossa.effetto}
                  </span>
                )}
              </p>
            )}
            {c.passiva && (
              <p>
                <b className="text-cyan-200">
                  <Icon name="diamond" className="size-[0.8em]" /> {c.passiva.nome}
                </b>
                {c.passiva.effetto && (
                  <span className="muted">
                    {" "}
                    — {PASSIVA_EFFETTO[c.passiva.effetto] ?? c.passiva.effetto}
                  </span>
                )}
              </p>
            )}
            <p className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="muted">{it.draft.rendeDipiu}</span>
              {bestRoles(o.affinita, 3).map(([r, a]) => (
                <span key={r} className="inline-flex items-center gap-1">
                  <b>{r}</b>
                  <AffinityChip aff={a} />
                </span>
              ))}
            </p>
          </div>
          <div className="text-right">
            <div className="display text-4xl font-black text-gold">{c.rating}</div>
            <div className="text-xs muted">
              {it.veloce.costo} {cost ?? o.cost}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function DetailSheet({
  o,
  canPick,
  onClose,
  onPick,
}: {
  o: Option;
  canPick: boolean;
  onClose: () => void;
  onPick: () => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={o.character.nome}
      className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center"
      onClick={onClose}
    >
      <div
        className="panel reveal grid max-h-[92vh] w-full max-w-2xl gap-4 overflow-auto p-4 sm:grid-cols-[220px_1fr] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-[200px] sm:w-[220px]">
          <CharacterCard character={o.character} fluid />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <CardDetail o={o} bare />
          <div className="mt-auto flex gap-2">
            <button className="btn flex-1" onClick={onClose}>
              {it.veloce.chiudi}
            </button>
            <button className="btn btn-primary flex-1" disabled={!canPick} onClick={onPick}>
              {it.draft.scegliQuesta} ({o.cost})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
