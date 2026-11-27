import Icon from "@/components/Icon";
import it from "@/i18n/it.json";

export default function MissionCard({
  titolo,
  nome,
  descrizione,
  esito,
}: {
  titolo?: string;
  nome: string;
  descrizione: string;
  esito?: boolean;
}) {
  return (
    <div
      data-testid="mission"
      className={`border-2 border-dashed p-3 text-sm ${
        esito === undefined
          ? "border-[#ffd21f] bg-[#ffd21f]/10"
          : esito
            ? "border-[#35d68a] bg-[#35d68a]/10"
            : "border-rose-400 bg-rose-500/10"
      }`}
      style={{ ["--accent" as string]: "var(--giallo)" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">{titolo ?? it.missione.titolo}</span>
        {esito !== undefined && (
          <span className="chip">
            <Icon name={esito ? "check" : "x"} />{" "}
            {esito ? it.missione.riuscita : it.missione.fallita}
          </span>
        )}
      </div>
      <p className="display text-xl font-extrabold leading-tight">{nome}</p>
      <p className="muted">{descrizione}</p>
      {esito === undefined && <p className="mt-1 text-xs text-amber-200">{it.missione.bonus}</p>}
    </div>
  );
}
