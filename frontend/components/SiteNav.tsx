"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";
import { useProfile } from "@/lib/profile";

const LINKS = [
  { href: "/", label: it.nav.gioca },
  { href: "/duello", label: it.nav.duello },
  { href: "/veloce", label: it.nav.veloce },
  { href: "/sfide", label: it.nav.sfida },
  { href: "/ranked", label: it.nav.ranked },
  { href: "/album", label: it.nav.album },
  { href: "/negozio", label: it.nav.negozio },
  { href: "/profilo", label: it.nav.profilo },
  { href: "/info", label: it.nav.info },
] as const;

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd45a" />
          <stop offset=".45" stopColor="#ff3d81" />
          <stop offset="1" stopColor="#8b5cff" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#lg)" />
      <path d="M21.5 6 11 22h7l-1.5 12L29 17h-7.5z" fill="#0b0818" opacity=".92" />
    </svg>
  );
}

export default function SiteNav() {
  const path = usePathname();
  const { profile } = useProfile();
  const active = (href: string) =>
    href === "/" || href === "/duello" ? path === href : path.startsWith(href);
  return (
    <header className="site-chrome sticky top-0 z-40">
      <div className="border-b bg-[#05040c]/70 backdrop-blur-xl">
        <nav
          aria-label="Principale"
          className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4"
        >
          <Link href="/" className="flex items-center gap-2.5" aria-label={APP_NAME}>
            <Logo />
            <span className="display hidden text-xl font-black leading-none tracking-wide sm:block">
              {APP_NAME}
            </span>
          </Link>
          <ul className="flex items-center gap-1">
            {LINKS.map((l) => (
              <li
                key={l.href}
                className={
                  ["/info", "/veloce", "/sfide", "/negozio", "/ranked"].includes(l.href)
                    ? "hidden sm:block"
                    : ""
                }
              >
                <Link
                  href={l.href}
                  aria-current={active(l.href) ? "page" : undefined}
                  className={`relative block rounded-full px-2.5 py-1.5 text-[0.8rem] font-bold sm:px-3.5 sm:text-sm transition-colors ${
                    active(l.href)
                      ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]"
                      : "text-[#a9a3c7] hover:bg-white/8 hover:text-white"
                  }`}
                >
                  {l.label}
                  {l.href === "/profilo" && profile && (
                    <span
                      className="ml-1.5 rounded-full bg-amber-300/25 px-1.5 text-[0.65rem] font-black text-amber-200"
                      data-testid="nav-livello"
                    >
                      {profile.livello}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
