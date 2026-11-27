import Icon from "@/components/Icon";
import it from "@/i18n/it.json";
import { ARENE_INFO } from "@/lib/battle/arene";

export default function ArenaBanner({
  id,
  nome,
  descrizione,
}: {
  id: string;
  nome: string;
  descrizione: string;
}) {
  return (
    <p
      className="panel flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
      data-testid="arena-banner"
    >
      <Icon name={ARENE_INFO[id]?.icona ?? ""} className="size-6" />
      <b>
        {it.draft.arena}: {nome}
      </b>
      <span className="muted">{descrizione}</span>
    </p>
  );
}
