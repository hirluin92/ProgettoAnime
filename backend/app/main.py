import os
import random
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, TypeAdapter

from app.daily import router as daily_router
from app.data_loader import load_characters, load_ruleset
from app.db import repo
from app.db.session import init_db
from app.engine.models import Character, MatchResult, Team
from app.engine.simulate import simulate
from app.profilo import router as profilo_router
from app.quick import router as quick_router
from app.rooms.manager import RoomError, manager, serve_socket
from app.rooms.protocol import ClientMessage, ErrorMsg, Join, Spectate
from app.scala import router as scala_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    manager.start_sweeper()
    yield


app = FastAPI(title="Gioco d'asta anime", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(quick_router)
app.include_router(daily_router)
app.include_router(profilo_router)
app.include_router(scala_router)


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
    if os.environ.get("DEV_TOOLS") != "1":
        raise HTTPException(404, "non disponibile")
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


class CreateRoomRequest(BaseModel):
    name: str = Field(min_length=1, max_length=24)
    streamer_channel: str | None = Field(None, max_length=40)
    chat_threshold: int | None = Field(None, ge=1, le=100)


class CreatedRoom(BaseModel):
    code: str
    player_id: str
    token: str


@app.post("/api/rooms")
async def create_room(req: CreateRoomRequest) -> CreatedRoom:
    try:
        room, host = manager.create_room(req.name, req.streamer_channel, req.chat_threshold)
    except RoomError as e:
        raise HTTPException(409, e.message) from e
    manager.start_chat(room)
    return CreatedRoom(code=room.code, player_id=host.id, token=host.token)


@app.get("/api/rooms/{code}")
def room_exists(code: str) -> dict[str, str]:
    room = manager.get(code)
    if room is None:
        raise HTTPException(404, "stanza non trovata o scaduta")
    return {"code": room.code, "phase": room.phase}


@app.websocket("/ws/rooms/{code}")
async def ws_room(ws: WebSocket, code: str) -> None:
    await ws.accept()
    room = manager.get(code)
    if room is None:
        await ws.send_text(
            ErrorMsg(code="room_not_found", message="Stanza non trovata").model_dump_json()
        )
        await ws.close()
        return
    try:
        first = TypeAdapter(ClientMessage).validate_json(await ws.receive_text())
    except Exception:
        await ws.close()
        return
    if not isinstance(first, Join | Spectate):
        await ws.close()
        return
    await serve_socket(room, ws, first)


class FakeChatMessage(BaseModel):
    user: str = Field(max_length=40)
    text: str = Field(max_length=500)


class FakeChatRequest(BaseModel):
    messages: list[FakeChatMessage] = Field(max_length=500)


@app.post("/api/dev/fake-chat/{code}")
async def fake_chat(code: str, req: FakeChatRequest) -> dict[str, int]:
    """Simulatore di chat per provare la modalità streamer senza un canale vero."""
    if os.environ.get("DEV_TOOLS") != "1":
        raise HTTPException(404, "non disponibile")
    room = manager.get(code)
    if room is None:
        raise HTTPException(404, "stanza non trovata")
    from app.twitch.votes import feed_message

    async with room.lock:
        used = sum(feed_message(room, m.user, m.text) for m in req.messages)
    return {"accepted": used}


@app.get("/api/characters")
def list_characters() -> list[Character]:
    return list(load_characters().values())
