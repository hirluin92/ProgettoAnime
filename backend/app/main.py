import os
import random
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.data_loader import load_characters, load_ruleset
from app.db import repo
from app.db.session import init_db
from app.engine.models import MatchResult, Team
from app.engine.simulate import simulate


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(title="Gioco d'asta anime", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


class SimulateRequest(BaseModel):
    team_a: list[str] = Field(min_length=7, max_length=7)
    team_b: list[str] = Field(min_length=7, max_length=7)
    seed: int | None = None


class StoredMatch(BaseModel):
    id: str
    result: MatchResult


def make_team(name: str, ids: list[str]) -> Team:
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
    return simulate(make_team("A", req.team_a), make_team("B", req.team_b), seed, load_ruleset())


@app.post("/api/dev/random-match")
def random_match() -> StoredMatch:
    """Scontro tra due squadre casuali, salvato: serve alla pagina /dev/scontro."""
    chars = list(load_characters().values())
    picks = random.sample(chars, 14)
    result = simulate(
        Team(nome="Lame dell'Alba", members=picks[:7]),
        Team(nome="Corvi del Vuoto", members=picks[7:]),
        random.randint(1, 9999),
        load_ruleset(),
    )
    return StoredMatch(id=repo.save_match(result), result=result)


@app.get("/api/matches/{match_id}")
def get_match(match_id: str) -> MatchResult:
    result = repo.get_match(match_id)
    if result is None:
        raise HTTPException(404, "partita non trovata")
    return result
