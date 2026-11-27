import Link from "next/link";
import { CartaRetro } from "@/components/carta/Carta";
import it from "@/i18n/it.json";

export default function NotFound() {
  return (
    <main className="mx-auto grid max-w-3xl items-center gap-8 px-5 pt-14 text-center sm:grid-cols-[auto_1fr] sm:pt-20 sm:text-left">
      <div className="relative mx-auto w-40 rotate-6" aria-hidden="true">
        <CartaRetro />
        <span className="onoma absolute -left-8 -top-6 text-6xl">?!</span>
      </div>
      <div>
        <div className="num text-grad text-[6.5rem] leading-none" aria-hidden="true">
          404
        </div>
        <h1 className="striscia mt-2 text-4xl">{it.errori.paginaNonTrovata}</h1>
        <p className="balloon mx-auto mt-4 w-fit text-sm sm:mx-0">{it.errori.paginaPersa}</p>
        <div className="mt-7">
          <Link className="btn btn-primary min-h-14 px-8 text-xl" href="/">
            {it.errori.tornaHome}
          </Link>
        </div>
      </div>
    </main>
  );
}
