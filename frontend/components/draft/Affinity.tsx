import { signed, toneOf, type Tone } from "@/lib/draft";
import it from "@/i18n/it.json";

export const TONE_CLASS: Record<Tone, string> = {
  ottimo: "border-emerald-300/70 bg-emerald-400/20 text-emerald-100",
  buono: "border-lime-300/60 bg-lime-300/15 text-lime-100",
  neutro: "border-amber-300/50 bg-amber-300/10 text-amber-100",
  debole: "border-rose-400/60 bg-rose-500/15 text-rose-200",
};

export function AffinityChip({ aff, big }: { aff: number; big?: boolean }) {
  const tone = toneOf(aff);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-black tabular-nums ${TONE_CLASS[tone]} ${
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
          <span className={`size-2.5 rounded-full border ${TONE_CLASS[t]}`} />
          {it.draft.tono[t]}
        </span>
      ))}
    </p>
  );
}
