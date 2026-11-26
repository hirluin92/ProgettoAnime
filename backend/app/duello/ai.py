"""Giocatori del Duello: casuale, euristico e a simulazione (Monte Carlo). Il motore resta puro.

La CPU non vede la mano dell'avversario: nelle simulazioni gliene si assegna una a caso tra le
carte che potrebbe avere (`pool`), così non bara.
"""

import random

from .carte import Carta
from .motore import (
    CORSIE,
    POSTI,
    Istanza,
    Mossa,
    Stato,
    altro,
    costo_in,
    energia,
    gioca_turno,
    totali,
)

LIVELLI = ("facile", "normale", "difficile")


def _liberi(stato: Stato, lato: int, nuove: list[int]) -> list[int]:
    """Posti ancora liberi per corsia, tenendo conto di quelli già scelti in questo turno."""
    out = []
    for c in range(CORSIE):
        limite = 3 if stato.luoghi[c] == "ghiaccio" else POSTI
        out.append(limite - len(stato.corsie[c][lato]) - nuove[c])
    return out


def mosse_casuali(stato: Stato, lato: int, rng: random.Random) -> list[Mossa]:
    mano = list(stato.lati[lato].mano)
    rng.shuffle(mano)
    budget = energia(stato, lato)
    nuove = [0] * CORSIE
    mosse: list[Mossa] = []
    for carta in mano:
        if rng.random() < 0.15:
            continue
        corsie = [c for c in range(CORSIE) if _liberi(stato, lato, nuove)[c] > 0]
        rng.shuffle(corsie)
        for c in corsie:
            costo = costo_in(stato, carta, c)
            if costo <= budget:
                mosse.append((carta.id, c))
                budget -= costo
                nuove[c] += 1
                break
    return mosse


def _valore_corsie(stato: Stato, lato: int) -> float:
    """Quanto va bene per `lato`: corsie in vantaggio (peso grande) e margine (peso piccolo)."""
    v = 0.0
    for t in totali(stato):
        diff = t[lato] - t[altro(lato)]
        v += (10 if diff > 0 else -10 if diff < 0 else 0) + max(-6, min(6, diff))
    return v


def _prova(stato: Stato, lato: int, carta: Carta, corsia: int) -> float:
    s = stato.copia()
    ist = Istanza(uid=10_000 + len(carta.id), carta=carta, lato=lato, corsia=corsia, turno=s.turno)
    s.corsie[corsia][lato].append(ist)
    return _valore_corsie(s, lato)


def mosse_euristiche(stato: Stato, lato: int, rng: random.Random | None = None) -> list[Mossa]:
    """Spende l'energia mettendo ogni carta dove migliora di più il quadro delle corsie."""
    budget = energia(stato, lato)
    nuove = [0] * CORSIE
    mano = sorted(stato.lati[lato].mano, key=lambda c: (-c.potenza / c.costo, -c.potenza, c.id))
    mosse: list[Mossa] = []
    # il quadro con le carte già scelte in questo turno (approssimato inserendole davvero)
    s = stato.copia()
    uid = 20_000
    rimaste = list(mano)
    while rimaste:
        migliore: tuple[float, Carta, int] | None = None
        base = _valore_corsie(s, lato)
        for carta in rimaste:
            for c in range(CORSIE):
                if _liberi(stato, lato, nuove)[c] <= 0:
                    continue
                costo = costo_in(stato, carta, c)
                if costo > budget:
                    continue
                guadagno = _prova(s, lato, carta, c) - base
                # a parità, meglio la carta più economica (resta energia per altre)
                punteggio = guadagno - 0.01 * costo + 0.001 * carta.potenza
                if migliore is None or punteggio > migliore[0]:
                    migliore = (punteggio, carta, c)
        if migliore is None or (migliore[0] < 0 and stato.turno < 6):
            break
        _, carta, c = migliore
        mosse.append((carta.id, c))
        budget -= costo_in(stato, carta, c)
        nuove[c] += 1
        rimaste.remove(carta)
        uid += 1
        s.corsie[c][lato].append(Istanza(uid=uid, carta=carta, lato=lato, corsia=c, turno=s.turno))
    return mosse


def _determinizza(stato: Stato, lato: int, pool: list[Carta], rng: random.Random) -> Stato:
    """Una possibile realtà: all'avversario si assegnano mano e mazzo presi a caso dal `pool`."""
    s = stato.copia()
    opp = s.lati[altro(lato)]
    visibili = {i.carta.id for c in range(CORSIE) for ll in (0, 1) for i in s.corsie[c][ll]}
    visibili |= {c.id for c in opp.distrutte}
    libere = [c for c in pool if c.id not in visibili]
    rng.shuffle(libere)
    n_mano, n_mazzo = len(opp.mano), len(opp.mazzo)
    opp.mano = libere[:n_mano]
    opp.mazzo = libere[n_mano : n_mano + n_mazzo]
    return s


def _partita_veloce(stato: Stato, lato: int, rng: random.Random) -> float:
    """Gioca il resto della partita con l'euristica e dà 1 (vinta), 0,5 o 0."""
    s = stato
    while not s.finita:
        m = [mosse_euristiche(s, 0), mosse_euristiche(s, 1)]
        gioca_turno(s, m[0], m[1], registra=False)
    if s.vincitore is None:
        return 0.5
    return 1.0 if s.vincitore == lato else 0.0


def mosse_simulate(
    stato: Stato,
    lato: int,
    pool: list[Carta],
    rng: random.Random,
    candidati: int = 14,
    simulazioni: int = 6,
) -> list[Mossa]:
    """Prova diversi piani e sceglie quello che vince più spesso in simulazioni del resto."""
    piani: list[list[Mossa]] = [mosse_euristiche(stato, lato)]
    for _ in range(candidati - 1):
        piani.append(mosse_casuali(stato, lato, rng))
    # un piano «tutto in una corsia» per ogni corsia
    for c in range(CORSIE):
        piano: list[Mossa] = []
        budget = energia(stato, lato)
        for carta in sorted(stato.lati[lato].mano, key=lambda x: -x.potenza):
            costo = costo_in(stato, carta, c)
            if costo <= budget and len(piano) + len(stato.corsie[c][lato]) < POSTI:
                piano.append((carta.id, c))
                budget -= costo
        piani.append(piano)
    migliore = piani[0]
    miglior_val = -1.0
    for piano in piani:
        tot = 0.0
        for _ in range(simulazioni):
            s = _determinizza(stato, lato, pool, rng)
            avversario = mosse_euristiche(s, altro(lato))
            mie = [0, 0]
            m = [piano, avversario] if lato == 0 else [avversario, piano]
            try:
                gioca_turno(s, m[0], m[1], registra=False)
            except ValueError:
                tot -= 1
                continue
            del mie
            tot += (
                _partita_veloce(s, lato, rng)
                if not s.finita
                else (1.0 if s.vincitore == lato else 0.5 if s.vincitore is None else 0.0)
            )
        if tot > miglior_val:
            miglior_val, migliore = tot, piano
    return migliore


def scegli(
    stato: Stato,
    lato: int,
    livello: str,
    rng: random.Random,
    pool: list[Carta] | None = None,
) -> list[Mossa]:
    if livello == "facile":
        return (
            mosse_casuali(stato, lato, rng) if rng.random() < 0.6 else mosse_euristiche(stato, lato)
        )
    if livello == "normale" or not pool:
        return mosse_euristiche(stato, lato)
    return mosse_simulate(stato, lato, pool, rng)
