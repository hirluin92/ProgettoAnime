"""RNG deterministico (mulberry32): stesso seed, stessa sequenza."""

_MASK = 0xFFFFFFFF


class Rng:
    def __init__(self, seed: int) -> None:
        self._a = seed & _MASK

    def random(self) -> float:
        """Float in [0, 1)."""
        self._a = (self._a + 0x6D2B79F5) & _MASK
        t = self._a
        t = ((t ^ (t >> 15)) * (t | 1)) & _MASK
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & _MASK)) & _MASK
        return ((t ^ (t >> 14)) & _MASK) / 4294967296

    def randint(self, low: int, high: int) -> int:
        """Intero in [low, high] inclusi."""
        return low + int(self.random() * (high - low + 1))
