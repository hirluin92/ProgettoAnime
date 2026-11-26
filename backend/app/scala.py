"""La Scala (V3): avversari CPU sempre più forti, un gradino alla volta, finché non si perde.

La squadra si crea con lo stesso draft della partita veloce. Dopo ogni vittoria si sceglie un
potenziamento tra 3. Lo stato della corsa sta in memoria sul server (il giocatore non può
riprovare lo stesso gradino con un altro piano): se il server si riavvia la corsa va persa.
"""

import random
import secrets
import time
from dataclasses import dataclass, field
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import Field

from app.data_loader import load_characters, load_forms, load_ruleset
from app.db import repo
from app.draft import build_deck, forms_by_base
from app.engine import tattiche as tat
from app.engine.arene import arena_per_seme
from app.engine.assegnazione import assegna_ottimo
from app.engine.formazioni import FORMAZIONI
from app.engine.formazioni import ORDINE as FORM_ORDINE
from app.engine.models import Character, MatchResult, Model, Team
from app.engine.scoring import potenza_ruolo
from app.engine.simulate import simulate
from app.profilo import Premio, assegna_premio_scala
from app.quick import PickIn, validate_picks

router = APIRouter(prefix="/api/scala")

MAX_GRADINI = 20
RUN_TTL = 2 * 3600
OFFERTE = 3
POOL = 24  # carte tra cui si pesca l'avversario
GRADINI_AL_MASSIMO = 12  # dal gradino 13 si affrontano le 7 carte più forti del gruppo
BONUS_CPU_PER_GRADINO = 0.03
BONUS_CPU_MAX = 0.50


# ---------- potenziamenti ----------
@dataclass(frozen=True)
class Potenziamento:
    id: str
    nome: str
    descrizione: str
    atk: float = 0.0
    hp: float = 0.0
    dif: float = 0.0
    energia: int = 0
    scudo: float = 0.0


POTENZIAMENTI: dict[str, Potenziamento] = {
    p.id: p
    for p in (
        Potenziamento("furia", "Furia", "+6% attacco a tutta la squadra.", atk=0.06),
        Potenziamento("tempra", "Tempra", "+6% vita a tutta la squadra.", hp=0.06),
        Potenziamento("bastione", "Bastione", "+10% difesa a tutta la squadra.", dif=0.10),
        Potenziamento("scintilla", "Scintilla", "Si parte con +30 di energia.", energia=30),
        Potenziamento(
            "egida", "Egida", "Si parte con uno scudo pari al 12% della vita.", scudo=0.12
        ),
        Potenziamento("armonia", "Armonia", "+3% attacco e +3% vita.", atk=0.03, hp=0.03),
        Potenziamento("assalto", "Assalto rapido", "+9% attacco, -3% vita.", atk=0.09, hp=-0.03),
        Potenziamento("muraglia", "Muraglia", "+9% vita, -3% attacco.", atk=-0.03, hp=0.09),
    )
}


def offerte_per(seed: int, gradino: int) -> list[str]:
    """I 3 potenziamenti proposti dopo aver vinto il gradino (deterministici)."""
    return random.Random(f"offerte:{seed}:{gradino}").sample(list(POTENZIAMENTI), OFFERTE)


# ---------- avversari ----------
def cpu_team(seed: int, gradino: int) -> Team:
    """L'avversario del gradino: 7 carte da una finestra di forza che sale a ogni gradino."""
    chars = list(load_characters().values())
    deck = build_deck(seed * 997 + gradino, chars, forms_by_base(load_forms()))
    pool = sorted(deck[:POOL], key=lambda c: (c.rating, c.id))
    inizio = round((len(pool) - 7) * min(1.0, (gradino - 1) / GRADINI_AL_MASSIMO))
    return Team(
        nome=f"Gradino {gradino}",
        members=assegna_ottimo(pool[inizio : inizio + 7]),
        bonus_missione=min(BONUS_CPU_MAX, BONUS_CPU_PER_GRADINO * (gradino - 1)),
    )


def forza(t: Team) -> int:
    from app.engine.roles import ROLES

    return sum(potenza_ruolo(m, r) for m, r in zip(t.members, ROLES, strict=True))


# ---------- modelli ----------
class Piano(Model):
    tattiche: list[str] = Field(min_length=tat.FASI, max_length=tat.FASI)
    carica: Literal["subito", "carica"] = "subito"
    formazione: str = "classica"


class ScalaStart(Model):
    seed: int
    picks: list[PickIn] = Field(min_length=7, max_length=7)
    swap: list[str] | None = Field(default=None, min_length=2, max_length=2)
    profile_id: str | None = None


class ScalaFight(Model):
    piano: Piano
    upgrade: int | None = None  # indice (0-2) del potenziamento scelto dopo l'ultima vittoria


class OffertaView(Model):
    id: str
    nome: str
    descrizione: str


class AvversarioView(Model):
    gradino: int
    nome: str
    forza: int
    forza_tua: int
    arena: str
    arena_nome: str
    membri: list[Character]


class ScalaState(Model):
    run_id: str
    gradino: int
    max_gradini: int
    avversario: AvversarioView
    squadra: list[Character]
    potenziamenti: list[OffertaView]  # quelli già presi


class ScalaResult(Model):
    run_id: str
    match_id: str
    result: MatchResult
    vinto: bool
    gradino: int  # il gradino appena giocato
    gradini_vinti: int
    finita: bool
    completata: bool  # tutti i gradini vinti
    offerte: list[OffertaView]  # solo dopo una vittoria non finale
    prossimo: AvversarioView | None
    premio: Premio | None = None


# ---------- stato delle corse ----------
@dataclass
class Run:
    id: str
    seed: int
    squadra: list[Character]
    profile_id: str | None
    gradino: int = 1
    presi: list[str] = field(default_factory=list)
    offerte: list[str] = field(default_factory=list)  # da scegliere prima del prossimo gradino
    finita: bool = False
    creata: float = field(default_factory=time.time)


RUNS: dict[str, Run] = {}


def _pulisci() -> None:
    t = time.time()
    for rid in [r for r, run in RUNS.items() if t - run.creata > RUN_TTL]:
        RUNS.pop(rid, None)


def _squadra(run: Run) -> Team:
    t = Team(nome="Tu", members=run.squadra)
    for pid in run.presi:
        p = POTENZIAMENTI[pid]
        t.bonus_atk += p.atk
        t.bonus_hp += p.hp
        t.bonus_dif += p.dif
        t.energia_iniziale += p.energia
        t.scudo_iniziale += p.scudo
    return t


def _offerta(pid: str) -> OffertaView:
    p = POTENZIAMENTI[pid]
    return OffertaView(id=p.id, nome=p.nome, descrizione=p.descrizione)


def _avversario(run: Run, gradino: int) -> AvversarioView:
    cpu = cpu_team(run.seed, gradino)
    a = arena_per_seme(run.seed * 31 + gradino)
    return AvversarioView(
        gradino=gradino,
        nome=cpu.nome,
        forza=forza(cpu),
        forza_tua=forza(_squadra(run)),
        arena=a.id,
        arena_nome=a.nome,
        membri=cpu.members,
    )


def _stato(run: Run) -> ScalaState:
    return ScalaState(
        run_id=run.id,
        gradino=run.gradino,
        max_gradini=MAX_GRADINI,
        avversario=_avversario(run, run.gradino),
        squadra=run.squadra,
        potenziamenti=[_offerta(p) for p in run.presi],
    )


# ---------- API ----------
@router.post("/start")
def start(body: ScalaStart) -> ScalaState:
    _pulisci()
    members, _ = validate_picks(body.seed, body.picks, body.swap)
    run = Run(
        id=secrets.token_urlsafe(9), seed=body.seed, squadra=members, profile_id=body.profile_id
    )
    RUNS[run.id] = run
    return _stato(run)


@router.get("/{run_id}")
def stato(run_id: str) -> ScalaState:
    run = RUNS.get(run_id)
    if run is None:
        raise HTTPException(404, "corsa non trovata o scaduta")
    return _stato(run)


def _simula(run: Run, piano: Piano) -> MatchResult:
    cpu = cpu_team(run.seed, run.gradino)
    arena = arena_per_seme(run.seed * 31 + run.gradino).id
    rnd = random.Random(f"scala:{run.seed}:{run.gradino}")
    return simulate(
        _squadra(run),
        cpu,
        run.seed * 7 + run.gradino,
        load_ruleset(),
        tattiche={
            "A": piano.tattiche,
            "B": tat.cpu_tattiche(run.seed + run.gradino, piano.tattiche),
        },
        arena=arena,
        carica={"A": piano.carica, "B": tat.cpu_carica(run.seed + run.gradino)},
        formazione={"A": piano.formazione, "B": rnd.choice(FORM_ORDINE)},
    )


@router.post("/{run_id}/fight")
def fight(run_id: str, body: ScalaFight) -> ScalaResult:
    run = RUNS.get(run_id)
    if run is None:
        raise HTTPException(404, "corsa non trovata o scaduta")
    if run.finita:
        raise HTTPException(409, "la corsa è finita")
    if not tat.valida(body.piano.tattiche) or body.piano.formazione not in FORMAZIONI:
        raise HTTPException(422, "piano non valido")
    if run.offerte:
        if body.upgrade is None or not 0 <= body.upgrade < len(run.offerte):
            raise HTTPException(422, "scegli un potenziamento")
        run.presi.append(run.offerte[body.upgrade])
        run.offerte = []
    result = _simula(run, body.piano)
    mid = repo.save_match(result)
    vinto = result.vincitore == "A"
    giocato = run.gradino
    vinti = giocato - 1 + int(vinto)
    completata = vinto and giocato >= MAX_GRADINI
    finita = (not vinto) or completata
    premio = None
    offerte: list[OffertaView] = []
    prossimo = None
    if finita:
        run.finita = True
        premio = assegna_premio_scala(run.profile_id, vinti, [m.id for m in run.squadra])
    else:
        run.gradino += 1
        run.offerte = offerte_per(run.seed, giocato)
        offerte = [_offerta(p) for p in run.offerte]
        prossimo = _avversario(run, run.gradino)
    return ScalaResult(
        run_id=run.id,
        match_id=mid,
        result=result,
        vinto=vinto,
        gradino=giocato,
        gradini_vinti=vinti,
        finita=finita,
        completata=completata,
        offerte=offerte,
        prossimo=prossimo,
        premio=premio,
    )
