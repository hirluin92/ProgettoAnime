"""Eventi anonimi di utilizzo: misurano ritenzione e rivincite (D1, D7, partite per sessione).

Il browser li invia solo se l'utente ha accettato il banner dei cookie. `pid` è un identificatore
casuale del browser, scollegato dal profilo: niente nome, email o IP. Nessun evento contiene
testo libero: i nomi sono un elenco chiuso e le proprietà sono poche e corte.
"""

import json
import statistics
from datetime import datetime, timedelta
from typing import Any, Literal

from fastapi import APIRouter
from pydantic import Field, field_validator

from app.db.models import EventoRow
from app.db.session import session_scope
from app.engine.models import Model
from app.profilo import UUID_RE
from app.tempo import giorno_italia

router = APIRouter(prefix="/api/eventi")

MAX_BLOCCO = 20  # eventi per richiesta
MAX_PROPS = 8
MAX_CHIAVE = 20
MAX_TESTO = 40
MAX_BYTE = 300  # dimensione massima delle proprietà serializzate

Valore = str | int | float | bool


class EventoIn(Model):
    nome: Literal[
        "apertura", "partita_inizio", "partita_fine", "rivincita", "abbandono", "condividi"
    ]
    sessione: str = Field(min_length=8, max_length=36, pattern=r"^[0-9a-zA-Z-]+$")
    props: dict[str, Valore] = Field(default_factory=dict)

    @field_validator("props")
    @classmethod
    def _props_corte(cls, v: dict[str, Valore]) -> dict[str, Valore]:
        if len(v) > MAX_PROPS:
            raise ValueError("troppe proprietà")
        for k, x in v.items():
            if not k or len(k) > MAX_CHIAVE:
                raise ValueError("chiave non valida")
            if isinstance(x, str) and len(x) > MAX_TESTO:
                raise ValueError("testo troppo lungo")
        if len(json.dumps(v)) > MAX_BYTE:
            raise ValueError("proprietà troppo grandi")
        return v


class BloccoIn(Model):
    pid: str
    eventi: list[EventoIn] = Field(min_length=1, max_length=MAX_BLOCCO)

    @field_validator("pid")
    @classmethod
    def _pid_valido(cls, v: str) -> str:
        if not UUID_RE.match(v):
            raise ValueError("pid non valido")
        return v


@router.post("")
def registra(body: BloccoIn) -> dict[str, int]:
    giorno = giorno_italia()
    with session_scope() as s:
        for e in body.eventi:
            s.add(
                EventoRow(
                    giorno=giorno, pid=body.pid, sessione=e.sessione, nome=e.nome, props=e.props
                )
            )
    return {"salvati": len(body.eventi)}


# ---------- metriche (usate da scripts/ritenzione.py) ----------
def _giorno(d: str) -> datetime:
    return datetime.strptime(d, "%Y-%m-%d")


def ritenzione(
    eventi: list[dict[str, Any]], oggi: str, giorni: tuple[int, ...] = (1, 7, 30)
) -> dict:  # type: ignore[type-arg]
    """Ritorno al giorno N, partite per sessione, rivincite e completamento, da una lista di eventi.

    Ogni evento è un dict con `giorno`, `pid`, `sessione`, `nome`, `props`. «Tornato al giorno N»
    vuol dire un evento di apertura o di partita iniziata esattamente N giorni dopo il primo
    giorno visto. Si contano solo le coorti abbastanza vecchie da poter essere osservate.
    """
    primo: dict[str, str] = {}
    attivi: dict[str, set[str]] = {}
    for e in eventi:
        pid, g = e["pid"], e["giorno"]
        if pid not in primo or g < primo[pid]:
            primo[pid] = g
        if e["nome"] in ("apertura", "partita_inizio"):
            attivi.setdefault(pid, set()).add(g)

    ritorno: dict[str, dict[str, Any]] = {}
    for n in giorni:
        coorte = [p for p, g in primo.items() if _giorno(g) + timedelta(days=n) <= _giorno(oggi)]
        tornati = [
            p
            for p in coorte
            if (_giorno(primo[p]) + timedelta(days=n)).strftime("%Y-%m-%d") in attivi.get(p, set())
        ]
        ritorno[f"D{n}"] = {
            "coorte": len(coorte),
            "tornati": len(tornati),
            "quota": round(len(tornati) / len(coorte), 3) if coorte else None,
        }

    inizi = [e for e in eventi if e["nome"] == "partita_inizio"]
    fini = [e for e in eventi if e["nome"] == "partita_fine"]
    per_sessione: dict[str, int] = {}
    for e in inizi:
        per_sessione[e["sessione"]] = per_sessione.get(e["sessione"], 0) + 1
    sconfitte = [e for e in fini if e["props"].get("esito") == "sconfitta"]
    rivincite = [e for e in eventi if e["nome"] == "rivincita"]
    dopo_sconfitta = [e for e in rivincite if e["props"].get("dopo") == "sconfitta"]
    pid_inizio = {e["pid"] for e in inizi}
    pid_fine = {e["pid"] for e in fini}
    return {
        "ritorno": ritorno,
        "giocatori": len(primo),
        "partite_per_sessione": statistics.median(per_sessione.values()) if per_sessione else None,
        "completa_prima_partita": (
            round(len(pid_fine) / len(pid_inizio), 3) if pid_inizio else None
        ),
        "rivincita_dopo_sconfitta": (
            round(len(dopo_sconfitta) / len(sconfitte), 3) if sconfitte else None
        ),
        "abbandoni": sum(1 for e in eventi if e["nome"] == "abbandono"),
        "eventi": len(eventi),
    }
