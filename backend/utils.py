"""
Layer 1: Ingest, Clean, Dedup, Spam/Sarcasm/Bot Detection
"""
import re, csv, json, os, hashlib
import pandas as pd
import numpy as np
from typing import List, Dict

# ── Ingest ─────────────────────────────────────────────────────────────────
def ingest_reviews(path: str) -> List[Dict]:
    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".csv":
            df = pd.read_csv(path, encoding="utf-8", on_bad_lines="skip")
            # Normalize column names
            col_map = {}
            for c in df.columns:
                lc = c.lower().strip()
                if any(k in lc for k in ["review", "text", "body", "comment"]):
                    col_map[c] = "text"
                elif any(k in lc for k in ["rating", "star", "score"]):
                    col_map[c] = "rating"
                elif any(k in lc for k in ["product", "item", "name", "title"]):
                    col_map[c] = "product"
                elif any(k in lc for k in ["date", "time", "created"]):
                    col_map[c] = "date"
                elif any(k in lc for k in ["category", "cat", "dept"]):
                    col_map[c] = "category"
            df = df.rename(columns=col_map)
            if "text" not in df.columns:
                raise ValueError("No review text column found in CSV")
            reviews = df.to_dict(orient="records")
        elif ext == ".json":
            with open(path) as f:
                data = json.load(f)
            reviews = data if isinstance(data, list) else data.get("reviews", [data])
        elif ext == ".txt":
            with open(path) as f:
                lines = [l.strip() for l in f if l.strip()]
            reviews = [{"text": l, "rating": None} for l in lines]
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    except Exception as e:
        raise RuntimeError(f"Ingest error: {e}")

    # Ensure all have 'text'
    out = []
    for r in reviews:
        txt = str(r.get("text", r.get("review_text", r.get("body", "")))).strip()
        if txt and txt.lower() not in ("nan", "none", ""):
            r["text"] = txt
            if "rating" not in r:
                r["rating"] = None
            if "category" not in r:
                r["category"] = "general"
            out.append(r)
    return out

# ── Clean / Normalize ──────────────────────────────────────────────────────
EMOJI_RE = re.compile(
    "["u"\U0001F600-\U0001F64F"u"\U0001F300-\U0001F5FF"
    u"\U0001F680-\U0001F9FF"u"\U00002702-\U000027B0""]+", flags=re.UNICODE)

HINGLISH_MAP = {
    "kharab": "bad/broken", "accha": "good", "bura": "bad",
    "bahut": "very", "nahi": "not", "hai": "is", "tha": "was",
    "bilkul": "completely", "theek": "okay", "kam": "less",
    "zyada": "more", "sahi": "correct", "galat": "wrong",
}

def normalize_hinglish(text: str) -> str:
    for hin, eng in HINGLISH_MAP.items():
        text = re.sub(rf"\b{hin}\b", f"{hin}({eng})", text, flags=re.IGNORECASE)
    return text

def clean_text(text: str) -> str:
    # Expand contractions lightly
    contractions = {"cant": "cannot", "wont": "will not", "dont": "do not",
                    "didnt": "did not", "isnt": "is not", "wasnt": "was not"}
    t = str(text)
    # Remove URLs
    t = re.sub(r"https?://\S+|www\.\S+", "", t)
    # Normalize whitespace/newlines
    t = re.sub(r"\s+", " ", t).strip()
    # Handle emojis → text label
    t = EMOJI_RE.sub(" [emoji] ", t)
    # Fix repeated chars (sooo → so)
    t = re.sub(r"(.)\1{3,}", r"\1\1", t)
    # Hinglish normalization
    t = normalize_hinglish(t)
    # Expand basic contractions
    for k, v in contractions.items():
        t = re.sub(rf"\b{k}\b", v, t, flags=re.IGNORECASE)
    return t.strip()

def clean_reviews(reviews: List[Dict]) -> List[Dict]:
    out = []
    for r in reviews:
        r = dict(r)
        r["original_text"] = r.get("text", "")
        r["text"] = clean_text(r.get("text", ""))
        r["word_count"] = len(r["text"].split())
        if r["word_count"] >= 3:  # Drop ultra-short noise
            out.append(r)
    return out

# ── Dedup Clustering ───────────────────────────────────────────────────────
def text_hash(text: str) -> str:
    return hashlib.md5(re.sub(r"\W", "", text.lower()).encode()).hexdigest()

def jaccard_sim(a: str, b: str) -> float:
    sa, sb = set(a.lower().split()), set(b.lower().split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)

def dedup_cluster(reviews: List[Dict], threshold: float = 0.85) -> List[Dict]:
    seen_hashes = {}
    out = []
    for r in reviews:
        h = text_hash(r["text"])
        if h in seen_hashes:
            r["duplicate_of"] = seen_hashes[h]
            r["is_duplicate"] = True
            continue
        # Near-dup check (only last 200 for speed)
        is_near_dup = False
        for prev in out[-200:]:
            if jaccard_sim(r["text"], prev["text"]) >= threshold:
                r["duplicate_of"] = text_hash(prev["text"])
                r["is_duplicate"] = True
                is_near_dup = True
                break
        if not is_near_dup:
            seen_hashes[h] = h
            r["is_duplicate"] = False
            r["cluster_id"] = h[:8]
            out.append(r)
    return out

# ── Spam / Bot / Sarcasm Detection ─────────────────────────────────────────
SPAM_PATTERNS = [
    r"buy now", r"click here", r"visit.*website", r"http", r"discount code",
    r"free.*shipping", r"promo", r"sponsored", r"\$\d+", r"whatsapp",
]
BOT_PATTERNS = [
    r"^(great|good|nice|excellent|perfect|awesome|amazing)\s*product\s*[.!]*$",
    r"^(bad|worst|terrible|horrible)\s*product\s*[.!]*$",
    r"highly recommend",
]

def is_spam(text: str) -> bool:
    tl = text.lower()
    return any(re.search(p, tl) for p in SPAM_PATTERNS)

def is_bot(text: str) -> bool:
    tl = text.lower().strip()
    return (
        len(tl.split()) < 4
        or any(re.fullmatch(p, tl) for p in BOT_PATTERNS)
        or re.match(r"^(.{3,20})\1{3,}", tl)  # Repetitive
    )

def detect_sarcasm(text: str) -> float:
    """Rule-based sarcasm score 0-1."""
    score = 0.0
    tl = text.lower()
    # High rating + negative words
    if re.search(r"\b(love|great|amazing)\b", tl) and re.search(r"\b(broken|waste|awful|terrible)\b", tl):
        score += 0.5
    # Oh sure / yeah right patterns
    if re.search(r"\b(oh sure|yeah right|as if|totally|brilliant idea)\b", tl):
        score += 0.4
    # Excessive punctuation
    if len(re.findall(r"[!?]{2,}", text)) >= 2:
        score += 0.2
    return min(score, 1.0)

def flag_spam_sarcasm(reviews: List[Dict]) -> List[Dict]:
    for r in reviews:
        t = r.get("text", "")
        r["is_spam"] = is_spam(t)
        r["is_bot"] = is_bot(t)
        r["sarcasm_score"] = detect_sarcasm(t)
        r["is_sarcasm"] = r["sarcasm_score"] > 0.4
        r["quality_score"] = (
            1.0
            - (0.4 if r["is_spam"] else 0)
            - (0.3 if r["is_bot"] else 0)
            - (0.2 if r["is_sarcasm"] else 0)
        )
    return reviews
