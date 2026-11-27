"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ZoomGame from "@/components/quiz/ZoomGame";

function Gioco() {
  const libero = useSearchParams().get("libero") === "1";
  return <ZoomGame key={libero ? "libero" : "giorno"} gioco="sigla" libero={libero} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Gioco />
    </Suspense>
  );
}
