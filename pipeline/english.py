"""A short English rendering of one word in its verse: "and she went / walked", "to her mother-in-law".

Built mechanically from the word's parse (OSHB) and its gloss (TBESH, as corrected in the overrides), so it shows
what the form says, not how a translation would smooth it: wayyiqtol and qatal come out as past, yiqtol and weqatal
as "will", 2nd person keeps its gender and number ("you (f pl)"), and a written/read pair gets one rendering each.
Words the rules get wrong are fixed per token in the overrides (_renderings), each with a reason and a source.
"""
from __future__ import annotations

import re

from morph import decode

# ── English verb forms ──────────────────────────────────────────────────────────────────────
# past, -ing and past participle for the irregular verbs that occur in the glosses; the rest are regular.
IRREGULAR = {
    "arise": ("arose", "arising", "arisen"), "bear": ("bore", "bearing", "borne"), "beat": ("beat", "beating", "beaten"),
    "become": ("became", "becoming", "become"), "beget": ("begot", "begetting", "begotten"),
    "bring": ("brought", "bringing", "brought"), "build": ("built", "building", "built"), "buy": ("bought", "buying", "bought"),
    "cleave": ("clung", "cleaving", "cleaved"), "come": ("came", "coming", "come"), "cut": ("cut", "cutting", "cut"),
    "die": ("died", "dying", "died"), "do": ("did", "doing", "done"), "draw": ("drew", "drawing", "drawn"),
    "drink": ("drank", "drinking", "drunk"), "eat": ("ate", "eating", "eaten"), "fall": ("fell", "falling", "fallen"),
    "find": ("found", "finding", "found"), "give": ("gave", "giving", "given"), "go": ("went", "going", "gone"),
    "grow": ("grew", "growing", "grown"), "hear": ("heard", "hearing", "heard"), "hold": ("held", "holding", "held"),
    "know": ("knew", "knowing", "known"), "leave": ("left", "leaving", "left"), "lie": ("lay", "lying", "lain"),
    "make": ("made", "making", "made"), "meet": ("met", "meeting", "met"), "put": ("put", "putting", "put"),
    "say": ("said", "saying", "said"), "see": ("saw", "seeing", "seen"), "seek": ("sought", "seeking", "sought"),
    "sell": ("sold", "selling", "sold"), "set": ("set", "setting", "set"), "shut": ("shut", "shutting", "shut"),
    "sit": ("sat", "sitting", "sat"), "speak": ("spoke", "speaking", "spoken"), "spread": ("spread", "spreading", "spread"),
    "stand": ("stood", "standing", "stood"), "take": ("took", "taking", "taken"), "tell": ("told", "telling", "told"),
    "weep": ("wept", "weeping", "wept"), "befall": ("befell", "befalling", "befallen"),
    "dwell": ("dwelt", "dwelling", "dwelt"), "lead": ("led", "leading", "led"), "let": ("let", "letting", "let"),
}
DOUBLE_FINAL = {"dip", "stop"}  # regular verbs that double their last consonant


def _regular(base: str) -> tuple[str, str, str]:
    if base in DOUBLE_FINAL:
        return base + base[-1] + "ed", base + base[-1] + "ing", base + base[-1] + "ed"
    if base.endswith("e"):
        return base + "d", (base[:-2] + "ying" if base.endswith("ie") else base[:-1] + "ing"), base + "d"
    if re.search(r"[^aeiou]y$", base):
        return base[:-1] + "ied", base + "ing", base[:-1] + "ied"
    return base + "ed", base + "ing", base + "ed"


def verb_forms(base: str) -> dict:
    past, ing, pp = IRREGULAR.get(base) or _regular(base)
    return {"base": base, "past": past, "ing": ing, "pp": pp}


# Pronouns by person-gender-number. 2nd person keeps gender and number: Ruth turns on who is addressed.
SUBJ = {"1cs": "I", "1cp": "we", "2ms": "you", "2fs": "you (f)", "2mp": "you (pl)", "2fp": "you (f pl)",
        "3ms": "he", "3fs": "she", "3mp": "they", "3fp": "they (f)", "3cp": "they", "1bs": "I", "3bs": "he"}
OBJ = {"1cs": "me", "1cp": "us", "2ms": "you", "2fs": "you (f)", "2mp": "you (pl)", "2fp": "you (f pl)",
       "3ms": "him", "3fs": "her", "3mp": "them", "3fp": "them (f)", "3cp": "them"}
POSS = {"1cs": "my", "1cp": "our", "2ms": "your", "2fs": "your (f)", "2mp": "your (pl)", "2fp": "your (f pl)",
        "3ms": "his", "3fs": "her", "3mp": "their", "3fp": "their (f)", "3cp": "their"}
PLURAL_SUBJ = {"we", "you (pl)", "you (f pl)", "they", "they (f)"}
ADDRESS = {"2ms": "", "2fs": " (f)", "2mp": " (pl)", "2fp": " (f pl)"}

# English prefixes for the Hebrew ones; the first sense of TBESH's "in/on/with" etc.
PREFIX_EN = {"H9002": "and", "H9003": "in", "H9004": "like", "H9005": "to", "H9006": "from", "H9009": "the"}

IRREGULAR_PLURAL = {"man": "men", "woman": "women", "child": "children", "foot": "feet", "wife": "wives",
                    "sheaf": "sheaves", "life": "lives", "self": "selves", "people": "peoples"}
NUMBER_WORDS = {"one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "all", "half"}
MASS = {"barley", "wheat"}  # plural in Hebrew, mass nouns in English
PARTICLES = {"back", "out", "up", "down", "aside", "over", "off"}  # "bring back" + me -> "brought me back"
# Lexemes whose gloss already includes the preposition written as a prefix: "in which", not "in in which";
# בְּטֶרֶם "before"; לְבִלְתִּי "so as not".
COMBINED = {"H834b", "H834c", "H834d", "H2962", "H1115", "H227b"}


def _plural_word(w: str) -> str:
    if w in IRREGULAR_PLURAL:
        return IRREGULAR_PLURAL[w]
    if re.search(r"(s|sh|ch|x)$", w):
        return w + "es"
    if re.search(r"[^aeiou]y$", w):
        return w[:-1] + "ies"
    return w + "s"


def pluralize(noun: str) -> str:
    """'daughter-in-law' -> 'daughters-in-law', 'ear of grain' -> 'ears of grain', 'young man' -> 'young men'."""
    if noun in NUMBER_WORDS or noun in MASS:
        return noun
    m = re.match(r"^(\w+)(-in-law| of .*)$", noun)
    if m:
        return _plural_word(m.group(1)) + m.group(2)
    head, _, last = noun.rpartition(" ")
    return (head + " " if head else "") + _plural_word(last)


def senses(gloss: str, max_senses: int = 2, participle: bool = False) -> list[str]:
    """'to go, walk' -> ['go', 'walk']; 'to support; (ptc.) nurse' -> ['support'] or, for a participle, ['nurse']."""
    g = re.sub(r"^\([^)]*[֐-׿][^)]*\)\s*", "", gloss)       # a leading Hebrew note, e.g. '(כִּי אִם) '
    g = re.sub(r"(\w)\((\w+)\)", r"\1", g)                            # 'to(wards)' -> 'to'
    parts = [p.strip() for p in re.split(r";|,", g) if p.strip()]
    ptc = [p[len("(ptc.)"):].strip() for p in parts if p.startswith("(ptc.)")]
    rest = [p for p in parts if not p.startswith("(ptc.)")]
    chosen = ptc if (participle and ptc) else rest
    return [re.sub(r"^to ", "", p) for p in chosen][:max_senses]


def _pgn(d: dict) -> str:
    return f"{d.get('person', '')}{d.get('gender', '')}{d.get('number', '')}"


def _inflect(phrase: str, form: str, subj: str = "", obj: str = "") -> str:
    """Inflect the first word of a verb phrase ('go down', 'be old', 'act as kinsman') for one form, with its object."""
    first, _, rest = phrase.partition(" ")
    if obj and rest.split(" ")[0] in PARTICLES:
        rest = f"{obj} {rest}"       # brought me back
    elif obj:
        rest = f"{rest} {obj}".strip()
    tail = (" " + rest) if rest else ""
    if first == "be":
        word = {"past": "were" if subj in PLURAL_SUBJ or subj.startswith("you") else "was",
                "will": "will be", "base": "be", "ing": "being", "pp": "been"}[form]
        return word + tail
    f = verb_forms(first)
    if form == "will":
        return "will " + first + tail
    return f[form] + tail


def _verb(d: dict, segs: list[str], to_inf: bool, suffix: dict | None, definite: bool, lex_key: str) -> str:
    """The verb word itself (without its prefixes): subject, verb, object. Alternative senses share one subject."""
    conj = d["conj"]
    pgn = _pgn(d)
    subj = SUBJ.get(pgn, "")
    if lex_key == "H1961" and pgn == "3ms":
        subj = "it"                  # וַיְהִי "and it was", the usual impersonal use; וִיהִי "let it be"
    obj = OBJ.get(_pgn(suffix), "") if suffix else ""
    poss = POSS.get(_pgn(suffix), "") if suffix else ""
    finite = conj in ("wayyiqtol", "perfect (qatal)", "imperfect (yiqtol)", "sequential perfect (weqatal)",
                      "jussive", "cohortative")
    o = obj if finite or conj == "participle active" or (conj == "infinitive construct" and to_inf) else ""
    if o:
        segs = segs[:1]              # "he will redeem you", not "... / act as kinsman you"
    lead, alts = "", []
    for s in segs:
        if conj in ("wayyiqtol", "perfect (qatal)"):
            alts.append(_inflect(s, "past", subj, o))
        elif conj in ("imperfect (yiqtol)", "sequential perfect (weqatal)"):
            alts.append(_inflect(s, "will", subj, o))
        elif conj == "jussive" and pgn.startswith("2"):
            lead = "you" + ADDRESS.get(pgn, "") + " should"   # mostly after אַל: "not | you should call"
            alts.append(_inflect(s, "base", obj=o))
        elif conj in ("jussive", "cohortative"):
            lead = "let " + ("it" if subj == "it" else OBJ.get(pgn, "him" if conj == "jussive" else "me"))
            alts.append(_inflect(s, "base", obj=o))
        elif conj == "imperative":
            alts.append(_inflect(s, "base", obj=o))
        elif conj == "infinitive construct":
            # after ל: "to go", "to leave you"; after other prepositions: "in going", "her coming"
            alts.append(_inflect(s, "base", obj=o) if to_inf else _inflect(s, "ing"))
        elif conj == "infinitive absolute":
            alts.append(_inflect(s, "ing"))
        elif conj == "participle active" and s.startswith("be "):
            alts.append(s[3:])       # Niphal participle: "stationed (over)"
        elif conj == "participle active":
            alts.append(_inflect(s, "ing", obj=o))
        elif conj == "participle passive":
            alts.append(_inflect(s, "pp"))
        else:
            alts.append(s)
    body = " / ".join(alts[:1] + [re.sub(r"^will ", "", x) for x in alts[1:]])
    if finite and not lead:
        lead = "who" if definite else subj  # article on a finite verb: הַשָּׁבָה "who returned"
    elif conj == "infinitive construct":
        lead = "to" if to_inf else poss
    elif conj == "participle active" and definite:
        lead = "ones" if d.get("number") in ("p", "d") else "one"
    out = f"{lead} {body}".strip()
    if conj == "imperative":
        out += "!" + ADDRESS.get(pgn, "")
    return out


def render(token: dict, lexemes: dict, stem_glosses: dict, number_glosses: dict, participles: dict | None = None) -> str:
    """English for one token. token: built token (segs with x, m, r); lexemes: built lexeme records.
    participles: {key: {s, p}} for verbs whose participle is used as a noun (גֹּאֵל 'redeemer')."""
    participles = participles or {}
    pre = [s for s in token["segs"] if s["r"] == "pre"]
    main = next(s for s in token["segs"] if s["r"] == "main")
    sufs = [s for s in token["segs"] if s["r"] == "suf"]
    d = decode(main["m"])
    lex = lexemes[main["x"]]
    gloss = token["gl"]["gloss"] if token.get("gl") else lex["gloss"]

    words: list[str] = []          # English prefixes, in order
    question = False
    definite = False
    if main["x"] in COMBINED:
        pre = [s for s in pre if s["x"] == "H9002"]
    for s in pre:
        if s["x"] == "H9008":       # interrogative ה
            question = True
            continue
        if s["m"] == "Rd":           # preposition with the article fused in
            words += [PREFIX_EN[s["x"]], "the"]
            definite = True
            continue
        if s["x"] == "H9009":
            definite = True
        words.append(PREFIX_EN[s["x"]])

    pron = next((s for s in sufs if s["m"].startswith("Sp")), None)
    pron_d = decode(pron["m"]) if pron else None
    directional = any(s["m"] == "Sd" for s in sufs)

    pos = d["pos"]
    if token.get("gl"):              # a reviewed gloss for this one word (e.g. a participle used as a noun)
        core = " / ".join(senses(gloss))
    elif pos == "S":                   # OSHB tags some prepositions as the suffix itself (מִכֶּם): "from you (pl)"
        core = OBJ.get(_pgn(d), "")
    elif pos == "V" and d["conj"].startswith("participle") and main["x"] in participles:
        core = participles[main["x"]]["p" if d.get("number") in ("p", "d") else "s"]
        if pron_d:
            core = f"{POSS.get(_pgn(pron_d), '')} {core}"
        elif d.get("state") == "construct":
            core += " of"
    elif pos == "V":
        stem_gloss = stem_glosses.get(main["x"], {}).get(main["m"][1])
        segs = senses(stem_gloss or gloss, participle=d["conj"].startswith("participle"))
        # ל before an infinitive is the English "to" of the infinitive: say it once, from _verb.
        to_inf = d["conj"] == "infinitive construct" and bool(words) and words[-1] == "to"
        if to_inf:
            words = words[:-1]
        if d["conj"] == "infinitive construct" and words and words[-1] == "like":
            words[-1] = "as"
        if definite and words and words[-1] == "the" and d["conj"] in ("wayyiqtol", "perfect (qatal)", "imperfect (yiqtol)"):
            words = words[:-1]       # "who returned", from _verb
        core = _verb(d, segs, to_inf, pron_d, definite, main["x"])
    else:
        number = d.get("number", "")
        by_number = number_glosses.get(main["x"])
        if by_number:
            alts = [by_number["p" if number in ("p", "d") else "s"]]
        else:
            alts = senses(gloss)
            if pos == "P" and d.get("type") == "personal pronoun":
                alts = [SUBJ.get(_pgn(d), alts[0] if alts else "")]
            elif pos == "N" and number in ("p", "d") and (not lex.get("name") or d.get("type") == "gentilic noun"):
                alts = [pluralize(a) for a in alts]
        if main["x"] == "H853":     # the object marker: no English word, only its suffix
            alts = [OBJ.get(_pgn(pron_d), "") if pron_d else "(object marker)"]
            pron_d = None
        core = " / ".join(alts)
        if pron_d:
            if pos in ("N", "A"):
                core = f"{POSS.get(_pgn(pron_d), '')} {core}"
            else:
                core = f"{core} {OBJ.get(_pgn(pron_d), '')}"
        if d.get("state") == "construct" and pos in ("N", "A") and not pron_d:
            core += " of"
        if directional:
            core = f"to {core}"
    if main["x"] == "H3117" and words[-1:] == ["the"] and d.get("number") == "s":
        words, core = words[:-1], "today"   # הַיּוֹם, a fixed phrase (BDB p. 400)
    if words and core.split(" ")[0] == words[-1]:
        words = words[:-1]           # "in" + "in which"
    out = " ".join(w for w in words + [core] if w)
    out = re.sub(r"\bthe (my|our|your|his|her|their|this|these)\b", r"\1", out)
    out = re.sub(r"\s+", " ", out).strip()
    return out + ("?" if question else "")
