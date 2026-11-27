"""Limite di richieste per IP: protegge le azioni che creano partite o costano CPU.

In memoria e per processo (basta per un'istanza sola). Si applica alle sole richieste che
scrivono (POST/PUT/DELETE) sotto /api, non alle letture né ai WebSocket.
"""

import time
from collections import deque


class LimiteRichieste:
    def __init__(self, massimo: int, finestra: float = 60.0) -> None:
        self.massimo = massimo
        self.finestra = finestra
        self._visti: dict[str, deque[float]] = {}

    def consenti(self, chiave: str, adesso: float | None = None) -> bool:
        """Registra una richiesta di `chiave`; falso se ha superato il massimo nella finestra."""
        if self.massimo <= 0:
            return True
        t = time.monotonic() if adesso is None else adesso
        coda = self._visti.setdefault(chiave, deque())
        while coda and t - coda[0] >= self.finestra:
            coda.popleft()
        if len(coda) >= self.massimo:
            return False
        coda.append(t)
        if len(self._visti) > 10_000:  # chiavi ferme da tempo: si buttano
            for k in [k for k, c in self._visti.items() if not c or t - c[-1] >= self.finestra]:
                del self._visti[k]
        return True
