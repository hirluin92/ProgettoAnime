"""La Scala (roguelike a duelli): si sale gradino dopo gradino finché non si perde.

Si parte da un mazzo di 8 carte (draft). Dopo ogni vittoria si sceglie 1 premio su 3: due carte
nuove da aggiungere al mazzo (massimo 12) oppure un rinforzo (+1 potenza a una carta). Gli
avversari diventano più forti a ogni gradino e ogni 4 c'è un boss. La corsa vive in memoria sul
server (2 ore): se il server si riavvia va persa. Un premio finale paga XP e crediti.
"""

import random
import secrets
import time
from dataclasses import dataclass, field, replace

from fastapi import APIRouter, HTTPException
from pydantic import Field

from app.duello.carte import Carta
from app.duello.motore import MAX_MAZZO, nuovo
from app.duello_api import (
    CartaView,
    DuelloState,
    PickIn,
    _deck,
    _legami,
    _valida_draft,
    mazzo_bilanciato,
    vista_carta,
    vista_stato,
)
from app.engine.models import Model
from app.profilo import UUID_RE, Premio, assegna_premio_scala

router = APIRouter(prefix="/api/scala-duelli")

MAX_GRADINI = 12
BOSS_OGNI = 4
OFFERTE = 3
POTENZA_MAX = 13
RUN_TTL = 2 * 3600


# ---------- regole pure ----------
def livello_cpu(gradino: int) -> str:
    return "facile" if gradino <= 2 else "normale" if gradino <= 6 else "difficile"


def e_boss(gradino: int) -> bool:
    return gradino % BOSS_OGNI == 0


def bonus_cpu(gradino: int) -> int:
    """Potenza in più per ogni carta avversaria: cresce di 1 ogni 3 gradini, +2 per i boss."""
    return (gradino - 1) // 3 + (2 if e_boss(gradino) else 0)


def rinforza(c: Carta, quanto: int) -> Carta:
    return replace(c, potenza=min(POTENZA_MAX, c.potenza + quanto))


def mazzo_avversario(seed: int, gradino: int, escludi: frozenset[str]) -> list[Carta]:
    base = mazzo_bilanciato(seed * 131 + gradino, escludi)
    b = bonus_cpu(gradino)
    return [rinforza(c, b) for c in base] if b else base


# ---------- modelli ----------
class OffertaView(Model):
    tipo: str  # "carta" | "rinforzo"
    carta: CartaView
    testo: str


class AvversarioView(Model):
    gradino: int
    boss: bool
    livello: str
    bonus: int
    mazzo: list[CartaView]


class RunView(Model):
    run_id: str
    gradino: int
    max_gradini: int
    mazzo: list[CartaView]
    max_mazzo: int
    avversario: AvversarioView
    vinti: int
    finita: bool


class ScalaEsito(Model):
    gradino: int
    vinto: bool | None
    finita: bool
    completata: bool
    vinti: int
    offerte: list[OffertaView]
    premio: Premio | None = None


class StartIn(Model):
    seed: int
    picks: list[PickIn] = Field(min_length=8, max_length=8)
    profile_id: str | None = None


class SceltaIn(Model):
    indice: int = Field(ge=0, le=OFFERTE - 1)


# ---------- corse ----------
@dataclass
class Corsa:
    id: str
    seed: int
    mazzo: list[Carta]
    profile_id: str | None
    gradino: int = 1
    vinti: int = 0
    offerte: list[tuple[str, Carta, int]] = field(default_factory=list)  # (tipo, carta, +potenza)
    finita: bool = False
    in_corso: bool = False  # un duello è in svolgimento
    premio: Premio | None = None
    creata: float = field(default_factory=time.time)
    iniziali: set[str] = field(default_factory=set)


CORSE: dict[str, Corsa] = {}


def _pulisci() -> None:
    t = time.time()
    for k in [k for k, c in CORSE.items() if t - c.creata > RUN_TTL]:
        CORSE.pop(k, None)


def _avversario(c: Corsa) -> AvversarioView:
    mazzo = mazzo_avversario(c.seed, c.gradino, frozenset(x.id for x in c.mazzo))
    return AvversarioView(
        gradino=c.gradino,
        boss=e_boss(c.gradino),
        livello=livello_cpu(c.gradino),
        bonus=bonus_cpu(c.gradino),
        mazzo=[vista_carta(x) for x in mazzo],
    )


def _vista(c: Corsa) -> RunView:
    return RunView(
        run_id=c.id,
        gradino=c.gradino,
        max_gradini=MAX_GRADINI,
        mazzo=[vista_carta(x) for x in c.mazzo],
        max_mazzo=MAX_MAZZO,
        avversario=_avversario(c),
        vinti=c.vinti,
        finita=c.finita,
    )


def offerte_per(c: Corsa) -> list[tuple[str, Carta, int]]:
    """Due carte nuove e un rinforzo, deterministici dal seme e dal gradino."""
    rnd = random.Random(f"offerte:{c.seed}:{c.gradino}")
    nel_mazzo = {x.id for x in c.mazzo}
    candidate = [x for x in _deck(c.seed * 7 + c.gradino)[:40] if x.id not in nel_mazzo]
    # le carte proposte salgono di valore con i gradini
    candidate.sort(key=lambda x: (x.potenza, x.id))
    meta = min(len(candidate) - 2, max(0, c.gradino * 2))
    finestra = candidate[max(0, meta - 6) : meta + 6] or candidate
    nuove = rnd.sample(finestra, 2) if len(finestra) >= 2 else finestra[:2]
    out: list[tuple[str, Carta, int]] = [("carta", x, 0) for x in nuove]
    migliorabile = [x for x in c.mazzo if x.potenza < POTENZA_MAX]
    bersaglio = rnd.choice(migliorabile or c.mazzo)
    out.append(("rinforzo", bersaglio, 1))
    return out


def _offerta_view(o: tuple[str, Carta, int]) -> OffertaView:
    tipo, carta, plus = o
    testo = (
        "Aggiungi al mazzo"
        if tipo == "carta"
        else f"Rinforzo: {carta.nome} guadagna +{plus} potenza"
    )
    return OffertaView(tipo=tipo, carta=vista_carta(carta), testo=testo)


# ---------- API ----------
@router.post("/start")
def start(body: StartIn) -> RunView:
    _pulisci()
    if body.profile_id is not None and not UUID_RE.match(body.profile_id):
        raise HTTPException(422, "id profilo non valido")
    mazzo = _valida_draft(body.seed, body.picks)
    c = Corsa(
        id=secrets.token_urlsafe(9),
        seed=body.seed,
        mazzo=mazzo,
        profile_id=body.profile_id,
        iniziali={x.id for x in mazzo},
    )
    CORSE[c.id] = c
    return _vista(c)


def _corsa(run_id: str) -> Corsa:
    c = CORSE.get(run_id)
    if c is None:
        raise HTTPException(404, "corsa non trovata o scaduta")
    return c


@router.get("/{run_id}")
def leggi(run_id: str) -> RunView:
    return _vista(_corsa(run_id))


@router.post("/{run_id}/gioca")
def gioca(run_id: str) -> DuelloState:
    """Inizia il duello del gradino attuale (poi si gioca con /api/duello/{id}/turno)."""
    from app.duello_api import PARTITE, Partita

    c = _corsa(run_id)
    if c.finita:
        raise HTTPException(409, "la corsa è finita")
    if c.offerte:
        raise HTTPException(409, "scegli prima un premio")
    if c.in_corso:
        raise HTTPException(409, "c'è già un duello in corso")
    leg, riv = _legami()
    seed = c.seed * 31 + c.gradino
    stato = nuovo(
        seed,
        c.mazzo,
        mazzo_avversario(c.seed, c.gradino, frozenset(x.id for x in c.mazzo)),
        leg,
        riv,
    )
    p = Partita(
        id=secrets.token_urlsafe(9),
        stato=stato,
        livello=livello_cpu(c.gradino),
        rng=random.Random(f"cpu:{seed}"),
        mazzo=c.mazzo,
        profile_id=None,  # il premio si paga a fine corsa, non a ogni duello
        personale=True,
        scala=run_id,
    )
    PARTITE[p.id] = p
    c.in_corso = True
    return DuelloState(id=p.id, livello=p.livello, stato=vista_stato(stato))


def chiudi(run_id: str, vinto: bool | None) -> ScalaEsito:
    """Registra l'esito di un duello della corsa (chiamato dal turno finale)."""
    c = _corsa(run_id)
    c.in_corso = False
    giocato = c.gradino
    if vinto:
        c.vinti += 1
        if giocato >= MAX_GRADINI:
            c.finita = True
        else:
            c.offerte = offerte_per(c)
    else:  # sconfitta o pareggio: la corsa finisce
        c.finita = True
    if c.finita and c.premio is None:
        c.premio = assegna_premio_scala(c.profile_id, c.vinti, [x.id for x in c.mazzo])
    return ScalaEsito(
        gradino=giocato,
        vinto=vinto,
        finita=c.finita,
        completata=bool(vinto) and giocato >= MAX_GRADINI,
        vinti=c.vinti,
        offerte=[_offerta_view(o) for o in c.offerte],
        premio=c.premio if c.finita else None,
    )


@router.post("/{run_id}/scegli")
def scegli(run_id: str, body: SceltaIn) -> RunView:
    c = _corsa(run_id)
    if not c.offerte:
        raise HTTPException(409, "nessun premio da scegliere")
    tipo, carta, plus = c.offerte[body.indice]
    if tipo == "carta":
        if (
            len(c.mazzo) >= MAX_MAZZO
        ):  # mazzo pieno: la carta nuova prende il posto della più debole
            debole = min(c.mazzo, key=lambda x: (x.potenza, x.id))
            c.mazzo.remove(debole)
        c.mazzo.append(carta)
    else:
        c.mazzo = [rinforza(x, plus) if x.id == carta.id else x for x in c.mazzo]
    c.offerte = []
    c.gradino += 1
    return _vista(c)
