"""Sfida del giorno: stesso mazzo di opzioni per tutti, un tentativo a nome, classifica."""

import zlib
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.models import DailyScore
from app.db.session import session_scope
from app.engine.models import Model
from app.quick import DraftOptions, PickIn, PlayResponse, draft_options, premio_per, run_quick

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
    draft: DraftOptions
    leaderboard: list[ScoreRow]


class DailyPlay(Model):
    name: str = Field(min_length=1, max_length=24)
    picks: list[PickIn] = Field(min_length=7, max_length=7)
    swap: list[str] | None = Field(default=None, min_length=2, max_length=2)
    tattiche: list[str] = Field(min_length=3, max_length=3)
    carica: Literal["subito", "carica"] = "subito"
    formazione: str = "classica"
    profile_id: str | None = None


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
    return DailyInfo(
        day=day,
        draft=draft_options(seed),
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
    res = run_quick(seed_for(day), req.picks, req.swap, req.tattiche, req.carica, req.formazione)
    score = res.result.totali["A"] + (100 if res.result.vincitore == "A" else 0)
    try:
        with session_scope() as s:
            s.add(DailyScore(day=day, name=name, name_key=key, score=score, match_id=res.id))
    except IntegrityError as e:
        raise HTTPException(409, "hai già giocato la sfida di oggi con questo nome") from e
    res.premio = premio_per(res, "sfida", req.profile_id, score)
    board = leaderboard(day)
    rank = next(i for i, r in enumerate(board, 1) if r.match_id == res.id)
    return DailyResult(play=res, score=score, rank=rank)
