import { Suspense } from "react";
import Caricamento from "@/components/Caricamento";
import Guida from "@/components/Guida";
import { PaginaZoom } from "@/components/quiz/PaginaQuiz";
import it from "@/i18n/it.json";
import { meta } from "@/lib/seo";

export const metadata = meta("scorcio", "/sfide/scorcio");

export default function Page() {
  return (
    <>
      <Suspense fallback={<Caricamento titolo={it.seo.scorcio.h1} />}>
        <PaginaZoom gioco="scorcio" />
      </Suspense>
      <Guida
        chiave="scorcio"
        briciole={[
          { nome: it.seo.briciole.home, path: "/" },
          { nome: it.seo.briciole.sfide, path: "/sfide" },
          { nome: it.seo.scorcio.h1, path: "/sfide/scorcio" },
        ]}
      />
    </>
  );
}
