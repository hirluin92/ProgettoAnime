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


# ---------- giochi a immagine ----------
def test_zoom_bersaglio_punto_e_indizi() -> None:
    from app.quiz import zoom

    for g in zoom.GIOCHI:
        t = zoom.bersaglio_giorno(g, "2026-03-03")
        assert t == zoom.bersaglio_giorno(g, "2026-03-03")
        fx, fy = zoom.punto(g, t)
        assert 0 <= fx <= 100 and 0 <= fy <= 100
        assert zoom.indizi(g, t, 0) == []
        assert g == "sigla" or zoom.indizi(g, t, 1) == []
        assert len(zoom.indizi(g, t, 5)) >= 3  # gli indizi crescono con gli errori
        if g == "sigla":
            assert zoom.audio(g, t).startswith("https://") and zoom.immagine(g, t) == ""
        else:
            assert zoom.immagine(g, t).startswith("https://") and zoom.audio(g, t) is None
    assert zoom.crediti_vittoria(1, 1) == 40 and zoom.crediti_vittoria(6, 1) == 10


def test_elenco_personaggi() -> None:
    r = client.get("/api/quiz/personaggi/elenco").json()
    assert len(r) >= 400 and {"id", "nome", "alt", "k"} <= set(r[0])


def test_zoom_allenamento_e_token(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'z1.db'}")
    for g in ("scorcio", "personaggio", "sigla"):
        n = client.post(f"/api/quiz/zoom/{g}/nuovo").json()
        assert (n["audio"] if g == "sigla" else n["immagine"]).startswith("https://")
        assert n["tentativi_max"] == 6
        sol = client.post(f"/api/quiz/zoom/{g}/arrenditi", json={"token": n["token"]}).json()
        ok = client.post(
            f"/api/quiz/zoom/{g}/guess",
            json={"risposta_id": sol["id"], "token": n["token"], "n": 2},
        ).json()
        assert ok["giusto"] and ok["finito"] and ok["bersaglio"]["id"] == sol["id"]
        assert client.post(
            f"/api/quiz/zoom/{g}/guess", json={"risposta_id": 1, "token": "9." + "0" * 16}
        ).status_code in (404, 422)
    assert client.post("/api/quiz/zoom/inventato/nuovo").status_code == 404


def test_zoom_del_giorno_con_profilo(tmp_path) -> None:  # type: ignore[no-untyped-def]
    from app.quiz import zoom

    configure(f"sqlite:///{tmp_path / 'z2.db'}")
    pid = nuovo_profilo()
    st = client.get("/api/quiz/zoom/scorcio/stato", params={"profile_id": pid}).json()
    t = zoom.bersaglio_giorno("scorcio", st["giorno"])
    assert st["indizi"] == [] and st["bersaglio"] is None and st["immagine"] == t["banner"]
    altro = next(a for a in pool_anime() if a["id"] != t["id"])
    for k in range(1, 3):
        r = client.post(
            "/api/quiz/zoom/scorcio/guess", json={"risposta_id": altro["id"], "profile_id": pid}
        ).json()
        assert not r["giusto"] and r["tentativo"] == k
    assert len(r["indizi"]) == 1  # al secondo errore compare l'anno
    vinta = client.post(
        "/api/quiz/zoom/scorcio/guess", json={"risposta_id": t["id"], "profile_id": pid}
    ).json()
    assert vinta["giusto"] and vinta["crediti"] == 28  # 3° tentativo: 40 - 2*6
    assert client.get(f"/api/profile/{pid}").json()["crediti"] == 28
    again = client.post(
        "/api/quiz/zoom/scorcio/guess", json={"risposta_id": t["id"], "profile_id": pid}
    )
    assert again.status_code == 409
    # il personaggio è un gioco a parte: la sua sfida è ancora aperta
    stp = client.get("/api/quiz/zoom/personaggio/stato", params={"profile_id": pid}).json()
    assert not stp["finito"] and stp["tentativi_fatti"] == 0


def test_sigle_dati_e_secondi() -> None:
    from app.quiz import zoom
    from app.quiz.dati import sigle

    assert len(sigle()) >= 50
    assert all(s["anteprima"].startswith("https://") and s["tipo"] in ("OP", "ED") for s in sigle())
    assert [zoom.secondi_sigla(e) for e in range(8)] == [1, 2, 4, 8, 16, 30, 30, 30]
    t = zoom.bersaglio_giorno("sigla", "2026-05-05")
    ind = zoom.indizi("sigla", t, 3)
    assert [i["k"] for i in ind] == ["tipo", "anno", "artista"]


def test_sigla_del_giorno_con_profilo(tmp_path) -> None:  # type: ignore[no-untyped-def]
    from app.quiz import zoom

    configure(f"sqlite:///{tmp_path / 'z3.db'}")
    pid = nuovo_profilo()
    st = client.get("/api/quiz/zoom/sigla/stato", params={"profile_id": pid}).json()
    t = zoom.bersaglio_giorno("sigla", st["giorno"])
    assert st["audio"] == t["anteprima"] and st["immagine"] == "" and st["indizi"] == []
    vinta = client.post(
        "/api/quiz/zoom/sigla/guess", json={"risposta_id": t["id"], "profile_id": pid}
    ).json()
    assert vinta["giusto"] and vinta["crediti"] == 40
    sol = vinta["bersaglio"]
    assert t["brano"] in sol["dettaglio"] and t["artista"] in sol["dettaglio"]


def test_animedle_indizi_progressivi() -> None:
    t = pool_anime()[0]
    assert animedle.indizi(t, 2) == []
    assert [i["k"] for i in animedle.indizi(t, 3)] == ["iniziale"]
    assert [i["k"] for i in animedle.indizi(t, 6)] == ["iniziale", "copertina", "parole"]
    assert animedle.indizi(t, 3)[0]["v"] == (t["titolo_en"] or t["titolo"])[:1].upper()


def test_animedle_indizi_via_api_e_salto_nei_giochi(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'q9.db'}")
    nuovo = client.post("/api/quiz/animedle/nuovo").json()
    sol = client.post("/api/quiz/animedle/arrenditi", json={"token": nuovo["token"]}).json()
    altro = next(a for a in pool_anime() if a["id"] != sol["id"])
    r = client.post(
        "/api/quiz/animedle/guess",
        json={"anime_id": altro["id"], "token": nuovo["token"], "n": 3},
    ).json()
    assert [i["k"] for i in r["indizi"]] == ["iniziale"]

    # saltare conta come tentativo: nel gioco del giorno con profilo
    pid = nuovo_profilo()
    for k in range(1, 4):
        e = client.post(
            "/api/quiz/zoom/sigla/guess", json={"salta": True, "profile_id": pid}
        ).json()
        assert not e["giusto"] and e["tentativo"] == k and not e["finito"]
    st = client.get("/api/quiz/zoom/sigla/stato", params={"profile_id": pid}).json()
    assert st["tentativi_fatti"] == 3 and [i["k"] for i in st["indizi"]] == [
        "tipo",
        "anno",
        "artista",
    ]
    for _ in range(3):
        e = client.post(
            "/api/quiz/zoom/sigla/guess", json={"salta": True, "profile_id": pid}
        ).json()
    assert e["finito"] and e["bersaglio"] is not None and e["crediti"] == 0
    assert (
        client.post(
            "/api/quiz/zoom/sigla/guess", json={"salta": True, "profile_id": pid}
        ).status_code
        == 409
    )
    # in allenamento e senza profilo il salto passa il numero di tentativo
    n = client.post("/api/quiz/zoom/scorcio/nuovo").json()
    e = client.post(
        "/api/quiz/zoom/scorcio/guess", json={"salta": True, "token": n["token"], "n": 2}
    ).json()
    assert e["tentativo"] == 2 and len(e["indizi"]) == 1


def test_stessa_serie_altre_stagioni() -> None:
    from app.quiz.dati import stessa_serie

    per_titolo = {a["titolo"]: a for a in anime()}
    s1 = per_titolo["Re:Zero kara Hajimeru Isekai Seikatsu"]
    s2 = per_titolo["Re:Zero kara Hajimeru Isekai Seikatsu 2nd Season"]
    altro = per_titolo["Shingeki no Kyojin"]
    assert stessa_serie(s1, s2) and stessa_serie(s2, s1)
    assert not stessa_serie(s1, s1) and not stessa_serie(s1, altro)


def test_altra_stagione_viene_segnalata_nelle_sfide() -> None:
    from app.quiz_api import firma

    per_titolo = {a["titolo"]: a for a in anime()}
    s1 = per_titolo["Re:Zero kara Hajimeru Isekai Seikatsu"]
    s2 = per_titolo["Re:Zero kara Hajimeru Isekai Seikatsu 2nd Season"]
    altro = per_titolo["Shingeki no Kyojin"]

    # scorcio (token fabbricato sul bersaglio «prima stagione»)
    tok = firma("scorcio", s1["id"])
    r = client.post(
        "/api/quiz/zoom/scorcio/guess", json={"risposta_id": s2["id"], "token": tok, "n": 1}
    ).json()
    assert not r["giusto"] and r["stessa_serie"]
    r = client.post(
        "/api/quiz/zoom/scorcio/guess", json={"risposta_id": altro["id"], "token": tok, "n": 1}
    ).json()
    assert not r["giusto"] and not r["stessa_serie"]
    r = client.post(
        "/api/quiz/zoom/scorcio/guess", json={"risposta_id": s1["id"], "token": tok, "n": 1}
    ).json()
    assert r["giusto"] and not r["stessa_serie"]

    # Animedle in allenamento
    tok = firma("animedle", s1["id"])
    r = client.post(
        "/api/quiz/animedle/guess", json={"anime_id": s2["id"], "token": tok, "n": 1}
    ).json()
    assert not r["giusto"] and r["stessa_serie"]

    # i personaggi non hanno stagioni
    p = client.post("/api/quiz/zoom/personaggio/nuovo").json()
    r = client.post(
        "/api/quiz/zoom/personaggio/guess", json={"risposta_id": 1, "token": p["token"], "n": 1}
    )
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        assert not r.json()["stessa_serie"]
