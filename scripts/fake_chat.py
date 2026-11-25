"""Simulatore di chat Twitch.

Invia messaggi `!offro N` a una stanza streamer (richiede DEV_TOOLS=1 sul backend).
Uso: uv run python ../scripts/fake_chat.py CODICE [--rate 200] [--seconds 60] [--url http://localhost:8000]
"""

import argparse
import json
import random
import time
import urllib.request


def post(url: str, payload: dict) -> dict:  # type: ignore[type-arg]
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.load(r)  # type: ignore[no-any-return]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("code")
    ap.add_argument("--rate", type=int, default=200, help="messaggi al minuto")
    ap.add_argument("--seconds", type=int, default=60)
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    ap.add_argument("--viewers", type=int, default=40)
    a = ap.parse_args()
    endpoint = f"{a.url}/api/dev/fake-chat/{a.code}"
    users = [f"spettatore{i}" for i in range(a.viewers)]
    sent = accepted = 0
    start = time.time()
    while (elapsed := time.time() - start) < a.seconds:
        due = int(a.rate * elapsed / 60) - sent  # cadenza basata sul tempo reale
        msgs = []
        for _ in range(max(0, due)):
            value = random.choices([1, 2, 3, 4, 5, 8], weights=[30, 30, 20, 10, 6, 4])[0]
            text = f"!offro {value}" if random.random() < 0.9 else random.choice(["ciao", "forza!", "LOL"])
            msgs.append({"user": random.choice(users), "text": text})
        if msgs:
            accepted += post(endpoint, {"messages": msgs})["accepted"]
            sent += len(msgs)
        time.sleep(0.25)
    minutes = (time.time() - start) / 60
    print(f"inviati {sent} messaggi in {minutes * 60:.0f}s (~{sent / minutes:.0f}/min), voti validi {accepted}")


if __name__ == "__main__":
    main()
