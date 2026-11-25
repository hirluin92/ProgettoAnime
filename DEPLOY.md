# Pubblicazione

Questa guida non è stata eseguita: servono account e credenziali dell'autore (Vercel, Fly.io, Neon).

1. **Database (Neon)**: crea un progetto Postgres 16 e copia la stringa di connessione, nel formato
   `postgresql+psycopg://utente:password@host/db?sslmode=require`.
2. **Backend (Fly.io)**, un'istanza sola:
   `fly launch --no-deploy --copy-config`, poi
   `fly secrets set DATABASE_URL=... CORS_ORIGINS=https://<tuo-dominio-vercel>` e `fly deploy`.
   Il container esegue `alembic upgrade head` all'avvio.
3. **Frontend (Vercel)**: importa la cartella `frontend`, imposta `NEXT_PUBLIC_API_URL=https://<app>.fly.dev`
   e `NEXT_PUBLIC_CONTACT_EMAIL` con l'indirizzo reale per le rimozioni.
4. **Verifica**: apri `/health` sul backend, crea una stanza, entra da 2 telefoni e fai una partita.
5. Lascia `DEV_TOOLS=0` in produzione.
