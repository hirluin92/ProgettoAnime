import DuelloGame from "@/components/duello/DuelloGame";
import Guida from "@/components/Guida";
import { meta } from "@/lib/seo";

export const metadata = meta("duello", "/duello");

export default function DuelloPage() {
  return (
    <>
      <DuelloGame />
      <Guida chiave="duello" />
    </>
  );
}
