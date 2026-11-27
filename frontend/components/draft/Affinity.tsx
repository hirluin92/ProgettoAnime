import { signed, toneOf, type Tone } from "@/lib/draft";
import it from "@/i18n/it.json";

export const TONE_CLASS: Record<Tone, string> = {
  ottimo: "border-[#35d68a] bg-[#35d68a]/25 text-emerald-100",
  buono: "border-lime-300/60 bg-lime-300/15 text-lime-100",
  neutro: "border-[#ffd21f]/70 bg-[#ffd21f]/10 text-amber-100",
  debole: "border-rose-400 bg-rose-500/15 text-rose-200",
};

export function AffinityChip({ aff, big }: { aff: number; big?: boolean }) {
  const tone = toneOf(aff);
  return (
    <span
      className={`num inline-flex items-center gap-1 rounded-[3px] border-[1.5px] tabular-nums ${TONE_CLASS[tone]} ${
        big ? "px-3 py-1 text-base" : "px-2 py-0.5 text-[0.7rem]"
      }`}
      title={it.draft.tono[tone]}
    >
      {signed(aff)}
    </span>
  );
}

export function AffinityLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] muted">
      <span>{it.draft.legenda}</span>
      {(["ottimo", "buono", "neutro", "debole"] as const).map((t) => (
        <span key={t} className="inline-flex items-center gap-1">
          <span className={`size-2.5 rotate-45 border ${TONE_CLASS[t]}`} />
          {it.draft.tono[t]}
        </span>
      ))}
    </p>
  );
}
