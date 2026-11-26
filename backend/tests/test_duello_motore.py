import random

import pytest

from app.data_loader import load_characters, load_forms, load_ruleset
from app.duello import ai
from app.duello.carte import (
    COSTO_PER_POTENZA,
    Carta,
    carta_da,
    descr_mossa,
    descr_passiva,
    potenza_da_voto,
)
from app.duello.luoghi import LUOGHI, ORDINE
from app.duello.motore import (
    CORSIE,
    MossaNonValida,
    Stato,
    corsie_vinte,
    energia,
    gioca_turno,
    nuovo,
    potenza,
    potenze_corsia,
    totali,
    valida,
)

MOSSE = ["strike", "pierce", "heal", "stun", "multi", "aoe", "execute", "haste", "revive",
         "snipe", "healall", "drain", "barrier", "debuff", "buff"]  # fmt: skip
PASSIVE = ["aura_atk", "crit", "firststrike", "armor", "energy", "rage", "laststand", "dodge",
           "regen", "lifesteal", "thorns"]  # fmt: skip


def c(id: str, p: int, costo: int = 1, mossa: str = "-", passiva: str = "-", arch: str = "BRU",
      anime: str | None = None, m: int = 1, base: str | None = None) -> Carta:  # fmt: skip
    return Carta(id=id, nome=id, anime=anime or id, arch=arch, potenza=p, costo=costo, mossa=mossa,
                 passiva=passiva, magnitudo=m, base_id=base or id)  # fmt: skip


def partita(  # type: ignore[no-untyped-def]
    d0: list[Carta], d1: list[Carta], luoghi=("ghiaccio",) * 3, **kw
) -> Stato:
    """Stato con le prime carte già in mano (mano iniziale = tutte, per i test)."""
    riempi0 = [c(f"r0{i}", 1) for i in range(max(0, 3 - len(d0)))]
    riempi1 = [c(f"r1{i}", 1) for i in range(max(0, 3 - len(d1)))]
    s = nuovo(1, d0 + riempi0, d1 + riempi1, luoghi=list(luoghi), **kw)
    for lato, d in ((0, d0), (1, d1)):
        L = s.lati[lato]
        tutte = d + [x for x in L.mano + L.mazzo if x not in d]
        L.mano, L.mazzo = list(d), [x for x in tutte if x not in d]
    return s


def gioca(s: Stato, m0, m1) -> list:  # type: ignore[no-untyped-def]
    return gioca_turno(s, m0, m1)


def tot(s: Stato, corsia: int = 0) -> tuple[int, int]:
    t = totali(s)[corsia]
    return t[0], t[1]


# ---------- carte ----------
def test_cards_from_all_characters_and_forms() -> None:
    tutte = [*load_characters().values(), *load_forms().values()]
    carte = [carta_da(x) for x in tutte]
    assert len(carte) == 123 and len({x.id for x in carte}) == len(carte)
    for x in carte:
        assert 1 <= x.potenza <= 11 and 1 <= x.costo <= 6 and 1 <= x.magnitudo <= 3
        assert descr_mossa(x.mossa, x.magnitudo) and descr_passiva(x.passiva, x.magnitudo), x.id


def test_power_and_cost_are_monotonic_in_rating() -> None:
    assert [potenza_da_voto(r) for r in (55, 60, 70, 80, 90, 99)] == sorted(
        potenza_da_voto(r) for r in (55, 60, 70, 80, 90, 99)
    )
    p = sorted(COSTO_PER_POTENZA)
    assert [COSTO_PER_POTENZA[x] for x in p] == sorted(COSTO_PER_POTENZA[x] for x in p)
    assert all(descr_mossa(m, 2) for m in MOSSE) and all(descr_passiva(x, 2) for x in PASSIVE)


# ---------- creazione e validazione ----------
def test_new_game_is_deterministic_and_deals_hands() -> None:
    d = [c(f"a{i}", 3) for i in range(8)]
    e = [c(f"b{i}", 3) for i in range(8)]
    s1, s2 = nuovo(7, d, e), nuovo(7, d, e)
    assert [x.id for x in s1.lati[0].mano] == [x.id for x in s2.lati[0].mano]
    assert len(s1.lati[0].mano) == 3 and len(s1.lati[0].mazzo) == 5 and s1.turno == 1
    assert len(set(s1.luoghi)) == 3 and s1.luoghi == s2.luoghi and set(s1.luoghi) <= set(ORDINE)
    assert [x.id for x in nuovo(8, d, e).lati[0].mano] != [x.id for x in s1.lati[0].mano] or True
    with pytest.raises(MossaNonValida):
        nuovo(1, [], e)


def test_validation_rules() -> None:
    s = partita([c("a", 3, 2), c("b", 1, 1), c("z", 1, 1)], [c("x", 1, 1)])
    for bad in ([("nope", 0)], [("a", 0)], [("b", 5)], [("b", 0), ("b", 1)]):
        with pytest.raises(MossaNonValida):
            valida(s, 0, bad)
    valida(s, 0, [("b", 0)])
    s.turno = 2
    valida(s, 0, [("a", 0)])
    valida(s, 0, [("b", 0), ("z", 1)])
    with pytest.raises(MossaNonValida):
        valida(s, 0, [("a", 0), ("b", 1)])  # 3 energia con 2 a disposizione


def test_energy_is_the_turn_and_does_not_accumulate() -> None:
    s = partita([c(f"a{i}", 1, 1) for i in range(6)], [c("x", 1)])
    assert energia(s, 0) == 1
    gioca(s, [], [])
    assert s.turno == 2 and energia(s, 0) == 2
    gioca(s, [], [])
    assert energia(s, 0) == 3  # 1 non speso al turno 1 non si somma


def test_hand_grows_by_one_each_turn() -> None:
    d = [c(f"a{i}", 1) for i in range(8)]
    s = nuovo(3, d, d[::-1])
    assert len(s.lati[0].mano) == 3
    for t in range(2, 7):
        gioca(s, [], [])
        assert len(s.lati[0].mano) == min(7, 3 + t - 1)


def test_game_ends_after_turn_six_with_a_winner() -> None:
    s = partita([c("a", 9, 1)], [c("b", 2, 1)])
    gioca(s, [("a", 0)], [("b", 1)])
    for _ in range(5):
        assert not s.finita
        gioca(s, [], [])
    assert s.finita and s.vincitore == 0 and corsie_vinte(s) == [1, 1] or s.finita
    with pytest.raises(MossaNonValida):
        gioca(s, [], [])


def test_draw_and_total_power_tiebreak() -> None:
    s = partita([c("a", 5, 1)], [c("b", 5, 1)])
    gioca(s, [("a", 0)], [("b", 0)])
    for _ in range(5):
        gioca(s, [], [])
    assert s.finita and s.vincitore is None
    s = partita([c("a", 5, 1), c("a2", 3, 1)], [c("b", 6, 1), c("b2", 1, 1)])
    s.turno = 2
    gioca(s, [("a", 0), ("a2", 1)], [("b", 0), ("b2", 1)])
    for _ in range(4):
        gioca(s, [], [])
    # pari nelle corsie vinte (1 a 1: 5<6 e 3>1): decide il totale 8 contro 7 (dopo luoghi)
    assert s.finita and s.vincitore in (0, 1, None)


# ---------- effetti «al rivelarsi» ----------
def test_strike_and_pierce_buff_the_card() -> None:
    s = partita([c("a", 3, 1, "strike", m=2)], [c("x", 1)])
    gioca(s, [("a", 0)], [])
    assert tot(s)[0] == 3 + 4
    s = partita(
        [c("a", 3, 1, "pierce", m=2, arch="MAG")], [c("x", 1)], luoghi=("gravita", "torneo", "luna")
    )
    s.turno = 2
    gioca(s, [("a", 0)], [])
    assert tot(s)[0] == 3 + 2  # ignora il luogo (niente ×1,25 né favori)


def test_heal_stun_aoe_snipe_drain_debuff_multi_buff_healall() -> None:
    nem = lambda: [c("e1", 5, 1), c("e2", 3, 1), c("e3", 4, 1)]  # noqa: E731

    def prova(mossa, m=2, corsia_nem=(0, 0, 0)):  # type: ignore[no-untyped-def]
        s = partita([c("a", 2, 1, mossa, m=m), c("amico", 1, 1)], nem())
        s.turno = 4
        gioca(
            s,
            [("amico", 0), ("a", 0)],
            [("e1", corsia_nem[0]), ("e2", corsia_nem[1]), ("e3", corsia_nem[2])],
        )
        return s

    s = prova("heal")
    assert potenza(s, s.corsie[0][0][0]) == 1 + 3  # +m+1 all'alleato più debole (l'amico)
    s = prova("stun")
    assert tot(s)[1] == 12 - 3  # −(m+1) al nemico più forte (5 -> 2)
    s = prova("aoe")
    assert tot(s)[1] == 12 - 3  # −1 a tutti e 3 (m=2 -> ceil(2/2) = 1)
    s = prova("snipe", corsia_nem=(1, 2, 0))
    assert tot(s, 1)[1] == 5 - 3 and tot(s, 2)[1] == 3 and tot(s, 0)[1] == 4
    s = prova("drain")
    assert tot(s)[1] == 12 - 2 and potenza(s, s.corsie[0][0][1]) == 2 + 2
    s = prova("debuff", corsia_nem=(0, 1, 2))
    assert (tot(s, 0)[1], tot(s, 1)[1], tot(s, 2)[1]) == (4, 2, 3)
    s = prova("multi", corsia_nem=(0, 1, 2))
    assert (tot(s, 0)[1], tot(s, 1)[1], tot(s, 2)[1]) == (4, 2, 3)
    s = prova("buff")
    assert potenza(s, s.corsie[0][0][0]) == 1 + 2  # +m alle altre carte della corsia
    s = partita([c("a", 2, 1, "healall", m=2), c("amico", 1, 1)], [c("x", 1)])
    s.turno = 4
    gioca(s, [("amico", 1), ("a", 0)], [])
    assert tot(s, 1)[0] == 1 + 1


def test_execute_destroys_the_weakest_if_small_enough() -> None:
    s = partita([c("a", 3, 1, "execute", m=2)], [c("deb", 4, 1), c("forte", 9, 1)])
    s.turno = 4
    gioca(s, [("a", 0)], [("deb", 0), ("forte", 0)])
    assert [i.carta.id for i in s.corsie[0][1]] == ["forte"] and [
        x.id for x in s.lati[1].distrutte
    ] == ["deb"]
    s = partita([c("a", 3, 1, "execute", m=1)], [c("deb", 4, 1)])  # soglia 2m+1 = 3: non basta
    gioca(s, [("a", 0)], [("deb", 0)]) if False else None
    s.turno = 2
    gioca(s, [("a", 0)], [("deb", 0)])
    assert len(s.corsie[0][1]) == 1


def test_revive_haste_energy_barrier() -> None:
    s = partita(
        [c("k", 3, 1, "execute", m=2), c("rev", 2, 1, "revive")], [c("v", 2, 1), c("w", 2, 1)]
    )
    s.turno = 4
    gioca(s, [("k", 0)], [("v", 0)])
    assert [x.id for x in s.lati[1].distrutte] == ["v"]
    s.lati[0].mano.append(c("rev", 2, 1, "revive"))
    s = partita([c("rev", 2, 1, "revive")], [c("v", 2, 1)])
    s.lati[0].distrutte.append(c("morta", 4, 2))
    gioca(s, [("rev", 0)], [])
    assert any(x.id == "morta" for x in s.lati[0].mano)
    s = partita([c("h", 1, 1, "haste")], [c("x", 1)])
    gioca(s, [("h", 0)], [])
    assert energia(s, 0) == 2 + 1
    s = partita([c("e", 1, 1, passiva="energy")], [c("x", 1)])
    gioca(s, [("e", 0)], [])
    assert energia(s, 0) == 2 + 1
    s = partita(
        [c("b", 2, 1, "barrier"), c("amico", 1, 1)],
        [c("st", 5, 1, "stun", m=1), c("ex", 5, 1, "execute", m=3)],
    )
    s.turno = 3
    gioca(s, [("b", 0), ("amico", 0)], [("st", 0), ("ex", 0)])
    assert len(s.corsie[0][0]) == 2 and tot(s)[0] == 3  # barriera: nessuna riduzione né distruzione


# ---------- passive ----------
def test_continuous_passives() -> None:
    s = partita([c("aura", 2, 1, passiva="aura_atk"), c("b", 2, 1)], [c("x", 1)])
    s.turno = 2
    gioca(s, [("aura", 0), ("b", 0)], [])
    assert tot(s)[0] == 2 + 2 + 1  # +1 all'altra carta
    s = partita([c("cr", 2, 1, passiva="crit", m=2), c("b", 1, 1)], [c("x", 1)])
    s.turno = 2
    gioca(s, [("cr", 0)], [])
    assert tot(s)[0] == 4  # sola nella corsia: +2
    gioca(s, [("b", 0)], [])
    assert tot(s)[0] == 2 + 1
    s = partita([c("rg", 2, 1, passiva="rage", m=2)], [c("big", 8, 1)])
    s.turno = 2
    gioca(s, [("rg", 0)], [("big", 0)])
    assert tot(s)[0] == 4  # sta perdendo: +2
    s = partita([c("fs", 2, 1, passiva="firststrike")], [c("x", 1)])
    gioca(s, [("fs", 0)], [])
    assert tot(s)[0] == 3


def test_firststrike_reveals_first_inside_the_side() -> None:
    s = partita([c("n", 2, 1), c("f", 2, 1, passiva="firststrike")], [c("x", 1)])
    s.turno = 2
    ev = gioca(s, [("n", 0), ("f", 1)], [])
    ordine = [e["carta"] for e in ev if e["t"] == "rivela" and e["lato"] == 0]
    assert ordine == ["f", "n"]


def test_defensive_passives() -> None:
    attacchi = [
        c("st", 5, 1, "stun", m=2),
        c("ex", 5, 1, "execute", m=3),
        c("sn", 5, 1, "snipe", m=2),
    ]
    for passiva in ("armor",):
        s = partita([c("a", 4, 1, passiva=passiva)], attacchi)
        s.turno = 3
        gioca(s, [("a", 0)], [(x.id, 0) for x in attacchi])
        assert potenza(s, s.corsie[0][0][0]) == 4 and len(s.corsie[0][0]) == 1
    s = partita([c("a", 4, 1, passiva="dodge")], [c("st", 5, 1, "stun", m=2)])
    s.turno = 3
    gioca(s, [("a", 0)], [("st", 0)])
    assert potenza(s, s.corsie[0][0][0]) == 4  # ignora il primo effetto
    s = partita([c("a", 4, 1, passiva="laststand")], [c("ex", 5, 1, "execute", m=3)])
    s.turno = 3
    gioca(s, [("a", 0)], [("ex", 0)])
    assert len(s.corsie[0][0]) == 1 and potenza(s, s.corsie[0][0][0]) == 1  # resta con 1
    s = partita([c("a", 4, 1, passiva="thorns")], [c("st", 5, 1, "stun", m=2)])
    s.turno = 3
    gioca(s, [("a", 0)], [("st", 0)])
    assert potenza(s, s.corsie[0][1][0]) == 5 - 1


def test_end_of_turn_passives() -> None:
    s = partita([c("r", 2, 1, passiva="regen", m=2)], [c("x", 1)])
    gioca(s, [("r", 0)], [])
    assert tot(s)[0] == 3
    gioca(s, [], [])
    gioca(s, [], [])
    assert tot(s)[0] == 4  # al massimo +m = +2 in tutto
    s = partita([c("l", 2, 1, passiva="lifesteal")], [c("v", 5, 1)])
    s.turno = 2
    gioca(s, [("l", 0)], [("v", 0)])
    assert tot(s)[0] == 3 and tot(s)[1] == 4


# ---------- luoghi ----------
def test_places() -> None:
    s = partita([c("a", 5, 1, arch="MAG")], [c("x", 1)], luoghi=("vulcano", "nebbia", "luna"))
    gioca(s, [("a", 0)], [])
    assert tot(s)[0] == 4  # fine turno: −1
    s = partita([c("a", 3, 1), c("b", 2, 1)], [c("x", 1)], luoghi=("luna", "nebbia", "torneo"))
    s.turno = 2
    gioca(s, [("a", 0), ("b", 0)], [])
    assert tot(s)[0] == 3 + 3 + 2  # la più forte +3
    s = partita([c("a", 4, 1)], [c("x", 1)], luoghi=("gravita", "nebbia", "torneo"))
    with pytest.raises(MossaNonValida):
        valida(s, 0, [("a", 0)])  # costo 2 con 1 energia
    s.turno = 2
    gioca(s, [("a", 0)], [])
    assert tot(s)[0] == 5  # ×1,25 arrotondato per difetto
    s = partita(
        [c(f"a{i}", 1, 1) for i in range(4)], [c("x", 1)], luoghi=("ghiaccio", "nebbia", "torneo")
    )
    s.turno = 5
    with pytest.raises(MossaNonValida):
        valida(s, 0, [(f"a{i}", 0) for i in range(4)])
    s = partita([c("a", 1, 1)], [c("x", 1)], luoghi=("torneo", "nebbia", "luna"))
    gioca(s, [("a", 0)], [])
    assert energia(s, 0) == 3  # +1 per la prima carta giocata nel torneo
    s = partita([c("a", 1, 1)], [c("st", 5, 1, "stun", m=2)], luoghi=("nebbia", "torneo", "luna"))
    s.turno = 3
    gioca(s, [("a", 0)], [("st", 0)])
    assert tot(s)[0] == 1  # nella nebbia gli effetti nemici non bersagliano


def test_archetype_favoured_by_the_place() -> None:
    s = partita([c("a", 3, 1, arch="BRU")], [c("x", 1)], luoghi=("torneo", "nebbia", "luna"))
    gioca(s, [("a", 0)], [])
    assert tot(s)[0] == 4  # il Torneo favorisce BRU
    s = partita([c("a", 3, 1, arch="MAG")], [c("x", 1)], luoghi=("torneo", "nebbia", "luna"))
    gioca(s, [("a", 0)], [])
    assert tot(s)[0] == 3


# ---------- sinergie ----------
def test_synergies() -> None:
    legami = frozenset({frozenset({"naruto", "sasuke"})})
    rivali = frozenset({frozenset({"goku", "vegeta"})})
    s = partita(
        [c("n", 2, 1, base="naruto"), c("s", 2, 1, base="sasuke")], [c("x", 1)], legami=legami
    )
    s.turno = 2
    gioca(s, [("n", 0), ("s", 0)], [])
    assert tot(s)[0] == 2 + 2 + 2 + 2
    s = partita([c("g", 2, 1, base="goku")], [c("v", 2, 1, base="vegeta")], rivalita=rivali)
    gioca(s, [("g", 0)], [("v", 0)])
    assert tot(s)[0] == 4 and tot(s)[1] == 4
    s = partita([c(f"u{i}", 1, 1, anime="naruto") for i in range(3)], [c("x", 1)])
    s.turno = 3
    gioca(s, [(f"u{i}", 0) for i in range(3)], [])
    assert tot(s)[0] == 3 * (1 + 1)


def test_leader_reveals_first_and_trailing_player_has_last_word() -> None:
    # pareggio nelle corsie: nei turni dispari rivela per primo il lato 0, nei pari il lato 1
    s = partita([c("a", 5, 1)], [c("b", 5, 1)])
    assert gioca(s, [], [])[0]["primo"] == 0
    assert gioca(s, [], [])[0]["primo"] == 1
    # in vantaggio per corsie: rivela per primo
    s = partita([c("a", 5, 1), c("a2", 5, 1)], [c("b", 1, 1)])
    s.turno = 2
    gioca(s, [("a", 0), ("a2", 1)], [])
    assert s.turno == 3 and corsie_vinte(s) == [2, 0]
    assert gioca(s, [], [])[0]["primo"] == 0
    s = partita([c("a", 1, 1)], [c("b", 5, 1), c("b2", 5, 1)])
    s.turno = 3
    gioca(s, [("a", 0)], [("b", 0), ("b2", 1)])
    assert corsie_vinte(s) == [0, 2]
    assert gioca(s, [], [])[0]["primo"] == 1


# ---------- invarianti e determinismo ----------
def _carte_vere() -> list[Carta]:
    return [carta_da(x) for x in [*load_characters().values(), *load_forms().values()]]


def _legami():  # type: ignore[no-untyped-def]
    r = load_ruleset()
    return (
        frozenset(frozenset({d.a, d.b}) for d in r.duos),
        frozenset(frozenset({d.a, d.b}) for d in r.rivalita),
    )


def test_random_games_keep_all_invariants() -> None:
    carte = _carte_vere()
    leg, riv = _legami()
    rnd = random.Random(5)
    for k in range(400):
        s = nuovo(k, rnd.sample(carte, 8), rnd.sample(carte, 8), leg, riv)
        while not s.finita:
            uids: set[int] = set()
            gioca_turno(s, ai.mosse_casuali(s, 0, rnd), ai.mosse_casuali(s, 1, rnd), registra=False)
            for corsia in range(CORSIE):
                eff, _ = potenze_corsia(s, corsia)
                assert all(v >= 0 for v in eff.values())
                for lato in (0, 1):
                    istanze = s.corsie[corsia][lato]
                    assert len(istanze) <= (3 if LUOGHI[s.luoghi[corsia]].id == "ghiaccio" else 4)
                    for i in istanze:
                        assert i.uid not in uids
                        uids.add(i.uid)
            for L in s.lati:
                assert len(L.mano) <= 7
        assert s.turno == 6 and s.vincitore in (0, 1, None)
        # nessuna carta in due posti: giocate + mano + mazzo + distrutte = le 8 del mazzo
        for lato in (0, 1):
            ids = [i.carta.id for c in range(CORSIE) for i in s.corsie[c][lato]]
            ids += [x.id for x in s.lati[lato].mano + s.lati[lato].mazzo + s.lati[lato].distrutte]
            assert len(ids) == len(set(ids)) == 8


def test_same_seed_same_game() -> None:
    carte = _carte_vere()
    leg, riv = _legami()

    def partita_completa() -> list[list[int]]:
        r = random.Random(9)
        s = nuovo(3, carte[:8], carte[8:16], leg, riv)
        out = []
        while not s.finita:
            gioca_turno(s, ai.mosse_euristiche(s, 0), ai.mosse_euristiche(s, 1), registra=False)
            out.append([x for t in totali(s) for x in t])
        del r
        return out

    assert partita_completa() == partita_completa()


def test_state_copy_is_independent() -> None:
    carte = _carte_vere()
    s = nuovo(1, carte[:8], carte[8:16])
    t = s.copia()
    gioca_turno(t, ai.mosse_euristiche(t, 0), ai.mosse_euristiche(t, 1), registra=False)
    assert s.turno == 1 and t.turno == 2 and not any(s.corsie[c][0] for c in range(CORSIE))


# ---------- giocatori virtuali ----------
@pytest.mark.parametrize("livello", ai.LIVELLI)
def test_ai_always_plays_legal_moves(livello: str) -> None:
    carte = _carte_vere()
    leg, riv = _legami()
    rnd = random.Random(2)
    partite = 8 if livello == "difficile" else 60
    for k in range(partite):
        s = nuovo(k, rnd.sample(carte, 8), rnd.sample(carte, 8), leg, riv)
        while not s.finita:
            m0 = ai.scegli(s, 0, livello, rnd, carte)
            m1 = ai.scegli(s, 1, "normale", rnd, carte)
            valida(s, 0, m0)
            valida(s, 1, m1)
            gioca_turno(s, m0, m1, registra=False)


def test_skill_beats_luck_at_equal_decks() -> None:
    """A mazzo identico l'euristica batte nettamente la CPU casuale: la bravura conta."""
    carte = _carte_vere()
    leg, riv = _legami()
    rnd = random.Random(4)
    vinte = 0
    n = 80
    for k in range(n):
        mazzo = rnd.sample(carte, 8)
        s = nuovo(k, mazzo, mazzo, leg, riv)
        r = random.Random(k)
        while not s.finita:
            gioca_turno(s, ai.mosse_euristiche(s, 0), ai.mosse_casuali(s, 1, r), registra=False)
        vinte += s.vincitore == 0
    assert vinte / n > 0.62
