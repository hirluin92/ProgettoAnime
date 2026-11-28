import it from "@/i18n/it.json";
import { COMMUNITY_EMAIL, COMMUNITY_URL } from "@/lib/constants";

/**
 * Invito alla community (Discord ed email) per il gioco nuovo. Compare solo se almeno uno dei due
 * indirizzi è impostato (`NEXT_PUBLIC_COMMUNITY_URL`, `NEXT_PUBLIC_COMMUNITY_EMAIL`): finché sono
 * segnaposto non si mostra, per non mandare i giocatori a un link che non esiste.
 */
export default function InvitoCommunity({ className = "" }: { className?: string }) {
  if (!COMMUNITY_URL && !COMMUNITY_EMAIL) return null;
  return (
    <section className={`panel mx-auto max-w-md space-y-2 p-4 text-left ${className}`}>
      <p className="eyebrow">{it.community.titolo}</p>
      <p className="text-sm font-medium">{it.community.testo}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {COMMUNITY_URL && (
          <a
            className="btn"
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="community-discord"
          >
            {it.community.discord}
          </a>
        )}
        {COMMUNITY_EMAIL && (
          <a className="btn" href={`mailto:${COMMUNITY_EMAIL}`} data-testid="community-email">
            {it.community.email}
          </a>
        )}
      </div>
    </section>
  );
}
