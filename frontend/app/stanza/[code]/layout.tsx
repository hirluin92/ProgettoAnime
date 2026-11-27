import { meta } from "@/lib/seo";

// pagina privata o temporanea: fuori dai risultati di ricerca
export const metadata = meta("stanza", "/stanza", { noindex: true });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
