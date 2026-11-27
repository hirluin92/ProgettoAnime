import { Suspense } from "react";
import Caricamento from "@/components/Caricamento";
import Guida from "@/components/Guida";
import { PaginaZoom } from "@/components/quiz/PaginaQuiz";
import it from "@/i18n/it.json";
import { meta } from "@/lib/seo";

export const metadata = meta("personaggio", "/sfide/personaggio");

export default function Page() {
  return (
    <>
      <Suspense fallback={<Caricamento titolo={it.seo.personaggio.h1} />}>
        <PaginaZoom gioco="personaggio" />
      </Suspense>
      <Guida
        chiave="personaggio"
        briciole={[
          { nome: it.seo.briciole.home, path: "/" },
          { nome: it.seo.briciole.sfide, path: "/sfide" },
          { nome: it.seo.personaggio.h1, path: "/sfide/personaggio" },
        ]}
      />
    </>
  );
}
