"""Quiz tra amici: domande a tempo, vince chi risponde giusto e prima.

Logica pura (il tempo arriva da fuori): scelta delle domande, punteggi, fasi. Il server custodisce
la soluzione e la manda solo a domanda chiusa. I giochi sono quelli delle sfide del giorno:
scorcio (banner da scoprire), personaggio misterioso e indizi (si indovina l'anime dai suoi dati).
"""

import random
from dataclasses import dataclass, field
from typing import Any

from app.quiz import zoom
from app.quiz.dati import pool_anime, pool_personaggi, sigle, stessa_serie
from app.rooms.models import QuizIndizio, QuizPunteggio, QuizSoluzione, QuizView

LIVELLI = 6
RIVELAZIONE = 6.0  # secondi di pausa a fine domanda
BLOCCO = 4.0  # secondi di attesa dopo una risposta sbagliata
BLOCCO_SERIE = 2.0  # se almeno era un'altra stagione della stessa serie
BONUS_POSIZIONE = (50, 25, 10)
BONUS_SERIE = 20  # per ogni domanda indovinata di fila prima di questa
BONUS_SERIE_MAX = 100
PARZIALE = {"brano": 0.5, "artista": 0.4}  # quota dei punti per il solo titolo o il solo artista
TIPI = ("scorcio", "personaggio", "indizi", "sigla")


class QuizErrore(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def indizi_anime(t: dict[str, Any], livello: int) -> list[dict[str, str]]:
    """Gli indizi sull'anime: uno in più a ogni livello."""
    scala = [
        ("generi", ", ".join(t["generi"])),
        ("anno", str(t["anno"])),
        ("episodi", str(t["episodi"])),
        ("studio", ", ".join(t["studio"])),
        ("fonte", str(t["fonte"])),
        ("voto", str(t["voto"])),
    ]
    return [{"k": k, "v": v} for k, v in scala[: livello + 1] if v]


@dataclass
class Domanda:
    kind: str
    target: dict[str, Any]

    def giusta(self, risposta_id: int) -> bool:
        return bool(risposta_id == self.target["id"])

    def vicina(self, risposta_id: int) -> bool:
        """Sbagliata ma della stessa serie (solo per le domande su un anime)."""
        if self.kind == "personaggio":
            return False
        r = zoom.risposta_per_id("scorcio", risposta_id)
        return r is not None and stessa_serie(self.target, r)

    def controlla(self, tipo: str, risposta_id: int) -> str:
        """«giusto», «serie» (altra stagione) o «no» per una risposta anime, brano o artista."""
        t = self.target
        if tipo == "anime" or self.kind != "sigla":
            if tipo != "anime" and self.kind != "sigla":
                raise QuizErrore("bad_type", "In questa domanda si risponde solo con l'anime")
            if self.giusta(risposta_id):
                return "giusto"
            return "serie" if self.vicina(risposta_id) else "no"
        chiave = "brano_idx" if tipo == "brano" else "artista_idx"
        return "giusto" if risposta_id == t[chiave] else "no"

    def soluzione(self) -> QuizSoluzione:
        t = self.target
        if self.kind == "sigla":
            return QuizSoluzione(
                nome=t["titolo_en"] or t["titolo"],
                dettaglio=f"{t['brano']} · {t['artista']} ({t['tipo']})",
                immagine=t["cover"],
            )
        if self.kind == "personaggio":
            dett = f"{t['anime']} · {t['anno']}" if t["anno"] else str(t["anime"])
            return QuizSoluzione(nome=t["nome"], dettaglio=dett, immagine=t["img"])
        return QuizSoluzione(
            nome=t["titolo_en"] or t["titolo"],
            dettaglio=f"{t['titolo']} · {t['anno']}",
            immagine=t["cover"],
        )

    def audio(self) -> str | None:
        return str(self.target["anteprima"]) if self.kind == "sigla" else None

    def immagine(self) -> str | None:
        if self.kind in ("indizi", "sigla"):
            return None
        return zoom.immagine(
            "personaggio" if self.kind == "personaggio" else "scorcio", self.target
        )

    def punto(self) -> tuple[float, float]:
        if self.kind in ("indizi", "sigla"):
            return 50.0, 50.0
        return zoom.punto("personaggio" if self.kind == "personaggio" else "scorcio", self.target)

    def indizi(self, livello: int) -> list[QuizIndizio]:
        if self.kind == "indizi":
            return [QuizIndizio(**i) for i in indizi_anime(self.target, livello)]
        if self.kind == "sigla":
            return [QuizIndizio(**i) for i in zoom.indizi("sigla", self.target, livello)]
        gioco = "personaggio" if self.kind == "personaggio" else "scorcio"
        return [QuizIndizio(**i) for i in zoom.indizi(gioco, self.target, livello)]


@dataclass
class QuizPartita:
    domande: list[Domanda]
    tempo: int
    giocatori: list[str]
    inizio: float
    idx: int = 0
    fase: str = "domanda"
    scadenza: float = 0.0
    punti: dict[str, int] = field(default_factory=dict)
    giusti: dict[str, int] = field(
        default_factory=dict
    )  # giocatore -> punti presi in questa domanda
    blocchi: dict[str, float] = field(default_factory=dict)
    clip: int = 30  # secondi massimi di anteprima di una sigla
    loop: bool = True
    chiede: str = "tutto"  # nelle sigle: tutto | anime | brano | artista
    parziali: dict[str, dict[str, int]] = field(
        default_factory=dict
    )  # pid -> {brano|artista: punti}
    serie: dict[str, int] = field(default_factory=dict)  # domande di fila indovinate (anime)
    serie_prima: dict[str, int] = field(default_factory=dict)  # la serie a inizio domanda
    ultimo: dict[str, tuple[str, int]] = field(default_factory=dict)  # pid -> (componente, punti)

    @classmethod
    def nuova(
        cls,
        seed: int,
        tipo: str,
        n: int,
        tempo: int,
        giocatori: list[str],
        adesso: float,
        clip: int = 30,
        loop: bool = True,
        chiede: str = "tutto",
    ) -> "QuizPartita":
        rng = random.Random(f"quiz:{seed}")
        kinds = list(TIPI) if tipo == "misto" else [tipo]
        anime = rng.sample(pool_anime(), min(n, len(pool_anime())))
        pers = rng.sample(pool_personaggi(), min(n, len(pool_personaggi())))
        brani = rng.sample(sigle(), min(n, len(sigle())))
        domande: list[Domanda] = []
        for i in range(n):
            k = kinds[i % len(kinds)] if tipo == "misto" else tipo
            t = pers[i] if k == "personaggio" else brani[i] if k == "sigla" else anime[i]
            if k == "scorcio" and not t["banner"]:
                k = "indizi"
            domande.append(Domanda(k, t))
        p = cls(domande, tempo, list(giocatori), adesso)
        p.clip, p.loop, p.chiede = clip, loop, chiede
        p.punti = dict.fromkeys(giocatori, 0)
        p.serie = dict.fromkeys(giocatori, 0)
        p._apri(adesso)
        return p

    # -- fasi
    def _apri(self, adesso: float) -> None:
        self.fase = "domanda"
        self.inizio = adesso
        self.scadenza = adesso + self.tempo
        self.giusti = {}
        self.blocchi = {}
        self.parziali = {}
        self.serie_prima = dict(self.serie)

    def tipi(self, d: Domanda) -> list[str]:
        """Come si può rispondere a una domanda: nelle sigle dipende dalle impostazioni."""
        if d.kind != "sigla":
            return ["anime"]
        return ["anime", "brano", "artista"] if self.chiede == "tutto" else [self.chiede]

    def principale(self, d: Domanda) -> str:
        """La risposta che vale i punti pieni e chiude la domanda quando l'hanno data tutti."""
        if d.kind != "sigla" or self.chiede in ("tutto", "anime"):
            return "anime"
        return self.chiede

    @property
    def corrente(self) -> Domanda:
        return self.domande[min(self.idx, len(self.domande) - 1)]

    def livello(self, adesso: float) -> int:
        if self.fase != "domanda":
            return LIVELLI - 1
        return max(0, min(LIVELLI - 1, int((adesso - self.inizio) / self.tempo * LIVELLI)))

    def rispondi(self, pid: str, risposta_id: int, adesso: float, tipo: str = "anime") -> str:
        """Esito: «giusto» (anime), «parziale» (solo brano o artista), «serie» o «no».

        L'anime vale tutti i punti (tempo, posizione, serie di risposte); il titolo del brano o il
        solo artista ne danno una parte, una volta ciascuno per domanda.
        """
        if self.fase != "domanda" or adesso >= self.scadenza:
            raise QuizErrore("closed", "La domanda è chiusa")
        if pid not in self.punti:
            raise QuizErrore("not_player", "Non stai giocando")
        if tipo not in self.tipi(self.corrente):
            raise QuizErrore("bad_type", "Questa risposta non vale in questa domanda")
        principale = self.principale(self.corrente)
        if tipo == principale and pid in self.giusti:
            raise QuizErrore("done", "Hai già indovinato")
        if tipo != principale and tipo in self.parziali.get(pid, {}):
            raise QuizErrore("done", "Questa parte l'hai già indovinata")
        attesa = self.blocchi.get(pid, 0.0) - adesso
        if attesa > 0:
            raise QuizErrore("locked", f"Aspetta ancora {attesa:.0f} secondi")
        esito = self.corrente.controlla(tipo, risposta_id)
        if esito != "giusto":
            self.blocchi[pid] = adesso + (BLOCCO_SERIE if esito == "serie" else BLOCCO)
            return esito
        resto = max(0.0, self.scadenza - adesso) / self.tempo
        base = 100 + round(100 * resto)
        if tipo != principale:
            guadagno = round(base * PARZIALE[tipo])
            self.parziali.setdefault(pid, {})[tipo] = guadagno
            self.punti[pid] += guadagno
            self.ultimo[pid] = (tipo, guadagno)
            return "parziale"
        posizione = len(self.giusti)
        bonus = BONUS_POSIZIONE[posizione] if posizione < len(BONUS_POSIZIONE) else 0
        serie = self.serie_prima.get(pid, 0)
        guadagno = base + bonus + min(BONUS_SERIE_MAX, BONUS_SERIE * serie)
        self.giusti[pid] = guadagno
        self.punti[pid] += guadagno
        self.serie[pid] = serie + 1
        self.ultimo[pid] = (tipo, guadagno)
        return "giusto"

    def tick(self, adesso: float, attivi: list[str]) -> bool:
        """Fa avanzare le fasi. True se qualcosa è cambiato (da trasmettere)."""
        if self.fase == "domanda":
            tutti = bool(attivi) and all(p in self.giusti for p in attivi)
            if tutti or adesso >= self.scadenza:
                for pid in self.punti:  # chi non ha indovinato perde la serie
                    if pid not in self.giusti:
                        self.serie[pid] = 0
                self.fase = "rivelazione"
                self.scadenza = adesso + RIVELAZIONE
                return True
        elif self.fase == "rivelazione" and adesso >= self.scadenza:
            self.idx += 1
            if self.idx >= len(self.domande):
                self.fase = "fine"
                self.idx = len(self.domande) - 1
            else:
                self._apri(adesso)
            return True
        return False

    def view(self, adesso: float) -> QuizView:
        d = self.corrente
        liv = self.livello(adesso)
        fx, fy = d.punto()
        ordine = sorted(self.punti, key=lambda p: (-self.punti[p], p))
        return QuizView(
            round=self.idx + 1,
            totali=len(self.domande),
            kind=d.kind,  # type: ignore[arg-type]
            fase=self.fase,  # type: ignore[arg-type]
            immagine=d.immagine(),
            fx=fx,
            fy=fy,
            livello=liv,
            audio=d.audio(),
            audio_secondi=min(self.clip, zoom.secondi_sigla(liv)) if d.kind == "sigla" else 0,
            loop=self.loop,
            tipi=self.tipi(d),
            principale=self.principale(d),
            indizi=d.indizi(liv),
            scadenza=self.scadenza,
            punteggi=[
                QuizPunteggio(
                    id=p,
                    punti=self.punti[p],
                    giusto=p in self.giusti,
                    guadagno=self.giusti.get(p, 0) + sum(self.parziali.get(p, {}).values()),
                    serie=self.serie.get(p, 0),
                    brano="brano" in self.parziali.get(p, {}),
                    artista="artista" in self.parziali.get(p, {}),
                )
                for p in ordine
            ],
            soluzione=d.soluzione() if self.fase != "domanda" else None,
        )
