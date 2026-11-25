import asyncio

from app.rooms.manager import RoomManager
from app.rooms.protocol import Ban, Start


class FakeSocket:
    async def send_text(self, data: str) -> None:
        return None


async def setup(bans: int = 1):  # type: ignore[no-untyped-def]
    mgr = RoomManager()
    room, host = mgr.create_room("A")
    guest = mgr.join(room, "B", None)
    for p in (host, guest):
        await mgr.connect(room, p, FakeSocket())
    room.settings.bans_per_player = bans
    return mgr, room, host, guest


def test_ban_phase_then_auction_without_banned() -> None:
    async def run() -> None:
        mgr, room, host, guest = await setup(2)
        await mgr.handle(room, host.id, Start())
        assert room.phase == "ban" and room.ban_deadline is not None
        await mgr.handle(room, host.id, Ban(character_id="son-goku"))
        await mgr.handle(room, host.id, Ban(character_id="vegeta"))
        await mgr.handle(room, host.id, Ban(character_id="shanks"))  # oltre il limite: ignorato
        assert room.bans[host.id] == ["son-goku", "vegeta"]
        await mgr.handle(room, guest.id, Ban(character_id="son-goku"))  # già bannato
        assert room.phase == "ban"
        await mgr.handle(room, guest.id, Ban(character_id="satoru-gojo"))
        await mgr.handle(room, guest.id, Ban(character_id="beerus"))
        assert room.phase == "auction" and room.auction is not None
        banned = {"son-goku", "vegeta", "satoru-gojo", "beerus"}
        queued = {c.id for c in room.auction.queue} | (
            {room.auction.lot.id} if room.auction.lot else set()
        )
        assert not banned & queued
        assert len(queued) == 100 - 4

    asyncio.run(run())


def test_ban_timeout_starts_auction() -> None:
    async def run() -> None:
        mgr, room, host, _ = await setup(1)
        await mgr.handle(room, host.id, Start())
        room.ban_deadline = 0.0
        mgr.ensure_loop(room)
        for _ in range(30):
            await asyncio.sleep(0.1)
            if room.phase == "auction":
                break
        assert room.phase == "auction"

    asyncio.run(run())


def test_no_ban_phase_by_default() -> None:
    async def run() -> None:
        mgr, room, host, _ = await setup(0)
        await mgr.handle(room, host.id, Start())
        assert room.phase == "auction"
        await mgr.handle(room, host.id, Ban(character_id="son-goku"))  # fuori fase: ignorato

    asyncio.run(run())
