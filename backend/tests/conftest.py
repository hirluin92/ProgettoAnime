import os

os.environ.setdefault("TWITCH_READER", "0")  # i test non aprono connessioni verso Twitch
os.environ.setdefault("DEV_TOOLS", "1")
os.environ.setdefault(
    "RATE_LIMIT_PER_MIN", "0"
)  # i test fanno centinaia di richieste dallo stesso indirizzo
