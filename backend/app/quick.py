"""Partita veloce V3: draft con slot liberi e affinità, rilanci, carta misteriosa, poi scontro."""

import random
from functools import lru_cache
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import Field

from app.data_loader import load_characters, load_forms, load_ruleset
from app.db import repo
from app.draft import (
    BUDGET,
    CHEAP,
    MAX_HANDS,
    REROLLS,
    ROUNDS,
    build_deck,
    forms_by_base,
    hand,
    mystery_cost,
    mystery_round,
)
from app.engine import affinita
from app.engine import tattiche as tat
from app.engine.arene import arena_per_seme
from app.engine.formazioni import FORMAZIONI
from app.engine.formazioni import ORDINE as FORM_ORDINE
from app.engine.missioni import BONUS, completata, missione_per_seme
from app.engine.models import Character, MatchResult, Model, Side, Team
from app.engine.roles import ROLES
from app.engine.scoring import potenza_ruolo
from app.engine.simulate import simulate, simulate_fino_a
from app.engine.spiega import esito_fase, perche, righe_fase
from app.profilo import Partita, Premio, assegna_premio

router = APIRouter(prefix="/api/quick")


def cost_of(c: Character) -> int:
    """Prezzo misurato dal simulatore di bilanciamento (scripts/balance_v2.py)."""
    return c.costo


class Option(Model):
    character: Character
    cost: int
    affinita: dict[str, int]  # punti % per ruolo (semaforo nell'interfaccia)


class Hand(Model):
    cards: list[Option]
    mystery_cost: int  # costo della prima carta se è la carta misteriosa di questo giro


class ArenaInfo(Model):
    id: str
    nome: str
    descrizione: str


class MissioneInfo(Model):
    id: str
    nome: str
    descrizione: str


class MissioneEsito(Model):
    id: str
    nome: str
    descrizione: str
    riuscita: bool
    bonus: float  # +x% attacco e vita se completata
    cpu_riuscita: bool


class DraftOptions(Model):
    seed: int
    missione: MissioneInfo  # obiettivo segreto: se lo completi, +3% attacco e vita
    arena: ArenaInfo  # regola della partita, nota prima del draft
    budget: int
    roles: list[str]
    rerolls: int
    mystery_round: int
    cheap: int  # regola anti-blocco: spesi + costo + cheap × giri rimasti <= budget
    hands: list[Hand]


class PickIn(Model):
    id: str
    role: str
    hand: int = Field(ge=0)  # indice della mano da cui è stata scelta


class PlayRequest(Model):
    seed: int
    picks: list[PickIn] = Field(min_length=ROUNDS, max_length=ROUNDS)  # in ordine di giro
    swap: list[str] | None = Field(default=None, min_length=2, max_length=2)  # scambio finale
    tattiche: list[str] = Field(min_length=tat.FASI, max_length=tat.FASI)  # una per fase
    carica: Literal["subito", "carica"] = "subito"  # quando lanciare la mossa finale
    formazione: str = "classica"
    profile_id: str | None = None  # se presente: XP, obiettivi, collezione e stagione


class PlayResponse(Model):
    id: str
    result: MatchResult
    spent: int
    cpu_spent: int
    missione: MissioneEsito
    premio: Premio | None = None
    perche: list[str] = Field(default_factory=list)  # i motivi del risultato, in italiano


@lru_cache(maxsize=256)
def deck_for(seed: int) -> tuple[Character, ...]:
    chars = list(load_characters().values())
    return tuple(build_deck(seed, chars, forms_by_base(load_forms())))


def draft_options(seed: int) -> DraftOptions:
    deck = list(deck_for(seed))
    hands = []
    for h in range(MAX_HANDS):
        cards = hand(deck, h)
        hands.append(
            Hand(
                cards=[
                    Option(character=c, cost=cost_of(c), affinita=affinita.tutte(c)) for c in cards
                ],
                mystery_cost=mystery_cost(cards[0]),
            )
        )
    ar = arena_per_seme(seed)
    mi = missione_per_seme(seed, "tu")
    return DraftOptions(
        seed=seed,
        missione=MissioneInfo(id=mi.id, nome=mi.nome, descrizione=mi.descrizione),
        arena=ArenaInfo(id=ar.id, nome=ar.nome, descrizione=ar.descrizione),
        budget=BUDGET,
        roles=list(ROLES),
        rerolls=REROLLS,
        mystery_round=mystery_round(seed),
        cheap=CHEAP,
        hands=hands,
    )


def _best_slot(c: Character, free: list[int]) -> int:
    return max(free, key=lambda i: potenza_ruolo(c, ROLES[i]))


def cpu_draft(seed: int) -> tuple[list[Character], int]:
    """La CPU gioca lo stesso draft (mazzo del seme+1, senza rilanci) e piazza al meglio."""
    deck = list(deck_for(seed + 1))
    mist = mystery_round(seed + 1)
    free = list(range(len(ROLES)))
    slots: dict[int, Character] = {}
    left = BUDGET
    for r in range(ROUNDS):
        cards = hand(deck, r)
        rounds_left = ROUNDS - r
        if r == mist:
            card = cards[0]
            cost = mystery_cost(card)
            slot = _best_slot(card, free)
        else:
            cap = min(left - CHEAP * (rounds_left - 1), round(left / rounds_left * 1.3))
            ok = [c for c in cards if cost_of(c) <= cap]
            if ok:
                card, slot = max(
                    ((c, i) for c in ok for i in free),
                    key=lambda t: (potenza_ruolo(t[0], ROLES[t[1]]), -cost_of(t[0]), -t[1]),
                )
            else:
                card = min(cards, key=lambda c: (cost_of(c), c.rating))
                slot = _best_slot(card, free)
            cost = cost_of(card)
        slots[slot] = card
        free.remove(slot)
        left -= cost
    return [slots[i] for i in range(len(ROLES))], BUDGET - left


@router.get("/draft")
def get_draft(seed: int | None = None) -> DraftOptions:
    seed = seed if seed is not None else random.randint(1, 2**31 - 1)
    return draft_options(seed)


@router.post("/play")
def play(req: PlayRequest) -> PlayResponse:
    res = run_quick(req.seed, req.picks, req.swap, req.tattiche, req.carica, req.formazione)
    res.premio = premio_per(res, "veloce", req.profile_id)
    return res


def validate_picks(
    seed: int, picks: list[PickIn], swap: list[str] | None
) -> tuple[list[Character], int]:
    """Ricalcola il draft dal seme: ogni carta deve essere davvero nella mano indicata."""
    deck = list(deck_for(seed))
    mist = mystery_round(seed)
    chosen: dict[str, Character] = {}
    spent = 0
    prev = -1
    for r, pk in enumerate(picks):
        if pk.role not in ROLES or pk.role in chosen:
            raise HTTPException(422, f"ruolo non valido o ripetuto: {pk.role}")
        if pk.hand <= prev or pk.hand >= MAX_HANDS:
            raise HTTPException(422, "mano non valida")
        cards = hand(deck, pk.hand)
        if r == mist:
            if pk.hand != prev + 1:
                raise HTTPException(422, "la carta misteriosa non si può rilanciare")
            card, cost = cards[0], mystery_cost(cards[0])
            if pk.id != card.id:
                raise HTTPException(422, "la carta misteriosa non corrisponde")
        else:
            match = [c for c in cards if c.id == pk.id]
            if not match:
                raise HTTPException(422, f"{pk.id} non è nella mano {pk.hand}")
            card, cost = match[0], cost_of(match[0])
        chosen[pk.role] = card
        spent += cost
        prev = pk.hand
    if prev - (ROUNDS - 1) > REROLLS:
        raise HTTPException(422, f"troppi rilanci (massimo {REROLLS})")
    if len({c.id for c in chosen.values()}) != len(chosen):
        raise HTTPException(422, "personaggi ripetuti")
    if spent > BUDGET:
        raise HTTPException(422, f"budget superato: {spent} su {BUDGET}")
    if swap is not None:
        a, b = swap
        if a not in ROLES or b not in ROLES or a == b:
            raise HTTPException(422, "scambio non valido")
        chosen[a], chosen[b] = chosen[b], chosen[a]
    return [chosen[r] for r in ROLES], spent


def premio_per(
    res: PlayResponse, kind: str, profile_id: str | None, score: int | None = None
) -> Premio | None:
    squadra = res.result.squadre["A"].members
    partita = Partita(
        result=res.result,
        missione_ok=res.missione.riuscita,
        kind=kind,
        forme=sum(1 for m in squadra if m.forma),
    )
    return assegna_premio(profile_id, partita, [m.id for m in squadra], score)


def cpu_formazione(seed: int) -> str:
    return random.Random(f"formazione:{seed}").choice(FORM_ORDINE)


def _squadre(seed: int, members: list[Character], spent: int):  # type: ignore[no-untyped-def]
    """Le due squadre (con il bonus missione) e gli esiti delle missioni."""
    cpu, cpu_spent = cpu_draft(seed)
    regole = load_ruleset()
    mia = missione_per_seme(seed, "tu")
    sua = missione_per_seme(seed, "cpu")
    team_a = Team(nome="Tu", members=members)
    team_b = Team(nome="CPU", members=cpu)
    ok_a = completata(mia.id, team_a, BUDGET - spent, regole)
    ok_b = completata(sua.id, team_b, BUDGET - cpu_spent, regole)
    team_a.bonus_missione = BONUS if ok_a else 0.0
    team_b.bonus_missione = BONUS if ok_b else 0.0
    return team_a, team_b, cpu_spent, ok_a, ok_b, mia


def run_quick(
    seed: int,
    picks: list[PickIn],
    swap: list[str] | None,
    tattiche: list[str],
    carica: str = "subito",
    formazione: str = "classica",
) -> PlayResponse:
    """Valida le scelte, fa il draft della CPU e simula lo scontro (salvato nel database)."""
    members, spent = validate_picks(seed, picks, swap)
    if not tat.valida(tattiche):
        raise HTTPException(422, "tattiche non valide")
    if formazione not in FORMAZIONI:
        raise HTTPException(422, "formazione non valida")
    team_a, team_b, cpu_spent, ok_a, ok_b, mia = _squadre(seed, members, spent)
    result = simulate(
        team_a,
        team_b,
        seed * 7 + 1,
        load_ruleset(),
        tattiche={"A": tattiche, "B": tat.cpu_tattiche(seed, tattiche)},
        arena=arena_per_seme(seed).id,
        carica={"A": carica, "B": tat.cpu_carica(seed)},
        formazione={"A": formazione, "B": cpu_formazione(seed)},
    )
    esito = MissioneEsito(
        id=mia.id,
        nome=mia.nome,
        descrizione=mia.descrizione,
        riuscita=ok_a,
        bonus=BONUS,
        cpu_riuscita=ok_b,
    )
    return PlayResponse(
        id=repo.save_match(result),
        result=result,
        spent=spent,
        cpu_spent=cpu_spent,
        missione=esito,
        perche=perche(result),
    )


# ---------- anteprima di fase (tattiche scelte una fase alla volta) ----------
class FaseIn(Model):
    seed: int
    picks: list[PickIn] = Field(min_length=7, max_length=7)
    swap: list[str] | None = Field(default=None, min_length=2, max_length=2)
    tattiche: list[str] = Field(min_length=1, max_length=2)  # quelle già scelte (1 o 2)
    carica: Literal["subito", "carica"] = "subito"
    formazione: str = "classica"


class MembroFase(Model):
    nome: str
    hp_pct: int
    vivo: bool


class FaseOut(Model):
    fase: int  # fasi già giocate (1 o 2)
    tue: list[str]
    cpu: list[str]
    confronti: list[str]  # una frase per fase giocata
    membri: dict[str, list[MembroFase]]
    percento: dict[str, int]
    righe: list[str]  # i momenti importanti dell'ultima fase
    finita: bool


@router.post("/fase")
def anteprima_fase(req: FaseIn) -> FaseOut:
    """Gioca le prime fasi con le tattiche già scelte e mostra come è andata, senza spoiler.

    Le scelte della CPU per le fasi successive non vengono rivelate; il risultato finale
    resta quello di /play con lo stesso piano completo (la simulazione è deterministica).
    """
    members, spent = validate_picks(req.seed, req.picks, req.swap)
    if any(t not in tat.TATTICHE for t in req.tattiche):
        raise HTTPException(422, "tattiche non valide")
    if req.formazione not in FORMAZIONI:
        raise HTTPException(422, "formazione non valida")
    fase = len(req.tattiche)
    team_a, team_b, _, _, _, _ = _squadre(req.seed, members, spent)
    piano = req.tattiche + ["assalto"] * (tat.FASI - fase)  # le fasi future non influiscono
    cpu_piano = tat.cpu_tattiche(req.seed, piano)
    eventi, hp, mx = simulate_fino_a(
        team_a,
        team_b,
        req.seed * 7 + 1,
        load_ruleset(),
        {"A": piano, "B": cpu_piano},
        tat.FASE_INIZIO[fase] - 1,
        arena=arena_per_seme(req.seed).id,
        carica={"A": req.carica, "B": tat.cpu_carica(req.seed)},
        formazione={"A": req.formazione, "B": cpu_formazione(req.seed)},
    )
    squadre: dict[Side, Team] = {"A": team_a, "B": team_b}
    membri = {
        s: [
            MembroFase(nome=m.nome, hp_pct=round(100 * h / x) if x else 0, vivo=h > 0)
            for m, h, x in zip(squadre[s].members, hp[s], mx[s], strict=True)
        ]
        for s in ("A", "B")
    }
    pct = {s: round(100 * sum(hp[s]) / max(1, sum(mx[s]))) for s in ("A", "B")}
    return FaseOut(
        fase=fase,
        tue=req.tattiche,
        cpu=cpu_piano[:fase],
        confronti=[esito_fase(req.tattiche[i], cpu_piano[i]) for i in range(fase)],
        membri=membri,
        percento=pct,
        righe=righe_fase(squadre, eventi, fase),
        finita=not any(hp["A"]) or not any(hp["B"]),
    )
