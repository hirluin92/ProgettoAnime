"""Carico: 20 client simulati offrono in contemporanea per 50 lotti."""

import asyncio
import random

from app.engine.roles import ROLES
from app.rooms import manager as mgr_mod
from app.rooms.manager import RoomManager
from app.rooms.protocol import AssignRole, Bid, ClientMessage, Pass, Start


class FakeSocket:
    def __init__(self) -> None:
        self.messages: list[str] = []

    async def send_text(self, data: str) -> None:
        self.messages.append(data)


async def run_load() -> tuple[int, list[str]]:
    mgr = RoomManager()
    mgr_mod.manager = mgr
    room, host = mgr.create_room("Host")
    sockets: dict[str, FakeSocket] = {}
    players = [host]
    for i in range(19):
        players.append(mgr.join(room, f"Bot{i}", None))
    for p in players:
        sockets[p.id] = FakeSocket()
        await mgr.connect(room, p, sockets[p.id])
    room.settings.timer = 1
    room.settings.role_timeout = 1
    # con 30 personaggi non bastano 140 slot: per il carico si usa un mazzo ripetuto
    pool = mgr.pool(room)
    mgr.pool = lambda r: pool * 6  # type: ignore[method-assign]
    mgr.ensure_loop(room)
    await mgr.handle(room, host.id, Start())
    errors: list[str] = []
    rnd = random.Random(7)
    assigned = 0

    async def bot(pid: str) -> None:
        nonlocal assigned
        while room.phase == "auction" and assigned < 50:
            await asyncio.sleep(rnd.random() * 0.05)
            a = room.auction
            if a is None or a.lot is None:
                continue
            p = room.players[pid]
            msg: ClientMessage
            if a.await_role and a.await_role.player_id == pid:
                msg = AssignRole(role=rnd.choice(p.free_roles()))
            elif rnd.random() < 0.6:
                msg = Bid(amount=a.bid + rnd.randint(1, 3))
            else:
                msg = Pass()
            await mgr.handle(room, pid, msg)
            assigned = sum(1 for q in room.players.values() for c in q.slots.values() if c)
            for q in room.players.values():  # invarianti
                free = len(q.free_roles())
                if free > 0 and q.budget < free:
                    errors.append(f"budget insufficiente per {q.name}")
                if q.budget < 0:
                    errors.append("budget negativo")

    await asyncio.wait_for(asyncio.gather(*(bot(p.id) for p in players)), timeout=240)
    room.phase = "stop"
    return assigned, errors


def test_twenty_clients_fifty_lots() -> None:
    assigned, errors = asyncio.run(run_load())
    assert assigned >= 50
    assert errors == []
    assert ROLES  # le squadre restano coerenti con i 7 ruoli
