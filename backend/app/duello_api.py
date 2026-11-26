"""API del Duello contro la CPU: draft di 8 carte e partite a sessione (in memoria, 2 ore)."""

import random
import secrets
import time
import zlib
from dataclasses import dataclass, field
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.data_loader import load_characters, load_forms, load_ruleset
from app.db.models import DuelloGiorno
from app.db.session import session_scope
from app.draft import build_deck, forms_by_base, hand
from app.duello import ai
from app.duello.carte import Carta, carta_da, descr_mossa, descr_passiva
from app.duello.luoghi import LUOGHI
from app.duello.motore import (
    CORSIE,
    MossaNonValida,
    Stato,
    corsie_vinte,
    energia,
    gioca_turno,
    nuovo,
    potenze_corsia,
    totali,
)
from app.engine.models import Character, Model
from app.profilo import Premio, assegna_premio_duello

router = APIRouter(prefix="/api/duello")

MAZZO = 8
RILANCI = 2
MANI = MAZZO + RILANCI
RUN_TTL = 2 * 3600


# ---------- carte e viste ----------
@lru_cache
def _tutte() -> dict[str, tuple[Carta, str | None]]:
    out: dict[str, tuple[Carta, str | None]] = {}
    for c in [*load_characters().values(), *load_forms().values()]:
        out[c.id] = (carta_da(c), c.immagine_url)
    return out


def _pool() -> list[Carta]:
    return [c for c, _ in _tutte().values()]


@lru_cache
def _legami() -> tuple[frozenset[frozenset[str]], frozenset[frozenset[str]]]:
    r = load_ruleset()
    return (
        frozenset(frozenset({d.a, d.b}) for d in r.duos),
        frozenset(frozenset({d.a, d.b}) for d in r.rivalita),
    )


class CartaView(Model):
    id: str
    nome: str
    anime: str
    arch: str
    potenza: int
    costo: int
    mossa: str
    passiva: str
    testo_mossa: str
    testo_passiva: str
    forma: str | None
    rating: int
    immagine_url: str | None


class LuogoView(Model):
    id: str
    nome: str
    regola: str
    favorisce: list[str]


class IstanzaView(Model):
    uid: int
    carta: CartaView
    lato: int
    corsia: int
    potenza: int
    mod: int


class StatoView(Model):
    turno: int
    turni: int
    energia: int  # del giocatore in questo turno
    energia_cpu: int
    mano: list[CartaView]
    mano_cpu: int
    mazzo: int
    mazzo_cpu: int
    luoghi: list[LuogoView]
    corsie: list[list[list[IstanzaView]]]  # [corsia][lato] (lato 0 = giocatore, 1 = CPU)
    totali: list[list[int]]
    corsie_vinte: list[int]
    finita: bool
    vincitore: int | None


def vista_carta(c: Carta) -> CartaView:
    return CartaView(
        id=c.id,
        nome=c.nome,
        anime=c.anime,
        arch=c.arch,
        potenza=c.potenza,
        costo=c.costo,
        mossa=c.mossa,
        passiva=c.passiva,
        testo_mossa=descr_mossa(c.mossa, c.magnitudo),
        testo_passiva=descr_passiva(c.passiva, c.magnitudo),
        forma=c.forma,
        rating=c.rating,
        immagine_url=_tutte()[c.id][1],
    )


def _flip(lato: int, x: int) -> int:
    """Indice dal punto di vista di `lato`: 0 = chi guarda, 1 = l'avversario."""
    return x if lato == 0 else 1 - x


def vista_stato(stato: Stato, lato: int = 0) -> StatoView:
    """La plancia vista da `lato` (0 = chi guarda sempre a sinistra). Mano e mazzo: solo i suoi."""
    altro = 1 - lato
    corsie: list[list[list[IstanzaView]]] = []
    for c in range(CORSIE):
        eff, _ = potenze_corsia(stato, c)
        corsie.append(
            [
                [
                    IstanzaView(
                        uid=i.uid,
                        carta=vista_carta(i.carta),
                        lato=_flip(lato, i.lato),
                        corsia=i.corsia,
                        potenza=eff[i.uid],
                        mod=i.mod,
                    )
                    for i in stato.corsie[c][l]
                ]
                for l in (lato, altro)  # noqa: E741
            ]
        )
    v = corsie_vinte(stato)
    return StatoView(
        turno=stato.turno,
        turni=6,
        energia=energia(stato, lato),
        energia_cpu=energia(stato, altro),
        mano=[vista_carta(c) for c in stato.lati[lato].mano],
        mano_cpu=len(stato.lati[altro].mano),
        mazzo=len(stato.lati[lato].mazzo),
        mazzo_cpu=len(stato.lati[altro].mazzo),
        luoghi=[
            LuogoView(
                id=LUOGHI[i].id,
                nome=LUOGHI[i].nome,
                regola=LUOGHI[i].regola,
                favorisce=sorted(LUOGHI[i].favorisce),
            )
            for i in stato.luoghi
        ],
        corsie=corsie,
        totali=[[t[lato], t[altro]] for t in totali(stato)],
        corsie_vinte=[v[lato], v[altro]],
        finita=stato.finita,
        vincitore=None if stato.vincitore is None else _flip(lato, stato.vincitore),
    )


def eventi_per_lato(eventi: list[dict[str, Any]], lato: int) -> list[dict[str, Any]]:
    """Gli eventi del turno dal punto di vista di `lato`, con i dati delle carte svelate."""
    out: list[dict[str, Any]] = []
    for e in eventi:
        e = dict(e)
        if "lato" in e:
            e["lato"] = _flip(lato, e["lato"])
        if "primo" in e:
            e["primo"] = _flip(lato, e["primo"])
        if e.get("t") == "rivela":
            e["carta_view"] = vista_carta(_tutte()[e["carta"]][0]).model_dump()
        if e.get("t") == "punteggi":
            e["corsie"] = [[t[lato], t[1 - lato]] for t in e["corsie"]]
        if e.get("t") == "fine":
            if e["vincitore"] is not None:
                e["vincitore"] = _flip(lato, e["vincitore"])
            e["corsie_vinte"] = [e["corsie_vinte"][lato], e["corsie_vinte"][1 - lato]]
            e["corsie"] = [[t[lato], t[1 - lato]] for t in e["corsie"]]
        out.append(e)
    return out


# ---------- draft ----------
class DraftDuello(Model):
    seed: int
    mazzo: int
    rilanci: int
    mani: list[list[CartaView]]


class PickIn(Model):
    id: str
    hand: int = Field(ge=0)


def _deck_ch(seed: int) -> list[Character]:
    chars = list(load_characters().values())
    return build_deck(seed, chars, forms_by_base(load_forms()))


def _deck(seed: int) -> list[Carta]:
    return [_tutte()[c.id][0] for c in _deck_ch(seed)]


def _mano(seed: int, h: int) -> list[Carta]:
    return [_tutte()[c.id][0] for c in hand(_deck_ch(seed), h)]


@router.get("/draft")
def draft(seed: int | None = None) -> DraftDuello:
    seed = seed if seed is not None else random.randint(1, 2**31 - 1)
    return DraftDuello(
        seed=seed,
        mazzo=MAZZO,
        rilanci=RILANCI,
        mani=[[vista_carta(c) for c in _mano(seed, h)] for h in range(MANI)],
    )


def _valida_draft(seed: int, picks: list[PickIn]) -> list[Carta]:
    if len(picks) != MAZZO:
        raise HTTPException(422, f"servono {MAZZO} carte")
    out: list[Carta] = []
    prev = -1
    for pk in picks:
        if pk.hand <= prev or pk.hand >= MANI:
            raise HTTPException(422, "mano non valida")
        card = next((c for c in _mano(seed, pk.hand) if c.id == pk.id), None)
        if card is None:
            raise HTTPException(422, f"{pk.id} non è nella mano {pk.hand}")
        out.append(card)
        prev = pk.hand
    if prev - (MAZZO - 1) > RILANCI:
        raise HTTPException(422, f"troppi rilanci (massimo {RILANCI})")
    return out


def mazzo_bilanciato(seed: int, escludi: frozenset[str] = frozenset()) -> list[Carta]:
    """8 carte con una buona curva di costi (per la CPU e per il rompicapo del giorno)."""
    deck = [c for c in _deck(seed)[:60] if c.id not in escludi][:40]
    obiettivo = {1: 1, 2: 2, 3: 2, 4: 2, 5: 1}
    scelte: list[Carta] = []
    for costo, n in obiettivo.items():
        candidate = sorted(
            (c for c in deck if c.costo == costo and c not in scelte),
            key=lambda c: (-c.potenza, c.id),
        )
        scelte += candidate[:n]
    for c in sorted(deck, key=lambda c: (-c.potenza, c.id)):
        if len(scelte) >= MAZZO:
            break
        if c not in scelte:
            scelte.append(c)
    return scelte[:MAZZO]


def mazzo_cpu(seed: int, escludi: frozenset[str] = frozenset()) -> list[Carta]:
    return mazzo_bilanciato(seed + 1, escludi)


# ---------- partite ----------
@dataclass
class Partita:
    id: str
    stato: Stato
    livello: str
    rng: random.Random
    mazzo: list[Carta]
    profile_id: str | None
    premio: Premio | None = None
    personale: bool = False  # mazzo dell'album o ranked: non vale per l'ELO contro la CPU
    ranked: dict | None = None  # type: ignore[type-arg]  # partita classificata: info avversario
    ranked_esito: Any = None
    giorno: str | None = None  # rompicapo del giorno: giorno e nome del giocatore
    nome: str | None = None
    creata: float = field(default_factory=time.time)


PARTITE: dict[str, Partita] = {}


def _pulisci() -> None:
    t = time.time()
    for k in [k for k, p in PARTITE.items() if t - p.creata > RUN_TTL]:
        PARTITE.pop(k, None)


class StartIn(Model):
    seed: int
    picks: list[PickIn] = Field(min_length=MAZZO, max_length=MAZZO)
    livello: str = "normale"
    profile_id: str | None = None


class StartPersonaleIn(Model):
    profile_id: str
    mazzo: int = Field(ge=0, le=9)
    livello: str = "normale"


class MossaIn(Model):
    carta: str
    corsia: int


class TurnoIn(Model):
    mosse: list[MossaIn] = Field(default_factory=list, max_length=12)


class DuelloState(Model):
    id: str
    livello: str
    stato: StatoView


class TurnoOut(Model):
    id: str
    eventi: list[dict[str, Any]]
    stato: StatoView
    mosse_cpu: list[MossaIn]
    finita: bool
    vinto: bool | None
    premio: Premio | None = None
    ranked: Any = None  # esito classificato (RankedEsito) se è una partita ranked


@router.post("/start")
def start(body: StartIn) -> DuelloState:
    _pulisci()
    if body.livello not in ai.LIVELLI:
        raise HTTPException(422, "livello non valido")
    mazzo = _valida_draft(body.seed, body.picks)
    leg, riv = _legami()
    stato = nuovo(body.seed, mazzo, mazzo_cpu(body.seed), leg, riv)
    p = Partita(
        id=secrets.token_urlsafe(9),
        stato=stato,
        livello=body.livello,
        rng=random.Random(f"cpu:{body.seed}"),
        mazzo=mazzo,
        profile_id=body.profile_id,
    )
    PARTITE[p.id] = p
    return DuelloState(id=p.id, livello=p.livello, stato=vista_stato(stato))


@router.post("/start-personale")
def start_personale(body: StartPersonaleIn) -> DuelloState:
    """Partita con un proprio mazzo dell'album: niente ELO (il ranked è sempre a draft)."""
    from app.album import mazzo_di_profilo

    _pulisci()
    if body.livello not in ai.LIVELLI:
        raise HTTPException(422, "livello non valido")
    mazzo = mazzo_di_profilo(body.profile_id, body.mazzo)
    seed = random.randint(1, 2**31 - 1)
    leg, riv = _legami()
    stato = nuovo(seed, mazzo, mazzo_cpu(seed), leg, riv)
    p = Partita(
        id=secrets.token_urlsafe(9),
        stato=stato,
        livello=body.livello,
        rng=random.Random(f"cpu:{seed}"),
        mazzo=mazzo,
        profile_id=body.profile_id,
        personale=True,
    )
    PARTITE[p.id] = p
    return DuelloState(id=p.id, livello=p.livello, stato=vista_stato(stato))


@router.get("/{partita_id}")
def leggi(partita_id: str) -> DuelloState:
    p = PARTITE.get(partita_id)
    if p is None:
        raise HTTPException(404, "partita non trovata o scaduta")
    return DuelloState(id=p.id, livello=p.livello, stato=vista_stato(p.stato))


def _eventi_con_carte(stato: Stato, eventi: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Aggiunge ai 'rivela' i dati della carta: la vista li usa per l'animazione."""
    out = []
    for e in eventi:
        e = dict(e)
        if e.get("t") == "rivela":
            c = _tutte()[e["carta"]][0]
            e["carta_view"] = vista_carta(c).model_dump()
        out.append(e)
    return out


@router.post("/{partita_id}/turno")
def turno(partita_id: str, body: TurnoIn) -> TurnoOut:
    p = PARTITE.get(partita_id)
    if p is None:
        raise HTTPException(404, "partita non trovata o scaduta")
    s = p.stato
    if s.finita:
        raise HTTPException(409, "la partita è finita")
    mie = [(m.carta, m.corsia) for m in body.mosse]
    cpu = ai.scegli(s, 1, p.livello, p.rng, _pool())
    try:
        eventi = gioca_turno(s, mie, cpu)
    except MossaNonValida as e:
        raise HTTPException(422, str(e)) from e
    vinto: bool | None = None
    if s.finita:
        vinto = None if s.vincitore is None else s.vincitore == 0
        if p.premio is None:
            p.premio = assegna_premio_duello(
                p.profile_id, vinto, p.livello, [c.id for c in p.mazzo], conta_elo=not p.personale
            )
            if p.giorno and p.nome:
                _registra_giorno(p, s)
            if p.ranked and p.profile_id and p.ranked_esito is None:
                from app.ranked import chiudi

                p.ranked_esito = chiudi(p.profile_id, vinto, p.mazzo, p.ranked)
    return TurnoOut(
        id=p.id,
        eventi=_eventi_con_carte(s, eventi),
        stato=vista_stato(s),
        mosse_cpu=[MossaIn(carta=c, corsia=k) for c, k in cpu],
        finita=s.finita,
        vinto=vinto,
        premio=p.premio,
        ranked=p.ranked_esito,
    )


# ---------- rompicapo del giorno ----------
GIORNO_LIVELLO = "normale"
TOP = 20


def oggi() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d")


def seed_giorno(day: str) -> int:
    return zlib.crc32(f"duello:{day}".encode()) & 0x7FFFFFFF


class GiornoRiga(Model):
    nome: str
    stelle: int
    punteggio: int


class GiornoInfo(Model):
    day: str
    mazzo: list[CartaView]
    mazzo_cpu: list[CartaView]
    classifica: list[GiornoRiga]


class GiornoStart(Model):
    name: str = Field(min_length=1, max_length=24)
    profile_id: str | None = None


class GiornoEsito(Model):
    stelle: int
    punteggio: int
    posizione: int
    classifica: list[GiornoRiga]


def classifica(day: str) -> list[GiornoRiga]:
    with session_scope() as s:
        rows = s.scalars(
            select(DuelloGiorno)
            .where(DuelloGiorno.day == day)
            .order_by(DuelloGiorno.stelle.desc(), DuelloGiorno.punteggio.desc(), DuelloGiorno.id)
        ).all()
        return [GiornoRiga(nome=r.name, stelle=r.stelle, punteggio=r.punteggio) for r in rows]


def stelle_e_punteggio(stato: Stato) -> tuple[int, int]:
    """0 = sconfitta, 1 = pareggio, 2 = vittoria, 3 = vittoria con tutte e 3 le corsie."""
    tot = totali(stato)
    margine = sum(t[0] - t[1] for t in tot)
    if stato.vincitore is None:
        return 1, margine
    if stato.vincitore != 0:
        return 0, margine
    return (3 if corsie_vinte(stato)[0] == 3 else 2), margine


def _registra_giorno(p: Partita, stato: Stato) -> None:
    assert p.giorno and p.nome
    stelle, margine = stelle_e_punteggio(stato)
    try:
        with session_scope() as s:
            s.add(
                DuelloGiorno(
                    day=p.giorno,
                    name=p.nome,
                    name_key=p.nome.lower(),
                    stelle=stelle,
                    punteggio=margine,
                )
            )
    except IntegrityError:
        pass


def _mazzo_cpu_giorno(seed: int) -> list[Carta]:
    return mazzo_cpu(seed, frozenset(c.id for c in mazzo_bilanciato(seed)))


@router.get("/giorno/info")
def giorno_info() -> GiornoInfo:
    day = oggi()
    seed = seed_giorno(day)
    return GiornoInfo(
        day=day,
        mazzo=[vista_carta(c) for c in mazzo_bilanciato(seed)],
        mazzo_cpu=[vista_carta(c) for c in _mazzo_cpu_giorno(seed)],
        classifica=classifica(day)[:TOP],
    )


@router.post("/giorno/start")
def giorno_start(body: GiornoStart) -> DuelloState:
    _pulisci()
    day = oggi()
    name = body.name.strip()
    if not name:
        raise HTTPException(422, "serve un nome")
    with session_scope() as s:
        if s.scalar(
            select(DuelloGiorno).where(
                DuelloGiorno.day == day, DuelloGiorno.name_key == name.lower()
            )
        ):
            raise HTTPException(409, "hai già giocato il rompicapo di oggi con questo nome")
    seed = seed_giorno(day)
    leg, riv = _legami()
    mio = mazzo_bilanciato(seed)
    stato = nuovo(seed, mio, _mazzo_cpu_giorno(seed), leg, riv)
    p = Partita(
        id=secrets.token_urlsafe(9),
        stato=stato,
        livello=GIORNO_LIVELLO,
        rng=random.Random(f"cpu:{seed}"),
        mazzo=mio,
        profile_id=body.profile_id,
        giorno=day,
        nome=name,
    )
    PARTITE[p.id] = p
    return DuelloState(id=p.id, livello=p.livello, stato=vista_stato(stato))


@router.get("/giorno/{partita_id}/esito")
def giorno_esito(partita_id: str) -> GiornoEsito:
    p = PARTITE.get(partita_id)
    if p is None or not p.giorno or not p.nome:
        raise HTTPException(404, "partita non trovata")
    if not p.stato.finita:
        raise HTTPException(409, "la partita non è finita")
    stelle, margine = stelle_e_punteggio(p.stato)
    board = classifica(p.giorno)
    pos = next((i for i, r in enumerate(board, 1) if r.nome.lower() == p.nome.lower()), 0)
    return GiornoEsito(stelle=stelle, punteggio=margine, posizione=pos, classifica=board[:TOP])
