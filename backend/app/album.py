"""Album delle carte e mazzi personali.

L'album mostra tutte le carte e quali si possiedono (la collezione del profilo). Un mazzo personale
è di 8 carte possedute, con dei tetti perché la collezione non decida da sola le partite: al più 2
leggendarie, 4 tra epiche e leggendarie, costo totale limitato. Il ranked usa sempre il draft.
"""

from fastapi import APIRouter, HTTPException
from pydantic import Field

from app.db.models import ProfileRow
from app.db.session import session_scope
from app.duello.carte import Carta
from app.duello_api import CartaView, _tutte, vista_carta
from app.engine.models import Model
from app.profilo import UUID_RE

router = APIRouter(prefix="/api/album")

MAZZO = 8
MAX_MAZZI = 5
MAX_LEGGENDARIE = 2
MAX_EPICHE_O_MEGLIO = 4
MAX_COSTO = 30


def rarita(rating: int) -> str:
    if rating >= 90:
        return "leggendaria"
    if rating >= 82:
        return "epica"
    if rating >= 72:
        return "rara"
    return "comune"


def errori_mazzo(ids: list[str], possedute: set[str]) -> list[str]:
    """Le ragioni per cui un mazzo non è valido (lista vuota = valido)."""
    tutte = _tutte()
    err: list[str] = []
    if len(ids) != MAZZO:
        err.append(f"servono esattamente {MAZZO} carte")
    if len(set(ids)) != len(ids):
        err.append("ci sono carte ripetute")
    sconosciute = [i for i in ids if i not in tutte]
    if sconosciute:
        return [*err, "carte sconosciute nel mazzo"]
    mancanti = [i for i in ids if i not in possedute]
    if mancanti:
        err.append("puoi usare solo carte che possiedi")
    carte: list[Carta] = [tutte[i][0] for i in ids]
    leggendarie = sum(1 for c in carte if rarita(c.rating) == "leggendaria")
    alte = sum(1 for c in carte if rarita(c.rating) in ("leggendaria", "epica"))
    costo = sum(c.costo for c in carte)
    if leggendarie > MAX_LEGGENDARIE:
        err.append(f"al massimo {MAX_LEGGENDARIE} carte leggendarie")
    if alte > MAX_EPICHE_O_MEGLIO:
        err.append(f"al massimo {MAX_EPICHE_O_MEGLIO} carte epiche o leggendarie")
    if costo > MAX_COSTO:
        err.append(f"costo totale massimo {MAX_COSTO} (il tuo è {costo})")
    return err


class AlbumCarta(Model):
    carta: CartaView
    rarita: str
    posseduta: bool


class MazzoPersonale(Model):
    nome: str = Field(min_length=1, max_length=24)
    carte: list[str]


class AlbumOut(Model):
    carte: list[AlbumCarta]
    posseduti: int
    totale: int
    mazzi: list[MazzoPersonale]
    limiti: dict[str, int]


class MazziIn(Model):
    mazzi: list[MazzoPersonale] = Field(max_length=MAX_MAZZI)


def _limiti() -> dict[str, int]:
    return {
        "mazzo": MAZZO,
        "mazzi": MAX_MAZZI,
        "leggendarie": MAX_LEGGENDARIE,
        "epiche_o_meglio": MAX_EPICHE_O_MEGLIO,
        "costo": MAX_COSTO,
    }


@router.get("/{profile_id}")
def album(profile_id: str) -> AlbumOut:
    if not UUID_RE.match(profile_id):
        raise HTTPException(422, "id profilo non valido")
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id)
        if row is None:
            raise HTTPException(404, "profilo non trovato")
        possedute = set(row.collezione or [])
        mazzi = [MazzoPersonale(**m) for m in (row.mazzi or [])]
    carte = [
        AlbumCarta(carta=vista_carta(c), rarita=rarita(c.rating), posseduta=c.id in possedute)
        for c, _ in _tutte().values()
    ]
    carte.sort(key=lambda a: (a.carta.anime, -a.carta.rating, a.carta.nome))
    return AlbumOut(
        carte=carte,
        posseduti=sum(1 for a in carte if a.posseduta),
        totale=len(carte),
        mazzi=mazzi,
        limiti=_limiti(),
    )


@router.put("/{profile_id}/mazzi")
def salva_mazzi(profile_id: str, body: MazziIn) -> list[MazzoPersonale]:
    if not UUID_RE.match(profile_id):
        raise HTTPException(422, "id profilo non valido")
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id)
        if row is None:
            raise HTTPException(404, "profilo non trovato")
        possedute = set(row.collezione or [])
        for m in body.mazzi:
            err = errori_mazzo(m.carte, possedute)
            if err:
                raise HTTPException(422, f"«{m.nome}»: " + "; ".join(err))
        row.mazzi = [m.model_dump() for m in body.mazzi]
        return body.mazzi


def mazzo_di_profilo(profile_id: str, indice: int) -> list[Carta]:
    """Il mazzo personale `indice` di un profilo, già validato (per le partite)."""
    if not UUID_RE.match(profile_id):
        raise HTTPException(422, "id profilo non valido")
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id)
        if row is None:
            raise HTTPException(404, "profilo non trovato")
        mazzi = row.mazzi or []
        if not 0 <= indice < len(mazzi):
            raise HTTPException(404, "mazzo non trovato")
        ids: list[str] = list(mazzi[indice]["carte"])
        err = errori_mazzo(ids, set(row.collezione or []))
    if err:
        raise HTTPException(422, "mazzo non valido: " + "; ".join(err))
    return [_tutte()[i][0] for i in ids]
