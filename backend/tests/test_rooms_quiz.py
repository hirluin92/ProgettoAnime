import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.rooms.manager import manager
from app.rooms.quiz import BLOCCO, LIVELLI, RIVELAZIONE, QuizErrore, QuizPartita

client = TestClient(app)


def partita(tipo: str = "misto", n: int = 4, tempo: int = 20) -> QuizPartita:
    return QuizPartita.nuova(7, tipo, n, tempo, ["a", "b", "c"], 1000.0)


def test_domande_deterministiche_e_senza_ripetizioni() -> None:
    p1, p2 = partita(n=8), partita(n=8)
    assert [d.target["id"] for d in p1.domande] == [d.target["id"] for d in p2.domande]
    assert {d.kind for d in p1.domande} == {"scorcio", "personaggio", "indizi"}
    anime = [d.target["id"] for d in p1.domande if d.kind != "personaggio"]
    assert len(anime) == len(set(anime))


def test_livello_cresce_col_tempo_e_la_soluzione_resta_nascosta() -> None:
    p = partita()
    assert p.livello(1000.0) == 0 and p.livello(1019.9) == LIVELLI - 1
    v = p.view(1000.0)
    assert v.soluzione is None and v.fase == "domanda" and v.round == 1
    d = p.corrente
    if d.kind != "indizi":
        assert v.immagine and 0 <= v.fx <= 100
    # niente della soluzione nei dati mandati ai giocatori durante la domanda
    nome = d.soluzione().nome
    assert nome not in v.model_dump_json() or nome in (v.immagine or "")


def test_risposte_punti_blocco_e_bonus_posizione() -> None:
    p = partita()
    giusto = p.corrente.target["id"]
    assert p.rispondi("a", giusto + 999999, 1001.0) is False  # sbagliata: blocco
    with pytest.raises(QuizErrore) as e:
        p.rispondi("a", giusto, 1002.0)
    assert e.value.code == "locked"
    assert p.rispondi("b", giusto, 1002.0) is True  # primo: bonus 50
    assert p.rispondi("c", giusto, 1010.0) is True  # secondo: bonus 25, meno tempo
    assert p.giusti["b"] > p.giusti["c"] >= 100 + 25
    assert p.punti["b"] == p.giusti["b"]
    with pytest.raises(QuizErrore):
        p.rispondi("b", giusto, 1011.0)  # già indovinato
    # passato il blocco si può riprovare
    assert p.rispondi("a", giusto, 1001.0 + BLOCCO + 1) is True
    with pytest.raises(QuizErrore):
        p.rispondi("z", giusto, 1003.0)  # non gioca


def test_fasi_fino_alla_fine() -> None:
    p = partita(n=3)
    t = 1000.0
    for k in range(3):
        giusto = p.corrente.target["id"]
        for pid in ("a", "b", "c"):
            p.rispondi(pid, giusto, t + 1)
        assert p.tick(t + 1, ["a", "b", "c"]) and p.fase == "rivelazione"
        assert p.view(t + 1).soluzione is not None
        assert not p.tick(t + 2, ["a", "b", "c"])  # la pausa non è finita
        t += 1 + RIVELAZIONE
        assert p.tick(t, ["a", "b", "c"])
        assert (p.fase, p.idx) == (("domanda", k + 1) if k < 2 else ("fine", 2))
    v = p.view(t)
    assert v.fase == "fine" and [x.id for x in v.punteggi][0] in {"a", "b", "c"}


def test_scade_il_tempo_senza_risposte() -> None:
    p = partita(n=2, tempo=10)
    assert not p.tick(1005.0, ["a", "b"])
    assert p.tick(1010.0, ["a", "b"]) and p.fase == "rivelazione"
    with pytest.raises(QuizErrore):
        p.rispondi("a", 1, 1011.0)


def recv_until(ws, type_: str, limit: int = 30) -> dict:  # type: ignore[no-untyped-def]
    for _ in range(limit):
        msg = ws.receive_json()
        if msg["type"] == type_:
            return msg
    raise AssertionError(f"messaggio {type_} non ricevuto")


def test_stanza_quiz_in_websocket() -> None:
    room = client.post("/api/rooms", json={"name": "Host"}).json()
    code = room["code"]
    with client.websocket_connect(f"/ws/rooms/{code}") as host:
        host.send_json({"type": "join", "name": "Host", "token": room["token"]})
        recv_until(host, "joined")
        with client.websocket_connect(f"/ws/rooms/{code}") as ospite:
            ospite.send_json({"type": "join", "name": "Ospite"})
            recv_until(ospite, "joined")
            st = recv_until(host, "room_state")["room"]
            impostazioni = {**st["settings"], "modalita": "quiz", "quiz_round": 3, "quiz_tempo": 20}
            host.send_json({"type": "update_settings", "settings": impostazioni})
            host.send_json({"type": "start"})
            while True:
                stato = recv_until(host, "room_state")["room"]
                if stato["phase"] == "quiz":
                    break
            q = stato["quiz"]
            assert q["round"] == 1 and q["totali"] == 3 and q["fase"] == "domanda"
            assert q["soluzione"] is None and len(q["punteggi"]) == 2

            r = manager.get(code)
            assert r is not None
            giusto = r.extras["quiz"].corrente.target["id"]
            ospite.send_json({"type": "quiz_risposta", "risposta_id": giusto + 10_000_000})
            assert recv_until(ospite, "quiz_esito")["giusto"] is False
            host.send_json({"type": "quiz_risposta", "risposta_id": giusto})
            assert recv_until(host, "quiz_esito")["giusto"] is True
            # l'ospite è bloccato per qualche secondo
            ospite.send_json({"type": "quiz_risposta", "risposta_id": giusto})
            assert recv_until(ospite, "error")["code"] == "locked"
            punteggi = recv_until(host, "room_state")["room"]["quiz"]["punteggi"]
            assert punteggi[0]["punti"] > 0 and punteggi[0]["giusto"]
