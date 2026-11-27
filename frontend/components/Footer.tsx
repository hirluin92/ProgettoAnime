import Link from "next/link";
import { Logo } from "@/components/SiteNav";
import it from "@/i18n/it.json";
import { APP_NAME } from "@/lib/constants";

export default function Footer() {
  return (
    <footer
      className="site-chrome mx-auto mt-24 max-w-7xl border-t px-5 py-10 text-xs muted"
      data-testid="footer"
    >
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="display text-lg font-black tracking-wide text-white">{APP_NAME}</span>
        </div>
        <p className="max-w-xl">{it.footer}</p>
        <p className="flex gap-4">
          <a className="underline hover:text-white" href="https://anilist.co" rel="noreferrer">
            {it.footerCredito}
          </a>
          <Link className="underline hover:text-white" href="/info">
            {it.info.link}
          </Link>
        </p>
      </div>
    </footer>
  );
}
