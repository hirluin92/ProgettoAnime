"""Ora italiana senza dipendenze dai fusi orari: il giorno delle sfide cambia a mezzanotte italiana.

L'Italia è UTC+1, con l'ora legale (UTC+2) dall'ultima domenica di marzo alle 01:00 UTC
all'ultima domenica di ottobre alle 01:00 UTC.
"""

from datetime import UTC, datetime, timedelta


def _ultima_domenica(anno: int, mese: int) -> datetime:
    ultimo = datetime(anno + (mese == 12), mese % 12 + 1, 1, 1, tzinfo=UTC) - timedelta(days=1)
    # ultimo giorno del mese alle 01:00 UTC, poi si torna indietro fino alla domenica
    return ultimo - timedelta(days=(ultimo.weekday() + 1) % 7)


def adesso_italia(adesso: datetime | None = None) -> datetime:
    ora = (adesso or datetime.now(UTC)).astimezone(UTC)
    legale = _ultima_domenica(ora.year, 3) <= ora < _ultima_domenica(ora.year, 10)
    return ora + timedelta(hours=2 if legale else 1)


def giorno_italia(adesso: datetime | None = None) -> str:
    return adesso_italia(adesso).strftime("%Y-%m-%d")
