"""Le carte del Duello, derivate dai personaggi esistenti. Funzioni pure.

potenza   = dal voto del personaggio (60 -> 2, 80 -> 7, 99 -> 11)
costo     = energia da 1 a 6, in proporzione alla potenza
mossa     = effetto «Al rivelarsi» (la mossa speciale del personaggio, in versione semplice)
passiva   = effetto «Continuo» (la passiva del personaggio)
magnitudo = 1..3, cresce con il costo: scala l'intensità degli effetti
"""

from dataclasses import dataclass

from app.engine.models import Character

POTENZA_MIN, POTENZA_MAX = 1, 11
COSTO_PER_POTENZA = {1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6}


@dataclass(frozen=True)
class Carta:
    id: str
    nome: str
    anime: str
    arch: str
    potenza: int
    costo: int
    mossa: str  # modello dell'effetto «Al rivelarsi»
    passiva: str  # modello dell'effetto «Continuo»
    magnitudo: int
    base_id: str  # personaggio base (le forme condividono legami e rivalità)
    forma: str | None = None
    rating: int = 0


def potenza_da_voto(rating: int) -> int:
    return max(POTENZA_MIN, min(POTENZA_MAX, round((rating - 50) / 4.5)))


def carta_da(c: Character) -> Carta:
    p = potenza_da_voto(c.rating)
    costo = COSTO_PER_POTENZA[p]
    return Carta(
        id=c.id,
        nome=c.nome,
        anime=c.anime,
        arch=c.arch,
        potenza=p,
        costo=costo,
        mossa=c.mossa.effetto,
        passiva=c.passiva.effetto,
        magnitudo=1 + (costo - 1) // 2,
        base_id=c.base_id or c.id,
        forma=c.forma,
        rating=c.rating,
    )


# ---------- testi in italiano (una riga per effetto) ----------
def _mezzi(m: int) -> int:
    return (m + 1) // 2


def descr_mossa(eff: str, m: int) -> str:
    return {
        "strike": f"Al rivelarsi: +{2 * m} a questa carta.",
        "pierce": f"Al rivelarsi: +{m} a questa carta; ignora le regole del luogo.",
        "heal": f"Al rivelarsi: +{m + 1} all'alleato più debole della corsia.",
        "stun": f"Al rivelarsi: −{m + 1} al nemico più forte della corsia.",
        "multi": "Al rivelarsi: −1 alle 3 carte nemiche più forti.",
        "aoe": f"Al rivelarsi: −{_mezzi(m)} a tutti i nemici della corsia.",
        "execute": f"Al rivelarsi: distrugge il nemico più debole della corsia ({2 * m + 1} o meno).",
        "haste": "Al rivelarsi: +1 energia al prossimo turno.",
        "revive": "Al rivelarsi: riprendi in mano la prima tua carta distrutta.",
        "snipe": f"Al rivelarsi: −{m + 1} alla carta nemica più forte in assoluto.",
        "healall": f"Al rivelarsi: +{_mezzi(m)} a tutte le tue altre carte.",
        "drain": f"Al rivelarsi: −{m} al nemico più forte della corsia, +{m} a questa carta.",
        "barrier": "Al rivelarsi: le tue carte in questa corsia non possono essere ridotte né distrutte.",
        "debuff": f"Al rivelarsi: −{_mezzi(m)} a tutte le carte nemiche.",
        "buff": f"Al rivelarsi: +{m} a tutte le tue altre carte nella corsia.",
    }.get(eff, "")


def descr_passiva(eff: str, m: int) -> str:
    return {
        "aura_atk": "Continuo: +1 a ogni altra tua carta nella corsia.",
        "crit": f"Continuo: +{m} se è la sola tua carta nella corsia.",
        "firststrike": "Continuo: +1; si rivela sempre per prima.",
        "armor": "Continuo: non può essere ridotta né distrutta.",
        "energy": "Quando entra in gioco: +1 energia al prossimo turno.",
        "rage": f"Continuo: +{m} se la tua corsia sta perdendo.",
        "laststand": "Se verrebbe distrutta, resta in gioco con potenza 1 (una volta).",
        "dodge": "Ignora il primo effetto nemico che la colpisce.",
        "regen": f"Fine turno: +1 (al massimo +{m} in tutto).",
        "lifesteal": "Fine turno: −1 al nemico più forte della corsia e +1 a questa carta.",
        "thorns": "Chi la riduce perde 1.",
    }.get(eff, "")
