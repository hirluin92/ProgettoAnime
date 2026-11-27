"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { Logo as Stemma } from "@/components/Logo";
import Moneta from "@/components/Moneta";
import { usePathname } from "next/navigation";
import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";
import { useProfile } from "@/lib/profile";

export { Logo } from "@/components/Logo";

/*
 * NAVIGAZIONE
 * Tre gruppi invece di nove voci in fila:
 *   GIOCARE     Duello (il cuore), Ranked, Sfide del giorno  + «Altri modi» (Scala, Veloce, Con gli amici)
 *   COLLEZIONE  Album, Negozio
 *   TU          saldo dei sigilli e profilo (a destra, sempre visibili, anche su telefono)
 * Info sta nel footer e nel menu. Su telefono: barra in basso con le quattro cose di ogni giorno e «Menu».
 */
const PRINCIPALI = [
  { href: "/duello", label: it.nav.duello, icona: "swords" },
  { href: "/ranked", label: it.nav.ranked, icona: "trophy" },
  { href: "/sfide", label: it.nav.sfida, icona: "sparkles" },
] as const;
const ALTRI_MODI = [
  { href: "/scala", label: it.nav.scala, icona: "ladder" },
  { href: "/veloce", label: it.nav.veloce, icona: "bolt" },
  { href: "/#amici", label: it.nav.amici, icona: "music" },
] as const;
const COLLEZIONE = [
  { href: "/album", label: it.nav.album, icona: "cards" },
  { href: "/negozio", label: it.nav.negozio, icona: "coin" },
] as const;

// barra in basso su telefono: le quattro cose di ogni giorno, tocchi grandi, più il menu
const RAPIDA = [
  { href: "/duello", label: it.nav.duello, icona: "swords" },
  { href: "/sfide", label: it.nav.sfida, icona: "sparkles" },
  { href: "/album", label: it.nav.album, icona: "cards" },
  { href: "/negozio", label: it.nav.negozio, icona: "coin" },
] as const;
const MENU = [
  { href: "/ranked", label: it.nav.ranked, icona: "trophy" },
  { href: "/scala", label: it.nav.scala, icona: "ladder" },
  { href: "/veloce", label: it.nav.veloce, icona: "bolt" },
  { href: "/#amici", label: it.nav.amici, icona: "music" },
  { href: "/profilo", label: it.nav.profilo, icona: "crown" },
  { href: "/", label: it.nav.home, icona: "flame" },
  { href: "/info", label: it.nav.info, icona: "shield" },
] as const;

const oggiRoma = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
const CHIAVE_SFIDE = "sfide-viste";

/** Vero finché oggi non si è ancora aperta la pagina delle sfide: accende il bollino «nuove». */
function useSfideNuove(path: string): boolean {
  const [nuove, setNuove] = useState(false);
  useEffect(() => {
    if (path.startsWith("/sfide")) {
      window.localStorage.setItem(CHIAVE_SFIDE, oggiRoma());
      setNuove(false);
    } else setNuove(window.localStorage.getItem(CHIAVE_SFIDE) !== oggiRoma());
  }, [path]);
  return nuove;
}

function Bollino() {
  return (
    <span
      className="absolute right-0.5 top-1.5 size-2.5 rotate-45 border-[1.5px] border-black bg-[#ffd21f]"
      title={it.nav.sfideNuove}
      data-testid="bollino-sfide"
    >
      <span className="sr-only">{it.nav.sfideNuove}</span>
    </span>
  );
}

/** Il saldo: quando cambia, il sigillo gira e la differenza («+25») scende dalla targhetta. */
function Saldo({ crediti }: { crediti: number }) {
  const prima = useRef<number | null>(null);
  const [delta, setDelta] = useState<{ n: number; k: number } | null>(null);
  useEffect(() => {
    const p = prima.current;
    prima.current = crediti;
    if (p === null || p === crediti) return;
    setDelta({ n: crediti - p, k: Date.now() });
    const t = setTimeout(() => setDelta(null), 1500);
    return () => clearTimeout(t);
  }, [crediti]);
  return (
    <Link
      href="/negozio"
      className="chip relative min-h-11 border-black bg-[#ffd21f] text-black"
      data-testid="nav-crediti"
      aria-label={`${crediti} ${it.nav.crediti}`}
    >
      <Moneta key={delta?.k ?? 0} gira={!!delta} className="size-5" />
      <span className="num text-[0.82rem]">{crediti}</span>
      {delta && (
        <span
          key={delta.k}
          aria-hidden="true"
          className={`delta-saldo num pointer-events-none absolute left-1/2 top-0 -ml-5 border-2 border-black px-1.5 text-xs shadow-[2px_2px_0_#000] ${
            delta.n > 0 ? "bg-[#35d68a] text-black" : "bg-carta text-nero"
          }`}
        >
          {delta.n > 0 ? `+${delta.n}` : delta.n}
        </span>
      )}
    </Link>
  );
}

function BarraRapida({ active, nuove }: { active: (href: string) => boolean; nuove: boolean }) {
  const [menu, setMenu] = useState(false);
  const inMenu = MENU.some((l) => l.href !== "/#amici" && l.href !== "/" && active(l.href));
  const voce = (attivo: boolean) =>
    `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-black uppercase tracking-wide transition-colors ${
      attivo ? "bg-carta text-nero" : "text-[#b5aea0]"
    }`;
  return (
    <div className="site-chrome sm:hidden">
      {menu && (
        <>
          <button
            type="button"
            aria-label={it.duello.chiudi}
            className="fixed inset-0 z-40 bg-black/70"
            onClick={() => setMenu(false)}
          />
          <ul
            className="panel-solido reveal fixed inset-x-3 bottom-[4.6rem] z-50 grid grid-cols-2 gap-3 rounded-md p-3 pb-4"
            data-testid="barra-altro"
          >
            {MENU.map((l) => (
              <li key={l.href} className={l.href === "/info" ? "col-span-2" : ""}>
                <Link
                  href={l.href}
                  onClick={() => setMenu(false)}
                  aria-current={active(l.href) ? "page" : undefined}
                  className={`btn w-full justify-start ${active(l.href) ? "sel" : ""}`}
                >
                  <Icon name={l.icona} className="size-[1.15em]" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </>
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
            onClick={() => setMenu(false)}
            aria-current={active(l.href) ? "page" : undefined}
            className={voce(active(l.href))}
          >
            <span className="relative">
              <Icon name={l.icona} className="size-[1.4rem]" />
              {l.href === "/sfide" && nuove && (
                <span className="absolute -right-2 -top-1 size-2.5 rotate-45 border-[1.5px] border-black bg-[#ffd21f]" />
              )}
            </span>
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          className={voce(inMenu || menu)}
          aria-expanded={menu}
          onClick={() => setMenu((v) => !v)}
        >
          <Icon name={menu ? "x" : "dots"} className="size-[1.4rem]" />
          {it.nav.menu}
        </button>
      </nav>
    </div>
  );
}

/** Cambio di tavola: a ogni cambio di pagina una fascia d'inchiostro attraversa lo schermo. */
function CambioTavola({ path }: { path: string }) {
  const primo = useRef(true);
  const [k, setK] = useState(0);
  useEffect(() => {
    if (primo.current) {
      primo.current = false;
      return;
    }
    setK((n) => n + 1);
  }, [path]);
  if (k === 0) return null;
  return <div key={k} className="cambio-tavola" aria-hidden="true" />;
}

export default function SiteNav() {
  const path = usePathname();
  const { profile } = useProfile();
  const nuove = useSfideNuove(path);
  const [altri, setAltri] = useState(false);
  useEffect(() => setAltri(false), [path]);
  const active = (href: string) =>
    href === "/"
      ? path === "/"
      : href === "/duello"
        ? path === href || path.startsWith("/duello/")
        : path.startsWith(href);
  const voce = (attivo: boolean) =>
    `display relative grid h-full place-items-center px-2.5 text-[1.02rem] tracking-wider transition-colors md:px-3.5 ${
      attivo
        ? "bg-carta text-nero [clip-path:polygon(0.5rem_0,100%_0,calc(100%-0.5rem)_100%,0_100%)]"
        : "text-[#cfc8b8] hover:text-white"
    }`;
  const inAltri = ALTRI_MODI.some((l) => l.href !== "/#amici" && active(l.href));
  return (
    <>
      <CambioTavola path={path} />
      <header className="site-chrome sticky top-0 z-40 border-b-2 border-black bg-[#0e0d10] shadow-[0_1px_0_rgb(243_236_221/0.16)]">
        <nav
          aria-label="Principale"
          className="mx-auto flex h-14 max-w-7xl items-stretch justify-between gap-2 px-3 sm:px-4"
        >
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2"
            aria-label={APP_NAME}
            aria-current={path === "/" ? "page" : undefined}
          >
            <span className="transition-transform duration-150 group-hover:-rotate-6 group-hover:scale-110">
              <Stemma size={36} />
            </span>
            <span className="display text-[1.5rem] italic leading-none tracking-wider text-carta max-[359px]:hidden">
              {APP_NAME}
            </span>
          </Link>
          <ul className="hidden items-stretch sm:flex">
            {PRINCIPALI.map((l) => (
              <li key={l.href} className="relative flex items-stretch">
                <Link
                  href={l.href}
                  aria-current={active(l.href) ? "page" : undefined}
                  className={voce(active(l.href))}
                >
                  {l.label}
                </Link>
                {l.href === "/sfide" && nuove && <Bollino />}
              </li>
            ))}
            <li
              className="relative flex items-stretch"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAltri(false);
              }}
            >
              <button
                type="button"
                className={voce(inAltri)}
                aria-expanded={altri}
                aria-haspopup="true"
                onClick={() => setAltri((v) => !v)}
                data-testid="nav-altri"
              >
                <span className="flex items-center gap-1">
                  {it.nav.altriModi}
                  <Icon
                    name="arrowdown"
                    className={`size-[0.8em] transition-transform ${altri ? "rotate-180" : ""}`}
                  />
                </span>
              </button>
              {altri && (
                <ul
                  className="panel-solido reveal absolute left-0 top-[calc(100%+0.5rem)] z-50 grid w-60 gap-1 rounded-md p-2"
                  data-testid="nav-altri-menu"
                >
                  {ALTRI_MODI.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={() => setAltri(false)}
                        aria-current={active(l.href) ? "page" : undefined}
                        className={`display flex min-h-11 items-center gap-2.5 px-3 text-lg tracking-wide ${
                          active(l.href) ? "bg-carta text-nero" : "hover:bg-white/10"
                        }`}
                      >
                        <Icon name={l.icona} className="size-[1.1em]" />
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            <li aria-hidden="true" className="mx-1.5 my-4 w-0.5 bg-[var(--line-forte)] md:mx-2.5" />
            {COLLEZIONE.map((l) => (
              <li key={l.href} className="flex items-stretch">
                <Link
                  href={l.href}
                  aria-current={active(l.href) ? "page" : undefined}
                  className={voce(active(l.href))}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex shrink-0 items-center gap-2">
            {profile && <Saldo crediti={profile.crediti} />}
            <Link
              href="/profilo"
              aria-current={active("/profilo") ? "page" : undefined}
              aria-label={it.nav.profilo}
              className={`chip min-h-11 ${
                active("/profilo")
                  ? "border-black bg-carta text-nero"
                  : "border-[rgb(243_236_221/0.32)] text-carta"
              }`}
            >
              <Icon name="crown" className="size-4" />
              <span className="hidden max-w-[7rem] truncate md:inline">
                {profile ? profile.name : it.nav.profilo}
              </span>
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
      <BarraRapida active={active} nuove={nuove} />
    </>
  );
}
