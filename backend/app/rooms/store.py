from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from app.rooms.manager import Room


class RoomStore(Protocol):
    """Interfaccia di archiviazione: in futuro si sostituisce con Redis."""

    def get(self, code: str) -> Room | None: ...
    def add(self, room: Room) -> None: ...
    def remove(self, code: str) -> None: ...
    def all(self) -> list[Room]: ...


class InMemoryRoomStore:
    def __init__(self) -> None:
        self._rooms: dict[str, Room] = {}

    def get(self, code: str) -> Room | None:
        return self._rooms.get(code)

    def add(self, room: Room) -> None:
        self._rooms[room.code] = room

    def remove(self, code: str) -> None:
        self._rooms.pop(code, None)

    def all(self) -> list[Room]:
        return list(self._rooms.values())
