"""Motore del Duello a corsie: stato e risoluzione dei turni. Puro e deterministico (nessun I/O).

Regole in PROPOSTA_V4.md. In breve: 3 corsie, 6 turni, energia = numero del turno; a ogni turno
si gioca in segreto, poi le carte si girano (prima chi è in vantaggio) e scattano gli effetti.
Dopo il turno 6 vince chi ha vinto più corsie.
"""

import math
import random
from dataclasses import dataclass, field, replace
from typing import Any

from .carte import Carta
from .luoghi import LUOGHI, ORDINE

CORSIE = 3
POSTI = 4
TURNI = 6
MANO_INIZIALE = 3
MANO_MAX = 7
MAX_MAZZO = 12

Mossa = tuple[str, int]  # (id carta, corsia)


class MossaNonValida(ValueError):
    pass


@dataclass
class Istanza:
    uid: int
    carta: Carta
    lato: int
    corsia: int
    mod: int = 0  # modifiche permanenti alla potenza (anche negative)
    ignora_luogo: bool = False
    dodge_usato: bool = False
    laststand_usato: bool = False
    regen_dato: int = 0
    turno: int = 0


@dataclass
class Lato:
    mazzo: list[Carta]  # carte ancora da pescare, in ordine
    mano: list[Carta] = field(default_factory=list)
    distrutte: list[Carta] = field(default_factory=list)
    energia_extra: int = 0  # bonus per il turno in corso (deciso al turno prima)
    energia_prossima: int = 0  # bonus per il turno dopo
    torneo: set[int] = field(default_factory=set)  # corsie dove il bonus del torneo è già dato


@dataclass
class Stato:
    seed: int
    luoghi: list[str]
    legami: frozenset[frozenset[str]]
    rivalita: frozenset[frozenset[str]]
    turno: int
    lati: list[Lato]
    corsie: list[list[list[Istanza]]]  # [corsia][lato] -> istanze in ordine di gioco
    barriere: set[tuple[int, int]] = field(default_factory=set)
    prossimo_uid: int = 1
    finita: bool = False
    vincitore: int | None = None  # 0, 1 oppure None (pareggio) se finita

    def copia(self) -> "Stato":
        return Stato(
            seed=self.seed,
            luoghi=list(self.luoghi),
            legami=self.legami,
            rivalita=self.rivalita,
            turno=self.turno,
            lati=[
                Lato(
                    mazzo=list(L.mazzo),
                    mano=list(L.mano),
                    distrutte=list(L.distrutte),
                    energia_extra=L.energia_extra,
                    energia_prossima=L.energia_prossima,
                    torneo=set(L.torneo),
                )
                for L in self.lati
            ],
            corsie=[[[replace(i) for i in lato] for lato in c] for c in self.corsie],
            barriere=set(self.barriere),
            prossimo_uid=self.prossimo_uid,
            finita=self.finita,
            vincitore=self.vincitore,
        )


def altro(lato: int) -> int:
    return 1 - lato


# ---------- creazione ----------
def nuovo(
    seed: int,
    mazzo0: list[Carta],
    mazzo1: list[Carta],
    legami: frozenset[frozenset[str]] = frozenset(),
    rivalita: frozenset[frozenset[str]] = frozenset(),
    luoghi: list[str] | None = None,
) -> Stato:
    if not (1 <= len(mazzo0) <= MAX_MAZZO and 1 <= len(mazzo1) <= MAX_MAZZO):
        raise MossaNonValida("mazzo non valido")
    lg = luoghi or random.Random(f"luoghi:{seed}").sample(list(ORDINE), CORSIE)
    lati = []
    for i, m in enumerate((mazzo0, mazzo1)):
        pila = list(m)
        random.Random(f"mazzo:{seed}:{i}").shuffle(pila)
        # mano iniziale giocabile: almeno una carta da 1-2 energia (se il mazzo ne ha)
        if all(c.costo > 2 for c in pila[:MANO_INIZIALE]):
            k = next((j for j in range(MANO_INIZIALE, len(pila)) if pila[j].costo <= 2), None)
            if k is not None:
                pila[0], pila[k] = pila[k], pila[0]
        lati.append(Lato(mazzo=pila[MANO_INIZIALE:], mano=pila[:MANO_INIZIALE]))
    return Stato(
        seed=seed,
        luoghi=lg,
        legami=legami,
        rivalita=rivalita,
        turno=1,
        lati=lati,
        corsie=[[[], []] for _ in range(CORSIE)],
    )


# ---------- potenza ----------
def _luogo(stato: Stato, corsia: int) -> Any:
    return LUOGHI[stato.luoghi[corsia]]


def _base(stato: Stato, i: Istanza, alleati: list[Istanza], nemici: list[Istanza]) -> int:
    """Potenza senza gli effetti che dipendono dal confronto tra le corsie (rabbia, luna)."""
    c = i.carta
    p = c.potenza + i.mod
    lg = _luogo(stato, i.corsia)
    if not i.ignora_luogo and c.arch in lg.favorisce:
        p += 1
    if c.passiva == "firststrike":
        p += 1
    p += sum(1 for a in alleati if a is not i and a.carta.passiva == "aura_atk")
    if c.passiva == "crit" and len(alleati) == 1:
        p += c.magnitudo
    for a in alleati:
        if a is not i and frozenset({a.carta.base_id, c.base_id}) in stato.legami:
            p += 2
    stesso_universo = sum(1 for a in alleati if a.carta.anime == c.anime)
    if stesso_universo >= 3:
        p += 1
    for n in nemici:
        if frozenset({n.carta.base_id, c.base_id}) in stato.rivalita:
            p += 2
    return p


def potenze_corsia(stato: Stato, corsia: int) -> tuple[dict[int, int], list[int]]:
    """Potenza effettiva di ogni carta della corsia (per uid) e i due totali."""
    per_lato = stato.corsie[corsia]
    base: dict[int, int] = {}
    for s in (0, 1):
        for i in per_lato[s]:
            base[i.uid] = _base(stato, i, per_lato[s], per_lato[altro(s)])
    totali_base = [sum(base[i.uid] for i in per_lato[s]) for s in (0, 1)]
    lg = _luogo(stato, corsia)
    eff: dict[int, int] = {}
    for s in (0, 1):
        piu_forte = max(per_lato[s], key=lambda i: (base[i.uid], -i.uid)) if per_lato[s] else None
        for i in per_lato[s]:
            p = base[i.uid]
            if i.carta.passiva == "rage" and totali_base[s] < totali_base[altro(s)]:
                p += i.carta.magnitudo
            if lg.id == "luna" and i is piu_forte and not i.ignora_luogo:
                p += 3
            if lg.id == "gravita" and not i.ignora_luogo:
                p = math.floor(p * 1.25)
            eff[i.uid] = max(0, p)
    return eff, [sum(eff[i.uid] for i in per_lato[s]) for s in (0, 1)]


def potenza(stato: Stato, i: Istanza) -> int:
    return potenze_corsia(stato, i.corsia)[0][i.uid]


def totali(stato: Stato) -> list[list[int]]:
    """Potenza totale di ogni corsia: [[lato0, lato1], ...]."""
    return [potenze_corsia(stato, c)[1] for c in range(CORSIE)]


def corsie_vinte(stato: Stato) -> list[int]:
    v = [0, 0]
    for a, b in totali(stato):
        if a > b:
            v[0] += 1
        elif b > a:
            v[1] += 1
    return v


# ---------- bersagli ed effetti ----------
def _protetta(stato: Stato, i: Istanza) -> bool:
    return i.carta.passiva == "armor" or (i.corsia, i.lato) in stato.barriere


def _bersagliabile(stato: Stato, bers: Istanza, fonte: Istanza) -> bool:
    if bers.lato != fonte.lato and stato.luoghi[bers.corsia] == "nebbia":
        return False
    return True


def _tutte(stato: Stato, lato: int) -> list[Istanza]:
    return [i for c in range(CORSIE) for i in stato.corsie[c][lato]]


def _nemici(stato: Stato, fonte: Istanza, solo_corsia: bool) -> list[Istanza]:
    lista = (
        stato.corsie[fonte.corsia][altro(fonte.lato)]
        if solo_corsia
        else _tutte(stato, altro(fonte.lato))
    )
    return [i for i in lista if _bersagliabile(stato, i, fonte)]


def _forti(stato: Stato, lista: list[Istanza]) -> list[Istanza]:
    pot = {c: potenze_corsia(stato, c)[0] for c in range(CORSIE)}
    return sorted(lista, key=lambda i: (-pot[i.corsia][i.uid], i.uid))


def _deboli(stato: Stato, lista: list[Istanza]) -> list[Istanza]:
    return list(reversed(_forti(stato, lista)))


def _riduci(stato: Stato, bers: Istanza, n: int, fonte: Istanza, ev: list[dict[str, Any]]) -> None:
    if _protetta(stato, bers):
        return
    if bers.carta.passiva == "dodge" and not bers.dodge_usato:
        bers.dodge_usato = True
        ev.append({"uid": bers.uid, "delta": 0, "schivata": True})
        return
    bers.mod -= n
    ev.append({"uid": bers.uid, "delta": -n})
    if bers.carta.passiva == "thorns" and not _protetta(stato, fonte):
        fonte.mod -= 1
        ev.append({"uid": fonte.uid, "delta": -1})


def _distruggi(stato: Stato, bers: Istanza, ev: list[dict[str, Any]]) -> None:
    if _protetta(stato, bers):
        return
    if bers.carta.passiva == "dodge" and not bers.dodge_usato:
        bers.dodge_usato = True
        ev.append({"uid": bers.uid, "delta": 0, "schivata": True})
        return
    if bers.carta.passiva == "laststand" and not bers.laststand_usato:
        bers.laststand_usato = True
        bers.mod = 1 - bers.carta.potenza
        ev.append({"uid": bers.uid, "delta": 0, "resiste": True})
        return
    stato.corsie[bers.corsia][bers.lato].remove(bers)
    stato.lati[bers.lato].distrutte.append(bers.carta)
    ev.append({"uid": bers.uid, "delta": 0, "distrutta": True})


def _applica_mossa(stato: Stato, i: Istanza, ev: list[dict[str, Any]]) -> None:
    m = i.carta.magnitudo
    mezzi = (m + 1) // 2
    eff = i.carta.mossa
    alleati = [a for a in stato.corsie[i.corsia][i.lato] if a is not i]
    nem_c = _nemici(stato, i, True)
    if eff == "strike":
        i.mod += 2 * m
        ev.append({"uid": i.uid, "delta": 2 * m})
    elif eff == "pierce":
        i.ignora_luogo = True
        i.mod += m
        ev.append({"uid": i.uid, "delta": m})
    elif eff == "heal":
        bers = (_deboli(stato, alleati) or [i])[0]
        bers.mod += m + 1
        ev.append({"uid": bers.uid, "delta": m + 1})
    elif eff == "stun":
        for b in _forti(stato, nem_c)[:1]:
            _riduci(stato, b, m + 1, i, ev)
    elif eff == "multi":
        for b in _forti(stato, _nemici(stato, i, False))[:3]:
            _riduci(stato, b, 1, i, ev)
    elif eff == "aoe":
        for b in list(nem_c):
            _riduci(stato, b, mezzi, i, ev)
    elif eff == "execute":
        deboli = _deboli(stato, nem_c)
        if deboli and potenza(stato, deboli[0]) <= 2 * m + 1:
            _distruggi(stato, deboli[0], ev)
    elif eff == "haste":
        stato.lati[i.lato].energia_prossima += 1
    elif eff == "revive":
        L = stato.lati[i.lato]
        if L.distrutte and len(L.mano) < MANO_MAX:
            L.mano.append(L.distrutte.pop(0))
    elif eff == "snipe":
        for b in _forti(stato, _nemici(stato, i, False))[:1]:
            _riduci(stato, b, m + 1, i, ev)
    elif eff == "healall":
        for a in _tutte(stato, i.lato):
            if a is not i:
                a.mod += mezzi
                ev.append({"uid": a.uid, "delta": mezzi})
    elif eff == "drain":
        for b in _forti(stato, nem_c)[:1]:
            _riduci(stato, b, m, i, ev)
            i.mod += m
            ev.append({"uid": i.uid, "delta": m})
    elif eff == "barrier":
        stato.barriere.add((i.corsia, i.lato))
    elif eff == "debuff":
        for b in _nemici(stato, i, False):
            _riduci(stato, b, mezzi, i, ev)
    elif eff == "buff":
        for a in alleati:
            a.mod += m
            ev.append({"uid": a.uid, "delta": m})


# ---------- turno ----------
def energia(stato: Stato, lato: int) -> int:
    return stato.turno + stato.lati[lato].energia_extra


def costo_in(stato: Stato, carta: Carta, corsia: int) -> int:
    return carta.costo + (1 if stato.luoghi[corsia] == "gravita" else 0)


def valida(stato: Stato, lato: int, mosse: list[Mossa]) -> None:
    mano = {c.id for c in stato.lati[lato].mano}
    visti: set[str] = set()
    speso = 0
    nuove = [0] * CORSIE
    for cid, corsia in mosse:
        if cid not in mano or cid in visti:
            raise MossaNonValida(f"carta non in mano: {cid}")
        if not 0 <= corsia < CORSIE:
            raise MossaNonValida("corsia non valida")
        visti.add(cid)
        carta = next(c for c in stato.lati[lato].mano if c.id == cid)
        speso += costo_in(stato, carta, corsia)
        nuove[corsia] += 1
    if speso > energia(stato, lato):
        raise MossaNonValida("energia insufficiente")
    for c in range(CORSIE):
        limite = 3 if stato.luoghi[c] == "ghiaccio" else POSTI
        if len(stato.corsie[c][lato]) + nuove[c] > limite:
            raise MossaNonValida("corsia piena")


def _fine_turno(stato: Stato, ev: list[dict[str, Any]]) -> None:
    for s in (0, 1):
        for i in sorted(_tutte(stato, s), key=lambda x: x.uid):
            p = i.carta.passiva
            if p == "regen" and i.regen_dato < i.carta.magnitudo:
                i.mod += 1
                i.regen_dato += 1
                ev.append(
                    {
                        "t": "effetto",
                        "uid": i.uid,
                        "mossa": "regen",
                        "bers": [{"uid": i.uid, "delta": 1}],
                    }
                )
            elif p == "lifesteal":
                nem = _forti(stato, _nemici(stato, i, True))
                if nem:
                    bers: list[dict[str, Any]] = []
                    _riduci(stato, nem[0], 1, i, bers)
                    i.mod += 1
                    bers.append({"uid": i.uid, "delta": 1})
                    ev.append({"t": "effetto", "uid": i.uid, "mossa": "lifesteal", "bers": bers})
    for c in range(CORSIE):
        if stato.luoghi[c] == "vulcano":
            bers = []
            for s in (0, 1):
                for i in stato.corsie[c][s]:
                    if potenza(stato, i) > 1 and not _protetta(stato, i):
                        i.mod -= 1
                        bers.append({"uid": i.uid, "delta": -1})
            if bers:
                ev.append({"t": "luogo", "corsia": c, "luogo": "vulcano", "bers": bers})


def _ordine_rivelazione(stato: Stato) -> list[int]:
    v = corsie_vinte(stato)
    if v[0] != v[1]:
        return [0, 1] if v[0] > v[1] else [1, 0]
    return [0, 1] if stato.turno % 2 == 1 else [1, 0]


def gioca_turno(
    stato: Stato, mosse0: list[Mossa], mosse1: list[Mossa], registra: bool = True
) -> list[dict[str, Any]]:
    """Risolve un turno con le mosse segrete dei due lati; restituisce gli eventi."""
    if stato.finita:
        raise MossaNonValida("partita finita")
    valida(stato, 0, mosse0)
    valida(stato, 1, mosse1)
    ev: list[dict[str, Any]] = []
    ordine = _ordine_rivelazione(stato)
    energie = [energia(stato, 0), energia(stato, 1)]
    ev.append({"t": "turno", "turno": stato.turno, "energia": energie, "primo": ordine[0]})
    mosse = {0: mosse0, 1: mosse1}
    giocate: dict[int, dict[str, Carta]] = {}
    for s in (0, 1):
        ids = {m[0] for m in mosse[s]}
        giocate[s] = {c.id: c for c in stato.lati[s].mano if c.id in ids}
        stato.lati[s].mano = [c for c in stato.lati[s].mano if c.id not in ids]
    # in ogni lato prima le carte «prima rivelazione», poi le altre nell'ordine scelto
    for s in ordine:
        carte = giocate[s]
        ordinate = sorted(mosse[s], key=lambda m: 0 if carte[m[0]].passiva == "firststrike" else 1)
        for cid, corsia in ordinate:
            carta = carte[cid]
            ist = Istanza(
                uid=stato.prossimo_uid, carta=carta, lato=s, corsia=corsia, turno=stato.turno
            )
            stato.prossimo_uid += 1
            stato.corsie[corsia][s].append(ist)
            ev.append(
                {"t": "rivela", "lato": s, "corsia": corsia, "uid": ist.uid, "carta": carta.id}
            )
            L = stato.lati[s]
            if carta.passiva == "energy":
                L.energia_prossima += 1
            if stato.luoghi[corsia] == "torneo" and corsia not in L.torneo:
                L.torneo.add(corsia)
                L.energia_prossima += 1
            bers: list[dict[str, Any]] = []
            _applica_mossa(stato, ist, bers)
            if bers or carta.mossa in ("haste", "revive", "barrier"):
                ev.append({"t": "effetto", "uid": ist.uid, "mossa": carta.mossa, "bers": bers})
    _fine_turno(stato, ev)
    ev.append({"t": "punteggi", "corsie": totali(stato)})
    if stato.turno >= TURNI:
        _concludi(stato, ev)
    else:
        stato.turno += 1
        for L in stato.lati:
            L.energia_extra = L.energia_prossima
            L.energia_prossima = 0
            if L.mazzo and len(L.mano) < MANO_MAX:
                L.mano.append(L.mazzo.pop(0))
    return ev if registra else []


def _concludi(stato: Stato, ev: list[dict[str, Any]]) -> None:
    v = corsie_vinte(stato)
    tot = totali(stato)
    if v[0] != v[1]:
        stato.vincitore = 0 if v[0] > v[1] else 1
    else:
        a = sum(t[0] for t in tot)
        b = sum(t[1] for t in tot)
        stato.vincitore = None if a == b else (0 if a > b else 1)
    stato.finita = True
    ev.append({"t": "fine", "vincitore": stato.vincitore, "corsie_vinte": v, "corsie": tot})
