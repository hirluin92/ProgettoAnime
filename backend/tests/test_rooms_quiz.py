import pytest

from app.rooms.quiz import BLOCCO, LIVELLI, RIVELAZIONE, QuizErrore, QuizPartita


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


def test_stanza_quiz_con_gestore_locale() -> None:
    import asyncio
    import json

    from app.rooms.manager import RoomManager
    from app.rooms.models import RoomSettings
    from app.rooms.protocol import QuizLobby, QuizRisposta, Start, UpdateSettings
    from tests.test_plan import Sock

    async def go():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host = mgr.create_room("Anna")
        ospite = mgr.join(room, "Bruno", None)
        socks = {host.id: Sock(), ospite.id: Sock()}
        await mgr.connect(room, host, socks[host.id])
        await mgr.connect(room, ospite, socks[ospite.id])
        await mgr.handle(
            room,
            host.id,
            UpdateSettings(settings=RoomSettings(modalita="quiz", quiz_round=3, quiz_tempo=20)),
        )
        await mgr.handle(room, host.id, Start())
        assert room.phase == "quiz"
        q = room.view().quiz
        assert q is not None and q.round == 1 and q.totali == 3 and q.soluzione is None

        giusto = room.extras["quiz"].corrente.target["id"]
        await mgr.handle(room, ospite.id, QuizRisposta(risposta_id=giusto + 10_000_000))
        await mgr.handle(room, ospite.id, QuizRisposta(risposta_id=giusto))  # bloccato
        await mgr.handle(room, host.id, QuizRisposta(risposta_id=giusto))
        privati = [json.loads(m) for m in socks[host.id].sent if '"type":"quiz_esito"' in m]
        assert privati and privati[-1]["giusto"] is True
        err = [json.loads(m) for m in socks[ospite.id].sent if '"code":"locked"' in m]
        assert err, "dopo un errore c'è il blocco"
        v = room.view().quiz
        assert v is not None and v.punteggi[0].id == host.id and v.punteggi[0].giusto
        # solo a fine quiz l'host riporta tutti in lobby
        await mgr.handle(room, host.id, QuizLobby())
        assert room.phase == "quiz"  # il quiz non è finito: nessun effetto, errore all'host
        room.extras["quiz"].fase = "fine"
        await mgr.handle(room, host.id, QuizLobby())
        return room

    room = asyncio.run(go())
    assert room.phase == "lobby" and "quiz" not in room.extras
