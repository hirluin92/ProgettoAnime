"""Partita veloce: draft da solo contro la CPU (regole in PIANO_MVP.md, sezione 8)."""

import random

from fastapi import APIRouter, HTTPException
from pydantic import Field

from app.data_loader import load_characters, load_ruleset
from app.db import repo
from app.engine.models import Character, MatchResult, Model, Team
from app.engine.roles import ROLES
from app.engine.scoring import role_fit
from app.engine.simulate import simulate

BUDGET = 50
OPTIONS_PER_ROLE = 5

router = APIRouter(prefix="/api/quick")


def cost_of(rating: int) -> int:
    return max(1, round((rating - 50) / 6))


class Option(Model):
    character: Character
    cost: int


class QuickOptions(Model):
    seed: int
    budget: int
    roles: list[str]
    options: dict[str, list[Option]]


class PlayRequest(Model):
    seed: int
    picks: list[str] = Field(min_length=7, max_length=7)  # un personaggio per ruolo, in ordine


class PlayResponse(Model):
    id: str
    result: MatchResult
    spent: int
    cpu_spent: int


def build_options(seed: int) -> dict[str, list[Character]]:
    rnd = random.Random(seed)
    chars = list(load_characters().values())
    return {role: rnd.sample(chars, OPTIONS_PER_ROLE) for role in ROLES}


def cpu_draft(seed: int) -> tuple[list[Character], int]:
    options = build_options(seed + 1)
    left = BUDGET
    picks: list[Character] = []
    for i, role in enumerate(ROLES):
        roles_left = len(ROLES) - i
        reserve = roles_left - 1
        cap = max(1, min(left - reserve, round(left / roles_left * 1.3)))

        def value(c: Character, role: str = role) -> int:
            return c.rating + role_fit(c.tags, role) + (6 if c.ruolo_firma == role else 0)

        taken = {p.id for p in picks}
        pool = [c for c in options[role] if c.id not in taken]
        affordable = [c for c in pool if cost_of(c.rating) <= cap]
        choice = max(affordable, key=value) if affordable else min(pool, key=lambda c: c.rating)
        picks.append(choice)
        left -= cost_of(choice.rating)
    return picks, BUDGET - left


@router.get("/options")
def get_options(seed: int | None = None) -> QuickOptions:
    seed = seed if seed is not None else random.randint(1, 2**31 - 1)
    opts = build_options(seed)
    return QuickOptions(
        seed=seed,
        budget=BUDGET,
        roles=list(ROLES),
        options={
            r: [Option(character=c, cost=cost_of(c.rating)) for c in cs] for r, cs in opts.items()
        },
    )


@router.post("/play")
def play(req: PlayRequest) -> PlayResponse:
    return run_quick(req.seed, req.picks)


def run_quick(seed: int, pick_ids: list[str]) -> PlayResponse:
    """Valida le scelte, fa il draft della CPU e simula lo scontro (salvato nel database)."""
    opts = build_options(seed)
    picks: list[Character] = []
    for role, cid in zip(ROLES, pick_ids, strict=True):
        match = [c for c in opts[role] if c.id == cid]
        if not match:
            raise HTTPException(422, f"{cid} non è tra le opzioni del ruolo {role}")
        picks.append(match[0])
    if len({c.id for c in picks}) != len(picks):
        raise HTTPException(422, "personaggi ripetuti")
    spent = sum(cost_of(c.rating) for c in picks)
    if spent > BUDGET:
        raise HTTPException(422, f"budget superato: {spent} su {BUDGET}")
    cpu, cpu_spent = cpu_draft(seed)
    result = simulate(
        Team(nome="Tu", members=picks),
        Team(nome="CPU", members=cpu),
        seed * 7 + 1,
        load_ruleset(),
    )
    return PlayResponse(id=repo.save_match(result), result=result, spent=spent, cpu_spent=cpu_spent)
