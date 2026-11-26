"""Sfida del giorno: stesso mazzo di opzioni per tutti, un tentativo a nome, classifica."""

import zlib
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.models import DailyScore
from app.db.session import session_scope
from app.engine.models import Model
from app.engine.roles import ROLES
from app.quick import BUDGET, Option, PlayResponse, QuickOptions, build_options, cost_of, run_quick

router = APIRouter(prefix="/api/daily")
TOP = 20


def today() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%d")


def seed_for(day: str) -> int:
    return zlib.crc32(f"sfida:{day}".encode()) & 0x7FFFFFFF


class ScoreRow(Model):
    name: str
    score: int
    match_id: str


class DailyInfo(Model):
    day: str
    options: QuickOptions
    leaderboard: list[ScoreRow]


class DailyPlay(Model):
    name: str = Field(min_length=1, max_length=24)
    picks: list[str] = Field(min_length=7, max_length=7)


class DailyResult(Model):
    play: PlayResponse
    score: int
    rank: int


def leaderboard(day: str) -> list[ScoreRow]:
    with session_scope() as s:
        rows = s.scalars(
            select(DailyScore)
            .where(DailyScore.day == day)
            .order_by(DailyScore.score.desc(), DailyScore.id)
        ).all()
        return [ScoreRow(name=r.name, score=r.score, match_id=r.match_id) for r in rows]


@router.get("")
def info() -> DailyInfo:
    day = today()
    seed = seed_for(day)
    opts = build_options(seed)
    return DailyInfo(
        day=day,
        options=QuickOptions(
            seed=seed,
            budget=BUDGET,
            roles=list(ROLES),
            options={
                r: [Option(character=c, cost=cost_of(c)) for c in cs] for r, cs in opts.items()
            },
        ),
        leaderboard=leaderboard(day)[:TOP],
    )


@router.post("/play")
def play(req: DailyPlay) -> DailyResult:
    day = today()
    name = req.name.strip()
    if not name:
        raise HTTPException(422, "serve un nome")
    key = name.lower()
    with session_scope() as s:
        if s.scalar(select(DailyScore).where(DailyScore.day == day, DailyScore.name_key == key)):
            raise HTTPException(409, "hai già giocato la sfida di oggi con questo nome")
    res = run_quick(seed_for(day), req.picks)
    score = res.result.totali["A"] + (100 if res.result.vincitore == "A" else 0)
    try:
        with session_scope() as s:
            s.add(DailyScore(day=day, name=name, name_key=key, score=score, match_id=res.id))
    except IntegrityError as e:
        raise HTTPException(409, "hai già giocato la sfida di oggi con questo nome") from e
    board = leaderboard(day)
    rank = next(i for i, r in enumerate(board, 1) if r.match_id == res.id)
    return DailyResult(play=res, score=score, rank=rank)
