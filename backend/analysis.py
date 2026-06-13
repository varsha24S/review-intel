"""
Layer 2: ABSA, Multilingual Sentiment, Emotions
Layer 3: Trends, Anomalies, Root Cause, Personas
"""
import re, os, json
from typing import List, Dict, Optional
from collections import defaultdict, Counter
import numpy as np
import pandas as pd

# ── Feature taxonomy ────────────────────────────────────────────────────────
FEATURE_KEYWORDS = {
    "battery":          ["battery", "charge", "charging", "battery life", "power", "drain"],
    "packaging":        ["packaging", "package", "box", "packing", "wrapped", "seal", "damaged box"],
    "delivery":         ["delivery", "shipping", "arrived", "dispatch", "courier", "late", "fast delivery"],
    "screen":           ["screen", "display", "resolution", "brightness", "touch", "scratched"],
    "camera":           ["camera", "photo", "picture", "lens", "zoom", "selfie"],
    "sound":            ["sound", "audio", "speaker", "volume", "bass", "earphone"],
    "build_quality":    ["build", "material", "plastic", "metal", "sturdy", "flimsy", "quality"],
    "customer_service": ["service", "support", "refund", "return", "response", "helpful", "rude"],
    "value_for_money":  ["price", "value", "worth", "expensive", "cheap", "affordable", "overpriced"],
    "taste":            ["taste", "flavor", "smell", "aroma", "fresh", "stale", "yummy"],
    "size_fit":         ["size", "fit", "small", "large", "tight", "loose"],
    "performance":      ["performance", "speed", "lag", "fast", "slow", "efficient", "processor"],
    "software":         ["app", "software", "update", "bug", "crash", "interface", "ui"],
    "instructions":     ["instructions", "manual", "guide", "setup", "install"],
}

POS_WORDS = {
    "great", "good", "excellent", "perfect", "amazing", "awesome", "love",
    "best", "nice", "wonderful", "fantastic", "superb", "happy", "satisfied",
    "fast", "quick", "smooth", "clear", "bright", "sturdy", "fresh", "tasty",
    "reliable", "durable", "convenient", "affordable", "worth", "recommend",
}
NEG_WORDS = {
    "bad", "terrible", "worst", "horrible", "poor", "broken", "damaged",
    "slow", "laggy", "expensive", "overpriced", "waste", "disappointed",
    "defective", "useless", "fake", "cheap", "flimsy", "stale", "bitter",
    "rude", "unhelpful", "delayed", "late", "missing", "scratched", "crack",
    "kharab", "bura", "galat",  # Hinglish
}

EMOTION_WORDS = {
    "joy":       ["happy", "love", "excited", "delighted", "thrilled", "great"],
    "anger":     ["angry", "furious", "outraged", "disgusted", "hate", "terrible"],
    "sadness":   ["sad", "disappointed", "unhappy", "depressed", "regret"],
    "fear":      ["worried", "concerned", "scared", "anxious", "nervous"],
    "surprise":  ["surprised", "shocked", "unexpected", "wow", "amazing"],
    "disgust":   ["disgusting", "awful", "horrible", "gross", "terrible"],
}

# ── Sentiment helpers ───────────────────────────────────────────────────────
def simple_sentiment(text: str) -> Dict:
    words = set(re.findall(r"\b\w+\b", text.lower()))
    pos = len(words & POS_WORDS)
    neg = len(words & NEG_WORDS)
    negated = bool(re.search(r"\b(not|no|never|dont|cannot|isnt|wasnt)\b", text.lower()))
    if negated:
        pos, neg = neg, pos  # Flip
    total = pos + neg or 1
    score = (pos - neg) / total
    label = "positive" if score > 0.1 else ("negative" if score < -0.1 else "neutral")
    confidence = min(abs(score) + 0.3, 1.0)
    return {"label": label, "score": round(score, 3), "confidence": round(confidence, 3)}

def detect_emotion(text: str) -> str:
    tl = text.lower()
    scores = {}
    for emotion, words in EMOTION_WORDS.items():
        scores[emotion] = sum(1 for w in words if w in tl)
    top = max(scores, key=scores.get)
    return top if scores[top] > 0 else "neutral"

def detect_language(text: str) -> str:
    hinglish_words = {"hai", "tha", "kharab", "bahut", "nahi", "accha", "theek", "bilkul"}
    words = set(re.findall(r"\b\w+\b", text.lower()))
    if len(words & hinglish_words) >= 2:
        return "hi-en"  # Hinglish
    # Very rough Hindi detection
    hindi_chars = re.findall(r"[\u0900-\u097F]", text)
    if len(hindi_chars) > 5:
        return "hi"
    return "en"

def impact_score(neg_pct: float, volume: int, confidence: float, total: int) -> float:
    if total == 0:
        return 0.0
    return round((neg_pct * volume * confidence) / total, 4)

# ── ABSA ────────────────────────────────────────────────────────────────────
def run_absa(reviews: List[Dict]) -> List[Dict]:
    """
    Rule-based ABSA with confidence scores.
    In production: swap inner loop with HuggingFace yangheng/deberta-absa pipeline.
    """
    total = len(reviews)
    results = []
    for r in reviews:
        if r.get("is_spam") or r.get("is_duplicate"):
            continue
        text = r.get("text", "")
        lang = detect_language(text)
        overall_sent = simple_sentiment(text)
        emotion = detect_emotion(text)

        # Extract aspect sentiments
        aspects = {}
        tl = text.lower()
        for feat, kws in FEATURE_KEYWORDS.items():
            matched_kws = [kw for kw in kws if kw in tl]
            if matched_kws:
                # Get context window around matched keyword
                kw = matched_kws[0]
                idx = tl.find(kw)
                window = tl[max(0, idx-40):idx+60]
                sent = simple_sentiment(window)
                aspects[feat] = {
                    "sentiment": sent["label"],
                    "score": sent["score"],
                    "confidence": sent["confidence"],
                    "matched_keywords": matched_kws,
                }

        # SHAP-like top words
        words = re.findall(r"\b\w{4,}\b", tl)
        top_words = [w for w in words if w in POS_WORDS | NEG_WORDS][:5]

        # Rating-based validation
        rating = r.get("rating")
        try:
            rating = float(rating)
        except (TypeError, ValueError):
            rating = None

        if rating is not None:
            if rating <= 2 and overall_sent["label"] == "positive":
                r["is_sarcasm"] = True
            if rating >= 4 and overall_sent["label"] == "negative":
                overall_sent["confidence"] *= 0.7  # Lower conf if mismatch

        results.append({
            **r,
            "language": lang,
            "overall_sentiment": overall_sent,
            "emotion": emotion,
            "aspects": aspects,
            "top_signal_words": top_words,
            "impact": impact_score(
                1 if overall_sent["label"] == "negative" else 0,
                1, overall_sent["confidence"], total
            ),
        })
    return results

# ── Trend Detection (Layer 3) ───────────────────────────────────────────────
def detect_trends(analyzed: List[Dict]) -> List[Dict]:
    if not analyzed:
        return []

    df = pd.DataFrame(analyzed)
    trends = []

    # For each feature, compare first half vs second half sentiment
    for feat in FEATURE_KEYWORDS:
        feat_reviews = [r for r in analyzed if feat in r.get("aspects", {})]
        if len(feat_reviews) < 10:
            continue
        mid = len(feat_reviews) // 2
        first_half = feat_reviews[:mid]
        second_half = feat_reviews[mid:]

        def pos_rate(lst):
            return sum(1 for r in lst if r["aspects"].get(feat, {}).get("sentiment") == "positive") / max(len(lst), 1)

        prev_rate = pos_rate(first_half)
        curr_rate = pos_rate(second_half)
        change = curr_rate - prev_rate
        change_pct = round(change * 100, 1)

        if abs(change_pct) >= 5:
            categories = [r.get("category", "general") for r in feat_reviews]
            cat = Counter(categories).most_common(1)[0][0]
            trends.append({
                "feature": feat,
                "category": cat,
                "change_pct": change_pct,
                "direction": "up" if change > 0 else "down",
                "current_rate": round(curr_rate, 3),
                "previous_rate": round(prev_rate, 3),
                "volume": len(feat_reviews),
                "alert": abs(change_pct) >= 15,
                "description": f"{feat} sentiment {abs(change_pct):.0f}% {'↑' if change > 0 else '↓'} ({cat})",
            })

    return sorted(trends, key=lambda x: abs(x["change_pct"]), reverse=True)

def get_anomalies(analyzed: List[Dict]) -> List[Dict]:
    anomalies = []
    # Detect sudden spikes in negative sentiment
    feature_neg = defaultdict(list)
    for r in analyzed:
        for feat, asp in r.get("aspects", {}).items():
            feature_neg[feat].append(1 if asp["sentiment"] == "negative" else 0)

    for feat, vals in feature_neg.items():
        if len(vals) < 20:
            continue
        arr = np.array(vals)
        mean, std = arr.mean(), arr.std()
        # Check last 10 reviews
        last10_mean = arr[-10:].mean()
        if last10_mean > mean + 2 * std:
            anomalies.append({
                "feature": feat,
                "type": "spike",
                "severity": "high" if last10_mean > mean + 3 * std else "medium",
                "description": f"Unusual spike in {feat} complaints (recent avg: {last10_mean:.0%} vs baseline {mean:.0%})",
                "is_systemic": len(vals) > 50,
            })
        elif last10_mean < mean - 2 * std:
            anomalies.append({
                "feature": feat,
                "type": "recovery",
                "severity": "low",
                "description": f"{feat} complaints dropped sharply — possible fix took effect",
                "is_systemic": False,
            })
    return anomalies

# ── Root Cause Analysis ─────────────────────────────────────────────────────
def run_root_cause(analyzed: List[Dict]) -> List[Dict]:
    """Cluster similar negative reviews by keyword similarity."""
    neg_reviews = [r for r in analyzed if r.get("overall_sentiment", {}).get("label") == "negative"]
    if not neg_reviews:
        return []

    clusters = defaultdict(list)
    for r in neg_reviews[:500]:
        words = frozenset(re.findall(r"\b\w{5,}\b", r.get("text", "").lower()))
        sig_words = tuple(sorted(words & (POS_WORDS | NEG_WORDS)))[:3]
        clusters[sig_words].append(r.get("text", "")[:100])

    results = []
    for sig, texts in sorted(clusters.items(), key=lambda x: -len(x[1])):
        if len(texts) >= 2:
            results.append({
                "cluster_keywords": list(sig),
                "count": len(texts),
                "sample_reviews": texts[:3],
                "possible_cause": f"Recurring issue around: {', '.join(sig) or 'general dissatisfaction'}",
            })
    return results[:10]

# ── Customer Personas ───────────────────────────────────────────────────────
def get_customer_personas(analyzed: List[Dict]) -> List[Dict]:
    personas = []

    # Budget buyers: mention price/value + negative
    budget = [r for r in analyzed if "value_for_money" in r.get("aspects", {}) and r.get("overall_sentiment", {}).get("label") == "negative"]
    if budget:
        personas.append({
            "name": "Budget Buyer",
            "count": len(budget),
            "top_concerns": ["value_for_money", "price"],
            "sentiment_mix": {"negative": 0.7, "positive": 0.2, "neutral": 0.1},
            "description": "Price-sensitive customers disappointed by cost-quality ratio",
        })

    # Power users: mention performance/battery
    power = [r for r in analyzed if any(f in r.get("aspects", {}) for f in ["battery", "performance", "software"])]
    if power:
        pos_cnt = sum(1 for r in power if r.get("overall_sentiment", {}).get("label") == "positive")
        personas.append({
            "name": "Power User",
            "count": len(power),
            "top_concerns": ["battery", "performance"],
            "sentiment_mix": {"positive": pos_cnt / max(len(power), 1), "negative": 1 - pos_cnt / max(len(power), 1)},
            "description": "Tech-savvy users focused on performance metrics",
        })

    # Eco buyers: packaging mentions
    eco = [r for r in analyzed if "packaging" in r.get("aspects", {})]
    if eco:
        personas.append({
            "name": "Eco-Conscious",
            "count": len(eco),
            "top_concerns": ["packaging", "delivery"],
            "sentiment_mix": {"positive": 0.4, "negative": 0.5, "neutral": 0.1},
            "description": "Customers concerned about packaging quality and sustainability",
        })

    return personas
