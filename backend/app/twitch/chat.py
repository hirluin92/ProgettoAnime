"""Lettura della chat Twitch in sola lettura (IRC anonimo, senza OAuth)."""

import asyncio
import contextlib
import random
import re
from collections.abc import Callable

from websockets.asyncio.client import connect

IRC_URL = "wss://irc-ws.chat.twitch.tv:443"
PRIVMSG_RE = re.compile(r"^(?:@\S+ )?:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.*)$")


def parse_line(line: str) -> tuple[str, str] | None:
    """(utente, testo) se la riga IRC è un messaggio di chat."""
    m = PRIVMSG_RE.match(line.strip())
    return (m.group(1), m.group(2)) if m else None


class TwitchChatReader:
    def __init__(self, channel: str, on_message: Callable[[str, str], object]) -> None:
        self.channel = channel.lower().lstrip("#")
        self.on_message = on_message
        self.task: asyncio.Task[None] | None = None

    def start(self) -> None:
        self.task = asyncio.create_task(self._run())

    def stop(self) -> None:
        if self.task:
            self.task.cancel()

    async def _run(self) -> None:
        delay = 1.0
        while True:
            try:
                async with connect(IRC_URL) as ws:
                    nick = f"justinfan{random.randint(10000, 99999)}"
                    await ws.send("PASS SCHMOOPIIE")
                    await ws.send(f"NICK {nick}")
                    await ws.send(f"JOIN #{self.channel}")
                    delay = 1.0
                    async for raw in ws:
                        for line in str(raw).split("\r\n"):
                            if line.startswith("PING"):
                                await ws.send("PONG :tmi.twitch.tv")
                            elif (parsed := parse_line(line)) is not None:
                                self.on_message(*parsed)
            except asyncio.CancelledError:
                raise
            except Exception:
                with contextlib.suppress(asyncio.CancelledError):
                    await asyncio.sleep(delay)
                delay = min(delay * 2, 30)
