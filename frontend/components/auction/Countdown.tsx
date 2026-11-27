"use client";

import { useEffect, useState } from "react";
import { useRoom } from "@/lib/store";

export function useSecondsLeft(deadline: number | null): number {
  const offset = useRoom((s) => s.offset);
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setLeft(Math.max(0, deadline - (Date.now() / 1000 + offset)));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline, offset]);
  return left;
}

export default function Countdown({ deadline, label }: { deadline: number; label?: string }) {
  const left = useSecondsLeft(deadline);
  return (
    <span
      data-testid="timer"
      aria-label={label}
      className="display tabular-nums text-4xl font-bold text-cyan-200"
    >
      {left.toFixed(1)}s
    </span>
  );
}

// Timer ad anello: si svuota con il tempo e diventa rosso negli ultimi secondi.
export function TimerRing({
  deadline,
  total,
  label,
}: {
  deadline: number;
  total: number;
  label?: string;
}) {
  const left = useSecondsLeft(deadline);
  const frac = Math.min(1, left / Math.max(total, 1));
  const urgent = left < 3;
  const R = 34;
  const C = 2 * Math.PI * R;
  return (
    <div className={`relative size-20 shrink-0 ${urgent ? "animate-pulse" : ""}`}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={R} fill="#0e0d10" stroke="#000" strokeWidth="9" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke="rgb(243 236 221 / 0.18)"
          strokeWidth="6"
        />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke={urgent ? "#e0301f" : "#ffd21f"}
          strokeWidth="6"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ transition: "stroke-dashoffset 0.12s linear, stroke 0.3s" }}
        />
      </svg>
      <span
        data-testid="timer"
        aria-label={label}
        className={`num absolute inset-0 grid place-items-center text-lg tabular-nums ${
          urgent ? "text-rose-300" : "text-carta"
        }`}
      >
        {left.toFixed(1)}
      </span>
    </div>
  );
}
