import asyncio

import pytest

from app.data_loader import load_characters, load_ruleset
from app.db import repo
from app.db.session import configure
from app.engine.arene import ARENE
from app.engine.roles import ROLES
from app.engine.simulate import simulate
from app.raid import DIFFICOLTA, boss_team, load_bosses
from app.rooms.manager import RoomManager
from app.rooms.protocol import Pick, Plan, Start


class Sock:
    def __init__(self) -> None:
        self.sent: list[str] = []

    async def send_text(self, data: str) -> None:
        self.sent.append(data)


def test_boss_data_is_valid() -> None:
    chars = load_characters()
    bosses = load_bosses()
    assert len(bosses) >= 6
    for b in bosses.values():
        assert len(b.squadra) == 7 and len(set(b.squadra)) == 7 and set(b.squadra) <= set(chars)
        assert b.arena in ARENE and b.fattore > 0 and b.nome and b.descrizione


def test_boss_team_scales_with_difficulty() -> None:
    rules = load_ruleset()
    hp = []
    for d in DIFFICOLTA:
        t = boss_team("freezer", d)
        assert t.members[0].id == "freezer"
        hp.append(simulate(t, t, 1, rules, registra=False).unita["A"][0].hp)
    assert hp == sorted(hp) and hp[-1] > hp[0] * 1.5
    normale = simulate(boss_team("freezer", "normale"), boss_team("freezer", "normale"), 1, rules)
    assert (
        normale.unita["A"][1].hp
        == simulate(boss_team("freezer", "normale"), boss_team("beerus", "normale"), 1, rules)
        .unita["A"][1]
        .hp
    )  # solo il Capitano ha i moltiplicatori del boss


async def setup(mgr: RoomManager, n: int, boss: str = "freezer", plan_timeout: int = 0):  # type: ignore[no-untyped-def]
    room, host = mgr.create_room("P0")
    players = [host, *[mgr.join(room, f"P{i}", None) for i in range(1, n)]]
    socks = {p.id: Sock() for p in players}
    for p in players:
        await mgr.connect(room, p, socks[p.id])
    room.settings.modalita = "raid"
    room.settings.boss = boss
    room.settings.plan_timeout = plan_timeout
    return room, players, socks


async def draft(mgr, room):  # type: ignore[no-untyped-def]
    while room.phase == "draft":
        sp = room.specchio
        turn = sp.turn()
        card = sp.cards()[0]
        role = next(r for r in ROLES if r not in sp.team)
        await mgr.handle(room, turn.id, Pick(character_id=card.id, role=role))


@pytest.mark.parametrize("n", [2, 3, 4])
def test_cooperative_draft_builds_one_shared_team(n: int, tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / f'r{n}.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, players, _ = await setup(mgr, n)
        await mgr.handle(room, players[0].id, Start())
        assert room.phase == "draft"
        turni = []
        for _ in range(7):
            turni.append(room.specchio.turn().id)
            card = room.specchio.cards()[0]
            role = next(r for r in ROLES if r not in room.specchio.team)
            await mgr.handle(room, turni[-1], Pick(character_id=card.id, role=role))
        return room, players, turni

    room, players, turni = asyncio.run(go())
    assert turni == [players[i % n].id for i in range(7)]  # giocatori a rotazione
    squadre = [tuple(c.id for c in (p.slots[r] for r in ROLES) if c) for p in players]
    assert all(s == squadre[0] and len(s) == 7 for s in squadre)  # stessa squadra per tutti
    assert room.phase == "raid_result" and room.raid is not None


def test_only_the_player_on_turn_can_pick_and_timeout_autopicks(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'r5.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, players, socks = await setup(mgr, 3)
        await mgr.handle(room, players[0].id, Start())
        card = room.specchio.cards()[0]
        await mgr.handle(room, players[1].id, Pick(character_id=card.id, role="Capitano"))
        assert any("not_your_turn" in m for m in socks[players[1].id].sent)
        guard = 0
        while room.phase == "draft":
            room.specchio.deadline = 0.0
            await mgr._after(room)
            room.specchio.tick(1e12)
            await mgr._after(room)
            guard += 1
            assert guard < 50
        return room

    assert asyncio.run(go()).phase == "raid_result"


def test_player_count_and_chat_are_validated(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'r6.db'}")

    async def go(n: int):  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, players, socks = await setup(mgr, n)
        await mgr.handle(room, players[0].id, Start())
        return room, socks[players[0].id]

    for n in (1, 5):
        room, sock = asyncio.run(go(n))
        if n == 1:
            assert room.phase == "lobby"  # 1 solo giocatore: servono almeno 2
        else:
            assert room.phase == "lobby" and any("raid_players" in m for m in sock.sent)


def test_plan_majority_and_result_view(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'r7.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, players, _ = await setup(mgr, 3, boss="muzan", plan_timeout=30)
        await mgr.handle(room, players[0].id, Start())
        await draft(mgr, room)
        assert room.phase == "plan"
        piani = [
            ("assalto", "assalto", "guardia", "carica", "muro"),
            ("assalto", "tecnica", "guardia", "carica", "classica"),
            ("tecnica", "tecnica", "guardia", "subito", "muro"),
        ]
        for p, (a, b, c, ca, fo) in zip(players, piani, strict=True):
            await mgr.handle(room, p.id, Plan(tattiche=[a, b, c], carica=ca, formazione=fo))
        return room

    room = asyncio.run(go())
    assert room.phase == "raid_result" and room.raid is not None
    res = repo.get_match(room.raid.match_id)
    assert res is not None and res.arena == load_bosses()["muzan"].arena
    assert res.tattiche["A"] == ["assalto", "tecnica", "guardia"]  # maggioranza per fase
    assert res.carica["A"] == "carica" and res.formazione["A"] == "muro"
    assert res.squadre["B"].members[0].id == "muzan-kibutsuji"
    assert room.raid.vinto == (res.vincitore == "A") and len(room.raid.boss) == 7
    assert room.view().arena is not None and room.view().arena.id == load_bosses()["muzan"].arena  # type: ignore[union-attr]


def test_harder_difficulty_is_harder() -> None:
    from app.data_loader import load_forms
    from app.draft import ROUNDS, build_deck, forms_by_base, hand
    from app.engine.models import Team
    from app.engine.scoring import potenza_ruolo

    chars = list(load_characters().values())
    forms = forms_by_base(load_forms())
    rules = load_ruleset()

    def squadra(seed: int) -> Team:
        deck = build_deck(seed, chars, forms)
        slots: dict[str, object] = {}
        for r in range(ROUNDS):
            libere = [x for x in ROLES if x not in slots]
            c, ruolo = max(
                ((c, x) for c in hand(deck, r) for x in libere),
                key=lambda t: (potenza_ruolo(t[0], t[1]), t[0].id),
            )
            slots[ruolo] = c
        return Team(nome="s", members=[slots[x] for x in ROLES])  # type: ignore[misc]

    def vinte(diff: str) -> int:
        return sum(
            simulate(squadra(s), boss_team("freezer", diff), s, rules, registra=False).vincitore
            == "A"
            for s in range(1, 70)
        )

    assert vinte("normale") > vinte("epico")
