import Guida from "@/components/Guida";
import NegozioView from "@/components/negozio/NegozioView";
import { meta } from "@/lib/seo";

export const metadata = meta("negozio", "/negozio");

export default function NegozioPage() {
  return (
    <>
      <NegozioView />
      <Guida chiave="negozio" />
    </>
  );
}
