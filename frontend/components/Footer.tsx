import Link from "next/link";
import { Marchio } from "@/components/Logo";
import it from "@/i18n/it.json";

const COLONNE = [
  {
    titolo: it.footerGioca,
    voci: [
      { href: "/duello", label: it.nav.duello },
      { href: "/ranked", label: it.nav.ranked },
      { href: "/sfide", label: it.nav.sfida },
      { href: "/veloce", label: it.nav.veloce },
    ],
  },
  {
    titolo: it.footerColleziona,
    voci: [
      { href: "/album", label: it.nav.album },
      { href: "/negozio", label: it.nav.negozio },
      { href: "/profilo", label: it.nav.profilo },
    ],
  },
] as const;

export default function Footer() {
  return (
    <footer className="site-chrome mt-24 border-t-2 border-black bg-[#0a090c]" data-testid="footer">
      {/* bordo a retino: la pagina «finisce» come il margine di una tavola */}
      <div
        aria-hidden="true"
        className="h-3 opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgb(243 236 221 / 0.5) 1.2px, transparent 1.6px)",
          backgroundSize: "9px 9px",
        }}
      />
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 text-sm sm:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="space-y-3">
          <Marchio size={38} />
          <p className="max-w-xs text-[0.95rem] font-bold text-carta">{it.footerMotto}</p>
        </div>
        {COLONNE.map((c) => (
          <nav key={c.titolo} aria-label={c.titolo} className="space-y-2">
            <div className="eyebrow">{c.titolo}</div>
            <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-1">
              {c.voci.map((v) => (
                <li key={v.href}>
                  <Link
                    href={v.href}
                    className="inline-flex min-h-9 items-center font-bold text-[#cfc8b8] hover:text-white hover:underline"
                  >
                    {v.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="space-y-2 text-[0.82rem] muted">
          <div className="eyebrow">{it.footerSito}</div>
          <p>{it.footer}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <a
              className="inline-flex min-h-9 items-center font-bold text-carta underline hover:text-white"
              href="https://anilist.co"
              rel="noreferrer"
            >
              {it.footerCredito}
            </a>
            <Link
              className="inline-flex min-h-9 items-center font-bold text-carta underline hover:text-white"
              href="/info"
            >
              {it.info.link}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
