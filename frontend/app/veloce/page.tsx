import Guida from "@/components/Guida";
import VelocePartita from "@/components/VelocePartita";
import { meta } from "@/lib/seo";

export const metadata = meta("veloce", "/veloce");

export default function VelocePage() {
  return (
    <>
      <VelocePartita />
      <Guida chiave="veloce" />
    </>
  );
}
