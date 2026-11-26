import random

import pytest

from app.data_loader import load_characters, load_forms
from app.duello import ai
from app.duello.carte import carta_da
from app.duello.motore import MossaNonValida
from app.rooms.duelli import Giocatore, TorneoDuelli

CARTE = [carta_da(c) for c in [*load_characters().values(), *load_forms().values()]]


def giocatori(n: int, bots: int = 0) -> list[Giocatore]:
    rnd = random.Random(n)
    return [
        Giocatore(id=f"p{i}", nome=f"G{i}", mazzo=rnd.sample(CARTE, 7), bot=i >= n - bots)
        for i in range(n)
    ]


def gioca_tutto(t: TorneoDuelli, umani: set[str], rnd: random.Random, durata: int = 30) -> float:
    """Gli umani consegnano mosse casuali valide; si va avanti fino alla fine del torneo."""
    ora = 1000.0
    t.avvia(ora)
    for _ in range(400):
        if t.finito:
            return ora
        for d in list(t.corrente):
            if d.finito or d.stato is None:
                continue
            for lato in (0, 1):
                g = d.giocatore(lato)
                if d.finito:
                    break
                if g and g.id in umani and d.mosse[lato] is None and rnd.random() < 0.85:
                    t.invia(g.id, ai.mosse_casuali(d.stato, lato, rnd), ora)
        ora += 10  # alcuni non consegnano: scade il timer e gioca la CPU
        t.tick(ora)
    raise AssertionError("il torneo non finisce")


@pytest.mark.parametrize("formato", ["girone", "eliminazione"])
@pytest.mark.parametrize("n", [2, 3, 4, 5])
def test_tournament_completes(formato: str, n: int) -> None:
    g = giocatori(n, bots=1)
    t = TorneoDuelli(5, g, formato, 30, pool=CARTE)
    gioca_tutto(t, {x.id for x in g if not x.bot}, random.Random(1))
    assert t.finito
    if formato == "girone":
        assert sum(len(r) for r in t.rounds) == n * (n - 1) // 2
    else:
        assert t.campione in {x.id for x in g}
        assert len(t.rounds[-1]) == 1


def test_turn_resolves_when_both_submit_and_hides_moves() -> None:
    g = giocatori(2)
    t = TorneoDuelli(9, g, "girone", 30, pool=CARTE)
    ini = t.avvia(100.0)
    assert {pid for pid, *_ in ini} == {"p0", "p1"}
    d = t.duello_di("p0")
    assert d is not None and d.stato is not None and d.stato.turno == 1
    prima = t.invia("p0", [], 101.0)  # una sola ha consegnato: nessun turno risolto
    assert d.stato.turno == 1 and all(not ev for _, _, ev, _ in prima)
    dopo = t.invia("p1", [], 102.0)
    assert d.stato.turno == 2 and any(ev for _, _, ev, _ in dopo)
    assert d.scadenza == 102.0 + 30


def test_deadline_plays_missing_moves_with_the_cpu() -> None:
    g = giocatori(2)
    t = TorneoDuelli(11, g, "girone", 30, pool=CARTE)
    t.avvia(0.0)
    d = t.duello_di("p0")
    assert d is not None and d.stato is not None
    assert t.tick(10.0) == [] and d.stato.turno == 1  # tempo non scaduto, nessuno ha consegnato
    t.tick(31.0)
    assert d.stato.turno == 2


def test_invalid_moves_are_rejected_and_do_not_block() -> None:
    g = giocatori(2)
    t = TorneoDuelli(13, g, "girone", 30, pool=CARTE)
    t.avvia(0.0)
    d = t.duello_di("p0")
    assert d is not None and d.stato is not None
    with pytest.raises(MossaNonValida):
        t.invia("p0", [("carta-che-non-esiste", 0)], 1.0)
    with pytest.raises(MossaNonValida):
        t.invia("nessuno", [], 1.0)
    assert d.mosse[0] is None


def test_bot_vs_bot_and_bye() -> None:
    g = giocatori(3, bots=3)
    t = TorneoDuelli(17, g, "eliminazione", 30, pool=CARTE)
    t.avvia(0.0)
    for k in range(1, 60):
        t.tick(float(k))
        if t.finito:
            break
    assert t.finito and t.campione is not None
    assert any(m.bye for r in t.rounds for m in r)  # 3 giocatori: qualcuno riposa


# ---------- integrazione con le stanze ----------
def _stanza(tmp_path, nome: str):  # type: ignore[no-untyped-def]
    """Stanza a due giocatori già collegati, con squadre complete e regole «duello»."""
    from app.db.session import configure
    from app.rooms.manager import RoomManager
    from app.rooms.protocol import Start
    from tests.test_plan import Sock, fill

    configure(f"sqlite:///{tmp_path / nome}")

    async def prepara():  # type: ignore[no-untyped-def]
        mgr = RoomManager()
        room, host = mgr.create_room("Anna")
        guest = mgr.join(room, "Bruno", None)
        socks = {host.id: Sock(), guest.id: Sock()}
        await mgr.connect(room, host, socks[host.id])
        await mgr.connect(room, guest, socks[guest.id])
        await mgr.handle(room, host.id, Start())
        room.settings.regole = "duello"
        room.settings.turno_duello = 10
        fill(host, 0)
        fill(guest, 10)
        await mgr._finish_auction(room)
        await mgr._flush(room)
        return mgr, room, host, guest, socks

    return prepara


def test_room_duel_tournament_end_to_end(tmp_path) -> None:  # type: ignore[no-untyped-def]
    import asyncio
    import json

    from app.rooms.protocol import DuelloMosse

    async def go():  # type: ignore[no-untyped-def]
        mgr, room, host, guest, socks = await _stanza(tmp_path, "d1.db")()
        assert room.phase == "duelli" and room.view().duelli is not None
        privati = {
            pid: [json.loads(m) for m in s.sent if '"type":"duello"' in m]
            for pid, s in socks.items()
        }
        assert all(len(v) == 1 and v[0]["nuovo"] for v in privati.values())
        # ognuno vede solo la propria mano, tutta del proprio mazzo
        t = room.extras["duelli"]
        for pid in (host.id, guest.id):
            mazzo = {c.id for g in t.giocatori if g.id == pid for c in g.mazzo}
            assert {c["id"] for c in privati[pid][0]["vista"]["mano"]} <= mazzo
        for _ in range(6):
            await mgr.handle(room, host.id, DuelloMosse(mosse=[]))
            await mgr.handle(room, guest.id, DuelloMosse(mosse=[]))
        await room.broadcast(await mgr._duelli_tick(room))  # il ciclo della stanza chiude il round
        return room, socks

    room, socks = asyncio.run(go())
    assert room.phase == "tournament" and room.tournament is not None
    assert len(room.tournament.giornate) == 1
    ultimi = [json.loads(m) for m in socks[next(iter(socks))].sent if '"type":"duello"' in m]
    assert len(ultimi) >= 7 and ultimi[-1]["vista"]["finita"]


def test_room_duel_deadline_plays_cpu_when_nobody_submits(tmp_path) -> None:  # type: ignore[no-untyped-def]
    import asyncio

    async def go():  # type: ignore[no-untyped-def]
        mgr, room, host, guest, socks = await _stanza(tmp_path, "d2.db")()
        for _ in range(100):
            if room.phase != "duelli":
                break
            for d in room.extras["duelli"].corrente:
                d.scadenza = 0.0  # scaduto: nessuno ha consegnato
            await room.broadcast(await mgr._duelli_tick(room))
        return room

    room = asyncio.run(go())
    assert room.phase == "tournament" and room.tournament is not None
    assert len(room.tournament.classifica) == 2


def test_room_duel_rejects_moves_outside_the_phase(tmp_path) -> None:  # type: ignore[no-untyped-def]
    import asyncio
    import json

    from app.rooms.protocol import DuelloMosse

    async def go():  # type: ignore[no-untyped-def]
        mgr, room, host, guest, socks = await _stanza(tmp_path, "d3.db")()
        await mgr.handle(room, host.id, DuelloMosse(mosse=[{"carta": "x", "corsia": 0}]))  # type: ignore[list-item]
        return [json.loads(m) for m in socks[host.id].sent if '"type":"error"' in m]

    errori = asyncio.run(go())
    assert errori and errori[-1]["code"] == "bad_moves"


# ---------- la chat vota le mosse ----------
def test_chat_votes_decide_the_chat_plan_at_the_deadline() -> None:
    g = giocatori(2)
    g[1].bot = g[1].chat = True
    t = TorneoDuelli(21, g, "girone", 30, pool=CARTE)
    t.avvia(0.0)
    d, lato = t.duello_chat()  # type: ignore[misc]
    assert lato == 1 and d.giocatore(1).chat  # type: ignore[union-attr]
    t.invia("p0", [], 5.0)
    # la chat non risponde da sola: il turno aspetta il voto (e la scadenza)
    assert d.stato is not None and d.stato.turno == 1
    t.tick(10.0)
    assert d.stato.turno == 1
    piani = t.piani_chat(d, 1)
    assert [x[0].split(":")[0] for x in piani] == ["Equilibrato", "Tutto in una corsia", "Prudente"]
    assert t.registra_voto("Anna", "b") and t.registra_voto("anna", "c")  # vale l'ultimo
    assert t.registra_voto("Bruno", "c") and not t.registra_voto("Carlo", "z")
    assert t.conteggio_voti() == {"a": 0, "b": 0, "c": 2}
    t.tick(31.0)
    assert d.stato.turno == 2 and t.conteggio_voti() == {"a": 0, "b": 0, "c": 0}  # voti azzerati


def test_chat_without_votes_plays_the_balanced_plan_and_plans_are_always_valid() -> None:
    from app.duello.motore import valida

    g = giocatori(2)
    g[1].bot = g[1].chat = True
    t = TorneoDuelli(22, g, "girone", 30, pool=CARTE)
    t.avvia(0.0)
    d, _ = t.duello_chat()  # type: ignore[misc]
    assert d.stato is not None
    for turno in range(6):
        for _, mosse in t.piani_chat(d, 1):
            valida(d.stato, 1, mosse)
        ora = 100.0 * (turno + 1)
        t.tick(ora)
    assert d.finito


def test_chat_vote_messages_reach_the_tournament_via_feed_message() -> None:
    from types import SimpleNamespace

    from app.twitch.votes import feed_message

    g = giocatori(2)
    g[1].bot = g[1].chat = True
    t = TorneoDuelli(23, g, "girone", 30, pool=CARTE)
    t.avvia(0.0)
    room = SimpleNamespace(phase="duelli", extras={"duelli": t}, auction=None)
    assert feed_message(room, "viewer1", "!a")  # type: ignore[arg-type]
    assert feed_message(room, "viewer2", " !B ")  # type: ignore[arg-type]
    assert not feed_message(room, "viewer3", "!d")  # type: ignore[arg-type]
    assert not feed_message(room, "viewer3", "ciao")  # type: ignore[arg-type]
    assert t.conteggio_voti() == {"a": 1, "b": 1, "c": 0}
    room.phase = "auction"
    assert not feed_message(room, "viewer4", "!a")  # type: ignore[arg-type]
