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
        <circle cx="40" cy="40" r={R} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={R}
          fill="none"
          stroke={urgent ? "#ff4d6d" : "#3fd0f0"}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{
            transition: "stroke-dashoffset 0.12s linear, stroke 0.3s",
            filter: `drop-shadow(0 0 6px ${urgent ? "#ff4d6d" : "#3fd0f0"})`,
          }}
        />
      </svg>
      <span
        data-testid="timer"
        aria-label={label}
        className={`display absolute inset-0 grid place-items-center text-2xl font-black tabular-nums ${
          urgent ? "text-rose-300" : "text-cyan-100"
        }`}
      >
        {left.toFixed(1)}
      </span>
    </div>
  );
}
