import it from "@/i18n/it.json";
import { nomeTattica } from "@/lib/battle/tattiche";

const CASELLE: [string, string][] = [
  ["f1", "Fase 1"],
  ["f2", "Fase 2"],
  ["f3", "Fase 3"],
  ["carica", "Mossa finale"],
  ["form", "Formazione"],
];

/** Conteggio in diretta dei voti della chat sul piano di battaglia. */
export default function ChatPlanVotes({
  voti,
  compact,
}: {
  voti: Record<string, Record<string, number>>;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1" : "panel space-y-2 p-4"} data-testid="chat-plan">
      <h3 className={compact ? "text-xl font-extrabold" : "text-2xl font-extrabold"}>
        {it.piano.chat.titolo}
      </h3>
      <p className="text-xs muted">{it.piano.chat.comandi}</p>
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {CASELLE.map(([k, label]) => {
          const v = Object.entries(voti[k] ?? {}).sort((a, b) => b[1] - a[1]);
          return (
            <li
              key={k}
              className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-1.5"
            >
              <span className="muted">{label}</span>
              <span className="font-bold">
                {v.length ? v.map(([val, n]) => `${nomeTattica(val)} ${n}`).join(" · ") : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
