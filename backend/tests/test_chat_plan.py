import asyncio

from app.data_loader import load_characters
from app.db.session import configure
from app.engine.roles import ROLES
from app.rooms.manager import RoomManager
from app.rooms.protocol import Start
from app.twitch.votes import ChatPlan, feed_message, parse_plan


class Sock:
    async def send_text(self, data: str) -> None:
        return None


def test_parse_plan_commands() -> None:
    assert parse_plan("!f1 assalto") == ("f1", "assalto")
    assert parse_plan("  !F3 GUARDIA ") == ("f3", "guardia")
    assert parse_plan("!carica") == ("carica", "carica") and parse_plan("!subito") == (
        "carica",
        "subito",
    )
    assert parse_plan("!form muro") == ("form", "muro")
    for bad in ("!f4 assalto", "!f1 boh", "assalto", "!form boh", "!offro 3", ""):
        assert parse_plan(bad) is None


def test_chat_plan_winner_is_most_voted_and_deterministic() -> None:
    c = ChatPlan()
    for u in "abcde":
        c.add(u, "f1", "assalto")
    c.add("x", "f1", "guardia")
    c.add("a", "f1", "guardia")  # vale l'ultimo voto di ciascun utente
    assert c.tally()["f1"] == {"assalto": 4, "guardia": 2}
    assert c.winner("f1", "7") == "assalto" and c.winner("f2", "7") is None
    t = ChatPlan()
    t.add("a", "f2", "tecnica")
    t.add("b", "f2", "guardia")
    assert t.winner("f2", "9") == t.winner("f2", "9")  # pareggio: scelta stabile dal seme


def test_streamer_plan_uses_chat_votes_and_waits_for_the_deadline(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'cp.db'}")

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host = mgr.create_room("Streamer", "canale")
        await mgr.connect(room, host, Sock())
        mgr.start_chat(room)
        await mgr.handle(room, host.id, Start())
        chars = list(load_characters().values())
        for k, p in enumerate((host, room.players["chat"])):
            for i, r in enumerate(ROLES):
                p.slots[r] = chars[k * 7 + i]
        room.settings.plan_timeout = 30
        await mgr._finish_auction(room)
        assert room.phase == "plan"
        for u in ("v1", "v2", "v3"):
            assert feed_message(room, u, "!f1 guardia") and feed_message(room, u, "!f2 tecnica")
        feed_message(room, "v1", "!f3 assalto")
        feed_message(room, "v2", "!carica")
        feed_message(room, "v3", "!form muro")
        assert not feed_message(room, "v1", "!offro 3")
        assert room.view().chat_plan is not None and room.view().chat_plan["f1"] == {"guardia": 3}
        from app.rooms.models import Player  # il piano dell'host non basta per chiudere in anticipo

        host.plan = {"tattiche": ["assalto"] * 3, "carica": "subito", "formazione": "classica"}
        await mgr._after(room)
        assert room.phase == "plan"  # c'è la chat: si aspetta la scadenza
        plan = mgr._plan_of(room, room.players["chat"])
        assert isinstance(room.players["chat"], Player)
        room.plan_deadline = 0.0
        await mgr._after(room)
        return room, plan

    room, plan = asyncio.run(go())
    assert plan["tattiche"] == ["guardia", "tecnica", "assalto"]
    assert plan["carica"] == "carica" and plan["formazione"] == "muro"
    assert room.phase == "tournament"
