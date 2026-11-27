"use client";

import Icon from "@/components/Icon";
import CharacterCard from "@/components/battle/CharacterCard";
import it from "@/i18n/it.json";
import { potenza, toneOf, type Option, type Placed } from "@/lib/draft";
import { AffinityChip, TONE_CLASS } from "./Affinity";

export type SlotMode = "place" | "swap" | "idle";

export default function SlotBoard({
  roles,
  byRole,
  selected,
  mode,
  swapFirst,
  onSlot,
  compatta,
}: {
  roles: string[];
  byRole: Record<string, Placed | undefined>;
  selected: Option | null;
  mode: SlotMode;
  swapFirst: string | null;
  onSlot: (role: string) => void;
  compatta?: boolean; // accanto alla mano: tre colonne di caselle piccole
}) {
  return (
    <ol
      className={`grid grid-cols-2 gap-3 ${compatta ? "sm:grid-cols-3" : "sm:grid-cols-4"}`}
      data-testid="slots"
    >
      {roles.map((role) => {
        const p = byRole[role];
        const placing = mode === "place" && !p && !!selected;
        const swapping = mode === "swap";
        const clickable = placing || swapping;
        const aff = p ? p.option.affinita[role] : selected?.affinita[role];
        return (
          <li key={role} className="min-w-0">
            <button
              type="button"
              disabled={!clickable}
              data-testid={p ? "slot-filled" : "slot-free"}
              aria-label={`${role}${p ? `: ${p.option.character.nome}` : ""}`}
              onClick={() => onSlot(role)}
              className={`grid h-full w-full grid-cols-[minmax(0,1fr)] justify-items-center gap-1.5 rounded-2xl border p-2 text-center transition ${
                swapFirst === role
                  ? "border-cyan-300 bg-cyan-300/15 shadow-[0_0_24px_rgb(53_224_255/0.4)]"
                  : placing && selected
                    ? `${TONE_CLASS[toneOf(selected.affinita[role])]} hover:-translate-y-1 hover:brightness-125`
                    : p
                      ? "border-transparent"
                      : "border-dashed border-white/20"
              } ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className="display text-sm font-extrabold tracking-wider">{role}</span>
              {p ? (
                <div className="w-full max-w-[230px]">
                  <CharacterCard
                    character={p.option.character}
                    role={role}
                    power={potenza(p.option.character.rating, p.option.affinita[role])}
                    fluid
                  />
                </div>
              ) : (
                <div className="grid aspect-[3/4.2] w-full max-w-[230px] place-items-center rounded-xl bg-[radial-gradient(circle_at_50%_40%,rgb(255_255_255/0.07),transparent_70%)]">
                  {placing && selected ? (
                    <div className="space-y-1">
                      <AffinityChip aff={selected.affinita[role]} big />
                      <div className="display text-3xl font-black">
                        {potenza(selected.character.rating, selected.affinita[role])}
                      </div>
                      <div className="text-[0.65rem] uppercase tracking-widest opacity-70">
                        {it.draft.potenza}
                      </div>
                    </div>
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-xs text-white/45">
                      <Icon name="shield" className="size-10 text-white/20" />
                      {it.veloce.vuoto}
                    </span>
                  )}
                </div>
              )}
              {p && aff !== undefined && <AffinityChip aff={aff} />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
