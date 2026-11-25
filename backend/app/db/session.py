import os
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.models import Base


def database_url() -> str:
    return os.environ.get("DATABASE_URL", "sqlite:///./local.db")


_engine = create_engine(database_url())
_factory = sessionmaker(_engine, expire_on_commit=False)


def configure(url: str) -> None:
    """Cambia database (usato dai test)."""
    global _engine, _factory
    _engine = create_engine(
        url, connect_args={"check_same_thread": False} if url.startswith("sqlite") else {}
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
