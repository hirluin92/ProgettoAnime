import asyncio

from app.db.session import configure
from app.engine.roles import ROLES
from app.rooms.manager import RoomManager
from app.rooms.protocol import Pick, Start


class Sock:
    def __init__(self) -> None:
        self.sent: list[str] = []

    async def send_text(self, data: str) -> None:
        self.sent.append(data)


async def setup(mgr: RoomManager, n: int = 2, plan_timeout: int = 0):  # type: ignore[no-untyped-def]
    room, host = mgr.create_room("Anna")
    others = [mgr.join(room, f"Gio{i}", None) for i in range(1, n)]
    players = [host, *others]
    socks = {p.id: Sock() for p in players}
    for p in players:
        await mgr.connect(room, p, socks[p.id])
    room.settings.modalita = "specchio"
    room.settings.plan_timeout = plan_timeout
    return room, players, socks


async def play_all(mgr, room, players):  # type: ignore[no-untyped-def]
    """Gioca 14 scelte: ognuno prende sempre la prima carta libera nel primo slot libero."""
    while room.phase == "draft":
        sp = room.specchio
        turn = sp.turn()
        card = next(c for c in sp.cards() if c.id not in sp.taken)
        role = next(r for r in ROLES if turn.slots[r] is None)
        await mgr.handle(room, turn.id, Pick(character_id=card.id, role=role))


def test_mirror_draft_full_flow(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 's1.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, players, socks = await setup(mgr)
        await mgr.handle(room, players[0].id, Start())
        assert room.phase == "draft" and room.specchio is not None
        first = room.specchio.turn()
        assert first is not None and first.id == players[0].id
        await play_all(mgr, room, players)
        return room, players

    room, players = asyncio.run(go())
    a, b = players
    assert room.phase == "tournament"
    ids_a = {c.id for c in a.slots.values() if c}
    ids_b = {c.id for c in b.slots.values() if c}
    assert len(ids_a) == 7 and len(ids_b) == 7 and not ids_a & ids_b  # carte tutte diverse
    assert a.complete and b.complete


def test_turns_alternate_who_starts_each_round(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 's2.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, players, _ = await setup(mgr)
        await mgr.handle(room, players[0].id, Start())
        sp = room.specchio
        firsts = []
        for _ in range(7):
            firsts.append(sp.first().id)
            for _ in range(2):
                turn = sp.turn()
                card = next(c for c in sp.cards() if c.id not in sp.taken)
                role = next(r for r in ROLES if turn.slots[r] is None)
                await mgr.handle(room, turn.id, Pick(character_id=card.id, role=role))
        return firsts, players

    firsts, players = asyncio.run(go())
    assert firsts == [players[i % 2].id for i in range(7)]


def test_rules_are_enforced(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 's3.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, players, socks = await setup(mgr)
        await mgr.handle(room, players[0].id, Start())
        sp = room.specchio
        card = sp.cards()[0]
        await mgr.handle(
            room, players[1].id, Pick(character_id=card.id, role="Capitano")
        )  # turno altrui
        await mgr.handle(room, players[0].id, Pick(character_id="nope", role="Capitano"))
        await mgr.handle(room, players[0].id, Pick(character_id=card.id, role="Boh"))
        assert sp.taken == {}
        await mgr.handle(room, players[0].id, Pick(character_id=card.id, role="Capitano"))
        await mgr.handle(
            room, players[1].id, Pick(character_id=card.id, role="Capitano")
        )  # già presa
        errs = [m for p in players for m in socks[p.id].sent if '"type":"error"' in m]
        return sp, errs

    sp, errs = asyncio.run(go())
    codes = " ".join(errs)
    assert "not_your_turn" in codes and "bad_card" in codes and "bad_role" in codes
    assert len(sp.taken) == 1


def test_timeout_makes_a_sensible_automatic_pick(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 's4.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, players, _ = await setup(mgr)
        await mgr.handle(room, players[0].id, Start())
        sp = room.specchio
        n = 0
        while room.phase == "draft":
            sp.deadline = 0.0
            await mgr._after(room)  # il ciclo della stanza fa lo stesso a ogni tick
            sp.tick(1e12)
            n += 1
            await mgr._after(room)
            assert n < 100
        return room, players

    room, players = asyncio.run(go())
    assert room.phase == "tournament" and all(p.complete for p in players)


def test_only_two_humans_and_no_chat(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 's5.db'}")

    async def go(n: int):  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, players, socks = await setup(mgr, n=n)
        await mgr.handle(room, players[0].id, Start())
        return room, socks[players[0].id]

    room, sock = asyncio.run(go(3))
    assert room.phase == "lobby" and any("two_players" in m for m in sock.sent)

    async def chat():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host = mgr.create_room("S", "canale")
        g = mgr.join(room, "G", None)
        room.settings.modalita = "specchio"
        s = Sock()
        await mgr.connect(room, host, s)
        await mgr.connect(room, g, Sock())
        await mgr.handle(room, host.id, Start())
        return room

    assert asyncio.run(chat()).phase == "lobby"


def test_missions_skip_budget_ones_and_stay_private(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 's6.db'}")

    async def go():  # type: ignore[no-untyped-def]
        seen = set()
        for _ in range(40):
            mgr = RoomManager()
            room, players, socks = await setup(mgr)
            await mgr.handle(room, players[0].id, Start())
            seen |= {p.missione for p in players}
            for p in players:
                assert sum('"type":"mission"' in m for m in socks[p.id].sent) == 1
        return seen

    seen = asyncio.run(go())
    assert "risparmiatore" not in seen and "spendaccione" not in seen and len(seen) >= 5
