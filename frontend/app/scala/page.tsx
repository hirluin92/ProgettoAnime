import DuelloGame from "@/components/duello/DuelloGame";
import Guida from "@/components/Guida";
import { meta } from "@/lib/seo";

export const metadata = meta("scala", "/scala");

export default function ScalaPage() {
  return (
    <>
      <DuelloGame scala />
      <Guida chiave="scala" />
    </>
  );
}
