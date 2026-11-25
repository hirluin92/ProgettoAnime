import random

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from app.data_loader import load_characters, load_ruleset
from app.engine.models import MatchResult, Team
from app.engine.simulate import simulate

app = FastAPI(title="Gioco d'asta anime")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


class SimulateRequest(BaseModel):
    team_a: list[str] = Field(min_length=7, max_length=7)
    team_b: list[str] = Field(min_length=7, max_length=7)
    seed: int | None = None


def _team(name: str, ids: list[str]) -> Team:
    chars = load_characters()
    unknown = [i for i in ids if i not in chars]
    if unknown:
        raise HTTPException(422, f"personaggi inesistenti: {unknown}")
    if len(set(ids)) != len(ids):
        raise HTTPException(422, "personaggi ripetuti nella stessa squadra")
    return Team(nome=name, members=[chars[i] for i in ids])


@app.post("/api/simulate")
def api_simulate(req: SimulateRequest) -> MatchResult:
    seed = req.seed if req.seed is not None else random.randint(1, 2**31 - 1)
    return simulate(_team("A", req.team_a), _team("B", req.team_b), seed, load_ruleset())
