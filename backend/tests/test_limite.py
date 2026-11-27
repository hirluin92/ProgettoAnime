from app.limite import LimiteRichieste


def test_limite_per_indirizzo_e_finestra() -> None:
    lim = LimiteRichieste(3, 60.0)
    assert [lim.consenti("a", t) for t in (0.0, 1.0, 2.0)] == [True, True, True]
    assert lim.consenti("a", 3.0) is False  # quarta nel minuto
    assert lim.consenti("b", 3.0) is True  # un altro indirizzo non è toccato
    assert lim.consenti("a", 61.0) is True  # passata la finestra si riparte


def test_senza_massimo_non_limita() -> None:
    lim = LimiteRichieste(0)
    assert all(lim.consenti("a", float(t)) for t in range(1000))
