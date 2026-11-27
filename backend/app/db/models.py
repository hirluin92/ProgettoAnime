import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, BigInteger, Boolean, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class MatchRow(Base):
    __tablename__ = "matches"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    room_code: Mapped[str | None] = mapped_column(String(8), nullable=True, index=True)
    seed: Mapped[int] = mapped_column(BigInteger)
    result: Mapped[dict[str, Any]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


def new_match_id() -> str:
    return uuid.uuid4().hex[:12]


class DailyScore(Base):
    __tablename__ = "daily_scores"
    __table_args__ = (UniqueConstraint("day", "name_key", name="uq_daily_day_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    day: Mapped[str] = mapped_column(String(10), index=True)
    name: Mapped[str] = mapped_column(String(24))
    name_key: Mapped[str] = mapped_column(String(24))  # nome in minuscolo: un tentativo a nome
    score: Mapped[int] = mapped_column(Integer)
    match_id: Mapped[str] = mapped_column(String(32))


class ProfileRow(Base):
    """Profilo anonimo di un dispositivo (id casuale nel browser): XP, collezione, statistiche."""

    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(24))
    xp: Mapped[int] = mapped_column(Integer, default=0)
    partite: Mapped[int] = mapped_column(Integer, default=0)
    vittorie: Mapped[int] = mapped_column(Integer, default=0)
    best_scala: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    elo: Mapped[int] = mapped_column(Integer, default=1200, server_default="1200")
    username: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True, index=True)
    pw_hash: Mapped[str | None] = mapped_column(String(200), nullable=True)
    recovery_hash: Mapped[str | None] = mapped_column(String(200), nullable=True)
    mazzi: Mapped[list[dict]] = mapped_column(JSON, default=list)  # type: ignore[type-arg]
    crediti: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    pity: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0"
    )  # pacchetti dall'ultima leggendaria
    pacchetti_aperti: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    mmr: Mapped[int] = mapped_column(Integer, default=1000, server_default="1000")  # ranked
    ranked_partite: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    collezione: Mapped[list[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class QuizGiorno(Base):
    """Un gioco a quiz del giorno (Animedle...) di un profilo: tentativi, esito, crediti."""

    __tablename__ = "quiz_giorno"
    __table_args__ = (UniqueConstraint("profile_id", "gioco", "day", name="uq_quiz_giorno"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[str] = mapped_column(String(36), index=True)
    gioco: Mapped[str] = mapped_column(String(20))
    day: Mapped[str] = mapped_column(String(10), index=True)
    tentativi: Mapped[int] = mapped_column(Integer, default=0)
    vinto: Mapped[bool] = mapped_column(Boolean, default=False)
    crediti: Mapped[int] = mapped_column(Integer, default=0)


class DuelloGiorno(Base):
    """Risultato del rompicapo del giorno del Duello: un tentativo a nome."""

    __tablename__ = "duello_giorno"
    __table_args__ = (UniqueConstraint("day", "name_key", name="uq_duello_giorno_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    day: Mapped[str] = mapped_column(String(10), index=True)
    name: Mapped[str] = mapped_column(String(24))
    name_key: Mapped[str] = mapped_column(String(24))
    stelle: Mapped[int] = mapped_column(Integer)
    punteggio: Mapped[int] = mapped_column(Integer)


class ProfileDay(Base):
    """Cosa ha già fatto un profilo in un giorno (obiettivi completati, bonus del primo gioco)."""

    __tablename__ = "profile_days"
    __table_args__ = (UniqueConstraint("profile_id", "day", name="uq_profile_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[str] = mapped_column(String(36), index=True)
    day: Mapped[str] = mapped_column(String(10))
    fatti: Mapped[list[str]] = mapped_column(JSON, default=list)  # id obiettivi completati
    primo: Mapped[bool] = mapped_column(Boolean, default=False)


class RankedGhost(Base):
    """Il mazzo di una partita classificata: diventa l'avversario di altri giocatori."""

    __tablename__ = "ranked_ghosts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(24))
    mmr: Mapped[int] = mapped_column(Integer, index=True)
    mazzo: Mapped[list[str]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )


class RankedSettimana(Base):
    """Partite classificate giocate in una settimana e premi già ritirati."""

    __tablename__ = "ranked_settimane"
    __table_args__ = (UniqueConstraint("profile_id", "settimana", name="uq_ranked_sett"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    profile_id: Mapped[str] = mapped_column(String(36), index=True)
    settimana: Mapped[str] = mapped_column(String(8))  # es. 2026-W48
    partite: Mapped[int] = mapped_column(Integer, default=0)
    ritirati: Mapped[list[int]] = mapped_column(JSON, default=list)  # soglie già incassate


class SeasonScore(Base):
    """Punti della stagione (un mese) di un profilo."""

    __tablename__ = "season_scores"
    __table_args__ = (UniqueConstraint("season", "profile_id", name="uq_season_profile"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season: Mapped[str] = mapped_column(String(7), index=True)
    profile_id: Mapped[str] = mapped_column(String(36))
    name: Mapped[str] = mapped_column(String(24))
    points: Mapped[int] = mapped_column(Integer, default=0)
