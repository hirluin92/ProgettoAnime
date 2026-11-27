from datetime import date, timedelta

from fastapi.testclient import TestClient

from app.db.models import QuizGiorno
from app.db.session import configure, session_scope
from app.main import app
from app.quiz import animedle
from app.quiz.dati import anime, normalizza, pool_anime, risposta_giusta_anime

client = TestClient(app)


def nuovo_profilo() -> str:
    return client.post("/api/profile", json={"name": "Quiz"}).json()["id"]


def test_dati_e_normalizzazione() -> None:
    assert len(anime()) >= 500 and len(pool_anime()) == 300
    assert normalizza("Shingeki no Kyōjin!") == "shingeki no kyojin"
    aot = next(a for a in anime() if a["titolo_en"] == "Attack on Titan")
    assert risposta_giusta_anime(aot, "  attack ON titan ") and not risposta_giusta_anime(aot, "")


def test_bersaglio_del_giorno_deterministico() -> None:
    assert animedle.bersaglio_giorno("2026-01-01") == animedle.bersaglio_giorno("2026-01-01")
    giorni = {animedle.bersaglio_giorno(f"2026-02-{d:02d}")["id"] for d in range(1, 28)}
    assert len(giorni) > 15  # non sempre lo stesso


def test_feedback_attributi() -> None:
    a = pool_anime()
    t = a[0]
    f = animedle.feedback(t, t)
    assert all(v["esito"] == "uguale" for v in f.values())
    g = dict(t, anno=t["anno"] - 5, episodi=t["episodi"] + 50, generi=["Zzz"], studio=["Nessuno"])
    f = animedle.feedback(g, t)
    assert f["anno"]["esito"] == "piu" and f["episodi"]["esito"] == "meno"
    assert f["generi"]["esito"] == "diverso" and f["studio"]["esito"] == "diverso"
    g2 = dict(t, generi=t["generi"][:1] + ["Zzz"])
    assert animedle.feedback(g2, t)["generi"]["esito"] == "parziale"


def test_crediti_vittoria() -> None:
    assert animedle.crediti_vittoria(1, 1) == 45
    assert animedle.crediti_vittoria(8, 1) == 10
    assert animedle.crediti_vittoria(1, 4) == 45 + 15
    assert animedle.crediti_vittoria(1, 99) == 45 + animedle.BONUS_SERIE_MAX


def test_elenco_senza_bersaglio() -> None:
    r = client.get("/api/quiz/anime/elenco")
    assert r.status_code == 200 and len(r.json()) == len(anime())
    assert {"id", "nome", "k", "anno"} <= set(r.json()[0])


def test_allenamento_con_token(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q1.db'}")
    nuovo = client.post("/api/quiz/animedle/nuovo").json()
    sbagliato = client.post(
        "/api/quiz/animedle/guess",
        json={"anime_id": pool_anime()[0]["id"], "token": nuovo["token"]},
    )
    assert sbagliato.status_code == 200
    # un token manomesso non vale
    assert (
        client.post(
            "/api/quiz/animedle/guess", json={"anime_id": 1, "token": "1." + "0" * 16}
        ).status_code
        == 422
    )
    # ci si arrende: il bersaglio si scopre, e indovinarlo chiude la partita
    sol = client.post("/api/quiz/animedle/arrenditi", json={"token": nuovo["token"]}).json()
    ok = client.post(
        "/api/quiz/animedle/guess", json={"anime_id": sol["id"], "token": nuovo["token"], "n": 3}
    ).json()
    assert (
        ok["giusto"] and ok["finito"] and ok["bersaglio"]["id"] == sol["id"] and ok["crediti"] == 0
    )


def test_sfida_del_giorno_con_profilo_e_crediti(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q2.db'}")
    pid = nuovo_profilo()
    st = client.get("/api/quiz/animedle/stato", params={"profile_id": pid}).json()
    assert st["tentativi_fatti"] == 0 and not st["finito"] and st["bersaglio"] is None

    bersaglio = animedle.bersaglio_giorno(st["giorno"])
    altro = next(a for a in pool_anime() if a["id"] != bersaglio["id"])
    r = client.post(
        "/api/quiz/animedle/guess", json={"anime_id": altro["id"], "profile_id": pid}
    ).json()
    assert not r["giusto"] and r["tentativo"] == 1 and r["bersaglio"] is None
    vinta = client.post(
        "/api/quiz/animedle/guess", json={"anime_id": bersaglio["id"], "profile_id": pid}
    ).json()
    assert vinta["giusto"] and vinta["finito"] and vinta["crediti"] == 40  # 2° tentativo
    assert client.get(f"/api/profile/{pid}").json()["crediti"] == 40
    # finita: non si può rigiocare né riscuotere ancora
    assert (
        client.post(
            "/api/quiz/animedle/guess", json={"anime_id": bersaglio["id"], "profile_id": pid}
        ).status_code
        == 409
    )
    st = client.get("/api/quiz/animedle/stato", params={"profile_id": pid}).json()
    assert (
        st["finito"]
        and st["vinto"]
        and st["serie"] == 1
        and st["bersaglio"]["id"] == bersaglio["id"]
    )


def test_serie_di_giorni_e_bonus(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q3.db'}")
    pid = nuovo_profilo()
    oggi = date.fromisoformat(client.get("/api/quiz/animedle/stato").json()["giorno"])
    with session_scope() as s:
        for k in (1, 2, 3):  # tre giorni vinti di fila fino a ieri
            s.add(
                QuizGiorno(
                    profile_id=pid,
                    gioco="animedle",
                    day=(oggi - timedelta(days=k)).isoformat(),
                    tentativi=2,
                    vinto=True,
                    crediti=40,
                )
            )
    st = client.get("/api/quiz/animedle/stato", params={"profile_id": pid}).json()
    assert st["serie"] == 3
    b = animedle.bersaglio_giorno(st["giorno"])
    r = client.post(
        "/api/quiz/animedle/guess", json={"anime_id": b["id"], "profile_id": pid}
    ).json()
    assert r["crediti"] == 45 + 15  # primo tentativo, serie di 4 giorni
    assert client.get("/api/quiz/animedle/stato", params={"profile_id": pid}).json()["serie"] == 4


def test_arrendersi_chiude_la_sfida(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q4.db'}")
    pid = nuovo_profilo()
    sol = client.post("/api/quiz/animedle/arrenditi", json={"profile_id": pid}).json()
    st = client.get("/api/quiz/animedle/stato", params={"profile_id": pid}).json()
    assert st["finito"] and not st["vinto"] and st["bersaglio"]["id"] == sol["id"]
