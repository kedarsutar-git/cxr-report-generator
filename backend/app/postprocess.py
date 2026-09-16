import re

FINDING_HDR = re.compile(r"\bfindings?\b\s*[:\-]?", re.I)
IMPRESSION_HDR = re.compile(r"\bimpressions?\b\s*[:\-]?", re.I)

# Tokens the model should never emit (IU X-Ray anonymisation + artifacts)
JUNK = re.compile(r"\bX{2,}\b|\bXXXX\b|\bXXX\b", re.I)
MULTI_SPACE = re.compile(r"\s+")
LEADING_PUNCT = re.compile(r"^[\s\.\-:;,_]+")
TRAILING_PUNCT = re.compile(r"[\s\.\-:;,_]+$")


def _clean(text: str) -> str:
    """Remove anonymisation tokens and clean whitespace."""
    text = JUNK.sub("", text)
    text = MULTI_SPACE.sub(" ", text)
    text = LEADING_PUNCT.sub("", text)
    text = TRAILING_PUNCT.sub("", text)
    return text.strip()


def _dedupe_sentences(text: str) -> str:
    """Remove repeated sentences in a report (beam search looping)."""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    seen = set()
    out = []
    for s in sentences:
        key = s.lower().strip(" .!?-")
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(s)
    return " ".join(out)


def _truncate_impression(text: str, max_sentences: int = 3) -> str:
    """Keep only the first N sentences of an impression."""
    sents = re.split(r"(?<=[.!?])\s+", text.strip())
    clean = []
    for s in sents:
        s_strip = s.strip()
        if re.match(r"^\d+\.", s_strip):
            continue
        if s_strip.lower().startswith("impression"):
            continue
        clean.append(s_strip)
        if len(clean) >= max_sentences:
            break
    return " ".join(clean) if clean else text


def split_report(text: str) -> tuple[str, str]:
    text = text.replace("<|endoftext|>", "").strip()
    text = re.sub(r"\s+", " ", text)

    imp_match = IMPRESSION_HDR.search(text)
    if imp_match:
        findings = text[: imp_match.start()].strip(" .:-")
        impression = text[imp_match.end():].strip(" .:-")
    else:
        sents = re.split(r"(?<=[.!?])\s+", text)
        findings = " ".join(sents[:2])
        impression = " ".join(sents[2:]) or findings

    findings = FINDING_HDR.sub("", findings).strip(" .:-")
    findings = _dedupe_sentences(_clean(findings))
    impression = _dedupe_sentences(_clean(impression))
    impression = _truncate_impression(impression, max_sentences=3)

    return findings or "No findings.", impression or "No impression."