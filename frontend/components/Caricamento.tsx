import it from "@/i18n/it.json";

/** Caricamento a scheletro: una testata e tre vignette vuote, al posto del testo «Connessione…». */
export default function Caricamento({
  testo = it.caricamento,
  titolo,
}: {
  testo?: string;
  /** il titolo della pagina: così l'H1 è già nell'HTML del server, prima che arrivino i dati */
  titolo?: string;
}) {
  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 pt-8" aria-busy="true">
      {titolo ? (
        <h1 className="striscia text-4xl sm:text-5xl">{titolo}</h1>
      ) : (
        <div className="scheletro h-12 w-64 max-w-full" />
      )}
      <p className="text-sm font-bold muted" role="status">
        {testo}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="scheletro h-40" />
        <div className="scheletro hidden h-40 sm:block" />
        <div className="scheletro hidden h-40 sm:block" />
      </div>
    </main>
  );
}
