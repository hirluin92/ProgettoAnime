"""Nuovi personaggi (13 anime in più): dati per characters.json, schede.json, tratti.json, duos e rivalità.

Le immagini sono collegamenti (hotlink) all'API AniList, mai copie. Uso:
    python scripts/gen_schede.py             # rigenera schede.json e tratti.json (include questi)
    python scripts/aggiungi_personaggi.py    # aggiunge i personaggi a characters.json, duos.json, rivalita.json
"""

# id | archetipo | mossa | effetto | passiva | effetto | tratti
RIGHE_SCHEDE = """
izuku-midoriya|BRU|Detroit Smash|strike|One For All|aura_atk|classe-1a
shoto-todoroki|MAG|Fuoco e Ghiaccio|aoe|Metà Ghiaccio, Metà Fuoco|armor|classe-1a
katsuki-bakugo|MAG|Howitzer Impact|strike|Sudore Esplosivo|rage|classe-1a
all-might|BRU|United States of Smash|strike|Simbolo della Pace|aura_atk|eroi-professionisti
shota-aizawa|ASS|Cancellazione|stun|Occhio Cancella-Quirk|dodge|eroi-professionisti
eijiro-kirishima|TAN|Red Riot Unbreakable|strike|Indurimento|armor|classe-1a
ochako-uraraka|SUP|Meteor Storm|aoe|Gravità Zero|dodge|classe-1a
tomura-shigaraki|EVO|Decadimento|drain|Disintegrazione|lifesteal|
denki-kaminari|MAG|Indiscriminate Shock|aoe|Scarica Elettrica|firststrike|classe-1a
tsuyu-asui|ASS|Lingua Frusta|pierce|Agilità da Rana|dodge|classe-1a
momo-yaoyorozu|SUP|Creazione|barrier|Mente Brillante|energy|classe-1a
fumikage-tokoyami|EVO|Dark Shadow|multi|Ombra Ribelle|rage|classe-1a
levi-ackerman|ASS|Tornado di Lame|multi|Il Più Forte dell'Umanità|firststrike|corpo-di-ricerca
eren-yeager|EVO|Gigante Attaccante|strike|Titano Fondatore|rage|corpo-di-ricerca,cadetti-104
mikasa-ackerman|ASS|Doppia Lama|pierce|Sangue Ackerman|crit|corpo-di-ricerca,cadetti-104
armin-arlert|SUP|Strategia Brillante|buff|Mente Geniale|aura_atk|cadetti-104,corpo-di-ricerca
hange-zoe|EVO|Esperimenti sui Giganti|debuff|Curiosità Infinita|energy|corpo-di-ricerca
erwin-smith|SUP|Carica Suicida|buff|Comandante del Corpo|aura_atk|corpo-di-ricerca
sasha-blouse|TIR|Tiro da Cacciatrice|snipe|Fame Eterna|dodge|cadetti-104
reiner-braun|TAN|Titano Corazzato|strike|Armatura Indistruttibile|armor|guerrieri-marley
jean-kirstein|ASS|Manovra Tridimensionale|pierce|Spirito di Comando|crit|cadetti-104
annie-leonhart|ASS|Calcio Titanico|execute|Cristallizzazione|armor|guerrieri-marley
historia-reiss|GUA|Regina di Paradis|heal|Gentilezza|regen|cadetti-104
ymir|EVO|Titano Mascella|multi|Sacrificio|laststand|cadetti-104
edward-elric|BRU|Trasmutazione Automail|strike|Alchimia Senza Cerchio|firststrike|fratelli-elric,alchimisti-di-stato
roy-mustang|MAG|Fiamma Purificatrice|aoe|Alchimista di Fuoco|rage|alchimisti-di-stato
alphonse-elric|TAN|Armatura Vuota|barrier|Anima Legata|armor|fratelli-elric
winry-rockbell|GUA|Riparazione Automail|heal|Meccanica Geniale|energy|fratelli-elric
riza-hawkeye|TIR|Tiro Infallibile|snipe|Occhio di Falco|crit|alchimisti-di-stato
ling-yao|ASS|Spada Imperiale|pierce|Immortalità di Greed|regen|
greed|TAN|Scudo Definitivo|strike|Avidità Eterna|armor|homunculus
maes-hughes|SUP|Coltelli da Lancio|snipe|Padre Amorevole|dodge|alchimisti-di-stato
scar|BRU|Decostruzione|execute|Alchimia di Ishval|firststrike|
olivier-mira-armstrong|TAN|Gelo di Briggs|stun|Generale d'Acciaio|armor|alchimisti-di-stato
alex-louis-armstrong|BRU|Pugno Armstrong|strike|Muscoli Orgogliosi|rage|alchimisti-di-stato
envy|EVO|Metamorfosi|drain|Invidia|regen|homunculus
killua-zoldyck|ASS|Godspeed|haste|Sangue Zoldyck|firststrike|famiglia-zoldyck,amici-di-gon
kurapika|SUP|Catene del Giudizio|stun|Occhi Scarlatti|aura_atk|amici-di-gon
gon-freecss|BRU|Jajanken|strike|Determinazione Cieca|rage|amici-di-gon
hisoka-morow|MAG|Bungee Gum|drain|Illusionista Sadico|lifesteal|
chrollo-lucilfer|EVO|Rubare Abilità|buff|Capo del Ragno|aura_atk|brigata-fantasma
meruem|MAG|Re delle Formiche|aoe|Rigenerazione Suprema|regen|formiche-chimera
leorio-paradinight|GUA|Cure Mediche|heal|Futuro Dottore|regen|amici-di-gon
feitan-portor|ASS|Sole Nascente|strike|Torturatore|crit|brigata-fantasma
isaac-netero|BRU|Bodhisattva a Mille Mani|execute|Presidente dei Hunter|armor|
neferpitou|MAG|Terpsichora|multi|Guardia Reale|firststrike|formiche-chimera
illumi-zoldyck|ASS|Aghi dell'Ombra|debuff|Assassino di Famiglia|dodge|famiglia-zoldyck
kite|ASS|Spada Mietitrice|pierce|Mentore|dodge|amici-di-gon
ichigo-kurosaki|BRU|Getsuga Tensho|strike|Hollow Interiore|rage|amici-di-ichigo
kisuke-urahara|SUP|Benihime|debuff|Genio Astuto|firststrike|gotei-13
rukia-kuchiki|MAG|Sode no Shirayuki|stun|Danza di Ghiaccio|dodge|gotei-13,amici-di-ichigo
sousuke-aizen|EVO|Kyoka Suigetsu|stun|Illusione Perfetta|dodge|
yoruichi-shihouin|ASS|Shunko|haste|Dea del Lampo|firststrike|amici-di-ichigo
kenpachi-zaraki|BRU|Spada Spezzata|strike|Istinto Assassino|rage|gotei-13
ulquiorra-cifer|MAG|Cero Oscuro|pierce|Hierro Perfetto|armor|arrancar
grimmjow-jaegerjaquez|BRU|Desgarron|strike|Pantera Assetata|rage|arrancar
orihime-inoue|GUA|Soten Kisshun|healall|Scudo dei Sei Fiori|regen|amici-di-ichigo
toshiro-hitsugaya|MAG|Hyorinmaru|aoe|Drago di Ghiaccio|crit|gotei-13
byakuya-kuchiki|MAG|Senbonzakura Kageyoshi|multi|Nobiltà Kuchiki|dodge|gotei-13
shunsui-kyoraku|SUP|Katen Kyokotsu|aoe|Pigrizia Letale|laststand|gotei-13
l-lawliet|SUP|Deduzione|debuff|Mente Geniale|aura_atk|squadra-investigativa
light-yagami|EVO|Death Note|execute|Dio del Nuovo Mondo|firststrike|culto-di-kira
ryuk|MAG|Shinigami della Mela|drain|Osservatore|dodge|culto-di-kira
misa-amane|SUP|Occhi dello Shinigami|debuff|Seconda Kira|crit|culto-di-kira
near|SUP|Giochi di Giocattoli|buff|Successore di L|energy|squadra-investigativa
mello|TIR|Colpo di Pistola|snipe|Rivale Impulsivo|rage|squadra-investigativa
touta-matsuda|TIR|Tiro Fortunato|snipe|Il Più Ingenuo|laststand|squadra-investigativa
rem|TAN|Sacrificio dello Shinigami|barrier|Amore Protettivo|armor|culto-di-kira
teru-mikami|ASS|Giudice di Kira|execute|Fede Cieca|crit|culto-di-kira
naomi-misora|TIR|Indagine FBI|pierce|Istinto d'Agente|dodge|squadra-investigativa
soichiro-yagami|TIR|Pistola del Padre|strike|Detective Integerrimo|armor|squadra-investigativa
quillsh-wammy|SUP|Inventore Misterioso|barrier|Maggiordomo Fedele|energy|squadra-investigativa
denji|BRU|Motosega Sanguinaria|multi|Cuore di Pochita|regen|divisione-4
makima|SUP|Controllo|stun|Diavolo del Controllo|dodge|
power|BRU|Sangue di Lancia|pierce|Diavolo del Sangue|lifesteal|divisione-4
aki-hayakawa|ASS|Diavolo della Volpe|aoe|Contratto della Maledizione|firststrike|divisione-4
reze|MAG|Bomba Vivente|aoe|Ragazza Esplosiva|rage|
pochita|TAN|Diavolo della Motosega|execute|Eroe dell'Inferno|laststand|diavoli
kobeni-higashiyama|TAN|Fuga Disperata|barrier|Fortuna Sfacciata|dodge|divisione-4
diavolo-dell-angelo|SUP|Tocco Mortale|drain|Angelo della Morte|lifesteal|diavoli
himeno|SUP|Diavolo del Fantasma|stun|Veterana Brillante|dodge|divisione-4
kishibe|TIR|Cacciatore di Diavoli|snipe|Il Più Forte|armor|divisione-4
beam|BRU|Squalo Devoto|strike|Fedele a Chainsaw|rage|diavoli
saitama|BRU|Pugno Normale|execute|Troppo Forte|laststand|classe-s
tatsumaki|MAG|Telecinesi|aoe|Tornado del Terrore|dodge|classe-s
genos|MAG|Incinerazione|pierce|Cyborg Demoniaco|regen|classe-s
garou|BRU|Cacciatore di Eroi|multi|Adattamento|rage|
fubuki|MAG|Tempesta Infernale|aoe|Gruppo Fubuki|aura_atk|associazione-eroi
sonic-supersonico|ASS|Lama Velocissima|pierce|Ninja Veloce|firststrike|associazione-eroi
bang|BRU|Pugno Corrente d'Acqua|multi|Maestro Marziale|dodge|classe-s
king|TAN|Motore del Re|stun|Aura del Più Forte|aura_atk|classe-s
zombieman|TIR|Pistola Zombie|strike|Immortale|regen|classe-s
puri-puri-prisoner|BRU|Gabbia Selvaggia|stun|Sacrificio d'Eroe|laststand|classe-s
boros|MAG|Cannone Collasso|aoe|Dominatore Spaziale|armor|
erza-scarlet|BRU|Armatura Heaven's Wheel|multi|Regina delle Fate|armor|team-natsu
natsu-dragneel|BRU|Pugno del Drago di Fuoco|strike|Dragon Slayer|rage|team-natsu
lucy-heartfilia|EVO|Spiriti Stellari|multi|Maga Celeste|energy|team-natsu
gray-fullbuster|MAG|Lancia di Ghiaccio|pierce|Maestro del Ghiaccio|dodge|team-natsu
juvia-lockser|MAG|Corpo d'Acqua|aoe|Pioggia d'Amore|dodge|gilda-fairy-tail
happy|SUP|Ali Magiche|haste|Gatto Alato|dodge|team-natsu
gajeel-redfox|TAN|Ruggito del Drago di Ferro|strike|Corpo di Ferro|armor|gilda-fairy-tail
mirajane-strauss|MAG|Satan Soul|strike|Demone Gentile|regen|gilda-fairy-tail
jellal-fernandes|MAG|Meteor|strike|Mago Pentito|firststrike|
wendy-marvell|GUA|Cure del Drago del Cielo|healall|Aria Guaritrice|regen|gilda-fairy-tail
zeref|MAG|Magia della Morte|execute|Mago Nero|laststand|
laxus-dreyar|MAG|Fulmine del Drago|aoe|Dio del Fulmine|firststrike|gilda-fairy-tail
asta|BRU|Spada Anti-Magia|pierce|Mai Arrendersi|laststand|toro-nero
yuno|MAG|Spirito del Vento Sylph|multi|Quadrifoglio a Quattro Foglie|firststrike|
yami-sukehiro|BRU|Taglio Oscuro|strike|Capitano dei Tori Neri|rage|toro-nero
noelle-silva|MAG|Valchiria d'Acqua|aoe|Sangue Reale|armor|toro-nero
mereoleona-vermillion|BRU|Fiamma Leonina|strike|Leonessa Reale|rage|cavalieri-magici
julius-novachrono|MAG|Magia del Tempo|buff|Imperatore Mago|aura_atk|cavalieri-magici
luck-voltia|MAG|Fulmine Ruggente|multi|Amore per il Combattimento|firststrike|toro-nero
zora-ideale|TIR|Trappola Magica|snipe|Cecchino Zora|dodge|toro-nero
vanessa-enoteca|SUP|Fili del Destino|stun|Strega Maledetta|dodge|toro-nero
charmy-pappitson|GUA|Cucina Magica|heal|Fame Eterna|regen|toro-nero
mimosa-vermillion|GUA|Magia delle Piante|healall|Gentilezza Reale|regen|cavalieri-magici
finral-roulacase|SUP|Portale Spaziale|haste|Teletrasporto|dodge|toro-nero
nacht-faust|MAG|Ombra Oscura|multi|Magia dell'Ombra|dodge|toro-nero
"""

# id -> (nome, stat, [bonus a 2, 3, 4 membri] in %)
TRATTI_NUOVI = {
    "classe-1a": ("Classe 1-A", "def", [5, 10, 15]),
    "eroi-professionisti": ("Eroi Professionisti", "atk", [6, 12, 18]),
    "corpo-di-ricerca": ("Corpo di Ricerca", "atk", [6, 12, 18]),
    "cadetti-104": ("104° Corpo Cadetti", "spd", [6, 12, 18]),
    "guerrieri-marley": ("Guerrieri di Marley", "hp", [6, 12, 18]),
    "fratelli-elric": ("Fratelli Elric", "hp", [10, 20, 30]),
    "alchimisti-di-stato": ("Alchimisti di Stato", "atk", [6, 12, 18]),
    "homunculus": ("Homunculus", "hp", [8, 16, 24]),
    "famiglia-zoldyck": ("Famiglia Zoldyck", "spd", [8, 16, 24]),
    "amici-di-gon": ("Amici di Gon", "def", [8, 16, 24]),
    "brigata-fantasma": ("Brigata Fantasma", "atk", [8, 16, 24]),
    "formiche-chimera": ("Formiche Chimera", "hp", [8, 16, 24]),
    "gotei-13": ("Gotei 13", "hp", [5, 10, 15]),
    "amici-di-ichigo": ("Amici di Ichigo", "def", [6, 12, 18]),
    "arrancar": ("Arrancar", "atk", [8, 16, 24]),
    "squadra-investigativa": ("Squadra Investigativa", "def", [5, 10, 15]),
    "culto-di-kira": ("Culto di Kira", "atk", [6, 12, 18]),
    "divisione-4": ("Divisione Speciale 4", "atk", [6, 12, 18]),
    "diavoli": ("Diavoli", "hp", [8, 16, 24]),
    "classe-s": ("Eroi di Classe S", "hp", [4, 8, 12]),
    "associazione-eroi": ("Associazione Eroi", "spd", [8, 16, 24]),
    "famiglia-forger": ("Famiglia Forger", "hp", [10, 20, 30]),
    "team-natsu": ("Team Natsu", "atk", [6, 12, 18]),
    "gilda-fairy-tail": ("Gilda di Fairy Tail", "hp", [5, 10, 15]),
    "toro-nero": ("Toro Nero", "hp", [5, 10, 15]),
    "cavalieri-magici": ("Cavalieri Magici", "atk", [6, 12, 18]),
    "piloti-eva": ("Piloti EVA", "atk", [6, 12, 18]),
    "nerv": ("NERV", "def", [5, 10, 15]),
    "equipaggio-bebop": ("Equipaggio del Bebop", "spd", [6, 12, 18]),
}

# anime -> nome mostrato
ANIME_NUOVI = {
    "my-hero-academia": "My Hero Academia",
    "attack-on-titan": "L'attacco dei Giganti",
    "fullmetal-alchemist": "Fullmetal Alchemist",
    "hunter-x-hunter": "Hunter x Hunter",
    "bleach": "Bleach",
    "death-note": "Death Note",
    "chainsaw-man": "Chainsaw Man",
    "one-punch-man": "One Punch Man",
    "fairy-tail": "Fairy Tail",
    "black-clover": "Black Clover",
}

DUOS_NUOVI = [
    ("killua-zoldyck", "gon-freecss", "Migliori amici"),
    ("edward-elric", "alphonse-elric", "Fratelli Elric"),
    ("natsu-dragneel", "gray-fullbuster", "Litigano ma si fidano"),
    ("asta", "yuno", "Amici e rivali"),
    ("izuku-midoriya", "all-might", "Maestro e allievo"),
    ("levi-ackerman", "erwin-smith", "Comandante e braccio destro"),
    ("denji", "power", "Compagni di caccia"),
]
RIVALITA_NUOVE = [
    ("light-yagami", "l-lawliet", "Gatto e topo"),
    ("ichigo-kurosaki", "sousuke-aizen", "Il traditore"),
    ("izuku-midoriya", "katsuki-bakugo", "Rivali d'infanzia"),
    ("saitama", "garou", "Eroe e mostro"),
    ("eren-yeager", "reiner-braun", "Nemici giurati"),
    ("hisoka-morow", "chrollo-lucilfer", "Duello del Ragno"),
    ("natsu-dragneel", "zeref", "Fratelli nemici"),
]

# forme alternative dei nuovi personaggi: (base, slug, nome forma, Δ voto, mossa, effetto, passiva, effetto, Δ costo)
FORME_NUOVE = [
    ("ichigo-kurosaki", "bankai", "Bankai", 3, "Getsuga Tensho Finale", "strike", "Velocità del Bankai", "firststrike", 1),
    ("ichigo-kurosaki", "hollow", "Hollow", 2, "Cero Hollow", "pierce", "Maschera Hollow", "rage", 1),
    ("izuku-midoriya", "full-cowl", "Full Cowl 100%", 1, "Delaware Smash", "strike", "Full Cowl", "rage", 0),
    ("all-might", "forma-magra", "Forma Magra", -12, "Pugno Sfinito", "strike", "Cuore d'Eroe", "laststand", -3),
    ("eren-yeager", "titano-fondatore", "Titano Fondatore", 3, "Boato della Terra", "aoe", "Ordine dei Giganti", "aura_atk", 1),
    ("killua-zoldyck", "fulmine-divino", "Godspeed", 3, "Fulmine Divino", "pierce", "Modalità Fulmine", "firststrike", 1),
    ("gon-freecss", "adulto", "Forma Adulta", 4, "Jajanken Adulto", "strike", "Aura Sconfinata", "aura_atk", 1),
    ("natsu-dragneel", "dragon-force", "Dragon Force", 3, "Pugno Fiamma Esplosiva", "strike", "Forza del Drago", "rage", 1),
    ("erza-scarlet", "armatura-purgatorio", "Armatura Purgatorio", 2, "Lama Infuocata", "multi", "Armatura Purgatorio", "armor", 1),
    ("asta", "demone", "Forma Demone", 3, "Taglio Demoniaco", "pierce", "Forma Demone", "rage", 1),
    ("denji", "chainsaw-man", "Chainsaw Man", 3, "Demone Motosega", "multi", "Rigenerazione Infernale", "regen", 1),
    ("saitama", "serio", "Serio", 2, "Pugno Serio", "execute", "Serietà Assoluta", "armor", 1),
    ("sousuke-aizen", "forma-finale", "Forma Finale", 3, "Hogyoku Fuso", "aoe", "Corpo Perfetto", "regen", 1),
]

# id -> (nome, anime, ruolo, tag, voto, immagine)
PERSONAGGI = [
    ["izuku-midoriya", "Izuku Midoriya", "my-hero-academia", "Capitano", ["MELEE", "SPEED", "AURA"], 93, "https://s4.anilist.co/file/anilistcdn/character/large/b89028-8w1I9o1ISHMg.png"],
    ["shoto-todoroki", "Shoto Todoroki", "my-hero-academia", "Vice", ["ELEMENT", "BARRIER"], 94, "https://s4.anilist.co/file/anilistcdn/character/large/b89220-KNBwaVFAR8FD.png"],
    ["katsuki-bakugo", "Katsuki Bakugo", "my-hero-academia", "Danno", ["ELEMENT", "SPEED"], 93, "https://s4.anilist.co/file/anilistcdn/character/large/b88892-bdOha3lNcaN6.png"],
    ["all-might", "All Might", "my-hero-academia", "Capitano", ["MELEE", "AURA"], 95, "https://s4.anilist.co/file/anilistcdn/character/large/b89224-K6KEuQAuYKzq.jpg"],
    ["shota-aizawa", "Shota Aizawa", "my-hero-academia", "Supporto", ["STEALTH", "MOBILITY"], 88, "https://s4.anilist.co/file/anilistcdn/character/large/b89225-XBgvUhI9naVI.png"],
    ["eijiro-kirishima", "Eijiro Kirishima", "my-hero-academia", "Tank", ["MELEE", "BARRIER"], 85, "https://s4.anilist.co/file/anilistcdn/character/large/b89243-R2WJlNuj3aEs.jpg"],
    ["ochako-uraraka", "Ochako Uraraka", "my-hero-academia", "Supporto", ["MOBILITY"], 84, "https://s4.anilist.co/file/anilistcdn/character/large/b89221-gSF2a4gPbG4m.png"],
    ["tomura-shigaraki", "Tomura Shigaraki", "my-hero-academia", "Danno", ["MELEE"], 90, "https://s4.anilist.co/file/anilistcdn/character/large/b89226-qGXqFthO4SM3.jpg"],
    ["denki-kaminari", "Denki Kaminari", "my-hero-academia", "Danno", ["ELEMENT"], 78, "https://s4.anilist.co/file/anilistcdn/character/large/b89249-Ygc30RlYoFta.png"],
    ["tsuyu-asui", "Tsuyu Asui", "my-hero-academia", "Supporto II", ["MOBILITY", "REGEN"], 80, "https://s4.anilist.co/file/anilistcdn/character/large/b89223-5762vburxnlz.png"],
    ["momo-yaoyorozu", "Momo Yaoyorozu", "my-hero-academia", "Supporto II", ["BARRIER", "SUMMON"], 79, "https://s4.anilist.co/file/anilistcdn/character/large/b89241-Q8KzAfX4Qe2y.png"],
    ["fumikage-tokoyami", "Fumikage Tokoyami", "my-hero-academia", "Danno", ["SUMMON", "STEALTH"], 78, "https://s4.anilist.co/file/anilistcdn/character/large/b89898-yAYDmPQPSOTV.png"],
    ["levi-ackerman", "Levi Ackerman", "attack-on-titan", "Vice", ["MELEE", "SPEED", "MOBILITY"], 95, "https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png"],
    ["eren-yeager", "Eren Yeager", "attack-on-titan", "Capitano", ["TRANSFORM", "GIANT"], 95, "https://s4.anilist.co/file/anilistcdn/character/large/b40882-dsj7IP943WFF.jpg"],
    ["mikasa-ackerman", "Mikasa Ackerman", "attack-on-titan", "Danno", ["MELEE", "SPEED"], 94, "https://s4.anilist.co/file/anilistcdn/character/large/b40881-F3gr1PkreDvj.png"],
    ["armin-arlert", "Armin Arlert", "attack-on-titan", "Supporto", ["PSYCHIC"], 88, "https://s4.anilist.co/file/anilistcdn/character/large/b46494-g7xYYuBtYPnO.png"],
    ["hange-zoe", "Hange Zoe", "attack-on-titan", "Supporto II", ["ENERGY"], 84, "https://s4.anilist.co/file/anilistcdn/character/large/b71121-7R7CnQd3lHgt.png"],
    ["erwin-smith", "Erwin Smith", "attack-on-titan", "Capitano", ["AURA"], 91, "https://s4.anilist.co/file/anilistcdn/character/large/b46496-Mu86MENd5wNB.png"],
    ["sasha-blouse", "Sasha Blouse", "attack-on-titan", "Danno", ["RANGE"], 78, "https://s4.anilist.co/file/anilistcdn/character/large/b45887-QPtJH0KwqthW.jpg"],
    ["reiner-braun", "Reiner Braun", "attack-on-titan", "Tank", ["GIANT", "BARRIER", "TRANSFORM"], 88, "https://s4.anilist.co/file/anilistcdn/character/large/b46484-P6A2GjNQn49F.png"],
    ["jean-kirstein", "Jean Kirstein", "attack-on-titan", "Vice", ["MOBILITY"], 79, "https://s4.anilist.co/file/anilistcdn/character/large/b46498-ritqAj9FW6jX.png"],
    ["annie-leonhart", "Annie Leonhart", "attack-on-titan", "Vice", ["MELEE", "STEALTH"], 85, "https://s4.anilist.co/file/anilistcdn/character/large/b46490-tan274Ifc1Jf.jpg"],
    ["historia-reiss", "Historia Reiss", "attack-on-titan", "Guaritore", ["AURA", "HEAL"], 74, "https://s4.anilist.co/file/anilistcdn/character/large/b62481-ZZDa7vn17lMU.png"],
    ["ymir", "Ymir", "attack-on-titan", "Supporto II", ["TRANSFORM"], 74, "https://s4.anilist.co/file/anilistcdn/character/large/b71479-huCD908XIdqv.png"],
    ["edward-elric", "Edward Elric", "fullmetal-alchemist", "Capitano", ["MELEE", "ELEMENT"], 94, "https://s4.anilist.co/file/anilistcdn/character/large/b11-TA5Nuk7EDUZG.jpg"],
    ["roy-mustang", "Roy Mustang", "fullmetal-alchemist", "Danno", ["ELEMENT"], 93, "https://s4.anilist.co/file/anilistcdn/character/large/b68-moBLY2WO2am3.png"],
    ["alphonse-elric", "Alphonse Elric", "fullmetal-alchemist", "Tank", ["BARRIER", "GIANT"], 88, "https://s4.anilist.co/file/anilistcdn/character/large/b12-tCKu8yK5kFL5.jpg"],
    ["winry-rockbell", "Winry Rockbell", "fullmetal-alchemist", "Guaritore", ["HEAL"], 70, "https://s4.anilist.co/file/anilistcdn/character/large/63-xloedtYxiJ2E.jpg"],
    ["riza-hawkeye", "Riza Hawkeye", "fullmetal-alchemist", "Supporto", ["RANGE"], 84, "https://s4.anilist.co/file/anilistcdn/character/large/b70-k4bCgDspyOdI.png"],
    ["ling-yao", "Ling Yao", "fullmetal-alchemist", "Vice", ["SPEED", "MELEE"], 82, "https://s4.anilist.co/file/anilistcdn/character/large/b3293-2GiFTmLQnBw8.jpg"],
    ["greed", "Greed", "fullmetal-alchemist", "Danno", ["MELEE", "BARRIER"], 85, "https://s4.anilist.co/file/anilistcdn/character/large/b351-XMQzTuMy2Xtn.jpg"],
    ["maes-hughes", "Maes Hughes", "fullmetal-alchemist", "Supporto II", ["RANGE"], 74, "https://s4.anilist.co/file/anilistcdn/character/large/b69-MRetSG8Qevvu.png"],
    ["scar", "Scar", "fullmetal-alchemist", "Danno", ["MELEE"], 86, "https://s4.anilist.co/file/anilistcdn/character/large/b66-bLbGWXrmDqfV.png"],
    ["olivier-mira-armstrong", "Olivier Mira Armstrong", "fullmetal-alchemist", "Tank", ["MELEE"], 82, "https://s4.anilist.co/file/anilistcdn/character/large/n3934-MKTV6tQeP8T3.png"],
    ["alex-louis-armstrong", "Alex Louis Armstrong", "fullmetal-alchemist", "Tank", ["MELEE"], 81, "https://s4.anilist.co/file/anilistcdn/character/large/b2079-RnhPS44vyqpJ.jpg"],
    ["envy", "Envy", "fullmetal-alchemist", "Vice", ["TRANSFORM"], 80, "https://s4.anilist.co/file/anilistcdn/character/large/b651-S4mzVOTMzej6.png"],
    ["killua-zoldyck", "Killua Zoldyck", "hunter-x-hunter", "Vice", ["SPEED", "ELEMENT", "MOBILITY"], 95, "https://s4.anilist.co/file/anilistcdn/character/large/b27-Z5O02kQUydpT.jpg"],
    ["kurapika", "Kurapika", "hunter-x-hunter", "Supporto", ["ENERGY", "AURA"], 93, "https://s4.anilist.co/file/anilistcdn/character/large/b28-ivA7UGnfE40a.png"],
    ["gon-freecss", "Gon Freecss", "hunter-x-hunter", "Capitano", ["MELEE", "AURA"], 94, "https://s4.anilist.co/file/anilistcdn/character/large/b30-lyFExKyDhefc.jpg"],
    ["hisoka-morow", "Hisoka Morow", "hunter-x-hunter", "Danno", ["AURA", "STEALTH"], 92, "https://s4.anilist.co/file/anilistcdn/character/large/b31-FZckOuu7L1un.png"],
    ["chrollo-lucilfer", "Chrollo Lucilfer", "hunter-x-hunter", "Capitano", ["PSYCHIC", "STEALTH"], 93, "https://s4.anilist.co/file/anilistcdn/character/large/b58-USOmsz3nursi.jpg"],
    ["meruem", "Meruem", "hunter-x-hunter", "Capitano", ["TRANSFORM"], 95, "https://s4.anilist.co/file/anilistcdn/character/large/b23277-EYmIxzL64Mji.png"],
    ["leorio-paradinight", "Leorio Paradinight", "hunter-x-hunter", "Guaritore", ["HEAL"], 76, "https://s4.anilist.co/file/anilistcdn/character/large/b29-RgzoSeKmDYzl.jpg"],
    ["feitan-portor", "Feitan Portor", "hunter-x-hunter", "Danno", ["SPEED"], 82, "https://s4.anilist.co/file/anilistcdn/character/large/3195.jpg"],
    ["isaac-netero", "Isaac Netero", "hunter-x-hunter", "Tank", ["MELEE", "AURA"], 92, "https://s4.anilist.co/file/anilistcdn/character/large/b14489-WgGsdlQJka65.jpg"],
    ["neferpitou", "Neferpitou", "hunter-x-hunter", "Vice", ["SPEED", "STEALTH"], 86, "https://s4.anilist.co/file/anilistcdn/character/large/b12300-kYzopQUTLa9A.png"],
    ["illumi-zoldyck", "Illumi Zoldyck", "hunter-x-hunter", "Supporto II", ["STEALTH"], 84, "https://s4.anilist.co/file/anilistcdn/character/large/b57-pTFguojSOQZW.png"],
    ["kite", "Kite", "hunter-x-hunter", "Supporto II", ["SUMMON"], 79, "https://s4.anilist.co/file/anilistcdn/character/large/b20594-QQJBR3LYobbv.jpg"],
    ["ichigo-kurosaki", "Ichigo Kurosaki", "bleach", "Capitano", ["MELEE", "TRANSFORM"], 95, "https://s4.anilist.co/file/anilistcdn/character/large/b5-a7bkJgjhhigE.png"],
    ["kisuke-urahara", "Kisuke Urahara", "bleach", "Supporto", ["STEALTH", "ENERGY"], 90, "https://s4.anilist.co/file/anilistcdn/character/large/b210-mw01NrQfRjzT.png"],
    ["rukia-kuchiki", "Rukia Kuchiki", "bleach", "Vice", ["ELEMENT"], 85, "https://s4.anilist.co/file/anilistcdn/character/large/b6-25WoBeWMZXBc.png"],
    ["sousuke-aizen", "Sousuke Aizen", "bleach", "Capitano", ["PSYCHIC"], 95, "https://s4.anilist.co/file/anilistcdn/character/large/b1086-qR9218BjZTC0.png"],
    ["yoruichi-shihouin", "Yoruichi Shihouin", "bleach", "Vice", ["SPEED", "MOBILITY"], 90, "https://s4.anilist.co/file/anilistcdn/character/large/b908-JSYUkJLCw1f0.png"],
    ["kenpachi-zaraki", "Kenpachi Zaraki", "bleach", "Danno", ["MELEE"], 92, "https://s4.anilist.co/file/anilistcdn/character/large/b909-slhoFBon7oiH.jpg"],
    ["ulquiorra-cifer", "Ulquiorra Cifer", "bleach", "Vice", ["ENERGY"], 91, "https://s4.anilist.co/file/anilistcdn/character/large/b1081-xLTqHfLL2I2W.png"],
    ["grimmjow-jaegerjaquez", "Grimmjow Jaegerjaquez", "bleach", "Danno", ["MELEE", "SPEED"], 88, "https://s4.anilist.co/file/anilistcdn/character/large/b1080-JUNo2Or0UGZg.jpg"],
    ["orihime-inoue", "Orihime Inoue", "bleach", "Guaritore", ["HEAL", "BARRIER"], 78, "https://s4.anilist.co/file/anilistcdn/character/large/b7-JdR4betokDjR.jpg"],
    ["toshiro-hitsugaya", "Toshiro Hitsugaya", "bleach", "Danno", ["ELEMENT"], 88, "https://s4.anilist.co/file/anilistcdn/character/large/b245-buy3Cfn6IFSB.jpg"],
    ["byakuya-kuchiki", "Byakuya Kuchiki", "bleach", "Vice", ["ELEMENT"], 89, "https://s4.anilist.co/file/anilistcdn/character/large/b907-kgnDKeMtEN5y.png"],
    ["shunsui-kyoraku", "Shunsui Kyoraku", "bleach", "Supporto", ["AURA"], 87, "https://s4.anilist.co/file/anilistcdn/character/large/b1088-6oO10CmxZ1lP.jpg"],
    ["l-lawliet", "L Lawliet", "death-note", "Capitano", ["PSYCHIC"], 95, "https://s4.anilist.co/file/anilistcdn/character/large/b71-1W4panC53vfs.png"],
    ["light-yagami", "Light Yagami", "death-note", "Capitano", ["PSYCHIC"], 94, "https://s4.anilist.co/file/anilistcdn/character/large/b80-26EhwSsSqQ50.png"],
    ["ryuk", "Ryuk", "death-note", "Supporto", ["SUMMON"], 82, "https://s4.anilist.co/file/anilistcdn/character/large/b75-IkEpzO21LgFy.jpg"],
    ["misa-amane", "Misa Amane", "death-note", "Supporto II", ["PSYCHIC"], 76, "https://s4.anilist.co/file/anilistcdn/character/large/b835-CiZa8y2z2gCz.png"],
    ["near", "Near", "death-note", "Vice", ["PSYCHIC"], 82, "https://s4.anilist.co/file/anilistcdn/character/large/n464-6KeJpU6g7Hwj.jpg"],
    ["mello", "Mello", "death-note", "Danno", ["RANGE"], 80, "https://s4.anilist.co/file/anilistcdn/character/large/b463-QBLeLf6XxVg6.png"],
    ["touta-matsuda", "Touta Matsuda", "death-note", "Supporto II", ["RANGE"], 62, "https://s4.anilist.co/file/anilistcdn/character/large/n1906-JCWKEGGook3Z.png"],
    ["rem", "Rem", "death-note", "Tank", ["BARRIER"], 78, "https://s4.anilist.co/file/anilistcdn/character/large/n1905-9GfCvLFKNRLR.png"],
    ["teru-mikami", "Teru Mikami", "death-note", "Danno", ["STEALTH"], 70, "https://s4.anilist.co/file/anilistcdn/character/large/n1904-xKw2NgiE6VbU.jpg"],
    ["naomi-misora", "Naomi Misora", "death-note", "Supporto", ["RANGE"], 66, "https://s4.anilist.co/file/anilistcdn/character/large/b4959-DKXw1VYrvael.png"],
    ["soichiro-yagami", "Soichiro Yagami", "death-note", "Tank", ["RANGE"], 72, "https://s4.anilist.co/file/anilistcdn/character/large/b1927-iaIWrFITyeJw.jpg"],
    ["quillsh-wammy", "Quillsh Wammy", "death-note", "Supporto II", ["BARRIER"], 68, "https://s4.anilist.co/file/anilistcdn/character/large/n2179-qF49l5qEurt5.png"],
    ["denji", "Denji", "chainsaw-man", "Capitano", ["MELEE", "TRANSFORM"], 93, "https://s4.anilist.co/file/anilistcdn/character/large/b130102-FO1VHNnEnLlB.png"],
    ["makima", "Makima", "chainsaw-man", "Vice", ["PSYCHIC"], 95, "https://s4.anilist.co/file/anilistcdn/character/large/b137080-UHcynYNjb5ZU.png"],
    ["power", "Power", "chainsaw-man", "Danno", ["MELEE", "SUMMON"], 93, "https://s4.anilist.co/file/anilistcdn/character/large/b137079-6yLEUYR3bmpr.png"],
    ["aki-hayakawa", "Aki Hayakawa", "chainsaw-man", "Vice", ["SUMMON"], 90, "https://s4.anilist.co/file/anilistcdn/character/large/b137081-TSrUR3mUJL6r.png"],
    ["reze", "Reze", "chainsaw-man", "Danno", ["ELEMENT"], 91, "https://s4.anilist.co/file/anilistcdn/character/large/b148740-ceAibPxLW8rR.png"],
    ["pochita", "Pochita", "chainsaw-man", "Supporto", ["TRANSFORM"], 87, "https://s4.anilist.co/file/anilistcdn/character/large/b170266-bBXPkNJnd3mg.png"],
    ["kobeni-higashiyama", "Kobeni Higashiyama", "chainsaw-man", "Supporto II", ["MOBILITY"], 70, "https://s4.anilist.co/file/anilistcdn/character/large/b144594-0dbO1NSYeZ12.png"],
    ["diavolo-dell-angelo", "Diavolo dell'Angelo", "chainsaw-man", "Guaritore", ["HEAL"], 82, "https://s4.anilist.co/file/anilistcdn/character/large/b152231-xNV2YsTRzEcS.png"],
    ["himeno", "Himeno", "chainsaw-man", "Supporto", ["STEALTH"], 78, "https://s4.anilist.co/file/anilistcdn/character/large/b144596-kvL6SD2litJu.png"],
    ["kishibe", "Kishibe", "chainsaw-man", "Tank", ["RANGE"], 86, "https://s4.anilist.co/file/anilistcdn/character/large/b144593-hdCTT9t54z0s.png"],
    ["beam", "Beam", "chainsaw-man", "Danno", ["MELEE"], 76, "https://s4.anilist.co/file/anilistcdn/character/large/b157232-5GuWeqoFN9Kq.jpg"],
    ["saitama", "Saitama", "one-punch-man", "Capitano", ["MELEE"], 95, "https://s4.anilist.co/file/anilistcdn/character/large/b73935-ON5d0mAcrItd.jpg"],
    ["tatsumaki", "Tatsumaki", "one-punch-man", "Danno", ["PSYCHIC"], 94, "https://s4.anilist.co/file/anilistcdn/character/large/b81929-WPVp2LQoWgkc.png"],
    ["genos", "Genos", "one-punch-man", "Vice", ["ENERGY"], 90, "https://s4.anilist.co/file/anilistcdn/character/large/b73979-tVi9maPID881.jpg"],
    ["garou", "Garou", "one-punch-man", "Danno", ["MELEE"], 93, "https://s4.anilist.co/file/anilistcdn/character/large/b89277-xBGb4B5YISXg.png"],
    ["fubuki", "Fubuki", "one-punch-man", "Supporto", ["PSYCHIC"], 80, "https://s4.anilist.co/file/anilistcdn/character/large/b81931-fmouMoprPVbV.png"],
    ["sonic-supersonico", "Sonic Supersonico", "one-punch-man", "Vice", ["SPEED", "STEALTH"], 85, "https://s4.anilist.co/file/anilistcdn/character/large/b74167-FE8EtGtHUM77.png"],
    ["bang", "Bang", "one-punch-man", "Tank", ["MELEE"], 90, "https://s4.anilist.co/file/anilistcdn/character/large/n81141-1ml7Q6X2B508.png"],
    ["king", "King", "one-punch-man", "Supporto II", ["AURA"], 75, "https://s4.anilist.co/file/anilistcdn/character/large/n88907-M7QLjYvp2LEp.png"],
    ["zombieman", "Zombieman", "one-punch-man", "Tank", ["REGEN"], 78, "https://s4.anilist.co/file/anilistcdn/character/large/n133835-7dbqvi4YzpRC.png"],
    ["puri-puri-prisoner", "Puri-Puri Prisoner", "one-punch-man", "Supporto II", ["MELEE"], 70, "https://s4.anilist.co/file/anilistcdn/character/large/n86029-iomUtQtGfJOU.png"],
    ["boros", "Boros", "one-punch-man", "Capitano", ["ENERGY", "GIANT"], 91, "https://s4.anilist.co/file/anilistcdn/character/large/n89263-GPItRQ64F27D.png"],
    ["erza-scarlet", "Erza Scarlet", "fairy-tail", "Vice", ["MELEE", "SUMMON"], 94, "https://s4.anilist.co/file/anilistcdn/character/large/b5189-GR1xdok9SFsN.jpg"],
    ["natsu-dragneel", "Natsu Dragneel", "fairy-tail", "Capitano", ["ELEMENT"], 94, "https://s4.anilist.co/file/anilistcdn/character/large/b5187-y1OEdRu9sPN2.png"],
    ["lucy-heartfilia", "Lucy Heartfilia", "fairy-tail", "Supporto", ["SUMMON"], 84, "https://s4.anilist.co/file/anilistcdn/character/large/b5186-izgXf2S86K9u.png"],
    ["gray-fullbuster", "Gray Fullbuster", "fairy-tail", "Danno", ["ELEMENT"], 90, "https://s4.anilist.co/file/anilistcdn/character/large/b4839-p2SBgjdTxHxk.png"],
    ["juvia-lockser", "Juvia Lockser", "fairy-tail", "Supporto II", ["ELEMENT"], 74, "https://s4.anilist.co/file/anilistcdn/character/large/b9719-xh4xqTV6byNl.png"],
    ["happy", "Happy", "fairy-tail", "Supporto II", ["MOBILITY"], 66, "https://s4.anilist.co/file/anilistcdn/character/large/b5188-1jTaic3aJ7Ds.jpg"],
    ["gajeel-redfox", "Gajeel Redfox", "fairy-tail", "Tank", ["MELEE"], 82, "https://s4.anilist.co/file/anilistcdn/character/large/b16893-l9HhHQ8j09H5.jpg"],
    ["mirajane-strauss", "Mirajane Strauss", "fairy-tail", "Vice", ["TRANSFORM"], 86, "https://s4.anilist.co/file/anilistcdn/character/large/b5190-Xql1rGKUv1ql.png"],
    ["jellal-fernandes", "Jellal Fernandes", "fairy-tail", "Danno", ["ENERGY"], 84, "https://s4.anilist.co/file/anilistcdn/character/large/b22751-ITQZWdiz8Ym7.png"],
    ["wendy-marvell", "Wendy Marvell", "fairy-tail", "Guaritore", ["HEAL"], 76, "https://s4.anilist.co/file/anilistcdn/character/large/b28886-unO1rEi3zdyF.jpg"],
    ["zeref", "Zeref", "fairy-tail", "Capitano", ["ENERGY"], 91, "https://s4.anilist.co/file/anilistcdn/character/large/37720-WfpaYoeW2OkV.jpg"],
    ["laxus-dreyar", "Laxus Dreyar", "fairy-tail", "Danno", ["ELEMENT"], 85, "https://s4.anilist.co/file/anilistcdn/character/large/b8294-24LS3f4VMrfs.jpg"],
    ["asta", "Asta", "black-clover", "Capitano", ["MELEE", "AURA"], 92, "https://s4.anilist.co/file/anilistcdn/character/large/b123285-tKijiuQErDS0.png"],
    ["yuno", "Yuno", "black-clover", "Vice", ["ELEMENT"], 91, "https://s4.anilist.co/file/anilistcdn/character/large/b123284-w6kIFYnTclMd.png"],
    ["yami-sukehiro", "Yami Sukehiro", "black-clover", "Capitano", ["MELEE"], 92, "https://s4.anilist.co/file/anilistcdn/character/large/b124440-Lpdo6y8cljV6.png"],
    ["noelle-silva", "Noelle Silva", "black-clover", "Danno", ["ELEMENT"], 80, "https://s4.anilist.co/file/anilistcdn/character/large/b123283-7nJHtKha0LSm.png"],
    ["mereoleona-vermillion", "Mereoleona Vermillion", "black-clover", "Danno", ["ELEMENT", "MELEE"], 88, "https://s4.anilist.co/file/anilistcdn/character/large/b124522-lJK4Hy6Aokie.png"],
    ["julius-novachrono", "Julius Novachrono", "black-clover", "Capitano", ["ENERGY"], 92, "https://s4.anilist.co/file/anilistcdn/character/large/b124435-gXFVXWrCcieK.jpg"],
    ["luck-voltia", "Luck Voltia", "black-clover", "Danno", ["ELEMENT"], 80, "https://s4.anilist.co/file/anilistcdn/character/large/b124449-yLXJfZah72SL.png"],
    ["zora-ideale", "Zora Ideale", "black-clover", "Supporto II", ["RANGE"], 72, "https://s4.anilist.co/file/anilistcdn/character/large/b124459-UggsjRUfNtko.png"],
    ["vanessa-enoteca", "Vanessa Enoteca", "black-clover", "Supporto II", ["STEALTH"], 70, "https://s4.anilist.co/file/anilistcdn/character/large/b124436-dES6CtprlZNy.png"],
    ["charmy-pappitson", "Charmy Pappitson", "black-clover", "Guaritore", ["HEAL"], 68, "https://s4.anilist.co/file/anilistcdn/character/large/b124447-2J1PKMgWETNT.png"],
    ["mimosa-vermillion", "Mimosa Vermillion", "black-clover", "Guaritore", ["HEAL"], 70, "https://s4.anilist.co/file/anilistcdn/character/large/b124438-nTvKfJaMD4d5.jpg"],
    ["finral-roulacase", "Finral Roulacase", "black-clover", "Supporto II", ["MOBILITY"], 68, "https://s4.anilist.co/file/anilistcdn/character/large/b124433-QyoZrgIUsSpd.png"],
    ["nacht-faust", "Nacht Faust", "black-clover", "Vice", ["STEALTH"], 80, "https://s4.anilist.co/file/anilistcdn/character/large/b187268-vkcrcTvjNSrA.png"],
]


# sei anime in più (file separato, stesso formato)
from nuovi_personaggi_2 import (  # noqa: E402
    ANIME_2,
    DUOS_2,
    FORME_2,
    PERSONAGGI_2,
    RIGHE_2,
    RIVALITA_2,
    TRATTI_2,
)

RIGHE_SCHEDE += RIGHE_2.strip() + "\n"
TRATTI_NUOVI.update(TRATTI_2)
ANIME_NUOVI.update(ANIME_2)
DUOS_NUOVI += DUOS_2
RIVALITA_NUOVE += RIVALITA_2
FORME_NUOVE += FORME_2
PERSONAGGI += PERSONAGGI_2
