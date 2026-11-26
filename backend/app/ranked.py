"""Partite classificate (ranked): leghe, MMR, piazzamento, fantasmi e obiettivi settimanali.

Vale solo la bravura: ogni partita parte da un draft nuovo (mani identiche per tutti a pari seme).
L'avversario è il mazzo (da draft) di un altro giocatore di livello simile, guidato dalla CPU: un
«fantasma». Se non ce n'è nessuno vicino, uno sfidante generato. Serve un account (nome utente).
"""

import random
import secrets
import time
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from pydantic import Field
from sqlalchemy import select

from app.db.models import ProfileRow, RankedGhost, RankedSettimana
from app.db.session import session_scope
from app.duello.carte import Carta
from app.duello_api import (
    DuelloState,
    PickIn,
    _tutte,
    _valida_draft,
    mazzo_bilanciato,
    vista_stato,
)
from app.engine.models import Model
from app.profilo import UUID_RE

router = APIRouter(prefix="/api/ranked")

MMR_INIZIALE = 1000
PIAZZAMENTO = 5
K_PIAZZAMENTO = 48
K_NORMALE = 24
MAX_FANTASMI = 6  # per profilo (i più recenti)
RAGGIO_FANTASMA = 250
SOGLIE_SETTIMANA = {5: 100, 10: 150, 15: 250}  # partite → crediti
TOP = 20
RUN_TTL = 2 * 3600

LEGHE = ("Bronzo", "Argento", "Oro", "Platino", "Diamante", "Campione")
DIVISIONI = ("IV", "III", "II", "I")


# ---------- regole pure ----------
def gradino(mmr: int) -> int:
    """Gradino da 0 a 20: ogni 50 punti da 700 (Bronzo IV) fino a 1700 (Campione)."""
    return max(0, min(20, (mmr - 700) // 50))


def lega_di(mmr: int) -> tuple[str, str | None]:
    """(lega, divisione): 5 leghe da 4 divisioni (200 punti ciascuna) e Campione da 1700."""
    g = gradino(mmr)
    if g >= 20:
        return LEGHE[5], None
    return LEGHE[g // 4], DIVISIONI[g % 4]


def nuovo_mmr(mio: int, avversario: int, esito: float, partite: int) -> int:
    k = K_PIAZZAMENTO if partite < PIAZZAMENTO else K_NORMALE
    atteso = 1 / (1 + 10 ** ((avversario - mio) / 400))
    return max(100, round(mio + k * (esito - atteso)))


def settimana_di(giorno: datetime | None = None) -> str:
    d = giorno or datetime.now(UTC)
    anno, sett, _ = d.isocalendar()
    return f"{anno}-W{sett:02d}"


def livello_cpu(mmr_avv: int) -> str:
    return "difficile" if mmr_avv >= 1300 else "normale"


# ---------- modelli ----------
class AvversarioView(Model):
    nome: str
    mmr: int
    lega: str
    divisione: str | None
    fantasma: bool  # False = sfidante generato


class SogliaView(Model):
    partite: int
    crediti: int
    raggiunta: bool
    ritirata: bool


class RigaClassifica(Model):
    nome: str
    mmr: int
    lega: str
    divisione: str | None


class RankedStato(Model):
    mmr: int
    lega: str
    divisione: str | None
    partite: int
    in_piazzamento: bool
    piazzamento_rimaste: int
    settimana: str
    partite_settimana: int
    soglie: list[SogliaView]
    classifica: list[RigaClassifica]
    serve_account: bool


class RankedStart(Model):
    ranked_id: str
    seed: int
    avversario: AvversarioView


class IniziaIn(Model):
    picks: list[PickIn] = Field(min_length=8, max_length=8)


class RankedEsito(Model):
    mmr_prima: int
    mmr_dopo: int
    lega_prima: str
    divisione_prima: str | None
    lega_dopo: str
    divisione_dopo: str | None
    promosso: bool
    retrocesso: bool
    in_piazzamento: bool
    avversario: str


# ---------- sessioni ----------
class Sessione:
    def __init__(self, pid: str, seed: int, opp: AvversarioView, mazzo_opp: list[Carta]) -> None:
        self.pid = pid
        self.seed = seed
        self.opp = opp
        self.mazzo_opp = mazzo_opp
        self.creata = time.time()
        self.usata = False


SESSIONI: dict[str, Sessione] = {}


def _pulisci() -> None:
    t = time.time()
    for k in [k for k, x in SESSIONI.items() if t - x.creata > RUN_TTL]:
        SESSIONI.pop(k, None)


def _avv_view(nome: str, mmr: int, fantasma: bool) -> AvversarioView:
    lega, div = lega_di(mmr)
    return AvversarioView(nome=nome, mmr=mmr, lega=lega, divisione=div, fantasma=fantasma)


def scegli_avversario(pid: str, mmr: int, seed: int) -> tuple[AvversarioView, list[Carta]]:
    """Un fantasma di livello simile (di un altro giocatore) o, in mancanza, uno sfidante."""
    tutte = _tutte()
    with session_scope() as s:
        g = s.scalars(
            select(RankedGhost)
            .where(
                RankedGhost.profile_id != pid,
                RankedGhost.mmr >= mmr - RAGGIO_FANTASMA,
                RankedGhost.mmr <= mmr + RAGGIO_FANTASMA,
            )
            .order_by(RankedGhost.id.desc())
            .limit(30)
        ).all()
        if g:
            ghost = random.Random(f"ghost:{seed}").choice(list(g))
            if all(c in tutte for c in ghost.mazzo):
                return _avv_view(ghost.name, ghost.mmr, True), [tutte[c][0] for c in ghost.mazzo]
    # nessun fantasma: sfidante generato, con livello vicino al tuo
    deck = mazzo_bilanciato(seed + 7)
    return _avv_view("Sfidante", max(MMR_INIZIALE - 100, mmr), False), deck


def _stato(pid: str) -> RankedStato:
    sett = settimana_di()
    with session_scope() as s:
        row = s.get(ProfileRow, pid)
        if row is None:
            raise HTTPException(404, "profilo non trovato")
        w = s.scalar(
            select(RankedSettimana).where(
                RankedSettimana.profile_id == pid, RankedSettimana.settimana == sett
            )
        )
        n = w.partite if w else 0
        ritirati = set(w.ritirati or []) if w else set()
        top = s.scalars(
            select(ProfileRow)
            .where(ProfileRow.username.is_not(None), ProfileRow.ranked_partite >= PIAZZAMENTO)
            .order_by(ProfileRow.mmr.desc(), ProfileRow.id)
            .limit(TOP)
        ).all()
        lega, div = lega_di(row.mmr)
        return RankedStato(
            mmr=row.mmr,
            lega=lega,
            divisione=div,
            partite=row.ranked_partite,
            in_piazzamento=row.ranked_partite < PIAZZAMENTO,
            piazzamento_rimaste=max(0, PIAZZAMENTO - row.ranked_partite),
            settimana=sett,
            partite_settimana=n,
            soglie=[
                SogliaView(partite=k, crediti=c, raggiunta=n >= k, ritirata=k in ritirati)
                for k, c in SOGLIE_SETTIMANA.items()
            ],
            classifica=[
                RigaClassifica(
                    nome=p.name, mmr=p.mmr, lega=lega_di(p.mmr)[0], divisione=lega_di(p.mmr)[1]
                )
                for p in top
            ],
            serve_account=row.username is None,
        )


# ---------- API ----------
@router.get("/{profile_id}")
def stato(profile_id: str) -> RankedStato:
    if not UUID_RE.match(profile_id):
        raise HTTPException(422, "id profilo non valido")
    return _stato(profile_id)


@router.post("/{profile_id}/start")
def start(profile_id: str) -> RankedStart:
    if not UUID_RE.match(profile_id):
        raise HTTPException(422, "id profilo non valido")
    _pulisci()
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id)
        if row is None:
            raise HTTPException(404, "profilo non trovato")
        if row.username is None:
            raise HTTPException(
                403, "per giocare classificate serve un account: registrati dal profilo"
            )
        mmr = row.mmr
    seed = random.randint(1, 2**31 - 1)
    avv, mazzo = scegli_avversario(profile_id, mmr, seed)
    rid = secrets.token_urlsafe(9)
    SESSIONI[rid] = Sessione(profile_id, seed, avv, mazzo)
    return RankedStart(ranked_id=rid, seed=seed, avversario=avv)


@router.post("/partita/{ranked_id}/inizia")
def inizia(ranked_id: str, body: IniziaIn) -> DuelloState:
    from app.duello.motore import nuovo
    from app.duello_api import PARTITE, Partita, _legami

    ses = SESSIONI.get(ranked_id)
    if ses is None or ses.usata:
        raise HTTPException(404, "partita classificata non trovata o già iniziata")
    mazzo = _valida_draft(ses.seed, body.picks)
    ses.usata = True
    leg, riv = _legami()
    stato = nuovo(ses.seed, mazzo, ses.mazzo_opp, leg, riv)
    with session_scope() as s:
        row = s.get(ProfileRow, ses.pid)
        mmr = row.mmr if row else MMR_INIZIALE
    p = Partita(
        id=secrets.token_urlsafe(9),
        stato=stato,
        livello=livello_cpu(ses.opp.mmr),
        rng=random.Random(f"cpu:{ses.seed}"),
        mazzo=mazzo,
        profile_id=ses.pid,
        personale=True,  # niente ELO «contro CPU»: qui conta l'MMR
        ranked={"rid": ranked_id, "opp": ses.opp.model_dump(), "mmr": mmr},
    )
    PARTITE[p.id] = p
    return DuelloState(id=p.id, livello=p.livello, stato=vista_stato(stato))


def chiudi(profile_id: str, vinto: bool | None, mazzo: list[Carta], info: dict) -> RankedEsito:  # type: ignore[type-arg]
    """Applica il risultato di una partita classificata: MMR, settimana e fantasma."""
    opp = AvversarioView(**info["opp"])
    esito = 0.5 if vinto is None else (1.0 if vinto else 0.0)
    sett = settimana_di()
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id)
        if row is None:
            raise HTTPException(404, "profilo non trovato")
        prima = row.mmr
        lega_p, div_p = lega_di(prima)
        in_piaz = row.ranked_partite < PIAZZAMENTO
        row.mmr = nuovo_mmr(prima, opp.mmr, esito, row.ranked_partite)
        row.ranked_partite += 1
        lega_d, div_d = lega_di(row.mmr)
        w = s.scalar(
            select(RankedSettimana).where(
                RankedSettimana.profile_id == profile_id, RankedSettimana.settimana == sett
            )
        )
        if w is None:
            s.add(RankedSettimana(profile_id=profile_id, settimana=sett, partite=1, ritirati=[]))
        else:
            w.partite += 1
        # il mazzo diventa un fantasma per gli altri (si tengono i più recenti)
        s.add(
            RankedGhost(
                profile_id=profile_id, name=row.name, mmr=row.mmr, mazzo=[c.id for c in mazzo]
            )
        )
        s.flush()
        vecchi = s.scalars(
            select(RankedGhost)
            .where(RankedGhost.profile_id == profile_id)
            .order_by(RankedGhost.id.desc())
            .offset(MAX_FANTASMI)
        ).all()
        for g in vecchi:
            s.delete(g)
        g_prima, g_dopo = gradino(prima), gradino(row.mmr)
        return RankedEsito(
            mmr_prima=prima,
            mmr_dopo=row.mmr,
            lega_prima=lega_p,
            divisione_prima=div_p,
            lega_dopo=lega_d,
            divisione_dopo=div_d,
            promosso=g_dopo > g_prima,
            retrocesso=g_dopo < g_prima,
            in_piazzamento=in_piaz,
            avversario=opp.nome,
        )


class RitiraIn(Model):
    partite: int


class RitiraOut(Model):
    crediti: int  # guadagnati ora
    saldo: int


@router.post("/{profile_id}/ritira")
def ritira(profile_id: str, body: RitiraIn) -> RitiraOut:
    """Incassa il premio settimanale di una soglia raggiunta (una volta sola)."""
    if not UUID_RE.match(profile_id):
        raise HTTPException(422, "id profilo non valido")
    if body.partite not in SOGLIE_SETTIMANA:
        raise HTTPException(422, "soglia sconosciuta")
    sett = settimana_di()
    with session_scope() as s:
        row = s.get(ProfileRow, profile_id)
        if row is None:
            raise HTTPException(404, "profilo non trovato")
        w = s.scalar(
            select(RankedSettimana).where(
                RankedSettimana.profile_id == profile_id, RankedSettimana.settimana == sett
            )
        )
        if w is None or w.partite < body.partite:
            raise HTTPException(409, "soglia non ancora raggiunta")
        if body.partite in (w.ritirati or []):
            raise HTTPException(409, "premio già ritirato")
        w.ritirati = [*(w.ritirati or []), body.partite]
        row.crediti += SOGLIE_SETTIMANA[body.partite]
        return RitiraOut(crediti=SOGLIE_SETTIMANA[body.partite], saldo=row.crediti)
