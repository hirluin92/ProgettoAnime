import Link from "next/link";
import it from "@/i18n/it.json";

export default function Footer() {
  return (
    <footer
      className="mx-auto mt-12 max-w-5xl border-t p-4 text-center text-xs opacity-80"
      data-testid="footer"
    >
      <p>{it.footer}</p>
      <p className="mt-1">
        <Link className="underline" href="/info">
          {it.info.link}
        </Link>
      </p>
    </footer>
  );
}
