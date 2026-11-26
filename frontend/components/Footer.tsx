import Link from "next/link";
import it from "@/i18n/it.json";

export default function Footer() {
  return (
    <footer
      className="mx-auto mt-16 max-w-5xl border-t p-6 text-center text-xs muted"
      data-testid="footer"
    >
      <p>{it.footer}</p>
      <p className="mt-1">
        <a className="underline hover:text-white" href="https://anilist.co" rel="noreferrer">
          {it.footerCredito}
        </a>
      </p>
      <p className="mt-2">
        <Link className="underline hover:text-white" href="/info">
          {it.info.link}
        </Link>
      </p>
    </footer>
  );
}
