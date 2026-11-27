import DuelloGame from "@/components/duello/DuelloGame";
import { meta } from "@/lib/seo";

export const metadata = meta("ranked", "/ranked", { noindex: true });

export default function RankedGiocaPage() {
  return <DuelloGame ranked />;
}
