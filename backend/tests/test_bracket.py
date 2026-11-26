import asyncio

import pytest

from app.data_loader import load_characters
from app.db.session import configure
from app.engine.roles import ROLES
from app.rooms import tournament
from app.rooms.manager import RoomManager
from app.rooms.protocol import Start


class Sock:
    async def send_text(self, data: str) -> None:
        return None


@pytest.mark.parametrize("n", range(2, 21))
def test_first_round_pairs_everyone_once_with_byes_for_top_seeds(n: int) -> None:
    pairs = tournament.primo_turno(n)
    flat = [x for p in pairs for x in p if x is not None]
    assert sorted(flat) == list(range(n))  # ogni giocatore compare una sola volta
    byes = [p for p in pairs if p[1] is None or p[0] is None]
    m = 1
    while m < n:
        m *= 2
    assert len(byes) == m - n
    # i bye vanno alle teste di serie più alte (indici più bassi)
    assert all(min(x for x in p if x is not None) < max(2, m - n + 1) for p in byes)


def test_bracket_order_pits_best_against_worst() -> None:
    assert tournament.ordine_tabellone(8) == [0, 7, 3, 4, 1, 6, 2, 5]
    assert tournament.ordine_tabellone(2) == [0, 1]


async def play(n: int):  # type: ignore[no-untyped-def]
    mgr = RoomManager()
    room, host = mgr.create_room("P0")
    players = [host] + [mgr.join(room, f"P{i}", None) for i in range(1, n)]
    for p in players:
        await mgr.connect(room, p, Sock())
    room.settings.formato = "eliminazione"
    room.settings.plan_timeout = 0
    chars = list(load_characters().values())
    await mgr.handle(room, host.id, Start())
    for k, p in enumerate(players):
        for i, r in enumerate(ROLES):
            p.slots[r] = chars[k * 7 + i]
    await mgr._finish_auction(room)
    return room, players


@pytest.mark.parametrize("n", [2, 3, 5, 8, 13])
def test_single_elimination_has_one_champion_and_n_minus_1_matches(n: int, tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / f'b{n}.db'}")
    room, players = asyncio.run(play(n))
    t = room.tournament
    assert t is not None and t.formato == "eliminazione" and t.campione in {p.id for p in players}
    reali = [m for r in t.giornate for m in r if not m.bye]
    assert len(reali) == n - 1  # ogni match elimina uno
    assert len(t.giornate[-1]) == 1  # la finale
    perdenti = {m.a if m.winner == m.b else m.b for m in reali}
    assert len(perdenti) == n - 1 and t.campione not in perdenti
    assert all(m.winner in (m.a, m.b) for m in reali)  # niente pareggi
    assert t.classifica[0].player_id == t.campione
    # chi ha avuto il bye è davvero passato al turno dopo
    for m in (m for r in t.giornate for m in r if m.bye):
        assert m.match_id == "" and m.winner == m.a


def test_default_format_is_still_round_robin(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'rr.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host = mgr.create_room("A")
        g = mgr.join(room, "B", None)
        for p in (host, g):
            await mgr.connect(room, p, Sock())
        room.settings.plan_timeout = 0
        await mgr.handle(room, host.id, Start())
        chars = list(load_characters().values())
        for k, p in enumerate((host, g)):
            for i, r in enumerate(ROLES):
                p.slots[r] = chars[k * 7 + i]
        await mgr._finish_auction(room)
        return room

    t = asyncio.run(go()).tournament
    assert t is not None and t.formato == "girone" and t.campione is None
