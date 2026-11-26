"""Torneo a duelli nelle stanze: partite simultanee tra giocatori, ognuno con il suo timer.

Il modulo non tocca la rete: riceve le mosse, fa avanzare i turni (`tick`) e restituisce gli
aggiornamenti da inviare. In un duello le mosse sono segrete: il turno si risolve quando
entrambi hanno consegnato, oppure allo scadere del timer (le mosse mancanti le gioca la CPU).
"""

import random
from dataclasses import dataclass, field

from app.duello import ai
from app.duello.carte import Carta
from app.duello.motore import MossaNonValida, Stato, corsie_vinte, gioca_turno, nuovo, valida
from app.rooms import tournament
from app.rooms.models import MatchRef

Mossa = tuple[str, int]


@dataclass
class Giocatore:
    id: str
    nome: str
    mazzo: list[Carta]
    bot: bool = False  # la chat e chi non c'è più giocano con la CPU


@dataclass
class Duello:
    a: Giocatore
    b: Giocatore | None  # None = turno di riposo (bye)
    stato: Stato | None
    scadenza: float = 0.0
    mosse: dict[int, list[Mossa] | None] = field(default_factory=lambda: {0: None, 1: None})
    ultimo: list[dict] = field(default_factory=list)  # type: ignore[type-arg]
    finito: bool = False
    vincitore: str | None = None  # id del vincitore, None = pareggio

    def lato_di(self, pid: str) -> int | None:
        if pid == self.a.id:
            return 0
        if self.b is not None and pid == self.b.id:
            return 1
        return None

    def giocatore(self, lato: int) -> Giocatore | None:
        return self.a if lato == 0 else self.b


Aggiornamento = tuple[str, Duello, list[dict], bool]  # type: ignore[type-arg]


class TorneoDuelli:
    def __init__(
        self,
        seed: int,
        giocatori: list[Giocatore],
        formato: str,
        durata_turno: int,
        legami: frozenset[frozenset[str]] = frozenset(),
        rivalita: frozenset[frozenset[str]] = frozenset(),
        pool: list[Carta] | None = None,
    ) -> None:
        self.seed = seed
        self.giocatori = giocatori
        self.formato = formato
        self.durata = durata_turno
        self.legami = legami
        self.rivalita = rivalita
        self.pool = pool or []
        self.rounds: list[list[MatchRef]] = []  # giornate concluse
        self.corrente: list[Duello] = []
        self.finito = False
        self.campione: str | None = None
        self._giornate = tournament.schedule(len(giocatori)) if formato != "eliminazione" else []
        self._indice_giornata = 0
        self._vincitori: list[Giocatore] = []
        self._accoppiati: list[tuple[Giocatore, Giocatore | None]] = []
        self._rng = random.Random(f"torneo:{seed}")

    # ---------- avvio dei round ----------
    def avvia(self, adesso: float) -> list[Aggiornamento]:
        if self.formato == "eliminazione":
            ordine = sorted(self.giocatori, key=lambda g: (-sum(c.potenza for c in g.mazzo), g.id))
            self._accoppiati = [
                (ordine[a], ordine[b] if b is not None else None)
                for a, b in tournament.primo_turno(len(ordine))
            ]
        return self._nuovo_round(adesso)

    def _nuovo_round(self, adesso: float) -> list[Aggiornamento]:
        if self.formato == "eliminazione":
            coppie = self._accoppiati
        else:
            gi = self._giornate[self._indice_giornata]
            coppie = [(self.giocatori[i], self.giocatori[j]) for i, j in gi]
        self.corrente = []
        out: list[Aggiornamento] = []
        for pa, pb in coppie:
            if pb is None:
                self.corrente.append(Duello(a=pa, b=None, stato=None, finito=True, vincitore=pa.id))
                continue
            i, j = self.giocatori.index(pa), self.giocatori.index(pb)
            stato = nuovo(
                tournament.match_seed(self.seed, i, j),
                pa.mazzo,
                pb.mazzo,
                self.legami,
                self.rivalita,
            )
            d = Duello(a=pa, b=pb, stato=stato, scadenza=adesso + self.durata)
            self.corrente.append(d)
            out += self._aggiornamenti(d, [], True)
        return out

    # ---------- mosse ----------
    def duello_di(self, pid: str) -> Duello | None:
        return next((d for d in self.corrente if d.lato_di(pid) is not None), None)

    def invia(self, pid: str, mosse: list[Mossa], adesso: float) -> list[Aggiornamento]:
        """Consegna le mosse di un giocatore; se anche l'altro ha consegnato si risolve il turno."""
        d = self.duello_di(pid)
        if d is None or d.finito or d.stato is None:
            raise MossaNonValida("non stai giocando un duello")
        lato = d.lato_di(pid)
        assert lato is not None
        valida(d.stato, lato, mosse)
        d.mosse[lato] = list(mosse)
        return self._risolvi_se_pronto(d, adesso)

    def _pronti(self, d: Duello) -> bool:
        """Entrambi hanno consegnato (i bot consegnano da soli)."""
        assert d.stato is not None
        for lato in (0, 1):
            g = d.giocatore(lato)
            if d.mosse[lato] is None and g is not None and g.bot:
                d.mosse[lato] = ai.scegli(d.stato, lato, "normale", self._rng, self.pool)
        return d.mosse[0] is not None and d.mosse[1] is not None

    def _risolvi_se_pronto(self, d: Duello, adesso: float) -> list[Aggiornamento]:
        if self._pronti(d):
            return self._risolvi(d, adesso)
        return self._aggiornamenti(d, [], False)  # chi ha consegnato vede «in attesa»

    def _risolvi(self, d: Duello, adesso: float) -> list[Aggiornamento]:
        assert d.stato is not None
        for lato in (0, 1):  # mosse mancanti (scadenza): le gioca la CPU
            if d.mosse[lato] is None:
                d.mosse[lato] = ai.mosse_euristiche(d.stato, lato)
        m0, m1 = d.mosse[0], d.mosse[1]
        assert m0 is not None and m1 is not None
        eventi = gioca_turno(d.stato, m0, m1)
        d.mosse = {0: None, 1: None}
        d.scadenza = adesso + self.durata
        if d.stato.finita:
            d.finito = True
            v = d.stato.vincitore
            d.vincitore = None if v is None else d.giocatore(v).id  # type: ignore[union-attr]
            if d.vincitore is None and self.formato == "eliminazione":
                d.vincitore = self._spareggio(d)
        return self._aggiornamenti(d, eventi, False)

    def _spareggio(self, d: Duello) -> str:
        """Eliminazione: niente pareggi, decide il seme del torneo."""
        assert d.b is not None
        return (d.a if self._rng.random() < 0.5 else d.b).id

    # ---------- tempo ----------
    def tick(self, adesso: float) -> list[Aggiornamento]:
        out: list[Aggiornamento] = []
        for d in self.corrente:
            if d.finito or d.stato is None:
                continue
            if adesso >= d.scadenza or self._pronti(d):
                out += self._risolvi(d, adesso)
        if self.corrente and all(d.finito for d in self.corrente):
            out += self._chiudi_round(adesso)
        return out

    # ---------- fine dei round ----------
    def _chiudi_round(self, adesso: float) -> list[Aggiornamento]:
        refs: list[MatchRef] = []
        for d in self.corrente:
            if d.b is None:
                refs.append(
                    MatchRef(
                        match_id="", a=d.a.id, b="", winner=d.a.id, total_a=0, total_b=0, bye=True
                    )
                )
                continue
            assert d.stato is not None
            v = corsie_vinte(d.stato)
            refs.append(
                MatchRef(
                    match_id="",
                    a=d.a.id,
                    b=d.b.id,
                    winner=d.vincitore,
                    total_a=v[0],
                    total_b=v[1],
                )
            )
        self.rounds.append(refs)
        vincitori = [d.a if d.vincitore == d.a.id else d.b for d in self.corrente]
        if self.formato == "eliminazione":
            chi = [g for g in vincitori if g is not None]
            if len(chi) == 1:
                self.finito, self.campione = True, chi[0].id
                self.corrente = []
                return []
            self._accoppiati = [(chi[i], chi[i + 1]) for i in range(0, len(chi), 2)]
            return self._nuovo_round(adesso)
        self._indice_giornata += 1
        if self._indice_giornata >= len(self._giornate):
            self.finito = True
            self.corrente = []
            return []
        return self._nuovo_round(adesso)

    # ---------- viste ----------
    @staticmethod
    def _aggiornamenti(d: Duello, eventi: list[dict], nuovo_duello: bool) -> list[Aggiornamento]:  # type: ignore[type-arg]
        out: list[Aggiornamento] = []
        for lato in (0, 1):
            g = d.giocatore(lato)
            if g is not None and not g.bot:
                out.append((g.id, d, eventi, nuovo_duello))
        return out
