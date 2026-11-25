import os
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.models import Base


def normalize_url(url: str) -> str:
    """Neon e Fly danno `postgresql://`: SQLAlchemy userebbe psycopg2, noi usiamo psycopg 3."""
    for prefix in ("postgresql://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix) :]
    return url


def database_url() -> str:
    return normalize_url(os.environ.get("DATABASE_URL", "sqlite:///./local.db"))


_engine = create_engine(database_url(), pool_pre_ping=True, pool_recycle=240)
_factory = sessionmaker(_engine, expire_on_commit=False)


def configure(url: str) -> None:
    """Cambia database (usato dai test)."""
    global _engine, _factory
    url = normalize_url(url)
    _engine = create_engine(
        url,
        connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
        pool_pre_ping=True,
        pool_recycle=240,
    )
    _factory = sessionmaker(_engine, expire_on_commit=False)
    init_db()


def init_db() -> None:
    Base.metadata.create_all(_engine)


@contextmanager
def session_scope() -> Iterator[Session]:
    with _factory() as session:
        yield session
        session.commit()
