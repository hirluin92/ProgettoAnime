import it from "@/i18n/it.json";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/constants";

export default function InfoPage() {
  return (
    <main className="panel mx-auto my-10 max-w-3xl space-y-7 p-8 sm:p-10 [&_li]:text-[#cfc9ec] [&_p]:text-[#cfc9ec] [&_li]:leading-relaxed [&_p]:leading-relaxed">
      <h1 className="text-5xl font-black leading-none">
        {it.info.titolo} {APP_NAME}
      </h1>
      <section>
        <h2 className="text-2xl font-extrabold text-gold">{it.info.duelloTitolo}</h2>
        <ul className="list-disc space-y-1 pl-5">
          {it.info.duelloElenco.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-extrabold text-gold">{it.info.regole}</h2>
        <ul className="list-disc pl-5">
          {it.info.regoleElenco.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-2xl font-extrabold text-gold">{it.info.disclaimer}</h2>
        <p>{it.footer}</p>
        <p>{it.info.noImmagini}</p>
      </section>
      <section>
        <h2 className="text-2xl font-extrabold text-gold">{it.info.rimozione}</h2>
        <p>
          {it.info.rimozioneTesto}{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`} data-testid="contact-email">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-extrabold text-gold">{it.info.cookie}</h2>
        <p>{it.info.cookieTesto}</p>
      </section>
    </main>
  );
}
