import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import it from "@/i18n/it.json";
import { conNome, SITO, type ChiaveSeo } from "@/lib/seo";

type Blocco = { titolo: string; paragrafi: string[] };

/**
 * Il testo «come funziona» di una pagina, reso dal server: si legge anche senza JavaScript
 * (motori di ricerca, anteprime) e spiega il gioco a chi arriva per la prima volta.
 * Con `briciole` aggiunge il percorso (Home › Sfide › pagina) e i dati strutturati BreadcrumbList.
 */
export default function Guida({
  chiave,
  briciole,
}: {
  chiave: ChiaveSeo;
  briciole?: { nome: string; path: string }[];
}) {
  const voce = (it.seo as unknown as Record<string, { guida?: Blocco }>)[chiave];
  const g = voce.guida;
  if (!g) return null;
  return (
    <section
      className="guida-quieta mx-auto mt-16 max-w-7xl px-4"
      aria-labelledby={`guida-${chiave}`}
      data-testid="guida"
    >
      {briciole && (
        <>
          <nav aria-label="Percorso" className="mb-3 text-sm font-bold">
            <ol className="flex flex-wrap items-center gap-x-2">
              {briciole.map((b, i) => (
                <li key={b.path} className="flex items-center gap-2">
                  {i > 0 && (
                    <span aria-hidden="true" className="muted">
                      /
                    </span>
                  )}
                  {i < briciole.length - 1 ? (
                    <Link
                      href={b.path}
                      className="inline-flex min-h-11 items-center underline muted hover:text-white"
                    >
                      {b.nome}
                    </Link>
                  ) : (
                    <span aria-current="page">{b.nome}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          <JsonLd
            dati={{
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: briciole.map((b, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: b.nome,
                item: `${SITO}${b.path}`,
              })),
            }}
          />
        </>
      )}
      <div className="border-t-[1.5px] border-[var(--line)] pt-8">
        <span className="eyebrow">{it.seo.guidaOcchiello}</span>
        <h2
          id={`guida-${chiave}`}
          className="mt-1 max-w-3xl text-2xl leading-none text-[#dcd5c5] sm:text-3xl"
        >
          {conNome(g.titolo)}
        </h2>
        <ol className="mt-5 grid gap-x-8 gap-y-4 md:grid-cols-3">
          {g.paragrafi.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span
                aria-hidden="true"
                className="num grid size-7 shrink-0 place-items-center border-[1.5px] border-[var(--line-forte)] text-xs text-[#dcd5c5]"
              >
                {i + 1}
              </span>
              <p className="text-[0.92rem] font-medium leading-relaxed">{conNome(p)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
