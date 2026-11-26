from __future__ import annotations

import asyncio
import contextlib
import os
import random
import secrets
from dataclasses import dataclass, field
from typing import Any, Protocol

from app.data_loader import load_characters, load_ruleset
from app.db import repo
from app.engine import tattiche as tat
from app.engine.arene import arena_per_seme
from app.engine.formazioni import DEFAULT as FORM_DEFAULT
from app.engine.formazioni import FORMAZIONI
from app.engine.missioni import BONUS, MISSIONI, completata, missione_per_seme
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
    MissionResult,
    Player,
    RoomArena,
    RoomSettings,
    RoomView,
    TournamentView,
    now,
)  # fmt: skip
from app.rooms.protocol import (
    AssignRole,
    Ban,
    Bid,
    ClientMessage,
    ErrorMsg,
    Join,
    Joined,
    Mission,
    Pass,
    Plan,
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
BAN_SECONDS = 30


class Socket(Protocol):
    async def send_text(self, data: str) -> None: ...


def _arena_info(seed: int) -> RoomArena:
    a = arena_per_seme(seed)
    return RoomArena(id=a.id, nome=a.nome, descrizione=a.descrizione)


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
    bans: dict[str, list[str]] = field(default_factory=dict)  # id giocatore -> id personaggi
    ban_deadline: float | None = None
    plan_deadline: float | None = None
    streamer_channel: str | None = None
    last_activity: float = field(default_factory=now)
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    sockets: dict[str, Socket] = field(default_factory=dict)
    spectators: list[Socket] = field(default_factory=list)
    task: asyncio.Task[None] | None = None
    extras: dict[str, Any] = field(default_factory=dict)  # es. stato chat Twitch

    def view(self) -> RoomView:
        a = self.auction
        chars = load_characters()
        return RoomView(
            code=self.code, phase=self.phase, host_id=self.host_id,  # type: ignore[arg-type]
            settings=self.settings, players=[p.view() for p in self.players.values()],
            lot=a.view() if a else None, lots_left=a.lots_left if a else 0,
            bans={pid: [chars[c] for c in ids if c in chars] for pid, ids in self.bans.items()},
            ban_deadline=self.ban_deadline, plan_deadline=self.plan_deadline,
            arena=_arena_info(self.seed), tournament=self.tournament,
            streamer_channel=self.streamer_channel,
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
            await self._after(room)

    async def _after(self, room: Room) -> None:
        """Passaggi di fase dopo un messaggio o un tick: missioni private, piano, torneo."""
        if room.phase == "auction":
            await self._send_missions(room)
        if room.auction and room.auction.finished and room.phase == "auction":
            await self._finish_auction(room)
        if room.phase == "plan" and self._plan_over(room):
            await self._run_tournament(room)

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
            case Ban():
                return self._ban(room, pid, msg.character_id)
            case Bid():
                return self._auction(room).place_bid(pid, msg.amount, now())
            case Pass():
                return self._auction(room).pass_lot(pid, now())
            case Plan():
                return self._set_plan(room, pid, msg)
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
        banned = {c for ids in room.bans.values() for c in ids}
        return [c for c in chars if c.id not in banned]

    def _start(self, room: Room) -> list[ServerMessage]:
        if room.phase != "lobby":
            raise RoomError("already_started", "Partita già iniziata")
        if len(room.players) < MIN_PLAYERS:
            raise RoomError("few_players", "Servono almeno 2 giocatori")
        pool = self.pool(room)
        humans = [p for p in room.players.values() if not p.is_chat]
        max_bans = room.settings.bans_per_player * len(humans)
        if len(room.players) * len(ROLES) > len(pool) - max_bans:
            raise RoomError("few_characters", "Troppi giocatori per i personaggi disponibili")
        for p in room.players.values():
            p.budget = room.settings.budget
        if room.settings.bans_per_player > 0:
            room.phase = "ban"
            room.bans = {p.id: [] for p in humans}
            room.ban_deadline = now() + BAN_SECONDS
            return [RoomState(room=room.view())]
        return self._begin_auction(room)

    def _begin_auction(self, room: Room) -> list[ServerMessage]:
        room.phase = "auction"
        room.ban_deadline = None
        room.auction = Auction(room.players, room.settings, self.pool(room), room.seed)
        room.extras["missions_sent"] = False
        for p in room.players.values():
            p.missione = None if p.is_chat else missione_per_seme(room.seed, p.id).id
        return [RoomState(room=room.view()), *room.auction.start(now())]

    def _ban(self, room: Room, pid: str, character_id: str) -> list[ServerMessage]:
        if room.phase != "ban" or pid not in room.bans:
            raise RoomError("not_ban_phase", "Non è il momento dei ban")
        if len(room.bans[pid]) >= room.settings.bans_per_player:
            raise RoomError("no_bans_left", "Hai finito i tuoi ban")
        if character_id not in load_characters():
            raise RoomError("bad_character", "Personaggio sconosciuto")
        if any(character_id in ids for ids in room.bans.values()):
            raise RoomError("already_banned", "Già bannato")
        room.bans[pid].append(character_id)
        if all(len(ids) >= room.settings.bans_per_player for ids in room.bans.values()):
            return self._begin_auction(room)
        return [RoomState(room=room.view())]

    # ---- missioni, piano e torneo ----
    async def _send_missions(self, room: Room) -> None:
        """Manda a ciascun giocatore, e solo a lui, la sua missione segreta."""
        if room.extras.get("missions_sent"):
            return
        room.extras["missions_sent"] = True
        for pid, p in room.players.items():
            ws = room.sockets.get(pid)
            if ws and p.missione:
                m = MISSIONI[p.missione]
                await room.send(ws, Mission(id=m.id, nome=m.nome, descrizione=m.descrizione))

    def _humans(self, room: Room) -> list[Player]:
        return [p for p in room.players.values() if not p.is_chat and p.complete]

    def _plan_over(self, room: Room) -> bool:
        if room.plan_deadline is not None and now() >= room.plan_deadline:
            return True
        return all(p.plan is not None for p in self._humans(room))

    def _set_plan(self, room: Room, pid: str, msg: Plan) -> list[ServerMessage]:
        p = room.players.get(pid)
        if room.phase != "plan" or p is None or p.is_chat or not p.complete:
            raise RoomError("not_plan_phase", "Non è il momento del piano di battaglia")
        if msg.tattiche is not None and not tat.valida(msg.tattiche):
            raise RoomError("bad_plan", "Tattiche non valide")
        if msg.formazione not in FORMAZIONI:
            raise RoomError("bad_plan", "Formazione non valida")
        p.plan = {"tattiche": msg.tattiche, "carica": msg.carica, "formazione": msg.formazione}
        return [RoomState(room=room.view())]

    def _plan_of(self, room: Room, p: Player) -> dict[str, Any]:
        """Il piano consegnato; se manca (chat, tempo scaduto) uno predefinito e deterministico."""
        plan = p.plan or {}
        tattiche = plan.get("tattiche")
        if not tattiche:
            rnd = random.Random(f"{room.seed}:{p.id}:piano")
            tattiche = [rnd.choice(tat.TATTICHE) for _ in range(tat.FASI)]
        return {
            "tattiche": tattiche,
            "carica": plan.get("carica", "subito"),
            "formazione": plan.get("formazione", FORM_DEFAULT),
        }

    async def _finish_auction(self, room: Room) -> None:
        if room.settings.plan_timeout > 0 and self._humans(room):
            room.phase = "plan"
            room.plan_deadline = now() + room.settings.plan_timeout
            await room.broadcast([RoomState(room=room.view())])
            return
        await self._run_tournament(room)

    async def _run_tournament(self, room: Room) -> None:
        room.phase = "tournament"
        room.plan_deadline = None
        players = [p for p in room.players.values() if p.complete]
        ids = [p.id for p in players]
        rounds: list[list[MatchRef]] = []
        rules = load_ruleset()
        arena = arena_per_seme(room.seed).id
        # missioni: svelate ora; chi le ha completate ha +3% attacco e vita in ogni scontro
        missioni: list[MissionResult] = []
        bonus: dict[str, float] = {}
        for p in players:
            if not p.missione:
                continue
            team = Team(nome=p.name, members=[p.slots[r] for r in ROLES])  # type: ignore[misc]
            ok = completata(p.missione, team, p.budget, rules)
            m = MISSIONI[p.missione]
            missioni.append(
                MissionResult(
                    player_id=p.id, id=m.id, nome=m.nome, descrizione=m.descrizione, riuscita=ok
                )
            )
            bonus[p.id] = BONUS if ok else 0.0
        for rnd in tournament.schedule(len(players)):
            refs = []
            for i, j in rnd:
                pa, pb = players[i], players[j]
                team_a = Team(nome=pa.name, members=[pa.slots[r] for r in ROLES],  # type: ignore[misc]
                              bonus_missione=bonus.get(pa.id, 0.0))  # fmt: skip
                team_b = Team(nome=pb.name, members=[pb.slots[r] for r in ROLES],  # type: ignore[misc]
                              bonus_missione=bonus.get(pb.id, 0.0))  # fmt: skip
                plan_a, plan_b = self._plan_of(room, pa), self._plan_of(room, pb)
                res = simulate(
                    team_a,
                    team_b,
                    tournament.match_seed(room.seed, i, j),
                    rules,
                    tattiche={"A": plan_a["tattiche"], "B": plan_b["tattiche"]},
                    arena=arena,
                    carica={"A": plan_a["carica"], "B": plan_b["carica"]},
                    formazione={"A": plan_a["formazione"], "B": plan_b["formazione"]},
                )
                mid = await asyncio.to_thread(repo.save_match, res, room.code)
                winner = None if res.pareggio else (pa.id if res.vincitore == "A" else pb.id)
                refs.append(MatchRef(match_id=mid, a=pa.id, b=pb.id, winner=winner,
                                     total_a=res.totali["A"], total_b=res.totali["B"]))  # fmt: skip
            rounds.append(refs)
        room.tournament = tournament.build(ids, rounds)
        room.tournament.missioni = missioni
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
            if player.missione and room.phase in ("auction", "plan"):
                m = MISSIONI[player.missione]
                await room.send(ws, Mission(id=m.id, nome=m.nome, descrizione=m.descrizione))

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
                elif (
                    room.phase == "ban"
                    and room.ban_deadline is not None
                    and now() >= room.ban_deadline
                ):
                    out += self._begin_auction(room)
                elif room.phase == "lobby":
                    out += self._prune_lobby(room)
                if out:
                    await room.broadcast(out)
                await self._after(room)

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
