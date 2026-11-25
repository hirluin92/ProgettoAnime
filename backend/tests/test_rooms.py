from fastapi.testclient import TestClient

from app.main import app
from app.rooms.manager import manager

client = TestClient(app)


def create(name: str = "Host") -> dict:
    return client.post("/api/rooms", json={"name": name}).json()


def recv_until(ws, type_: str, limit: int = 20) -> dict:  # type: ignore[no-untyped-def]
    for _ in range(limit):
        msg = ws.receive_json()
        if msg["type"] == type_:
            return msg
    raise AssertionError(f"messaggio {type_} non ricevuto")


def test_room_code_format() -> None:
    code = create()["code"]
    assert len(code) == 5 and not set(code) & set("OI01")


def test_join_lobby_and_rejoin_with_token() -> None:
    room = create()
    code = room["code"]
    with client.websocket_connect(f"/ws/rooms/{code}") as host:
        host.send_json({"type": "join", "name": "Host", "token": room["token"]})
        assert recv_until(host, "joined")["player_id"] == room["player_id"]
        with client.websocket_connect(f"/ws/rooms/{code}") as guest:
            guest.send_json({"type": "join", "name": "Ospite"})
            joined = recv_until(guest, "joined")
            state = recv_until(guest, "room_state")["room"]
            assert [p["name"] for p in state["players"]] == ["Host", "Ospite"]
            assert state["host_id"] == room["player_id"]
            token = joined["token"]
        # l'ospite si è disconnesso: rientra con il token e ritrova il suo posto
        with client.websocket_connect(f"/ws/rooms/{code}") as again:
            again.send_json({"type": "join", "name": "", "token": token})
            assert recv_until(again, "joined")["player_id"] == joined["player_id"]
            state = recv_until(again, "room_state")["room"]
            assert len(state["players"]) == 2


def test_duplicate_name_and_unknown_room() -> None:
    room = create("Anna")
    with client.websocket_connect(f"/ws/rooms/{room['code']}") as ws:
        ws.send_json({"type": "join", "name": "anna"})
        assert recv_until(ws, "error")["code"] == "name_taken"
    with client.websocket_connect("/ws/rooms/ZZZZZ") as ws:
        assert ws.receive_json()["code"] == "room_not_found"
    assert client.get("/api/rooms/ZZZZZ").status_code == 404


def test_only_host_can_start_and_settings() -> None:
    room = create()
    code = room["code"]
    with client.websocket_connect(f"/ws/rooms/{code}") as host:
        host.send_json({"type": "join", "token": room["token"]})
        recv_until(host, "joined")
        with client.websocket_connect(f"/ws/rooms/{code}") as guest:
            guest.send_json({"type": "join", "name": "B"})
            recv_until(guest, "joined")
            guest.send_json({"type": "start"})
            assert recv_until(guest, "error")["code"] == "not_host"
            host.send_json({"type": "update_settings", "settings": {"budget": 70, "timer": 3}})
            state = recv_until(guest, "room_state")["room"]
            assert state["settings"]["budget"] == 70
            assert state["players"][0]["budget"] == 70


def test_start_needs_two_players() -> None:
    room = create()
    with client.websocket_connect(f"/ws/rooms/{room['code']}") as host:
        host.send_json({"type": "join", "token": room["token"]})
        recv_until(host, "joined")
        host.send_json({"type": "start"})
        assert recv_until(host, "error")["code"] == "few_players"


def test_room_expiry() -> None:
    room = create()
    r = manager.get(room["code"])
    assert r is not None
    r.last_activity -= 31 * 60
    assert manager.sweep_once() >= 1
    assert manager.get(room["code"]) is None


def test_streamer_room_has_chat_player_and_channel_limit() -> None:
    r = client.post("/api/rooms", json={"name": "S", "streamer_channel": "#CanaleProva"})
    assert r.status_code == 200
    room = manager.get(r.json()["code"])
    assert room is not None and "chat" in room.players
    assert room.players["chat"].name == "Chat di canaleprova"
    assert (
        client.post(
            "/api/rooms", json={"name": "S2", "streamer_channel": "canaleprova"}
        ).status_code
        == 409
    )
