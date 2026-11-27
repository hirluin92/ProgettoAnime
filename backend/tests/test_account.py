from fastapi.testclient import TestClient

from app import account
from app.account import BONUS_REGISTRAZIONE, hash_segreto, nuovo_codice_recupero, verifica_segreto
from app.db.session import configure
from app.main import app

client = TestClient(app)


def nuovo_profilo(nome: str = "Anna") -> str:
    return client.post("/api/profile", json={"name": nome}).json()["id"]


def test_hash_is_salted_and_verifiable() -> None:
    a, b = hash_segreto("segreto123"), hash_segreto("segreto123")
    assert a != b and a.startswith("scrypt$") and "segreto" not in a
    assert verifica_segreto("segreto123", a) and not verifica_segreto("altro", a)
    assert not verifica_segreto("x", None) and not verifica_segreto("x", "rotto")
    assert len(nuovo_codice_recupero()) == 19


def test_register_login_and_cross_device(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'acc1.db'}")
    pid = nuovo_profilo()
    assert client.get(f"/api/profile/{pid}").json()["username"] is None
    r = client.post(
        "/api/account/registra",
        json={"profile_id": pid, "username": "Anna_01", "password": "password1"},
    )
    assert r.status_code == 200, r.text
    out = r.json()
    assert out["profile"]["username"] == "anna_01" and out["codice_recupero"]
    assert client.get(f"/api/profile/{pid}").json()["username"] == "anna_01"
    # un altro dispositivo: accede con nome e password e ottiene lo stesso profilo
    ok = client.post("/api/account/accedi", json={"username": "ANNA_01", "password": "password1"})
    assert (
        ok.status_code == 200
        and ok.json()["profile"]["id"] == pid
        and ok.json()["codice_recupero"] is None
    )
    assert (
        client.post(
            "/api/account/accedi", json={"username": "anna_01", "password": "sbagliata"}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/account/accedi", json={"username": "nessuno", "password": "password1"}
        ).status_code
        == 401
    )


def test_register_validation_and_conflicts(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'acc2.db'}")
    a, b = nuovo_profilo("Anna"), nuovo_profilo("Bruno")

    def reg(pid: str, user: str, pw: str = "password1"):  # type: ignore[no-untyped-def]
        return client.post(
            "/api/account/registra", json={"profile_id": pid, "username": user, "password": pw}
        )

    assert reg(a, "ab").status_code == 422  # troppo corto
    assert reg(a, "nome con spazi").status_code == 422
    assert reg(a, "anna", "corta").status_code == 422
    assert reg(a, "anna").status_code == 200
    assert reg(b, "ANNA").status_code == 409  # nome già preso, anche con maiuscole
    assert reg(a, "altro").status_code == 409  # il profilo ha già un account
    # il bonus di registrazione è dato una volta sola
    assert client.get(f"/api/profile/{a}").json()["crediti"] == BONUS_REGISTRAZIONE
    assert reg("00000000-0000-4000-8000-000000000000", "terzo").status_code == 404
    assert reg("non-un-uuid", "quarto").status_code == 422


def test_recovery_code_resets_password_once(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'acc3.db'}")
    pid = nuovo_profilo()
    codice = client.post(
        "/api/account/registra",
        json={"profile_id": pid, "username": "elena", "password": "password1"},
    ).json()["codice_recupero"]
    r = client.post(
        "/api/account/recupera",
        json={
            "username": "elena",
            "codice": codice.lower().replace("-", " "),
            "nuova_password": "nuovapass9",
        },
    )
    assert (
        r.status_code == 200
        and r.json()["codice_recupero"]
        and r.json()["codice_recupero"] != codice
    )
    assert (
        client.post(
            "/api/account/accedi", json={"username": "elena", "password": "password1"}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/account/accedi", json={"username": "elena", "password": "nuovapass9"}
        ).status_code
        == 200
    )
    # il vecchio codice non vale più
    assert (
        client.post(
            "/api/account/recupera",
            json={"username": "elena", "codice": codice, "nuova_password": "ancora1234"},
        ).status_code
        == 401
    )


def test_login_is_rate_limited(tmp_path) -> None:  # type: ignore[no-untyped-def]
    configure(f"sqlite:///{tmp_path / 'acc4.db'}")
    account._falliti.clear()
    pid = nuovo_profilo()
    client.post(
        "/api/account/registra",
        json={"profile_id": pid, "username": "carlo", "password": "password1"},
    )
    for _ in range(account.TENTATIVI):
        assert (
            client.post(
                "/api/account/accedi", json={"username": "carlo", "password": "no"}
            ).status_code
            == 401
        )
    assert (
        client.post(
            "/api/account/accedi", json={"username": "carlo", "password": "password1"}
        ).status_code
        == 429
    )
    account._falliti.clear()
    assert (
        client.post(
            "/api/account/accedi", json={"username": "carlo", "password": "password1"}
        ).status_code
        == 200
    )


def test_blocco_tentativi_non_cresce_all_infinito(monkeypatch) -> None:  # type: ignore[no-untyped-def]
    from app import account

    account._falliti.clear()
    for i in range(5100):
        account._falliti[f"ip|nome{i}"] = [0.0]  # tentativi vecchissimi: scaduti
    account._registra_fallimento("ip|nuovo")
    assert len(account._falliti) == 1 and "ip|nuovo" in account._falliti
