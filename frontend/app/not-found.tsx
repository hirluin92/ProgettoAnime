import Link from "next/link";
import it from "@/i18n/it.json";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-5 pt-20 text-center">
      <div className="display text-grad text-[9rem] font-black leading-none" aria-hidden="true">
        404
      </div>
      <h1 className="mt-2 text-4xl font-black">{it.errori.paginaNonTrovata}</h1>
      <Link className="btn btn-primary mt-6" href="/">
        {it.errori.tornaHome}
      </Link>
    </main>
  );
}
