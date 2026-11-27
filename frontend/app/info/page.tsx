import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import it from "@/i18n/it.json";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/constants";
import { conNome, meta } from "@/lib/seo";

export const metadata = meta("info", "/info");

export default function InfoPage() {
  return (
    <main
      className="su-carta mx-auto my-8 max-w-3xl space-y-8 border-2 border-black bg-carta p-6 text-nero shadow-[8px_8px_0_var(--rosso)] sm:my-12 sm:p-10 [&_li]:font-medium [&_li]:leading-relaxed [&_p]:font-medium [&_p]:leading-relaxed"
      style={{ counterReset: "sez" }}
    >
      <header className="border-b-[3px] border-black pb-4">
        <span className="text-xs font-black uppercase tracking-[0.25em] text-[#b3200f]">
          {it.info.occhiello}
        </span>
        <h1 className="text-5xl leading-none sm:text-6xl">
          {it.info.titolo} {APP_NAME}
        </h1>
      </header>
      <nav aria-label={it.info.indice} className="flex flex-wrap gap-2">
        <a href="#faq" className="chip min-h-9 border-black bg-nero text-carta">
          {it.faq.titolo}
        </a>
        <a href="#duello" className="chip min-h-9 border-black bg-nero text-carta">
          {it.info.duelloTitolo}
        </a>
        <a href="#regole" className="chip min-h-9 border-black bg-nero text-carta">
          {it.info.regole}
        </a>
        <a href="#disclaimer" className="chip min-h-9 border-black bg-nero text-carta">
          {it.info.disclaimer}
        </a>
        <a href="#rimozione" className="chip min-h-9 border-black bg-nero text-carta">
          {it.info.rimozione}
        </a>
        <a href="#cookie" className="chip min-h-9 border-black bg-nero text-carta">
          {it.info.cookie}
        </a>
      </nav>
      <section id="faq" className="scroll-mt-24">
        <h2 className="mb-2 flex items-baseline gap-3 text-3xl before:font-[family-name:var(--font-num)] before:text-xl before:not-italic before:text-[#b3200f] before:content-[counter(sez,decimal-leading-zero)] before:[counter-increment:sez]">
          {it.faq.titolo}
        </h2>
        <dl className="divide-y-[1.5px] divide-black/25">
          {it.faq.voci.map((v) => (
            <div key={v.d} className="py-3">
              <dt className="text-[1.05rem] font-black">{conNome(v.d)}</dt>
              <dd className="mt-1 font-medium leading-relaxed">{conNome(v.r)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3">
          <Link href="/come-si-gioca" className="font-black underline">
            {it.linkUtili.comeSiGioca}
          </Link>
        </p>
        <JsonLd
          dati={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: it.faq.voci.map((v) => ({
              "@type": "Question",
              name: conNome(v.d),
              acceptedAnswer: { "@type": "Answer", text: conNome(v.r) },
            })),
          }}
        />
      </section>
      <section id="duello" className="scroll-mt-24">
        <h2 className="mb-2 flex items-baseline gap-3 text-3xl before:font-[family-name:var(--font-num)] before:text-xl before:not-italic before:text-[#b3200f] before:content-[counter(sez,decimal-leading-zero)] before:[counter-increment:sez]">
          {it.info.duelloTitolo}
        </h2>
        <ul className="list-disc space-y-1 pl-5 marker:text-[#b3200f]">
          {it.info.duelloElenco.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <section id="regole" className="scroll-mt-24">
        <h2 className="mb-2 flex items-baseline gap-3 text-3xl before:font-[family-name:var(--font-num)] before:text-xl before:not-italic before:text-[#b3200f] before:content-[counter(sez,decimal-leading-zero)] before:[counter-increment:sez]">
          {it.info.regole}
        </h2>
        <ul className="list-disc space-y-1 pl-5 marker:text-[#b3200f]">
          {it.info.regoleElenco.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <section id="disclaimer" className="scroll-mt-24">
        <h2 className="mb-2 flex items-baseline gap-3 text-3xl before:font-[family-name:var(--font-num)] before:text-xl before:not-italic before:text-[#b3200f] before:content-[counter(sez,decimal-leading-zero)] before:[counter-increment:sez]">
          {it.info.disclaimer}
        </h2>
        <p>{it.footer}</p>
        <p>{it.info.noImmagini}</p>
      </section>
      <section id="rimozione" className="scroll-mt-24">
        <h2 className="mb-2 flex items-baseline gap-3 text-3xl before:font-[family-name:var(--font-num)] before:text-xl before:not-italic before:text-[#b3200f] before:content-[counter(sez,decimal-leading-zero)] before:[counter-increment:sez]">
          {it.info.rimozione}
        </h2>
        <p>
          {it.info.rimozioneTesto}{" "}
          <a
            className="font-black underline"
            href={`mailto:${CONTACT_EMAIL}`}
            data-testid="contact-email"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
      <section id="cookie" className="scroll-mt-24">
        <h2 className="mb-2 flex items-baseline gap-3 text-3xl before:font-[family-name:var(--font-num)] before:text-xl before:not-italic before:text-[#b3200f] before:content-[counter(sez,decimal-leading-zero)] before:[counter-increment:sez]">
          {it.info.cookie}
        </h2>
        <p>{it.info.cookieTesto}</p>
      </section>
    </main>
  );
}
