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
    <span data-testid="timer" aria-label={label} className="tabular-nums text-3xl font-black">
      {left.toFixed(1)}s
    </span>
  );
}
