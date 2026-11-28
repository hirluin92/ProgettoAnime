import uuid

import pytest
from fastapi.testclient import TestClient

from app.db.models import EventoRow
from app.db.session import configure, session_scope
from app.eventi import ritenzione
from app.main import app

client = TestClient(app)


def blocco(pid: str | None = None, **kw) -> dict:  # type: ignore[no-untyped-def,type-arg]
    return {
        "pid": pid or str(uuid.uuid4()),
        "eventi": kw.get("eventi", [{"nome": "apertura", "sessione": "abcdefgh1", "props": {}}]),
    }


def test_registra_eventi(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'e.db'}")
    corpo = blocco(
        eventi=[
            {"nome": "apertura", "sessione": "abcdefgh1", "props": {"path": "/duello"}},
            {
                "nome": "partita_fine",
                "sessione": "abcdefgh1",
                "props": {"modo": "duello", "esito": "vittoria", "turni": 6},
            },
        ]
    )
    r = client.post("/api/eventi", json=corpo)
    assert r.status_code == 200 and r.json() == {"salvati": 2}
    with session_scope() as s:
        righe = s.query(EventoRow).all()
        assert [x.nome for x in righe] == ["apertura", "partita_fine"]
        assert righe[1].props["esito"] == "vittoria"
        assert righe[0].pid == corpo["pid"] and len(righe[0].giorno) == 10


@pytest.mark.parametrize(
    "corpo",
    [
        {"pid": "non-un-uuid", "eventi": [{"nome": "apertura", "sessione": "abcdefgh1"}]},
        blocco(eventi=[]),
        blocco(eventi=[{"nome": "clic_qualsiasi", "sessione": "abcdefgh1"}]),
        blocco(eventi=[{"nome": "apertura", "sessione": "corta"}]),
        blocco(eventi=[{"nome": "apertura", "sessione": "abcdefgh1", "props": {"x" * 21: 1}}]),
        blocco(eventi=[{"nome": "apertura", "sessione": "abcdefgh1", "props": {"t": "a" * 41}}]),
        blocco(
            eventi=[
                {
                    "nome": "apertura",
                    "sessione": "abcdefgh1",
                    "props": {f"k{i}": i for i in range(9)},
                }
            ]
        ),
        blocco(eventi=[{"nome": "apertura", "sessione": "abcdefgh1"}] * 21),
        blocco(
            eventi=[
                {
                    "nome": "apertura",
                    "sessione": "abcdefgh1",
                    "props": {f"k{i}": "x" * 40 for i in range(8)},
                }
            ]
        ),
    ],
)
def test_rifiuta_eventi_non_validi(corpo, tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'e2.db'}")
    assert client.post("/api/eventi", json=corpo).status_code == 422
    with session_scope() as s:
        assert s.query(EventoRow).count() == 0


def ev(pid: str, giorno: str, nome: str, sessione: str = "s1", **props):  # type: ignore[no-untyped-def]
    return {"pid": pid, "giorno": giorno, "nome": nome, "sessione": sessione, "props": props}


def test_ritenzione_d1_d7_e_rivincite() -> None:
    eventi = [
        # a: torna al giorno 1 e al giorno 7
        ev("a", "2026-11-01", "apertura"),
        ev("a", "2026-11-01", "partita_inizio", "a1"),
        ev("a", "2026-11-01", "partita_fine", "a1", esito="sconfitta"),
        ev("a", "2026-11-01", "rivincita", "a1", dopo="sconfitta"),
        ev("a", "2026-11-01", "partita_inizio", "a1"),
        ev("a", "2026-11-02", "apertura", "a2"),
        ev("a", "2026-11-08", "partita_inizio", "a3"),
        # b: non torna, non finisce nemmeno la prima partita
        ev("b", "2026-11-01", "apertura", "b1"),
        ev("b", "2026-11-01", "partita_inizio", "b1"),
        ev("b", "2026-11-01", "abbandono", "b1"),
        # c: primo giorno troppo recente per D7
        ev("c", "2026-11-05", "apertura", "c1"),
    ]
    r = ritenzione(eventi, oggi="2026-11-10")
    assert r["giocatori"] == 3
    assert r["ritorno"]["D1"] == {"coorte": 3, "tornati": 1, "quota": 0.333}
    assert r["ritorno"]["D7"] == {"coorte": 2, "tornati": 1, "quota": 0.5}
    assert r["ritorno"]["D30"]["coorte"] == 0 and r["ritorno"]["D30"]["quota"] is None
    assert r["partite_per_sessione"] == 1  # a1: 2, b1: 1, a3: 1 → mediana 1
    assert r["completa_prima_partita"] == 0.5  # a ha una partita finita, b no
    assert r["rivincita_dopo_sconfitta"] == 1.0
    assert r["abbandoni"] == 1


def test_ritenzione_senza_eventi() -> None:
    r = ritenzione([], oggi="2026-11-10")
    assert r["giocatori"] == 0 and r["partite_per_sessione"] is None
    assert r["ritorno"]["D1"]["quota"] is None
