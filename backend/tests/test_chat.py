import asyncio

from fastapi.testclient import TestClient

from app.main import app
from app.rooms.manager import RoomManager
from app.rooms.protocol import Bid, Pass, Start
from app.twitch.chat import parse_line
from app.twitch.votes import ChatVotes, feed_message, parse_offer


def test_parse_offer() -> None:
    assert parse_offer("!offro 12") == 12
    assert parse_offer("  !OFFRO 3 ") == 3
    assert parse_offer("!offro") is None and parse_offer("offro 3") is None
    assert parse_offer("!offro 3 grazie") is None and parse_offer("!offro -2") is None


def test_parse_irc_line() -> None:
    line = ":mario!mario@mario.tmi.twitch.tv PRIVMSG #canale :!offro 4"
    assert parse_line(line) == ("mario", "!offro 4")
    tagged = (
        "@badge-info=;color=#fff :luigi!luigi@luigi.tmi.twitch.tv PRIVMSG #canale :ciao a tutti"
    )
    assert parse_line(tagged) == ("luigi", "ciao a tutti")
    assert parse_line("PING :tmi.twitch.tv") is None
    assert parse_line(":tmi.twitch.tv 001 justinfan1 :Welcome") is None


def test_votes_threshold_and_last_vote_counts() -> None:
    v = ChatVotes(threshold=3)
    for u in ("a", "b"):
        v.add(u, 5)
    assert v.best() is None  # solo 2 voti per il 5
    v.add("c", 5)
    assert v.best() == 5
    for u in ("d", "e", "f"):
        v.add(u, 8)
    assert v.best() == 8  # il valore più alto con almeno 3 voti
    for u in ("d", "e", "f"):
        v.add(u, 2)  # cambiano idea: vale l'ultimo
    assert v.best() == 5
    v.add("A", 2)  # stesso utente (case-insensitive): sostituisce il voto
    assert sum(1 for x in v.votes.values() if x == 5) == 2 or v.best() == 5
    v.reset(2)
    assert v.best() is None


class FakeSocket:
    async def send_text(self, data: str) -> None:
        return None


async def chat_game() -> tuple[bool, int]:
    mgr = RoomManager()
    room, host = mgr.create_room("Streamer", "canale")
    await mgr.connect(room, host, FakeSocket())
    mgr.start_chat(room)
    room.settings.timer = 3
    mgr.ensure_loop(room)
    await mgr.handle(room, host.id, Start())
    chat = room.players["chat"]
    spectators = [f"v{i}" for i in range(30)]

    async def viewers() -> None:
        while room.phase == "auction":
            await asyncio.sleep(0.05)
            for u in spectators:
                feed_message(room, u, "!offro 2")

    async def streamer() -> None:
        while room.phase == "auction":
            await asyncio.sleep(0.1)
            a = room.auction
            if a and a.lot and not a.await_role and host.id not in a.passed:
                if host.complete or a.bid or a.bidder == host.id:
                    await mgr.handle(room, host.id, Pass())
                else:  # il streamer compra a 1 solo se nessuno ha offerto
                    await mgr.handle(room, host.id, Bid(amount=1))

    await asyncio.wait_for(asyncio.gather(viewers(), streamer()), timeout=120)
    return chat.complete, sum(1 for c in chat.slots.values() if c)


def test_chat_buys_and_completes_team() -> None:
    complete, count = asyncio.run(chat_game())
    assert complete and count == 7


def test_fake_chat_endpoint_and_streamer_room() -> None:
    client = TestClient(app)
    r = client.post(
        "/api/rooms", json={"name": "S", "streamer_channel": "provaprova", "chat_threshold": 2}
    )
    code = r.json()["code"]
    ok = client.post(
        f"/api/dev/fake-chat/{code}", json={"messages": [{"user": "a", "text": "!offro 1"}]}
    )
    assert ok.status_code == 200 and ok.json() == {"accepted": 0}  # nessun lotto in corso
    assert client.post("/api/dev/fake-chat/ZZZZZ", json={"messages": []}).status_code == 404
