import it from "@/i18n/it.json";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/constants";

export default function InfoPage() {
  return (
    <main className="panel mx-auto my-10 max-w-2xl space-y-5 p-8 [&_li]:text-[#a9a3c7] [&_p]:text-[#a9a3c7]">
      <h1 className="text-4xl font-bold">
        {it.info.titolo} {APP_NAME}
      </h1>
      <section>
        <h2 className="text-xl font-bold text-gold">{it.info.regole}</h2>
        <ul className="list-disc pl-5">
          {it.info.regoleElenco.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-bold text-gold">{it.info.disclaimer}</h2>
        <p>{it.footer}</p>
        <p>{it.info.noImmagini}</p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-gold">{it.info.rimozione}</h2>
        <p>
          {it.info.rimozioneTesto}{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`} data-testid="contact-email">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
      <section>
        <h2 className="text-xl font-bold text-gold">{it.info.cookie}</h2>
        <p>{it.info.cookieTesto}</p>
      </section>
    </main>
  );
}
