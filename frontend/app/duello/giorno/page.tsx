import DuelloGame from "@/components/duello/DuelloGame";
import Guida from "@/components/Guida";
import it from "@/i18n/it.json";
import { meta } from "@/lib/seo";

export const metadata = meta("giorno", "/duello/giorno");

export default function GiornoPage() {
  return (
    <>
      <DuelloGame giorno />
      <Guida
        chiave="giorno"
        briciole={[
          { nome: it.seo.briciole.home, path: "/" },
          { nome: it.seo.briciole.sfide, path: "/sfide" },
          { nome: it.seo.giorno.h1, path: "/duello/giorno" },
        ]}
      />
    </>
  );
}
