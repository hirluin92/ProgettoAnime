from fastapi.testclient import TestClient

from app.main import app


def test_health() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_normalize_url() -> None:
    from app.db.session import normalize_url

    assert normalize_url("postgresql://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert normalize_url("postgres://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert normalize_url("postgresql+psycopg://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert normalize_url("sqlite:///x.db") == "sqlite:///x.db"


def test_match_seed_is_64bit_column() -> None:
    """Postgres ha INTEGER a 32 bit: i seed grandi devono poter essere salvati."""
    from sqlalchemy import BigInteger

    from app.db.models import MatchRow

    assert isinstance(MatchRow.__table__.c.seed.type, BigInteger)
