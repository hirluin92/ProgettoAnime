"""Combattimento a squadre a turni. Funzione pura e deterministica dal seed."""

from dataclasses import dataclass, field
from typing import Literal

from . import tattiche as tat
from .arene import ARENE, Arena
from .formazioni import DEFAULT as FORM_DEFAULT
from .formazioni import FORMAZIONI
from .models import (
    Azione,
    Effetti,
    Esito,
    Event,
    Fase,
    Fine,
    Ingresso,
    MatchResult,
    Respiro,
    RivalitaAttiva,
    Ruleset,
    Side,
    Sinergia,
    Stato,
    Team,
    Turno,
    Unita,
)
from .rng import Rng
from .roles import ROLES
from .scoring import (
    DUO_ATK,
    adatto,
    legami_squadra,
    potenza_ruolo,
    sinergie_squadra,
    statistiche_base,
)

SIDES: tuple[Side, Side] = ("A", "B")
MAX_TURNI = 10
ENERGIA_MAX = 100
ENERGIA_AZIONE = 40
ENERGIA_COLPITO = 10
ENERGIA_INIZIALE = 20
CRIT_BASE = 0.12
CRIT_PASSIVA = 0.35
SCHIVATA = 0.18
VARIANZA = 0.08
BURN_PCT = 0.05  # bruciatura: % della vita massima per turno
VELENO_PCT = 0.04
CORROSIONE = 1.5  # bruciatura + veleno insieme: danni ×1,5
CARICA_DAL_TURNO = 4  # con la mossa finale "trattenuta" si lancia dal turno 4...
CARICA_MOLT = 1.3  # ...con il 30% di danno in più
RITARDO_PUNTI = 20  # recupero: energia +50% se si è indietro di 20 punti % di vita
RITARDO_BONUS = 0.5
RESPIRO_ATK = 1.3
RIVALITA_BONUS = 1.08
RESPIRO_SCUDO = 0.15
HYPE_MAX = 100
HYPE_SOGLIE: tuple[tuple[int, float], ...] = ((100, 0.08), (50, 0.04))
NEUTRA = Arena("neutra", "Arena neutra", "Nessuna regola speciale.")

# moltiplicatore di danno dei colpi speciali
MOLT = {
    "strike": 2.3,
    "pierce": 1.9,
    "aoe": 0.95,
    "multi": 0.95,
    "stun": 1.5,
    "drain": 1.7,
    "execute": 1.7,
    "snipe": 2.1,
    "haste": 1.3,
    "debuff": 0.7,
}
RANGED = {"MAG", "TIR", "EVO"}


def _altro(s: Side) -> Side:
    return "B" if s == "A" else "A"


@dataclass
class U:
    lato: Side
    idx: int
    arch: str
    passiva: str
    mossa_nome: str
    mossa_eff: str
    rating: int
    maxhp: int
    hp: int
    atk: float
    dif: float
    vel: float
    fila: int
    energia: int = ENERGIA_INIZIALE
    scudo: int = 0
    stordito: bool = False
    mod_atk: float = 1.0
    mod_turni: int = 0
    laststand_usata: bool = False
    legati: list[int] = field(default_factory=list)
    legame_rotto: bool = False
    primo_turno: bool = True
    tags: frozenset[str] = frozenset()
    bid: str = ""  # id del personaggio base (le forme condividono rivalità e legami)
    burn: int = 0  # turni di bruciatura rimasti
    veleno: int = 0
    sigillo: int = 0  # turni in cui non può lanciare la mossa finale
    respiro: bool = False  # ultimo respiro già usato

    @property
    def vivo(self) -> bool:
        return self.hp > 0


class Battaglia:
    def __init__(
        self,
        squadre: dict[Side, Team],
        seed: int,
        regole: Ruleset,
        registra: bool,
        tattiche: dict[Side, list[str]] | None = None,
        arena: str | None = None,
        carica: dict[Side, str] | None = None,
        formazione: dict[Side, str] | None = None,
    ) -> None:
        self.rng = Rng(seed)
        self.tattiche = tattiche or {}
        self.arena: Arena = ARENE[arena] if arena else NEUTRA
        self.carica: dict[Side, str] = carica or {"A": "subito", "B": "subito"}
        self.formazione: dict[Side, str] = formazione or {"A": FORM_DEFAULT, "B": FORM_DEFAULT}
        self.hype: dict[Side, int] = {"A": 0, "B": 0}
        self.rivalita: list[RivalitaAttiva] = []
        self.rivali: set[tuple[str, str]] = set()
        self.speciale_att: U | None = None  # chi sta lanciando la mossa finale in questo momento
        self.respiro_emesso: set[Side] = set()
        self.registra = registra
        self.squadre = squadre
        self.sinergie: list[Sinergia] = []
        self.unita: dict[Side, list[U]] = {"A": [], "B": []}
        self.iniziali: dict[Side, list[Unita]] = {"A": [], "B": []}
        self.eventi: list[Event] = []
        self.turno = 0
        self.limite_turno: int | None = None  # per le anteprime di fase
        self.energia_bonus: dict[Side, float] = {}
        for s in SIDES:
            self._prepara(s, regole)
        for r in regole.rivalita:
            for ia, ua in enumerate(self.unita["A"]):
                for ib, ub in enumerate(self.unita["B"]):
                    if {ua.bid, ub.bid} == {r.a, r.b}:
                        self.rivalita.append(RivalitaAttiva(nome=r.nome, a=ia, b=ib))
                        self.rivali.add((ua.bid, ub.bid))
                        self.rivali.add((ub.bid, ua.bid))

    # ---------- preparazione ----------
    def _prepara(self, s: Side, regole: Ruleset) -> None:
        team = self.squadre[s]
        sin = sinergie_squadra(s, team, regole.tratti)
        self.sinergie += sin
        legami = legami_squadra(team, regole.duos)
        bonus = {
            "atk": team.bonus_missione + team.bonus_atk,
            "def": team.bonus_dif,
            "hp": team.bonus_missione + team.bonus_hp,
            "spd": 0.0,
            "energy": 0.0,
        }
        fila = FORMAZIONI[self.formazione[s]].fila
        for x in sin:
            if x.stat == "tutto":
                for k in ("atk", "def", "hp"):
                    bonus[k] += x.valore / 100
            else:
                bonus[x.stat] += x.valore / 100
        for i, ch in enumerate(team.members):
            hp, atk, dif, vel = statistiche_base(ch, ROLES[i])
            hp *= 1 + bonus["hp"]
            atk *= 1 + bonus["atk"]
            if i == 0:  # boss dei raid: vita e attacco del Capitano
                hp *= team.boss_hp
                atk *= team.boss_atk
            dif *= 1 + bonus["def"]
            vel *= 1 + bonus["spd"]
            if ch.passiva.effetto == "armor":
                dif *= 1.25
            vel *= self.arena.vel
            if ch.arch == "TAN":
                dif *= self.arena.tank_dif
            u = U(
                lato=s,
                idx=i,
                arch=ch.arch,
                passiva=ch.passiva.effetto,
                mossa_nome=ch.mossa.nome,
                mossa_eff=ch.mossa.effetto,
                rating=ch.rating,
                maxhp=round(hp),
                hp=round(hp),
                atk=atk,
                dif=dif,
                vel=vel,
                fila=fila[i],
                energia=min(
                    ENERGIA_MAX,
                    round(ENERGIA_INIZIALE * (1 + bonus["energy"])) + team.energia_iniziale,
                ),
                scudo=round(round(hp) * team.scudo_iniziale),
                tags=frozenset(ch.tags),
                bid=ch.base_id or ch.id,
            )
            u.legati = [b if a == i else a for a, b, _ in legami if i in (a, b)]
            self.unita[s].append(u)
            self.iniziali[s].append(
                Unita(
                    hp=u.maxhp,
                    atk=round(atk),
                    dif=round(dif),
                    vel=round(vel),
                    adatto=adatto(ch, ROLES[i]),
                )
            )
        self.energia_bonus[s] = bonus["energy"]

    # ---------- utilità ----------
    def stato(self) -> Stato:
        return Stato(
            hp={s: [u.hp for u in self.unita[s]] for s in SIDES},
            energia={s: [u.energia for u in self.unita[s]] for s in SIDES},
            scudo={s: [u.scudo for u in self.unita[s]] for s in SIDES},
            hype=dict(self.hype),
        )

    def vivi(self, s: Side) -> list[U]:
        return [u for u in self.unita[s] if u.vivo]

    def atk_eff(self, u: U) -> float:
        m = u.mod_atk
        if u.passiva == "rage" and u.hp < u.maxhp * 0.5:
            m *= 1.45
        alleati = self.vivi(u.lato)
        if self.unita[u.lato][0].vivo:  # aura del Capitano
            m *= 1.05
        # abilità di ruolo: l'aura rende il doppio se chi la porta guida (Capitano o Vice)
        m *= 1 + sum(
            (0.07 if a.idx in (0, 1) else 0.035) for a in alleati if a.passiva == "aura_atk"
        )
        if u.legati:
            m *= 1 + DUO_ATK
            if u.legame_rotto:
                m *= 1.12
        if u.passiva == "firststrike" and self.turno == 1:
            m *= 1.25
        m *= self.molt_tattica(u.lato)
        m *= 1 + next((b for soglia, b in HYPE_SOGLIE if self.hype[u.lato] >= soglia), 0.0)
        if u.respiro:
            m *= RESPIRO_ATK
        m *= self.arena.danno
        if self.speciale_att is u and self.carica[u.lato] == "carica":
            m *= CARICA_MOLT
        return u.atk * m

    def molt_tattica(self, lato: Side) -> float:
        if not self.tattiche:
            return 1.0
        f = tat.fase_di_turno(self.turno)
        return tat.moltiplicatore(lato, self.tattiche["A"][f], self.tattiche["B"][f])

    def bersaglio(self, att: U, modo: str) -> U | None:
        nemici = self.vivi(_altro(att.lato))
        if not nemici:
            return None
        if modo == "lowest":
            return min(nemici, key=lambda u: (u.hp / u.maxhp, u.idx))
        if modo == "any":
            return nemici[int(self.rng.random() * len(nemici))]
        fila = min(u.fila for u in nemici)
        cand = [u for u in nemici if u.fila == fila]
        return cand[int(self.rng.random() * len(cand))]

    def modo_base(self, u: U) -> str:
        if u.arch == "ASS":
            return "lowest"
        if u.arch in RANGED:
            return "any"
        return "fila"

    # ---------- danni ----------
    def colpisci(
        self,
        att: U,
        bers: U,
        mult: float,
        esiti: dict[tuple[Side, int], Esito],
        pierce: bool = False,
    ) -> int:
        e = self._esito(esiti, bers)
        if not bers.vivo:
            return 0
        base = self.atk_eff(att) * mult * (1 - VARIANZA + 2 * VARIANZA * self.rng.random())
        if (att.bid, bers.bid) in self.rivali:
            base *= RIVALITA_BONUS
        if self.arena.mancato and self.rng.random() < self.arena.mancato:
            e.schivata = True
            return 0
        if bers.passiva == "dodge" and self.rng.random() < SCHIVATA:
            e.schivata = True
            return 0
        chance = (CRIT_PASSIVA if att.passiva == "crit" else CRIT_BASE) + self.arena.crit
        crit = self.rng.random() < chance
        dmg = (
            base * (1.5 if crit else 1.0) * 100 / (100 + bers.dif * 1.6 * (0.4 if pierce else 1.0))
        )
        dmg_i = max(1, round(dmg))
        assorbito = min(bers.scudo, dmg_i)
        bers.scudo -= assorbito
        reale = dmg_i - assorbito
        if reale >= bers.hp and bers.passiva == "laststand" and not bers.laststand_usata:
            bers.laststand_usata = True
            reale = bers.hp - 1
        reale = min(reale, bers.hp)
        bers.hp -= reale
        e.delta -= reale
        e.scudo = bers.scudo
        e.crit = e.crit or crit
        if crit:
            self._hype(att.lato, 6)
        if bers.vivo:
            bers.energia = min(ENERGIA_MAX, bers.energia + ENERGIA_COLPITO)
            if reale > 0:
                self._stato_alterato(att, bers, e)
        else:
            e.ko = True
            self._hype(att.lato, 10)
            self._morto(bers)
        if reale > 0:
            if att.passiva == "lifesteal":
                self._cura(att, round(reale * 0.25), esiti)
            if bers.passiva == "thorns" and att.vivo:
                ri = min(att.hp, round(reale * 0.2))
                att.hp -= ri
                ea = self._esito(esiti, att)
                ea.delta -= ri
                if not att.vivo:
                    ea.ko = True
                    self._morto(att)
        return reale

    def _hype(self, lato: Side, quanto: int) -> None:
        self.hype[lato] = min(HYPE_MAX, self.hype[lato] + quanto)

    def _stato_alterato(self, att: U, bers: U, e: Esito) -> None:
        """Stati dai tratti: Elemento brucia, Psichico sigilla (finale), Furtività avvelena."""
        if self.speciale_att is att:
            if "ELEMENT" in att.tags:
                bers.burn = max(bers.burn, 2)
                e.effetto = "bruciatura"
            if "PSYCHIC" in att.tags:
                bers.sigillo = max(bers.sigillo, 1)
                e.effetto = "sigillo"
        elif "STEALTH" in att.tags:
            bers.veleno = max(bers.veleno, 3)
            e.effetto = "veleno"

    def _in_ritardo(self, lato: Side) -> bool:
        return self.percento(lato) <= self.percento(_altro(lato)) - RITARDO_PUNTI

    def _tick(self) -> None:
        """A fine turno: danni da bruciatura, veleno e arena; la corrosione somma i due stati."""
        esiti: dict[tuple[Side, int], Esito] = {}
        for s in SIDES:
            for u in self.unita[s]:
                if not u.vivo:
                    continue
                danno = 0.0
                tipo: str | None = None
                if u.burn > 0:
                    danno += u.maxhp * BURN_PCT
                    tipo = "bruciatura"
                if self.arena.bruciatura_prima_linea and u.fila == 0:
                    danno += u.maxhp * BURN_PCT * 0.8
                    tipo = "bruciatura"
                if u.veleno > 0:
                    danno += u.maxhp * VELENO_PCT
                    tipo = "veleno" if tipo is None else "corrosione"
                    if u.burn > 0:
                        danno *= CORROSIONE
                u.burn = max(0, u.burn - 1)
                u.veleno = max(0, u.veleno - 1)
                u.sigillo = max(0, u.sigillo - 1)
                if danno <= 0:
                    continue
                d = min(u.hp, max(1, round(danno)))
                u.hp -= d
                e = self._esito(esiti, u)
                e.delta -= d
                e.effetto = tipo
                if not u.vivo:
                    e.ko = True
                    self._hype(_altro(s), 10)
                    self._morto(u)
        if esiti and self.registra:
            for (lato, idx), e in esiti.items():
                e.scudo = self.unita[lato][idx].scudo
            self.eventi.append(
                Effetti(turno=self.turno, esiti=list(esiti.values()), stato=self.stato())
            )

    def _respiro(self) -> None:
        """Ultimo respiro: l'ultimo superstite (contro 2+) ottiene bonus, scudo ed energia piena."""
        for s in SIDES:
            vivi = self.vivi(s)
            if s in self.respiro_emesso or len(vivi) != 1 or len(self.vivi(_altro(s))) < 2:
                continue
            u = vivi[0]
            self.respiro_emesso.add(s)
            u.respiro = True
            u.scudo += round(u.maxhp * RESPIRO_SCUDO)
            u.energia = ENERGIA_MAX
            self._hype(s, 15)
            if self.registra:
                self.eventi.append(Respiro(turno=self.turno, lato=s, idx=u.idx, stato=self.stato()))

    def _morto(self, u: U) -> None:
        for i in u.legati:
            self.unita[u.lato][i].legame_rotto = True

    def _esito(self, esiti: dict[tuple[Side, int], Esito], u: U) -> Esito:
        k = (u.lato, u.idx)
        if k not in esiti:
            esiti[k] = Esito(
                lato=u.lato,
                idx=u.idx,
                delta=0,
                scudo=u.scudo,
                ko=False,
                schivata=False,
                crit=False,
                stordito=False,
            )
        return esiti[k]

    def _cura(self, u: U, quanto: int, esiti: dict[tuple[Side, int], Esito]) -> None:
        if not u.vivo or quanto <= 0:
            return
        reale = min(quanto, u.maxhp - u.hp)
        u.hp += reale
        self._esito(esiti, u).delta += reale

    # ---------- azioni ----------
    def agisci(self, u: U) -> None:
        esiti: dict[tuple[Side, int], Esito] = {}
        speciale = False
        mossa = "Attacco"
        effetto = "base"
        if u.passiva == "regen":
            # abilità di ruolo: la rigenerazione rende di più nello slot del Guaritore
            self._cura(u, round(u.maxhp * (0.08 if u.idx == 6 else 0.05)), esiti)
        if u.stordito:
            u.stordito = False
            self._esito(esiti, u)
            mossa, effetto = "Stordito", "stordito"
        elif (
            u.energia >= ENERGIA_MAX
            and u.sigillo == 0
            and not (self.carica[u.lato] == "carica" and self.turno < CARICA_DAL_TURNO)
        ):
            speciale = True
            mossa, effetto = u.mossa_nome, u.mossa_eff
            u.energia = 0
            self._hype(u.lato, 12)
            self.speciale_att = u
            self._speciale(u, effetto, esiti)
            self.speciale_att = None
        else:
            guadagno = ENERGIA_AZIONE * (1.6 if u.passiva == "energy" else 1.0)
            bonus_e = (
                self.energia_bonus[u.lato]
                + self.arena.energia
                + (RITARDO_BONUS if self._in_ritardo(u.lato) else 0.0)
            )
            u.energia = min(ENERGIA_MAX, u.energia + round(guadagno * (1 + bonus_e)))
            b = self.bersaglio(u, self.modo_base(u))
            if b is not None:
                self.colpisci(u, b, 0.9 if u.arch in ("GUA", "SUP") else 1.0, esiti)
        u.primo_turno = False
        self._emetti(u, mossa, speciale, effetto, esiti)
        if speciale:
            self._combo(u)
        self._respiro()

    def _combo(self, u: U) -> None:
        """Dopo la mossa finale, i compagni di legame ancora in piedi colpiscono subito dopo."""
        for i in u.legati:
            p = self.unita[u.lato][i]
            if not p.vivo or p.stordito or not self.vivi(_altro(u.lato)):
                continue
            esiti: dict[tuple[Side, int], Esito] = {}
            b = self.bersaglio(p, self.modo_base(p))
            if b is not None:
                self.colpisci(p, b, 0.8, esiti)
            self._emetti(p, "Combo", False, "combo", esiti)

    def _emetti(
        self, u: U, mossa: str, speciale: bool, effetto: str, esiti: dict[tuple[Side, int], Esito]
    ) -> None:
        if not self.registra:
            return
        for (lato, idx), e in esiti.items():
            e.scudo = self.unita[lato][idx].scudo
        self.eventi.append(
            Azione(
                turno=self.turno,
                da=u.lato,
                idx=u.idx,
                mossa=mossa,
                speciale=speciale,
                effetto=effetto,
                esiti=list(esiti.values()),
                stato=self.stato(),
            )
        )

    def _speciale(self, u: U, eff: str, esiti: dict[tuple[Side, int], Esito]) -> None:
        mia = self.vivi(u.lato)
        nem = self.vivi(_altro(u.lato))
        if eff in ("strike", "pierce", "stun", "drain", "execute", "haste", "debuff"):
            b = self.bersaglio(u, self.modo_base(u))
            if b is None:
                return
            mult = MOLT[eff]
            if eff == "execute" and b.hp < b.maxhp * 0.5:
                mult = 2.6
            reale = self.colpisci(u, b, mult, esiti, pierce=(eff == "pierce"))
            if eff == "stun" and b.vivo:
                b.stordito = True
                self._esito(esiti, b).stordito = True
            elif eff == "drain":
                self._cura(u, round(reale * 0.6), esiti)
            elif eff == "debuff":
                for n in self.vivi(_altro(u.lato)):
                    n.mod_atk, n.mod_turni = 0.75, 2
                    self._esito(esiti, n)
            elif eff == "haste":
                u.vel += 15
        elif eff == "snipe":
            b = self.bersaglio(u, "lowest")
            if b is not None:
                self.colpisci(u, b, MOLT[eff], esiti)
        elif eff == "aoe":
            for n in nem:
                self.colpisci(u, n, MOLT[eff], esiti)
        elif eff == "multi":
            for _ in range(3):
                b = self.bersaglio(u, "any")
                if b is not None:
                    self.colpisci(u, b, MOLT[eff], esiti)
        elif eff == "barrier":
            for a in mia:
                a.scudo += round(a.maxhp * 0.14)
                self._esito(esiti, a)
        elif eff == "heal":
            t = min(mia, key=lambda a: (a.hp / a.maxhp, a.idx))
            self._cura(t, round(t.maxhp * 0.42), esiti)
        elif eff == "healall":
            for a in mia:
                self._cura(a, round(a.maxhp * 0.19), esiti)
        elif eff == "revive":
            caduti = [a for a in self.unita[u.lato] if not a.vivo]
            if caduti:
                c = caduti[0]
                c.hp = round(c.maxhp * 0.4)
                c.stordito = False
                self._esito(esiti, c).delta += c.hp
            else:
                t = min(mia, key=lambda a: (a.hp / a.maxhp, a.idx))
                self._cura(t, round(t.maxhp * 0.38), esiti)
        elif eff == "buff":
            for a in mia:
                a.mod_atk, a.mod_turni = 1.25, 2
                self._esito(esiti, a)

    # ---------- partita ----------
    def gioca(self) -> tuple[Side, Literal["ko", "tempo"]]:
        if self.registra:
            self.eventi.append(Ingresso(stato=self.stato()))
        for n in range(1, (self.limite_turno or MAX_TURNI) + 1):
            self.turno = n
            if self.registra:
                self.eventi.append(Turno(n=n))
                if self.tattiche and n in tat.FASE_INIZIO:
                    f = tat.fase_di_turno(n)
                    ta, tb = self.tattiche["A"][f], self.tattiche["B"][f]
                    self.eventi.append(
                        Fase(
                            turno=n, fase=f + 1, tattica={"A": ta, "B": tb}, esito=tat.esito(ta, tb)
                        )
                    )
            ordine = sorted(
                (u for s in SIDES for u in self.unita[s] if u.vivo),
                key=lambda u: (
                    -(u.vel + (1000 if u.passiva == "firststrike" and n == 1 else 0)),
                    u.lato,
                    u.idx,
                ),
            )
            for u in ordine:
                if not u.vivo:
                    continue
                if not self.vivi("A") or not self.vivi("B"):
                    break
                self.agisci(u)
                if (
                    u.mossa_eff == "haste"
                    and u.energia == 0
                    and u.vivo
                    and self.vivi(_altro(u.lato))
                ):
                    self.agisci_extra(u)
            self._tick()
            self._respiro()
            for s in SIDES:
                for x in self.unita[s]:
                    if x.mod_turni > 0:
                        x.mod_turni -= 1
                        if x.mod_turni == 0:
                            x.mod_atk = 1.0
            if not self.vivi("A") or not self.vivi("B"):
                break
        a, b = self.vivi("A"), self.vivi("B")
        if a and not b:
            return "A", "ko"
        if b and not a:
            return "B", "ko"
        return self._ai_punti(), "tempo"

    def agisci_extra(self, u: U) -> None:
        esiti: dict[tuple[Side, int], Esito] = {}
        b = self.bersaglio(u, self.modo_base(u))
        if b is not None:
            self.colpisci(u, b, 1.0, esiti)
        self._emetti(u, "Doppio colpo", False, "base", esiti)

    def percento(self, s: Side) -> int:
        tot = sum(u.maxhp for u in self.unita[s])
        rimasti = sum(u.hp for u in self.unita[s])
        # con almeno un superstite la percentuale non scende mai a 0 (0 = squadra annientata)
        return max(1, round(100 * rimasti / tot)) if rimasti > 0 else 0

    def _ai_punti(self) -> Side:
        pa, pb = self.percento("A"), self.percento("B")
        if pa != pb:
            return "A" if pa > pb else "B"
        ra = sum(u.rating for u in self.unita["A"])
        rb = sum(u.rating for u in self.unita["B"])
        if ra != rb:
            return "A" if ra > rb else "B"
        return "A" if self.rng.random() < 0.5 else "B"


def simulate(
    team_a: Team,
    team_b: Team,
    seed: int,
    rules: Ruleset,
    registra: bool = True,
    tattiche: dict[Side, list[str]] | None = None,
    arena: str | None = None,
    carica: dict[Side, str] | None = None,
    formazione: dict[Side, str] | None = None,
) -> MatchResult:
    """Stesso input e stesso seed, stesso risultato."""
    teams: dict[Side, Team] = {"A": team_a, "B": team_b}
    if tattiche is not None and not all(tat.valida(tattiche.get(s, [])) for s in SIDES):
        raise ValueError("tattiche non valide")
    if arena is not None and arena not in ARENE:
        raise ValueError("arena sconosciuta")
    if carica is not None and not all(carica.get(s) in ("subito", "carica") for s in SIDES):
        raise ValueError("carica non valida")
    if formazione is not None and not all(formazione.get(s) in FORMAZIONI for s in SIDES):
        raise ValueError("formazione non valida")
    bt = Battaglia(teams, seed, rules, registra, tattiche, arena, carica, formazione)
    vincitore, motivo = bt.gioca()
    tot: dict[Side, int] = {s: bt.percento(s) for s in SIDES}
    if registra:
        bt.eventi.append(Fine(vincitore=vincitore, motivo=motivo))
    return MatchResult(
        seed=seed,
        squadre=teams,
        unita=bt.iniziali,
        potenze={
            s: [potenza_ruolo(m, ROLES[i]) for i, m in enumerate(teams[s].members)] for s in SIDES
        },
        sinergie=bt.sinergie,
        totali=tot,
        vincitore=vincitore,
        pareggio=motivo == "tempo" and tot["A"] == tot["B"],
        turni=bt.turno,
        tattiche=tattiche or {},
        arena=arena,
        carica=carica or {},
        formazione=formazione or {},
        rivalita=bt.rivalita,
        eventi=bt.eventi,
    )


def simulate_fino_a(
    team_a: Team,
    team_b: Team,
    seed: int,
    rules: Ruleset,
    tattiche: dict[Side, list[str]],
    fino_turno: int,
    arena: str | None = None,
    carica: dict[Side, str] | None = None,
    formazione: dict[Side, str] | None = None,
) -> tuple[list[Event], dict[Side, list[int]], dict[Side, list[int]]]:
    """Gioca solo i primi `fino_turno` turni: eventi, HP rimasti e HP massimi per lato."""
    teams: dict[Side, Team] = {"A": team_a, "B": team_b}
    bt = Battaglia(teams, seed, rules, True, tattiche, arena, carica, formazione)
    bt.limite_turno = fino_turno
    bt.gioca()
    hp = {s: [u.hp for u in bt.unita[s]] for s in SIDES}
    mx = {s: [u.maxhp for u in bt.unita[s]] for s in SIDES}
    return bt.eventi, hp, mx
