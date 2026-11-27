import Guida from "@/components/Guida";
import SfideHub from "@/components/sfide/SfideHub";
import it from "@/i18n/it.json";
import { meta } from "@/lib/seo";

export const metadata = meta("sfide", "/sfide");

export default function SfidePage() {
  return (
    <>
      <SfideHub />
      <Guida
        chiave="sfide"
        briciole={[
          { nome: it.seo.briciole.home, path: "/" },
          { nome: it.seo.briciole.sfide, path: "/sfide" },
        ]}
      />
    </>
  );
}
