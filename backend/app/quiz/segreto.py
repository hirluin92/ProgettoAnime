"""Segreto del server per i quiz: firma dei token e scelta del bersaglio del giorno.

Serve che sia stabile (il bersaglio di oggi non deve cambiare a ogni riavvio) e non pubblico
(il codice è aperto: senza segreto chiunque calcolerebbe la soluzione del giorno).
`QUIZ_SECRET` se impostato, altrimenti un valore derivato da `DATABASE_URL`, che è privato.
"""

import hashlib
import os


def segreto() -> bytes:
    esplicito = os.environ.get("QUIZ_SECRET")
    if esplicito:
        return esplicito.encode()
    return hashlib.sha256(
        f"arena-anime-quiz:{os.environ.get('DATABASE_URL', '')}".encode()
    ).digest()
