"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AnimedleGame from "@/components/quiz/AnimedleGame";

function Gioco() {
  const libero = useSearchParams().get("libero") === "1";
  return <AnimedleGame key={libero ? "libero" : "giorno"} libero={libero} />;
}

export default function AnimedlePage() {
  return (
    <Suspense fallback={null}>
      <Gioco />
    </Suspense>
  );
}
