"""Partita completa da 8 giocatori: classifica corretta e ogni scontro rivedibile."""

import asyncio
import random

from app.db import repo
from app.db.session import configure
from app.rooms import tournament
from app.rooms.manager import RoomManager
from app.rooms.protocol import AssignRole, Bid, Pass, Start


class FakeSocket:
    async def send_text(self, data: str) -> None:
        return None


async def play_room(mgr: RoomManager):  # type: ignore[no-untyped-def]
    room, host = mgr.create_room("P0")
    players = [host] + [mgr.join(room, f"P{i}", None) for i in range(1, 8)]
    for p in players:
        await mgr.connect(room, p, FakeSocket())
    room.settings.timer = 1
    room.settings.role_timeout = 1
    pool = mgr.pool(room)
    mgr.pool = lambda r: pool * 3  # type: ignore[method-assign]
    mgr.ensure_loop(room)
    await mgr.handle(room, host.id, Start())
    rnd = random.Random(11)

    async def bot(pid: str) -> None:
        while room.phase == "auction":
            await asyncio.sleep(rnd.random() * 0.03)
            a = room.auction
            if a is None or a.lot is None:
                continue
            p = room.players[pid]
            if a.await_role and a.await_role.player_id == pid:
                await mgr.handle(room, pid, AssignRole(role=rnd.choice(p.free_roles())))
            elif rnd.random() < 0.7:
                await mgr.handle(room, pid, Bid(amount=a.bid + 1))
            else:
                await mgr.handle(room, pid, Pass())

    await asyncio.wait_for(asyncio.gather(*(bot(p.id) for p in players)), timeout=300)
    await asyncio.sleep(0.3)
    return room


def test_eight_players_full_tournament(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'full.db'}")
    room = asyncio.run(play_room(RoomManager()))
    t = room.tournament
    assert t is not None and room.phase == "tournament"
    assert all(p.complete for p in room.players.values())
    assert len(t.giornate) == 7 and all(len(g) == 4 for g in t.giornate)

    matches = [m for g in t.giornate for m in g]
    pairs = {frozenset((m.a, m.b)) for m in matches}
    assert len(matches) == 28 and len(pairs) == 28  # ogni coppia una sola volta

    # classifica ricalcolata da zero: 3 punti vittoria, 1 pareggio, 0 sconfitta
    expected = {p: 0 for p in room.players}
    for m in matches:
        if m.winner is None:
            expected[m.a] += 1
            expected[m.b] += 1
        else:
            expected[m.winner] += 3
    assert {r.player_id: r.punti for r in t.classifica} == expected
    keys = [(-r.punti, -r.totale) for r in t.classifica]
    assert keys == sorted(keys)  # a parità di punti conta la somma dei totali

    # ogni scontro è salvato con il suo copione e si può rivedere
    for m in matches:
        res = repo.get_match(m.match_id)
        assert res is not None
        assert res.totali["A"] == m.total_a and res.totali["B"] == m.total_b
        assert res.eventi[0].tipo == "ingresso" and res.eventi[-1].tipo == "fine"
    assert tournament.match_seed(room.seed, 0, 1) == tournament.match_seed(room.seed, 0, 1)
