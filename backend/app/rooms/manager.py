from __future__ import annotations

import asyncio
import contextlib
import os
import secrets
from dataclasses import dataclass, field
from typing import Any, Protocol

from app.data_loader import load_characters, load_ruleset
from app.db import repo
from app.engine.models import Team
from app.engine.roles import ROLES
from app.engine.simulate import simulate
from app.rooms import tournament
from app.rooms.auction import Auction, BidError
from app.rooms.models import (
    CODE_ALPHABET,
    COLORS,
    MAX_PLAYERS,
    MIN_PLAYERS,
    MatchRef,
    Player,
    RoomSettings,
    RoomView,
    TournamentView,
    now,
)  # fmt: skip
from app.rooms.protocol import (
    AssignRole,
    Bid,
    ClientMessage,
    ErrorMsg,
    Join,
    Joined,
    Pass,
    RoomState,
    ServerMessage,
    Spectate,
    Start,
    TournamentResult,
    UpdateSettings,
)  # fmt: skip
from app.rooms.store import InMemoryRoomStore, RoomStore

ROOM_TTL = 30 * 60
REJOIN_WINDOW = 60
TICK = 0.1


class Socket(Protocol):
    async def send_text(self, data: str) -> None: ...


class RoomError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class Room:
    code: str
    settings: RoomSettings
    host_id: str
    seed: int
    players: dict[str, Player] = field(default_factory=dict)
    phase: str = "lobby"
    auction: Auction | None = None
    tournament: TournamentView | None = None
    streamer_channel: str | None = None
    last_activity: float = field(default_factory=now)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    sockets: dict[str, Socket] = field(default_factory=dict)
    spectators: list[Socket] = field(default_factory=list)
    task: asyncio.Task[None] | None = None
    extras: dict[str, Any] = field(default_factory=dict)  # es. stato chat Twitch

    def view(self) -> RoomView:
        a = self.auction
        return RoomView(
            code=self.code, phase=self.phase, host_id=self.host_id,  # type: ignore[arg-type]
            settings=self.settings, players=[p.view() for p in self.players.values()],
            lot=a.view() if a else None, lots_left=a.lots_left if a else 0,
            tournament=self.tournament, streamer_channel=self.streamer_channel,
            server_time=now(),
        )  # fmt: skip

    async def broadcast(self, msgs: list[ServerMessage]) -> None:
        targets = [*self.sockets.values(), *self.spectators]
        for m in msgs:
            data = m.model_dump_json()
            for ws in list(targets):
                try:
                    await ws.send_text(data)
                except Exception:
                    for pid, s in list(self.sockets.items()):
                        if s is ws:
                            self.sockets.pop(pid, None)
                    if ws in self.spectators:
                        self.spectators.remove(ws)
                    if ws in targets:
                        targets.remove(ws)

    async def send(self, ws: Socket, msg: ServerMessage) -> None:
        with contextlib.suppress(Exception):
            await ws.send_text(msg.model_dump_json())


class RoomManager:
    def __init__(self, store: RoomStore | None = None) -> None:
        self.store: RoomStore = store or InMemoryRoomStore()
        self._sweeper: asyncio.Task[None] | None = None

    # ---- creazione ----
    def _new_code(self) -> str:
        while True:
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(5))
            if self.store.get(code) is None:
                return code

    def create_room(
        self, host_name: str, streamer_channel: str | None = None, chat_threshold: int | None = None
    ) -> tuple[Room, Player]:
        channel = streamer_channel.lower().lstrip("#") if streamer_channel else None
        if channel and any(r.streamer_channel == channel for r in self.store.all()):
            raise RoomError("channel_busy", "Esiste già una stanza streamer per questo canale")
        settings = RoomSettings()
        if chat_threshold:
            settings.chat_threshold = chat_threshold
        host = Player(id=secrets.token_hex(4), name=host_name.strip()[:24] or "Host",
                      color=COLORS[0], budget=settings.budget)  # fmt: skip
        room = Room(code=self._new_code(), settings=settings, host_id=host.id,
                    seed=secrets.randbelow(2**31), streamer_channel=channel)  # fmt: skip
        room.players[host.id] = host
        if channel:
            chat = Player(id="chat", name=f"Chat di {channel}", color=COLORS[1],
                          budget=settings.budget, is_chat=True)  # fmt: skip
            room.players[chat.id] = chat
        self.store.add(room)
        return room, host

    def get(self, code: str) -> Room | None:
        return self.store.get(code.upper())

    # ---- ingresso ----
    def join(self, room: Room, name: str, token: str | None) -> Player:
        if token:
            for p in room.players.values():
                if p.token == token and not p.is_chat:
                    p.left_at = None
                    return p
            raise RoomError("bad_token", "Sessione non valida o scaduta")
        if room.phase != "lobby":
            raise RoomError("game_started", "La partita è già iniziata")
        if len(room.players) >= MAX_PLAYERS:
            raise RoomError("room_full", "Stanza piena")
        name = name.strip()[:24]
        if not name:
            raise RoomError("bad_name", "Serve un nome")
        if any(p.name.lower() == name.lower() for p in room.players.values()):
            raise RoomError("name_taken", "Nome già usato")
        used = {p.color for p in room.players.values()}
        color = next((c for c in COLORS if c not in used), COLORS[0])
        p = Player(id=secrets.token_hex(4), name=name, color=color, budget=room.settings.budget)
        room.players[p.id] = p
        return p

    # ---- gestione messaggi (sempre sotto il lock della stanza) ----
    async def handle(self, room: Room, pid: str, msg: ClientMessage) -> None:
        room.last_activity = now()
        async with room.lock:
            out: list[ServerMessage] = []
            try:
                out = await self._dispatch(room, pid, msg)
            except (BidError, RoomError) as e:
                ws = room.sockets.get(pid)
                if ws:
                    await room.send(ws, ErrorMsg(code=e.code, message=e.message))
                return
            if out:
                await room.broadcast(out)
            if room.auction and room.auction.finished and room.phase == "auction":
                await self._finish_auction(room)

    async def _dispatch(self, room: Room, pid: str, msg: ClientMessage) -> list[ServerMessage]:
        match msg:
            case Start():
                self._require_host(room, pid)
                return self._start(room)
            case UpdateSettings():
                self._require_host(room, pid)
                if room.phase != "lobby":
                    raise RoomError("not_lobby", "Impostazioni modificabili solo in lobby")
                room.settings = msg.settings
                for p in room.players.values():
                    p.budget = msg.settings.budget
                return [RoomState(room=room.view())]
            case Bid():
                return self._auction(room).place_bid(pid, msg.amount, now())
            case Pass():
                return self._auction(room).pass_lot(pid, now())
            case AssignRole():
                if msg.role not in ROLES:
                    raise BidError("bad_role", "Ruolo sconosciuto")
                return self._auction(room).assign_role(pid, msg.role, now())
            case _:
                return []

    @staticmethod
    def _require_host(room: Room, pid: str) -> None:
        if pid != room.host_id:
            raise RoomError("not_host", "Solo l'host può farlo")

    @staticmethod
    def _auction(room: Room) -> Auction:
        if room.auction is None or room.phase != "auction":
            raise BidError("no_auction", "L'asta non è in corso")
        return room.auction

    def pool(self, room: Room) -> list[Any]:
        chars = list(load_characters().values())
        if room.settings.anime:
            chars = [c for c in chars if c.anime in room.settings.anime]
        return chars

    def _start(self, room: Room) -> list[ServerMessage]:
        if room.phase != "lobby":
            raise RoomError("already_started", "Partita già iniziata")
        if len(room.players) < MIN_PLAYERS:
            raise RoomError("few_players", "Servono almeno 2 giocatori")
        pool = self.pool(room)
        if len(room.players) * len(ROLES) > len(pool):
            raise RoomError("few_characters", "Troppi giocatori per i personaggi disponibili")
        for p in room.players.values():
            p.budget = room.settings.budget
        room.phase = "auction"
        room.auction = Auction(room.players, room.settings, pool, room.seed)
        return [RoomState(room=room.view()), *room.auction.start(now())]

    # ---- fine asta e torneo ----
    async def _finish_auction(self, room: Room) -> None:
        room.phase = "tournament"
        players = [p for p in room.players.values() if p.complete]
        ids = [p.id for p in players]
        rounds: list[list[MatchRef]] = []
        rules = load_ruleset()
        for rnd in tournament.schedule(len(players)):
            refs = []
            for i, j in rnd:
                pa, pb = players[i], players[j]
                team_a = Team(nome=pa.name, members=[pa.slots[r] for r in ROLES])  # type: ignore[misc]
                team_b = Team(nome=pb.name, members=[pb.slots[r] for r in ROLES])  # type: ignore[misc]
                res = simulate(team_a, team_b, tournament.match_seed(room.seed, i, j), rules)
                mid = await asyncio.to_thread(repo.save_match, res, room.code)
                winner = None if res.pareggio else (pa.id if res.vincitore == "A" else pb.id)
                refs.append(MatchRef(match_id=mid, a=pa.id, b=pb.id, winner=winner,
                                     total_a=res.totali["A"], total_b=res.totali["B"]))  # fmt: skip
            rounds.append(refs)
        room.tournament = tournament.build(ids, rounds)
        await room.broadcast(
            [RoomState(room=room.view()), TournamentResult(tournament=room.tournament)]
        )

    # ---- connessioni ----
    async def connect(self, room: Room, player: Player, ws: Socket) -> None:
        async with room.lock:
            player.connected = True
            player.left_at = None
            room.sockets[player.id] = ws
            await room.send(ws, Joined(player_id=player.id, token=player.token))
            await room.broadcast([RoomState(room=room.view())])
            if room.tournament:
                await room.send(ws, TournamentResult(tournament=room.tournament))

    async def disconnect(self, room: Room, player: Player, ws: Socket) -> None:
        async with room.lock:
            if room.sockets.get(player.id) is ws:
                room.sockets.pop(player.id, None)
                player.connected = False
                player.left_at = now()
                await room.broadcast([RoomState(room=room.view())])

    async def spectate(self, room: Room, ws: Socket) -> None:
        async with room.lock:
            room.spectators.append(ws)
            await room.send(ws, RoomState(room=room.view()))

    def start_chat(self, room: Room) -> None:
        """Stanza streamer: aggrega i voti della chat e (se abilitato) legge Twitch."""
        if not room.streamer_channel or "chat_votes" in room.extras:
            return
        from app.twitch.chat import TwitchChatReader
        from app.twitch.votes import ChatVotes, feed_message, make_chat_tick

        votes = ChatVotes(room.settings.chat_threshold)
        room.extras["chat_votes"] = votes
        room.extras["chat_tick"] = make_chat_tick(votes)
        if os.environ.get("TWITCH_READER", "1") == "1":
            reader = TwitchChatReader(room.streamer_channel, lambda u, t: feed_message(room, u, t))
            room.extras["chat_reader"] = reader
            reader.start()
        self.ensure_loop(room)

    # ---- ciclo della stanza ----
    def ensure_loop(self, room: Room) -> None:
        if room.task is None or room.task.done():
            room.task = asyncio.create_task(self._loop(room))

    async def _loop(self, room: Room) -> None:
        while self.store.get(room.code) is room:
            await asyncio.sleep(TICK)
            async with room.lock:
                out: list[ServerMessage] = []
                if room.phase == "auction" and room.auction:
                    out += await self._chat_tick(room)
                    out += room.auction.tick(now())
                elif room.phase == "lobby":
                    out += self._prune_lobby(room)
                if out:
                    await room.broadcast(out)
                if room.auction and room.auction.finished and room.phase == "auction":
                    await self._finish_auction(room)

    async def _chat_tick(self, room: Room) -> list[ServerMessage]:
        hook = room.extras.get("chat_tick")
        if hook is None or room.auction is None:
            return []
        try:
            return list(hook(room, now()))
        except BidError:
            return []

    def _prune_lobby(self, room: Room) -> list[ServerMessage]:
        """Toglie dalla lobby chi è assente da più di 60 s; passa l'host se serve."""
        t = now()
        gone = [
            p.id
            for p in room.players.values()
            if not p.is_chat and not p.connected and p.left_at and t - p.left_at > REJOIN_WINDOW
        ]
        if not gone:
            return []
        for pid in gone:
            room.players.pop(pid, None)
        if room.host_id not in room.players:
            humans = [p for p in room.players.values() if not p.is_chat]
            if humans:
                room.host_id = humans[0].id
        return [RoomState(room=room.view())]

    # ---- scadenza ----
    def start_sweeper(self) -> None:
        if self._sweeper is None:
            self._sweeper = asyncio.create_task(self._sweep())

    async def _sweep(self) -> None:
        while True:
            await asyncio.sleep(60)
            self.sweep_once()

    def sweep_once(self, ttl: float = ROOM_TTL) -> int:
        t = now()
        expired = [r for r in self.store.all() if t - r.last_activity > ttl]
        for r in expired:
            self.store.remove(r.code)
            if r.task:
                r.task.cancel()
            reader = r.extras.get("chat_reader")
            if reader:
                reader.stop()
        return len(expired)


manager = RoomManager()


async def serve_socket(room: Room, ws: Any, first: Join | Spectate) -> None:
    """Gestisce un client già accettato dopo il primo messaggio."""
    mgr = manager
    mgr.ensure_loop(room)
    if isinstance(first, Spectate):
        await mgr.spectate(room, ws)
        with contextlib.suppress(Exception):
            while True:
                await ws.receive_text()
        if ws in room.spectators:
            room.spectators.remove(ws)
        return
    async with room.lock:
        try:
            player = mgr.join(room, first.name, first.token)
        except RoomError as e:
            await room.send(ws, ErrorMsg(code=e.code, message=e.message))
            return
    await mgr.connect(room, player, ws)
    from pydantic import TypeAdapter

    adapter = TypeAdapter(ClientMessage)
    try:
        while True:
            raw = await ws.receive_text()
            room.last_activity = now()
            try:
                msg = adapter.validate_json(raw)
            except Exception:
                await room.send(ws, ErrorMsg(code="bad_message", message="Messaggio non valido"))
                continue
            await mgr.handle(room, player.id, msg)
    except Exception:
        pass
    finally:
        await mgr.disconnect(room, player, ws)
