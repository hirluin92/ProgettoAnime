import { Suspense } from "react";
import Caricamento from "@/components/Caricamento";
import Guida from "@/components/Guida";
import { PaginaZoom } from "@/components/quiz/PaginaQuiz";
import it from "@/i18n/it.json";
import { meta } from "@/lib/seo";

export const metadata = meta("sigla", "/sfide/sigla");

export default function Page() {
  return (
    <>
      <Suspense fallback={<Caricamento titolo={it.seo.sigla.h1} />}>
        <PaginaZoom gioco="sigla" />
      </Suspense>
      <Guida
        chiave="sigla"
        briciole={[
          { nome: it.seo.briciole.home, path: "/" },
          { nome: it.seo.briciole.sfide, path: "/sfide" },
          { nome: it.seo.sigla.h1, path: "/sfide/sigla" },
        ]}
      />
    </>
  );
}
