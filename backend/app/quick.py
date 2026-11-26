"""Partita veloce V3: draft con slot liberi e affinità, rilanci, carta misteriosa, poi scontro."""

from functools import lru_cache

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
from app.engine.models import Character, MatchResult, Model, Team
from app.engine.roles import ROLES
from app.engine.scoring import potenza_ruolo
from app.engine.simulate import simulate

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


class DraftOptions(Model):
    seed: int
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


class PlayResponse(Model):
    id: str
    result: MatchResult
    spent: int
    cpu_spent: int


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
    return DraftOptions(
        seed=seed,
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
    import random

    seed = seed if seed is not None else random.randint(1, 2**31 - 1)
    return draft_options(seed)


@router.post("/play")
def play(req: PlayRequest) -> PlayResponse:
    return run_quick(req.seed, req.picks, req.swap, req.tattiche)


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


def run_quick(
    seed: int, picks: list[PickIn], swap: list[str] | None, tattiche: list[str]
) -> PlayResponse:
    """Valida le scelte, fa il draft della CPU e simula lo scontro (salvato nel database)."""
    members, spent = validate_picks(seed, picks, swap)
    if not tat.valida(tattiche):
        raise HTTPException(422, "tattiche non valide")
    cpu, cpu_spent = cpu_draft(seed)
    result = simulate(
        Team(nome="Tu", members=members),
        Team(nome="CPU", members=cpu),
        seed * 7 + 1,
        load_ruleset(),
        tattiche={"A": tattiche, "B": tat.cpu_tattiche(seed, tattiche)},
    )
    return PlayResponse(id=repo.save_match(result), result=result, spent=spent, cpu_spent=cpu_spent)
