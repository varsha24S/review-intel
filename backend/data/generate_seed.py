"""
Generate synthetic Amazon-style review dataset with seeded packaging trend.
Run: python generate_seed.py
"""
import pandas as pd
import numpy as np
import random
import os
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

CATEGORIES = ["electronics", "beauty", "grocery"]

TEMPLATES = {
    "electronics": {
        "positive": [
            "This phone has an incredible {feat} — really impressed by the quality.",
            "The {feat} is outstanding. Works perfectly after {days} days of use.",
            "Battery life is amazing! {feat} exceeded my expectations. Would buy again.",
            "Fast delivery, excellent {feat}. Great value for money.",
            "The {feat} is phenomenal. Best purchase I've made this year.",
            "Bahut accha {feat} hai, very satisfied with this product!",
            "Screen quality is superb. {feat} works like a charm.",
            "Performance is blazing fast. {feat} no issues at all.",
        ],
        "negative": [
            "The {feat} stopped working after just {days} days. Very disappointed.",
            "Battery drains too fast. {feat} is terrible for the price.",
            "Received a damaged unit. {feat} was cracked right out of the box.",
            "Customer service refused my refund. {feat} is clearly defective.",
            "Slow performance, laggy interface. {feat} is a waste of money.",
            "{feat} kharab ho gaya — totally broken. Worst product ever.",
            "Overpriced for what you get. {feat} broke within a week.",
            "Don't buy this! {feat} failed immediately. Complete waste.",
        ],
        "neutral": [
            "The {feat} is okay, nothing special. Gets the job done.",
            "Average product. {feat} works but has some quirks.",
            "Decent {feat} for the price. Not the best but acceptable.",
        ],
    },
    "beauty": {
        "positive": [
            "Love this! The {feat} is so gentle on my skin.",
            "Amazing {feat} — noticeable results in just {days} days.",
            "The {feat} smells wonderful and lasts all day.",
            "Perfect consistency. {feat} applies smoothly.",
            "Best {feat} I've tried. Highly recommend!",
            "Great value. {feat} worth every penny.",
        ],
        "negative": [
            "The {feat} caused a reaction. Terrible ingredients.",
            "Arrived damaged — {feat} was leaking all over.",
            "The {feat} has a horrible smell. Unusable.",
            "No results even after {days} days. Complete scam.",
            "Packaging was terrible — {feat} was crushed.",
        ],
        "neutral": [
            "The {feat} is decent. Nothing extraordinary.",
            "Okay product. {feat} works as described.",
        ],
    },
    "grocery": {
        "positive": [
            "Delicious! The {feat} is incredibly fresh.",
            "Great taste and {feat} is top quality.",
            "Fresh and tasty. {feat} exceeded expectations.",
            "Fast delivery. {feat} arrived in perfect condition.",
        ],
        "negative": [
            "Stale product! {feat} was clearly expired.",
            "Terrible taste. {feat} smelled off on arrival.",
            "Wrong item sent. {feat} was completely different from listed.",
            "Late delivery, {feat} was damaged.",
        ],
        "neutral": ["Okay taste. {feat} is average quality.",
                    "Nothing special. {feat} is just okay."],
    },
}

FEATURES = {
    "electronics": ["battery life", "display quality", "camera", "build quality",
                     "performance", "charging speed", "software"],
    "beauty": ["moisturizer", "serum", "packaging", "fragrance", "texture", "results"],
    "grocery": ["taste", "freshness", "packaging", "value for money", "quality"],
}

RATINGS = {"positive": [4, 5], "negative": [1, 2], "neutral": [3]}

def make_review(category: str, sentiment: str, date: datetime, seed_packaging: bool = False) -> dict:
    feats = FEATURES[category]
    feat = "packaging" if seed_packaging else random.choice(feats)
    tmpl = random.choice(TEMPLATES[category][sentiment])
    text = tmpl.format(feat=feat, days=random.randint(3, 30))
    rating = random.choice(RATINGS[sentiment])

    # Add noise
    if random.random() < 0.05:
        text = text.upper()
    if random.random() < 0.08:
        text += " " + random.choice(["👍", "😊", "😡", "💔", "⭐"])
    if random.random() < 0.03:
        text = text.replace("e", "3").replace("a", "@")

    return {
        "text": text,
        "rating": rating,
        "category": category,
        "date": date.strftime("%Y-%m-%d"),
        "product_id": f"{category[:3].upper()}-{random.randint(1000,9999)}",
        "verified_purchase": random.random() > 0.1,
    }

def generate_seed_data(n: int = 600):
    os.makedirs("data", exist_ok=True)
    reviews = []
    base_date = datetime(2026, 1, 1)

    # 550 regular reviews spread across categories
    for i in range(550):
        cat = random.choice(CATEGORIES)
        sent = random.choices(
            ["positive", "negative", "neutral"],
            weights=[0.5, 0.35, 0.15]
        )[0]
        date = base_date + timedelta(days=random.randint(0, 95))
        reviews.append(make_review(cat, sent, date))

    # Seed: last 50 beauty reviews show packaging trend (mostly negative early, improving)
    for i in range(50):
        date = base_date + timedelta(days=96 + i)
        # Growing positive packaging sentiment in beauty (the trend to detect)
        sent = "positive" if i >= 25 else "negative"
        reviews.append(make_review("beauty", sent, date, seed_packaging=True))

    # Add 20 spam reviews
    spams = [
        "Buy now! Click here for discount code: SAVE50",
        "Visit our website for best deals on all products",
        "Great product!!",
        "Bad.",
        "Good product good product good product",
    ]
    for i in range(20):
        reviews.append({
            "text": random.choice(spams),
            "rating": random.randint(1, 5),
            "category": random.choice(CATEGORIES),
            "date": (base_date + timedelta(days=random.randint(0, 146))).strftime("%Y-%m-%d"),
            "product_id": "SPAM-0000",
            "verified_purchase": False,
        })

    # Add 5 duplicate reviews
    base_dup = reviews[0].copy()
    for _ in range(5):
        reviews.append(base_dup.copy())

    df = pd.DataFrame(reviews)
    df = df.sample(frac=1).reset_index(drop=True)  # Shuffle
    df.to_csv("data/amazon_reviews_demo.csv", index=False)
    print(f"✅ Generated {len(df)} reviews → data/amazon_reviews_demo.csv")
    return df

if __name__ == "__main__":
    generate_seed_data()
