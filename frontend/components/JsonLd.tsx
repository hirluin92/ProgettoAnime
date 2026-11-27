/** Dati strutturati (schema.org) per i motori di ricerca. */
export default function JsonLd({ dati }: { dati: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // i dati vengono solo da it.json e dalle costanti: nessun testo dell'utente
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dati).replace(/</g, "\\u003c") }}
    />
  );
}
