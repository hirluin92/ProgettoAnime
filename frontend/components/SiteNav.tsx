"use client";

import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/Icon";
import { Logo as Stemma } from "@/components/Logo";
import { usePathname } from "next/navigation";
import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";
import { useProfile } from "@/lib/profile";

export { Logo } from "@/components/Logo";

// Barra in alto (da tablet in su): prima i modi di giocare, poi la collezione; a destra crediti e profilo.
const GIOCO = [
  { href: "/duello", label: it.nav.duello },
  { href: "/ranked", label: it.nav.ranked },
  { href: "/sfide", label: it.nav.sfida },
  { href: "/veloce", label: it.nav.veloce, largo: true },
  { href: "/album", label: it.nav.album },
  { href: "/negozio", label: it.nav.negozio },
  { href: "/info", label: it.nav.info, largo: true },
] as const;

// barra in basso su telefono: le cinque cose che si usano di più, tocchi grandi
const RAPIDA = [
  { href: "/duello", label: it.nav.duello, icona: "swords" },
  { href: "/sfide", label: it.nav.sfida, icona: "sparkles" },
  { href: "/album", label: it.nav.album, icona: "cards" },
  { href: "/negozio", label: it.nav.negozio, icona: "coin" },
  { href: "/profilo", label: it.nav.profilo, icona: "crown" },
] as const;
const ALTRE = [
  { href: "/", label: it.nav.gioca, icona: "bolt" },
  { href: "/veloce", label: it.nav.veloce, icona: "flame" },
  { href: "/ranked", label: it.nav.ranked, icona: "trophy" },
  { href: "/info", label: it.nav.info, icona: "shield" },
] as const;

function BarraRapida({ active }: { active: (href: string) => boolean }) {
  const [altro, setAltro] = useState(false);
  const inAltre = ALTRE.some((l) => active(l.href));
  const voce = (attivo: boolean) =>
    `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-black uppercase tracking-wide transition-colors ${
      attivo ? "bg-carta text-nero" : "text-[#b5aea0]"
    }`;
  return (
    <div className="site-chrome sm:hidden">
      {altro && (
        <ul
          className="panel-solido fixed inset-x-3 bottom-[4.5rem] z-50 grid grid-cols-2 gap-3 rounded-md p-3"
          data-testid="barra-altro"
        >
          {ALTRE.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                onClick={() => setAltro(false)}
                aria-current={active(l.href) ? "page" : undefined}
                className={`btn w-full ${active(l.href) ? "sel" : ""}`}
              >
                <Icon name={l.icona} className="size-[1.1em]" />
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <nav
        aria-label={it.nav.rapida}
        data-testid="barra-rapida"
        className="fixed inset-x-0 bottom-0 z-50 flex border-t-2 border-carta bg-[#0e0d10] pb-[env(safe-area-inset-bottom)]"
      >
        {RAPIDA.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setAltro(false)}
            aria-current={active(l.href) ? "page" : undefined}
            className={voce(active(l.href))}
          >
            <Icon name={l.icona} className="size-[1.35rem]" />
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          className={voce(inAltre || altro)}
          aria-expanded={altro}
          onClick={() => setAltro((v) => !v)}
        >
          <Icon name="dots" className="size-[1.35rem]" />
          {it.nav.altro}
        </button>
      </nav>
    </div>
  );
}

export default function SiteNav() {
  const path = usePathname();
  const { profile } = useProfile();
  const active = (href: string) =>
    href === "/" || href === "/duello"
      ? path === href || (href === "/duello" && path.startsWith("/scala"))
      : path.startsWith(href);
  return (
    <>
      <header className="site-chrome sticky top-0 z-40 border-b-2 border-black bg-[#0e0d10] shadow-[0_1px_0_rgb(243_236_221/0.16)]">
        <nav
          aria-label="Principale"
          className="mx-auto flex h-14 max-w-7xl items-stretch justify-between gap-2 px-4"
        >
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5"
            aria-label={APP_NAME}
            aria-current={path === "/" ? "page" : undefined}
          >
            <span className="transition-transform duration-150 group-hover:-rotate-6 group-hover:scale-110">
              <Stemma size={36} />
            </span>
            <span className="display text-[1.55rem] italic leading-none tracking-wider text-carta">
              {APP_NAME}
            </span>
          </Link>
          <ul className="hidden items-stretch sm:flex">
            {GIOCO.map((l) => (
              <li
                key={l.href}
                className={`items-stretch ${"largo" in l ? "hidden lg:flex" : "flex"}`}
              >
                <Link
                  href={l.href}
                  aria-current={active(l.href) ? "page" : undefined}
                  className={`display relative grid place-items-center px-2.5 text-[1.02rem] tracking-wider transition-colors md:px-3.5 ${
                    active(l.href)
                      ? "bg-carta text-nero [clip-path:polygon(0.5rem_0,100%_0,calc(100%-0.5rem)_100%,0_100%)]"
                      : "text-[#cfc8b8] hover:text-white"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-2">
            {profile && (
              <Link
                href="/negozio"
                className="chip min-h-9 border-black bg-[#ffd21f] text-black"
                data-testid="nav-crediti"
                aria-label={`${profile.crediti} ${it.nav.crediti}`}
              >
                <Icon name="coin" className="size-4" />
                <span className="num text-[0.8rem]">{profile.crediti}</span>
              </Link>
            )}
            <Link
              href="/profilo"
              aria-current={active("/profilo") ? "page" : undefined}
              className={`chip hidden min-h-9 sm:inline-flex ${
                active("/profilo")
                  ? "border-black bg-carta text-nero"
                  : "border-[rgb(243_236_221/0.32)] text-carta"
              }`}
            >
              <Icon name="crown" className="size-4" />
              <span className="max-w-[7rem] truncate">
                {profile ? profile.name : it.nav.profilo}
              </span>
              <span className="sr-only">{it.nav.profilo}</span>
              {profile && (
                <span
                  className="num grid min-w-5 place-items-center bg-[#e0301f] px-1 text-[0.68rem] text-white"
                  data-testid="nav-livello"
                >
                  {profile.livello}
                </span>
              )}
            </Link>
          </div>
        </nav>
      </header>
      <BarraRapida active={active} />
    </>
  );
}
