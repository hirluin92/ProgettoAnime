import Link from "next/link";
import it from "@/i18n/it.json";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl space-y-3 p-6 pt-16">
      <h1 className="text-4xl font-bold">{it.errori.paginaNonTrovata}</h1>
      <Link className="btn btn-primary" href="/">
        {it.errori.tornaHome}
      </Link>
    </main>
  );
}
