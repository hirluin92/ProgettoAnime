"""Ritenzione e rivincite dai dati raccolti (tabella `eventi`).

Uso (dal backend, con DATABASE_URL del database da leggere):
    cd backend && uv run python ../scripts/ritenzione.py [--giorni 14]

Stampa D1/D7/D30, partite per sessione, completamento della prima partita e rivincite dopo una
sconfitta. Sotto i 200 giocatori per coorte si leggono le tendenze, non i decimali.
Non legge né scrive altro: nessun dato personale (gli eventi hanno solo un id casuale del browser).
"""

import argparse
from datetime import UTC, datetime, timedelta

from app.db.models import EventoRow
from app.db.session import session_scope
from app.eventi import ritenzione
from app.tempo import giorno_italia


def carica(giorni: int | None) -> list[dict]:  # type: ignore[type-arg]
    with session_scope() as s:
        q = s.query(EventoRow)
        if giorni:
            q = q.filter(EventoRow.ts >= datetime.now(UTC) - timedelta(days=giorni))
        return [
            {"pid": r.pid, "giorno": r.giorno, "sessione": r.sessione, "nome": r.nome, "props": r.props}
            for r in q.order_by(EventoRow.id)
        ]


def pct(x: float | None) -> str:
    return "n/d" if x is None else f"{x * 100:.1f}%"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--giorni", type=int, default=None, help="solo gli ultimi N giorni")
    args = ap.parse_args()
    eventi = carica(args.giorni)
    r = ritenzione(eventi, oggi=giorno_italia())
    print(f"Eventi: {r['eventi']}  Giocatori (id browser): {r['giocatori']}")
    for k, v in r["ritorno"].items():
        print(f"  {k}: {pct(v['quota'])}  ({v['tornati']} su {v['coorte']})")
    print(f"Partite per sessione (mediana): {r['partite_per_sessione']}")
    print(f"Completa la prima partita: {pct(r['completa_prima_partita'])}")
    print(f"Rivincita dopo una sconfitta: {pct(r['rivincita_dopo_sconfitta'])}")
    print(f"Abbandoni a partita in corso: {r['abbandoni']}")
    print("Soglie (stime): D1 20-30% regge; D7 6-10%; partite per sessione 3-4; rivincita 30-45%.")


if __name__ == "__main__":
    main()
