import pytest

from app.rooms import quiz as modulo_quiz
from app.rooms.manager import RoomManager
from app.rooms.quiz import BLOCCO, LIVELLI, RIVELAZIONE, QuizErrore, QuizPartita


@pytest.fixture(autouse=True)
def senza_preparazione(monkeypatch):  # type: ignore[no-untyped-def]
    monkeypatch.setattr(modulo_quiz, "PREPARAZIONE", 0.0)


def partita(tipo: str = "misto", n: int = 4, tempo: int = 20) -> QuizPartita:
    return QuizPartita.nuova(7, tipo, n, tempo, ["a", "b", "c"], 1000.0)


def test_domande_deterministiche_e_senza_ripetizioni() -> None:
    p1, p2 = partita(n=8), partita(n=8)
    assert [d.target["id"] for d in p1.domande] == [d.target["id"] for d in p2.domande]
    assert {d.kind for d in p1.domande} == {"scorcio", "personaggio", "indizi", "sigla"}
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
    assert p.rispondi("a", giusto + 999999, 1001.0) == "no"  # sbagliata: blocco
    with pytest.raises(QuizErrore) as e:
        p.rispondi("a", giusto, 1002.0)
    assert e.value.code == "locked"
    assert p.rispondi("b", giusto, 1002.0) == "giusto"  # primo: bonus 50
    assert p.rispondi("c", giusto, 1010.0) == "giusto"  # secondo: bonus 25, meno tempo
    assert p.giusti["b"] > p.giusti["c"] >= 100 + 25
    assert p.punti["b"] == p.giusti["b"]
    with pytest.raises(QuizErrore):
        p.rispondi("b", giusto, 1011.0)  # già indovinato
    # passato il blocco si può riprovare
    assert p.rispondi("a", giusto, 1001.0 + BLOCCO + 1) == "giusto"
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


def test_domanda_sigla_ha_audio_e_secondi_crescenti() -> None:
    p = QuizPartita.nuova(7, "sigla", 3, 20, ["a", "b", "c"], 1000.0, progressivo=True)
    v = p.view(1000.0)
    assert v.kind == "sigla" and v.audio and v.audio.startswith("https://") and v.immagine is None
    assert v.audio_secondi == 1
    assert p.view(1019.0).audio_secondi == 30
    # la soluzione (anime, brano, artista) resta nascosta finché la domanda è aperta
    assert v.soluzione is None
    p.tick(1020.0, ["a"])
    sol = p.view(1020.0).soluzione
    assert sol is not None and "·" in sol.dettaglio


def test_altra_stagione_blocca_meno_e_si_segnala() -> None:
    from app.quiz.dati import anime
    from app.rooms.quiz import BLOCCO_SERIE, Domanda

    per_titolo = {a["titolo"]: a for a in anime()}
    s1 = per_titolo["Re:Zero kara Hajimeru Isekai Seikatsu"]
    s2 = per_titolo["Re:Zero kara Hajimeru Isekai Seikatsu 2nd Season"]
    p = partita(n=3)
    p.domande[0] = Domanda("scorcio", s1)
    assert p.rispondi("a", s2["id"], 1001.0) == "serie"
    assert p.blocchi["a"] == 1001.0 + BLOCCO_SERIE
    assert p.rispondi("b", s1["id"], 1002.0) == "giusto"


def partita_sigla(n: int = 3) -> QuizPartita:
    return QuizPartita.nuova(11, "sigla", n, 20, ["a", "b"], 1000.0)


def test_sigla_punti_parziali_per_brano_e_artista() -> None:
    p = partita_sigla()
    t = p.corrente.target
    # solo il titolo del brano: punti ridotti, nessun bonus posizione, la domanda resta aperta
    assert p.rispondi("a", t["brano_idx"], 1000.0, "brano") == "parziale"
    assert p.ultimo["a"][0] == "brano" and p.fase == "domanda"
    assert p.punti["a"] == round(200 * 0.5)  # risposta istantanea: 100 + 100 di tempo
    # lo stesso pezzo non si incassa due volte
    with pytest.raises(QuizErrore) as e:
        p.rispondi("a", t["brano_idx"], 1001.0, "brano")
    assert e.value.code == "done"
    assert p.rispondi("a", t["artista_idx"], 1000.0, "artista") == "parziale"
    assert p.punti["a"] == 100 + round(200 * 0.4)
    # l'anime vale di più di titolo e artista messi insieme
    assert p.rispondi("b", t["id"], 1000.0) == "giusto"
    assert p.punti["b"] == 200 + 50
    assert p.punti["b"] > p.punti["a"]
    v = p.view(1000.0)
    ra = next(x for x in v.punteggi if x.id == "a")
    assert ra.brano and ra.artista and not ra.giusto and ra.guadagno == p.punti["a"]
    # un brano sbagliato blocca come ogni errore
    q = partita_sigla()
    assert q.rispondi("a", q.corrente.target["brano_idx"] + 1, 1000.0, "brano") == "no"
    assert q.blocchi["a"] == 1000.0 + BLOCCO


def test_titolo_e_artista_solo_nelle_sigle() -> None:
    p = partita(tipo="scorcio", n=3)
    with pytest.raises(QuizErrore) as e:
        p.rispondi("a", 1, 1000.0, "brano")
    assert e.value.code == "bad_type"


def test_serie_di_risposte_giuste_da_bonus_e_si_perde_sbagliando() -> None:
    p = partita(tipo="indizi", n=4, tempo=20)
    t = 1000.0
    guadagni = []
    for _ in range(3):
        giusto = p.corrente.target["id"]
        p.rispondi("a", giusto, t + 20 - 0.0001)  # allo scadere: solo 100 + bonus posizione
        guadagni.append(p.giusti["a"])
        # «b» non indovina: perde la serie (e non ne ha una)
        p.tick(t + 21, ["a", "b"])
        t += 21 + RIVELAZIONE
        p.tick(t, ["a", "b"])
    # 1ª: 100+50; 2ª: +20 di serie; 3ª: +40
    assert guadagni[1] - guadagni[0] == 20 and guadagni[2] - guadagni[1] == 20
    assert p.serie["a"] == 3 and p.serie["b"] == 0
    assert p.view(t).punteggi[0].serie == 3
    # saltare una domanda azzera la serie
    p.tick(t + 21, ["a", "b"])
    assert p.serie["a"] == 0


def test_impostazioni_cosa_si_indovina_nelle_sigle() -> None:
    def nuova(chiede: str) -> QuizPartita:
        return QuizPartita.nuova(11, "sigla", 3, 20, ["a", "b"], 1000.0, chiede=chiede)

    # solo il titolo del brano: vale il punteggio pieno e chiude la domanda
    p = nuova("brano")
    t = p.corrente.target
    assert p.view(1000.0).tipi == ["brano"] and p.view(1000.0).principale == "brano"
    with pytest.raises(QuizErrore) as e:
        p.rispondi("a", t["id"], 1000.0, "anime")
    assert e.value.code == "bad_type"
    assert p.rispondi("a", t["brano_idx"], 1000.0, "brano") == "giusto"
    assert p.giusti["a"] == 200 + 50 and "a" in p.giusti
    p.rispondi("b", t["brano_idx"], 1000.0, "brano")
    assert p.tick(1000.0, ["a", "b"]) and p.fase == "rivelazione"

    # solo l'artista
    q = nuova("artista")
    assert q.rispondi("a", q.corrente.target["artista_idx"], 1000.0, "artista") == "giusto"
    assert q.punti["a"] == 250

    # tutto: l'anime chiude, titolo e artista sono parziali
    r = nuova("tutto")
    assert (
        r.view(1000.0).tipi == ["anime", "brano", "artista"]
        and r.view(1000.0).principale == "anime"
    )

    # durata massima dell'anteprima (modalità progressiva: cresce col tempo)
    corta = QuizPartita.nuova(11, "sigla", 3, 20, ["a"], 1000.0, clip=5, progressivo=True)
    assert corta.view(1019.0).audio_secondi == 5 and corta.view(1000.0).audio_secondi == 1
    assert corta.view(1000.0).audio_progressivo is True
    con_loop = QuizPartita.nuova(11, "sigla", 3, 20, ["a"], 1000.0, loop=True)
    assert con_loop.view(1000.0).loop is True
    senza = QuizPartita.nuova(11, "sigla", 3, 20, ["a"], 1000.0)
    assert senza.view(1000.0).loop is False  # di partenza: una volta sola


def test_canzone_intera_per_tutto_il_tempo_a_disposizione() -> None:
    # di partenza la canzone suona intera, una volta, per il tempo per rispondere (max 30 s)
    p = QuizPartita.nuova(11, "sigla", 3, 25, ["a"], 1000.0)
    assert p.view(1000.0).audio_secondi == 25 and p.view(1024.0).audio_secondi == 25
    assert p.view(1000.0).audio_progressivo is False and p.view(1000.0).loop is False
    # tempo più lungo dell'anteprima: suona 30 s (la durata del campione Apple)
    lungo = QuizPartita.nuova(11, "sigla", 3, 120, ["a"], 1000.0)
    assert lungo.view(1000.0).audio_secondi == 30
    # un tetto più basso accorcia l'ascolto
    tetto = QuizPartita.nuova(11, "sigla", 3, 25, ["a"], 1000.0, clip=10)
    assert tetto.view(1000.0).audio_secondi == 10


def test_conto_alla_rovescia_prima_di_ogni_domanda(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(modulo_quiz, "PREPARAZIONE", 3.0)
    p = partita(n=3, tempo=20)
    assert p.inizio == 1003.0 and p.scadenza == 1023.0
    assert p.view(1000.0).inizio == 1003.0 and p.livello(1002.0) == 0
    giusto = p.corrente.target["id"]
    with pytest.raises(QuizErrore) as e:
        p.rispondi("a", giusto, 1002.5)  # prima del via non si risponde
    assert e.value.code == "not_started"
    assert p.rispondi("a", giusto, 1003.0) == "giusto"
    # la domanda successiva ha il suo conto alla rovescia
    p.rispondi("b", giusto, 1004.0)
    p.rispondi("c", giusto, 1004.0)
    p.tick(1004.0, ["a", "b", "c"])
    p.tick(1004.0 + RIVELAZIONE, ["a", "b", "c"])
    assert p.idx == 1 and p.inizio == 1004.0 + RIVELAZIONE + 3.0


def test_due_partite_nella_stessa_stanza_hanno_domande_diverse() -> None:
    mgr = RoomManager()
    stanza, _ = mgr.create_room("Anna")
    stanza.settings.quiz_round = 6
    mgr._begin_quiz(stanza)
    domande_a = [d.target["id"] for d in stanza.extras["quiz"].domande]
    stanza.extras["quiz"].fase = "fine"
    mgr._quiz_lobby(stanza)
    mgr._begin_quiz(stanza)
    domande_b = [d.target["id"] for d in stanza.extras["quiz"].domande]
    assert domande_a and domande_a != domande_b
