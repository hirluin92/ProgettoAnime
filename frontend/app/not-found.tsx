import Link from "next/link";
import it from "@/i18n/it.json";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl space-y-3 p-6">
      <h1 className="text-3xl font-black">{it.errori.paginaNonTrovata}</h1>
      <Link className="underline" href="/">
        {it.errori.tornaHome}
      </Link>
    </main>
  );
}
