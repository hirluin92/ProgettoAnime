import Link from "next/link";
import Icon from "@/components/Icon";
import it from "@/i18n/it.json";

const VOCI = [
  { href: "/sfide/animedle", testo: it.linkUtili.animedle, icona: "sparkles" },
  { href: "/sfide/sigla", testo: it.linkUtili.sigla, icona: "music" },
  { href: "/sfide/scorcio", testo: it.linkUtili.scorcio, icona: "moon" },
  { href: "/sfide/personaggio", testo: it.linkUtili.personaggio, icona: "shield" },
  { href: "/duello/giorno", testo: it.linkUtili.giorno, icona: "trophy" },
] as const;

/** Collegamenti con testo descrittivo verso le sfide del giorno: SOLO le sfide (reso dal server). */
export default function LinkSfide() {
  return (
    <section
      className="mx-auto mt-14 max-w-7xl px-4 sm:px-5"
      aria-labelledby="link-sfide"
      style={{ ["--accent" as string]: "var(--ciano)" }}
    >
      <span className="eyebrow">{it.linkUtili.sotto}</span>
      <h2 id="link-sfide" className="mt-1 text-4xl leading-none sm:text-5xl">
        {it.linkUtili.titolo}
      </h2>
      <ul className="mt-5 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {VOCI.map((v) => (
          <li key={v.href} className="border-b-[1.5px] border-[var(--line)]">
            <Link
              href={v.href}
              className="group flex min-h-14 items-center gap-3 py-2 font-bold text-carta hover:text-white"
            >
              <Icon name={v.icona} className="size-6 shrink-0 text-[var(--accent)]" />
              <span className="flex-1 group-hover:underline">{v.testo}</span>
              <Icon
                name="arrowright"
                className="size-5 shrink-0 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
