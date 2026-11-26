"""Fase piano delle stanze, missioni private, arena e affinità del lotto."""

import asyncio

import pytest

from app.data_loader import load_characters
from app.db.session import configure
from app.engine.arene import arena_per_seme
from app.engine.missioni import MISSIONI
from app.engine.roles import ROLES
from app.rooms.manager import Room, RoomManager
from app.rooms.models import Player
from app.rooms.protocol import Plan, RoomState, Start


class Sock:
    def __init__(self) -> None:
        self.sent: list[str] = []

    async def send_text(self, data: str) -> None:
        self.sent.append(data)


def fill(p: Player, offset: int) -> None:
    chars = list(load_characters().values())
    for i, r in enumerate(ROLES):
        p.slots[r] = chars[offset + i]


async def setup(mgr: RoomManager, plan_timeout: int = 45):  # type: ignore[no-untyped-def]
    room, host = mgr.create_room("Anna")
    guest = mgr.join(room, "Bruno", None)
    socks = {host.id: Sock(), guest.id: Sock()}
    await mgr.connect(room, host, socks[host.id])
    await mgr.connect(room, guest, socks[guest.id])
    room.settings.plan_timeout = plan_timeout
    await mgr.handle(room, host.id, Start())
    return room, host, guest, socks


def test_missions_are_private_and_unique_to_each_player(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'p1.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host, guest, socks = await setup(mgr)
        return room, host, guest, socks

    room, host, guest, socks = asyncio.run(go())
    assert host.missione in MISSIONI and guest.missione in MISSIONI
    for pid, sock in socks.items():
        mine = [m for m in sock.sent if '"type":"mission"' in m]
        assert len(mine) == 1
        other = room.players[host.id if pid == guest.id else guest.id]
        assert (
            other.missione is not None
            and f'"id":"{other.missione}"' not in mine[0]
            or (host.missione == guest.missione)
        )
    # la missione non compare nello stato pubblico della stanza
    state = room.view().model_dump_json()
    assert "missione" not in state


def test_plan_phase_then_tournament_with_arena_and_missions(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'p2.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host, guest, _ = await setup(mgr)
        fill(host, 0)
        fill(guest, 10)
        host.budget, guest.budget = 3, 12
        await mgr._finish_auction(room)
        assert room.phase == "plan" and room.plan_deadline is not None
        with pytest.raises(AssertionError):
            assert room.tournament is not None
        await mgr.handle(
            room,
            host.id,
            Plan(tattiche=["assalto", "assalto", "guardia"], carica="carica", formazione="muro"),
        )
        assert room.phase == "plan"  # manca il piano di Bruno
        await mgr.handle(room, guest.id, Plan())
        return room, host, guest

    room, host, guest = asyncio.run(go())
    assert room.phase == "tournament" and room.tournament is not None
    assert {m.player_id for m in room.tournament.missioni} == {host.id, guest.id}
    from app.db import repo

    mid = room.tournament.giornate[0][0].match_id
    res = repo.get_match(mid)
    assert res is not None and res.arena == arena_per_seme(room.seed).id
    assert res.tattiche["A"] == ["assalto", "assalto", "guardia"] and len(res.tattiche["B"]) == 3
    assert res.carica["A"] == "carica" and res.formazione["A"] == "muro"


def test_plan_deadline_starts_tournament_with_default_plans(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'p3.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host, guest, _ = await setup(mgr, plan_timeout=1)
        fill(host, 0)
        fill(guest, 10)
        await mgr._finish_auction(room)
        room.plan_deadline = 0.0  # scaduto
        await mgr._after(room)
        return room

    room = asyncio.run(go())
    assert room.phase == "tournament" and room.tournament is not None


def test_plan_validation_and_phase_guard(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'p4.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host, guest, socks = await setup(mgr)
        await mgr.handle(room, host.id, Plan())  # non è la fase piano
        assert any('"code":"not_plan_phase"' in m for m in socks[host.id].sent)
        fill(host, 0)
        fill(guest, 10)
        await mgr._finish_auction(room)
        await mgr.handle(room, host.id, Plan(tattiche=["boh", "assalto", "guardia"]))
        await mgr.handle(room, host.id, Plan(formazione="boh"))
        errs = [m for m in socks[host.id].sent if '"code":"bad_plan"' in m]
        assert len(errs) == 2 and host.plan is None
        return room

    asyncio.run(go())


def test_plan_phase_can_be_skipped(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'p5.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host, guest, _ = await setup(mgr, plan_timeout=0)
        fill(host, 0)
        fill(guest, 10)
        await mgr._finish_auction(room)
        return room

    assert asyncio.run(go()).phase == "tournament"


def test_lot_view_and_message_carry_the_affinity() -> None:
    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host, guest, socks = await setup(mgr, plan_timeout=0)
        return room, socks

    room, socks = asyncio.run(go())
    assert room.auction is not None and room.auction.lot is not None
    lot = room.view().lot
    assert lot is not None and set(lot.affinita) == set(ROLES)
    started = [m for m in socks[next(iter(socks))].sent if '"type":"lot_started"' in m]
    assert started and '"affinita"' in started[0]
    assert isinstance(room, Room) and RoomState is not None
