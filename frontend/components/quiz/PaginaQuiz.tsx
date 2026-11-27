"use client";

import { useSearchParams } from "next/navigation";
import AnimedleGame from "@/components/quiz/AnimedleGame";
import ZoomGame from "@/components/quiz/ZoomGame";

// La parte «client» delle pagine dei quiz: legge ?libero=1 (allenamento) e monta il gioco.
export function PaginaAnimedle() {
  const libero = useSearchParams().get("libero") === "1";
  return <AnimedleGame key={libero ? "libero" : "giorno"} libero={libero} />;
}

export function PaginaZoom({ gioco }: { gioco: "sigla" | "scorcio" | "personaggio" }) {
  const libero = useSearchParams().get("libero") === "1";
  return <ZoomGame key={libero ? "libero" : "giorno"} gioco={gioco} libero={libero} />;
}
