import Link from "next/link";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import LinkSfide from "@/components/LinkSfide";
import it from "@/i18n/it.json";
import { conNome, meta, SITO } from "@/lib/seo";

export const metadata = meta("comeSiGioca", "/come-si-gioca");

// Le regole del Duello spiegate per esteso: pagina di solo testo, resa dal server.
export default function ComeSiGiocaPage() {
  const g = it.comeSiGioca;
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pt-8">
        <header className="testata space-y-2">
          <span className="eyebrow">{g.occhiello}</span>
          <h1 className="text-4xl sm:text-6xl">{it.seo.comeSiGioca.h1}</h1>
          <p className="text-lg font-medium leading-relaxed text-[#dcd5c5]">{conNome(g.intro)}</p>
        </header>
        <ol className="mt-8 space-y-8">
          {g.sezioni.map((s, i) => (
            <li key={s.t} className="grid gap-x-5 gap-y-2 sm:grid-cols-[4.5rem_1fr]">
              <span
                aria-hidden="true"
                className="num grid size-14 place-items-center border-2 border-black bg-carta text-xl text-nero shadow-[4px_4px_0_var(--accent)] sm:size-[4.5rem] sm:text-2xl"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-3xl leading-none sm:text-4xl">{s.t}</h2>
                {s.p.map((p) => (
                  <p key={p} className="mt-2.5 font-medium leading-relaxed text-[#dcd5c5]">
                    {conNome(p)}
                  </p>
                ))}
              </div>
            </li>
          ))}
        </ol>
        <section className="panel-vivo mt-10 space-y-3 p-5 sm:p-7">
          <h2 className="text-3xl leading-none">{g.poi}</h2>
          <p className="font-medium muted">{g.poiTesto}</p>
          <Link href="/duello" className="btn btn-primary min-h-14 px-8 text-xl">
            <Icon name="swords" className="size-[1.1em]" /> {g.cta}
          </Link>
          <p>
            <Link
              href="/info"
              className="inline-flex min-h-11 items-center text-sm font-bold underline muted"
            >
              {g.altreRegole}
            </Link>
          </p>
        </section>
      </main>
      <LinkSfide />
      <JsonLd
        dati={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: conNome(it.seo.comeSiGioca.titolo),
          description: conNome(it.seo.comeSiGioca.descrizione),
          inLanguage: "it",
          mainEntityOfPage: `${SITO}/come-si-gioca`,
        }}
      />
    </>
  );
}
