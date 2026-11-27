import { Suspense } from "react";
import Caricamento from "@/components/Caricamento";
import Guida from "@/components/Guida";
import { PaginaAnimedle } from "@/components/quiz/PaginaQuiz";
import it from "@/i18n/it.json";
import { meta } from "@/lib/seo";

export const metadata = meta("animedle", "/sfide/animedle");

export default function AnimedlePage() {
  return (
    <>
      <Suspense fallback={<Caricamento titolo={it.seo.animedle.h1} />}>
        <PaginaAnimedle />
      </Suspense>
      <Guida
        chiave="animedle"
        briciole={[
          { nome: it.seo.briciole.home, path: "/" },
          { nome: it.seo.briciole.sfide, path: "/sfide" },
          { nome: it.seo.animedle.h1, path: "/sfide/animedle" },
        ]}
      />
    </>
  );
}
