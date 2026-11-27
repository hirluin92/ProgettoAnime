import Guida from "@/components/Guida";
import RankedHome from "@/components/ranked/RankedHome";
import { meta } from "@/lib/seo";

export const metadata = meta("ranked", "/ranked");

export default function RankedPage() {
  return (
    <>
      <RankedHome />
      <Guida chiave="ranked" />
    </>
  );
}
