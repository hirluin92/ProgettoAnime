"""Genera backend/data/schede.json e tratti.json (schede di gioco v2). Uso: python scripts/gen_schede.py
id | archetipo | mossa | effetto mossa | passiva | effetto passiva | tratti"""

import json
from pathlib import Path

RIGHE = """
naruto-uzumaki|BRU|Rasengan|strike|Modalità Eremitica|aura_atk|squadra-7,hokage,jinchuriki
sasuke-uchiha|ASS|Chidori|pierce|Sharingan|crit|squadra-7,uchiha
kakashi-hatake|ASS|Raikiri|pierce|Copia|firststrike|squadra-7
sakura-haruno|GUA|Cento Guarigioni|heal|Forza Mostruosa|armor|squadra-7
gaara|TAN|Tomba di Sabbia|stun|Assoluta Difesa|armor|jinchuriki
jiraiya|EVO|Invocazione del Rospo|multi|Modalità Eremitica|energy|sannin
monkey-d-luffy|BRU|Gomu Gomu Gatling|multi|Gear Fourth|rage|cappello-di-paglia,fratelli-di-mare
roronoa-zoro|BRU|Santoryu Oni Giri|strike|Volontà di Ferro|laststand|cappello-di-paglia,spadaccini
sanji|ASS|Diable Jambe|strike|Cavalleria|dodge|cappello-di-paglia
nami|MAG|Thunderbolt Tempo|aoe|Clima-Tact|dodge|cappello-di-paglia
tony-tony-chopper|GUA|Rumble Ball|heal|Cuore di Renna|regen|cappello-di-paglia
jinbe|TAN|Karate degli Uomini-Pesce|stun|Armatura d'Acqua|armor|cappello-di-paglia
son-goku|BRU|Kamehameha|strike|Istinto Superiore|rage|saiyan,guerrieri-z
vegeta|BRU|Final Flash|pierce|Orgoglio Saiyan|rage|saiyan,guerrieri-z,famiglia-briefs
piccolo|SUP|Makankosappo|pierce|Rigenerazione Namecciana|regen|guerrieri-z
son-gohan|MAG|Masenko|strike|Potenziale Nascosto|rage|saiyan,guerrieri-z
crilin|TIR|Kienzan|execute|Veterano|dodge|guerrieri-z
majin-bu|TAN|Furia di Bu|aoe|Corpo Elastico|regen|cattivi
tanjiro-kamado|BRU|Hinokami Kagura|strike|Naso Sopraffino|crit|corpo-sterminatori,famiglia-kamado
zenitsu-agatsuma|ASS|Tuono e Fulmine Sesta Forma|haste|Velocità Fulminea|firststrike|corpo-sterminatori
inosuke-hashibira|BRU|Respiro della Bestia|multi|Sensi Animali|dodge|corpo-sterminatori
shinobu-kocho|GUA|Danza dell'Ape|revive|Veleno di Glicine|dodge|pilastri
gyomei-himejima|TAN|Catena Meteorica|stun|Corpo Roccioso|armor|pilastri
tengen-uzui|TIR|Esplosione Sonora|aoe|Occhio Musicale|crit|pilastri
yuji-itadori|BRU|Pugno Divergente|strike|Resistenza|laststand|studenti-tokyo
satoru-gojo|MAG|Vuoto Viola|aoe|Infinito|dodge|studenti-tokyo,stregoni-forti
megumi-fushiguro|EVO|Dieci Ombre|multi|Ombra Protettiva|armor|studenti-tokyo
nobara-kugisaki|TIR|Chiodo Risonante|snipe|Voodoo|crit|studenti-tokyo
ryomen-sukuna|MAG|Santuario Malevolo|aoe|Re delle Maledizioni|lifesteal|maledizioni
maki-zenin|BRU|Lancia Divina|pierce|Corpo Potenziato|armor|studenti-tokyo,clan-zenin
itachi-uchiha|MAG|Tsukuyomi|stun|Illusione|dodge|akatsuki,uchiha
minato-namikaze|ASS|Hiraishin|haste|Lampo Giallo|firststrike|hokage
madara-uchiha|MAG|Meteora Perfetta|aoe|Susanoo|armor|uchiha
hinata-hyuga|ASS|Pugno Gentile|stun|Byakugan|dodge|hyuga
shikamaru-nara|SUP|Cattura dell'Ombra|stun|Mente Geniale|aura_atk|konoha-giovani
rock-lee|BRU|Loto Primario|strike|Otto Porte|rage|team-guy
neji-hyuga|ASS|Otto Trigrammi|multi|Byakugan|dodge|team-guy,hyuga
tsunade|GUA|Creazione Rigenerante|healall|Cento Guarigioni|regen|sannin,hokage
orochimaru|EVO|Serpente Gigante|drain|Rinascita|laststand|sannin
might-guy|BRU|Hachimon Porta della Morte|execute|Spirito Giovanile|rage|team-guy
killer-bee|TAN|Lariat|strike|Otto Code|armor|jinchuriki
pain|EVO|Shinra Tensei|aoe|Sei Sentieri|aura_atk|akatsuki
kisame-hoshigaki|TAN|Grande Squalo|drain|Samehada|lifesteal|akatsuki
obito-uchiha|SUP|Kamui|barrier|Intangibilità|dodge|akatsuki,uchiha
portgas-d-ace|MAG|Pugno di Fuoco|strike|Corpo di Fiamma|dodge|fratelli-di-mare
trafalgar-law|SUP|Room|debuff|Chirurgo della Morte|firststrike|supernova
nico-robin|EVO|Cien Fleur|multi|Occhio Onnisciente|dodge|cappello-di-paglia
usopp|TIR|Colpo di Fionda|snipe|Bugiardo Leggendario|crit|cappello-di-paglia
franky|TAN|Radical Beam|aoe|Corpo Cyborg|armor|cappello-di-paglia
brook|ASS|Cavalcata dell'Anima|pierce|Corpo Scheletrico|dodge|cappello-di-paglia
barbabianca|TAN|Gura Gura no Mi|aoe|Terremoto|thorns|imperatori
shanks|BRU|Pressione del Re|debuff|Haki del Re|aura_atk|imperatori
dracule-mihawk|ASS|Taglio Supremo|pierce|Miglior Spadaccino|crit|spadaccini
boa-hancock|SUP|Mero Mero Mellow|stun|Bellezza Letale|dodge|supernova
sabo|MAG|Dragon Claw|strike|Fiamme Rivoluzionarie|rage|fratelli-di-mare
kaido|TAN|Ragnarok|strike|Drago Supremo|regen|imperatori
charlotte-katakuri|ASS|Mochi Perforante|pierce|Preveggenza|dodge|supernova
marshall-d-teach|MAG|Kurouzu|drain|Due Frutti|lifesteal|imperatori
trunks|BRU|Burning Attack|strike|Spada del Futuro|crit|saiyan,famiglia-briefs
freezer|MAG|Death Ball|aoe|Forma Finale|armor|cattivi
cell|TAN|Kamehameha Perfetto|strike|Rigenerazione Cellulare|regen|cattivi,androidi
tenshinhan|TIR|Tricuspide|snipe|Terzo Occhio|crit|guerrieri-z
yamcha|BRU|Rogafufuken|multi|Veterano|dodge|guerrieri-z
goten|BRU|Kamehameha Junior|strike|Slancio Infantile|firststrike|saiyan
broly|TAN|Eraser Cannon|strike|Leggendario|rage|saiyan,cattivi
jiren|BRU|Pugno della Giustizia|strike|Occhi Divini|armor|
beerus|MAG|Hakai|execute|Dio della Distruzione|aura_atk|dei
whis|SUP|Colpo dell'Angelo|barrier|Istinto Superiore|dodge|dei
numero-18|TIR|Colpo Rotante|pierce|Cyborg|crit|androidi
gotenks|MAG|Super Ghost Kamikaze|multi|Fusione|firststrike|saiyan
bulma|GUA|Scudo Capsule|barrier|Genio|energy|famiglia-briefs
dende|GUA|Guarigione Namecciana|healall|Dono Divino|regen|guerrieri-z
kyojuro-rengoku|BRU|Nona Forma Rengoku|strike|Fiamma Indomita|laststand|pilastri
giyu-tomioka|ASS|Undicesima Forma Calma|pierce|Respiro dell'Acqua|dodge|pilastri
muichiro-tokito|ASS|Luna Nebbiosa|haste|Marchio dei Cacciatori|firststrike|pilastri
mitsuri-kanroji|BRU|Frusta d'Amore|multi|Muscoli Densi|armor|pilastri
sanemi-shinazugawa|BRU|Tornado Ruggente|strike|Sangue Raro|rage|pilastri
obanai-iguro|ASS|Serpente Doppio|pierce|Serpente Kaburamaru|dodge|pilastri
nezuko-kamado|TAN|Sangue Esplosivo|aoe|Forma Demone|regen|demoni,famiglia-kamado
kokushibo|BRU|Luna Piena|multi|Sei Occhi|crit|lune-superiori,demoni
muzan-kibutsuji|EVO|Tentacoli|drain|Corpo Perfetto|regen|demoni
akaza|BRU|Annientamento|multi|Rilevamento|rage|lune-superiori,demoni
douma|SUP|Fiocchi di Ghiaccio|aoe|Corpo Gelido|lifesteal|lune-superiori,demoni
kanao-tsuyuri|ASS|Fiore Occhi|pierce|Vista Superiore|crit|corpo-sterminatori
genya-shinazugawa|TAN|Fucilata|strike|Fame Demoniaca|lifesteal|corpo-sterminatori
daki|SUP|Nastri di Obi|stun|Rigenerazione|regen|lune-superiori,demoni
toji-fushiguro|ASS|Catena dell'Ombra|execute|Zero Energia|firststrike|clan-zenin
kento-nanami|BRU|Rapporto 7:3|strike|Straordinari|crit|stregoni-forti
yuta-okkotsu|EVO|Rika|multi|Copia|aura_atk|stregoni-forti
aoi-todo|TAN|Boogie Woogie|stun|Migliore Amico|armor|stregoni-forti
panda|TAN|Modalità Gorilla|strike|Triplo Nucleo|regen|studenti-tokyo
toge-inumaki|SUP|Voce Maledetta|debuff|Parole Maledette|dodge|studenti-tokyo
kenjaku|SUP|Manipolazione delle Maledizioni|buff|Cervello Antico|aura_atk|maledizioni
mahito|SUP|Trasfigurazione Inerte|drain|Anima Plasmabile|regen|maledizioni
jogo|MAG|Meteora Eruttiva|aoe|Vulcano|rage|maledizioni
hanami|TAN|Radici Fameliche|drain|Natura|regen|maledizioni
kinji-hakari|TAN|Jackpot|heal|Casinò Infinito|laststand|stregoni-forti
hajime-kashimo|MAG|Lampo Ricorrente|multi|Corpo Elettrico|firststrike|
shoko-ieiri|GUA|Tecnica Inversa|revive|Dottoressa|regen|studenti-tokyo
mai-zenin|TIR|Proiettile di Costruzione|snipe|Sorella Minore|dodge|clan-zenin
"""

# id -> (nome, stat, [bonus a 2, 3, 4 membri] in %)
TRATTI = {
    "squadra-7": ("Squadra 7", "atk", [6, 12, 18]),
    "hokage": ("Hokage", "hp", [6, 12, 16]),
    "jinchuriki": ("Jinchuriki", "hp", [8, 14, 20]),
    "uchiha": ("Clan Uchiha", "atk", [6, 12, 18]),
    "sannin": ("Sannin", "energy", [10, 20, 30]),
    "akatsuki": ("Akatsuki", "atk", [6, 12, 18]),
    "hyuga": ("Clan Hyuga", "spd", [6, 12, 18]),
    "konoha-giovani": ("Giovani di Konoha", "spd", [6, 10, 14]),
    "team-guy": ("Squadra Guy", "atk", [8, 16, 24]),
    "cappello-di-paglia": ("Ciurma di Cappello di Paglia", "hp", [5, 10, 15]),
    "fratelli-di-mare": ("Fratelli di Mare", "atk", [8, 16, 24]),
    "spadaccini": ("Spadaccini", "atk", [8, 16, 24]),
    "imperatori": ("Imperatori", "atk", [8, 16, 24]),
    "supernova": ("Supernova", "spd", [6, 12, 18]),
    "saiyan": ("Saiyan", "atk", [5, 10, 15]),
    "guerrieri-z": ("Guerrieri Z", "def", [5, 10, 15]),
    "famiglia-briefs": ("Famiglia Briefs", "energy", [10, 20, 30]),
    "cattivi": ("Cattivi Iconici", "hp", [6, 12, 18]),
    "androidi": ("Androidi", "def", [8, 16, 24]),
    "dei": ("Divinità", "atk", [10, 20, 30]),
    "pilastri": ("Pilastri", "atk", [4, 8, 12]),
    "corpo-sterminatori": ("Corpo dei Cacciatori", "spd", [6, 12, 18]),
    "famiglia-kamado": ("Famiglia Kamado", "hp", [8, 16, 24]),
    "demoni": ("Demoni", "hp", [4, 8, 12]),
    "lune-superiori": ("Lune Superiori", "atk", [8, 16, 24]),
    "studenti-tokyo": ("Studenti di Tokyo", "def", [4, 8, 12]),
    "stregoni-forti": ("Stregoni di Grado Speciale", "atk", [6, 12, 18]),
    "maledizioni": ("Maledizioni", "hp", [6, 12, 18]),
    "clan-zenin": ("Clan Zenin", "spd", [8, 16, 24]),
}

ARCH = {"BRU", "ASS", "MAG", "TAN", "TIR", "SUP", "GUA", "EVO"}
MOSSE = {"strike", "pierce", "aoe", "stun", "barrier", "heal", "healall", "buff", "debuff",
         "drain", "execute", "revive", "snipe", "multi", "haste"}
PASSIVE = {"thorns", "regen", "lifesteal", "crit", "dodge", "armor", "rage", "laststand",
           "aura_atk", "firststrike", "energy"}

if __name__ == "__main__":
    base = Path(__file__).resolve().parent.parent / "backend" / "data"
    schede = {}
    for riga in RIGHE.strip().splitlines():
        i, arch, mossa, em, passiva, ep, tr = riga.split("|")
        assert arch in ARCH and em in MOSSE and ep in PASSIVE, riga
        tratti = [t for t in tr.split(",") if t]
        for t in tratti:
            assert t in TRATTI or t == "", (i, t)
        schede[i] = {
            "arch": arch,
            "mossa": {"nome": mossa, "effetto": em},
            "passiva": {"nome": passiva, "effetto": ep},
            "tratti": tratti,
        }
    chars = {c["id"] for c in json.loads((base / "characters.json").read_text(encoding="utf8"))}
    assert set(schede) == chars, (chars ^ set(schede))
    usati = {t for s in schede.values() for t in s["tratti"]}
    assert usati <= set(TRATTI), usati - set(TRATTI)
    tratti_json = [
        {"id": k, "nome": n, "stat": s, "soglie": {"2": v[0], "3": v[1], "4": v[2]}}
        for k, (n, s, v) in TRATTI.items()
        if k in usati
    ]
    (base / "schede.json").write_text(json.dumps(schede, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    (base / "tratti.json").write_text(json.dumps(tratti_json, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
    from collections import Counter
    print("schede:", len(schede), "tratti:", len(tratti_json))
    print(Counter(s["arch"] for s in schede.values()))
    print(Counter(s["mossa"]["effetto"] for s in schede.values()))
    print(Counter(t for s in schede.values() for t in s["tratti"]).most_common(8))
