"""
OpenRouter API Proxy — Recommendations, Summaries, Voice
"""
import os, json, base64
import requests

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE = "https://openrouter.ai/api/v1"
MODEL = "anthropic/claude-3.5-sonnet"

HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "HTTP-Referer": "https://review-intel.vercel.app",
    "X-Title": "Customer Review Intelligence Platform",
    "Content-Type": "application/json",
}

def _chat(messages: list, max_tokens: int = 600) -> str:
    if not OPENROUTER_API_KEY:
        return "[OpenRouter API key not set — add OPENROUTER_API_KEY to .env]"
    try:
        resp = requests.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers=HEADERS,
            json={"model": MODEL, "messages": messages, "max_tokens": max_tokens},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[OpenRouter error: {e}]"

def get_recommendations(insights_json: str) -> str:
    prompt = f"""You are a product strategy AI. Based on these customer review insights:

{insights_json}

Provide exactly 3 actionable recommendations in this format:
1. [ACTION] — [Why] — [Expected Impact]
2. [ACTION] — [Why] — [Expected Impact]  
3. [ACTION] — [Why] — [Expected Impact]

Focus on: marketing messaging, product improvement, supply chain fixes.
Be concise and data-driven."""
    return _chat([{"role": "user", "content": prompt}], max_tokens=500)

def summarize_reviews(reviews: list) -> str:
    sample_texts = [r.get("text", "")[:150] for r in reviews[:30]]
    combined = "\n".join(f"- {t}" for t in sample_texts)
    prompt = f"""Summarize these customer reviews into a 3-sentence executive summary. 
Highlight: #1 praised aspect, #1 criticized aspect, overall sentiment trend.

Reviews:
{combined}"""
    return _chat([{"role": "user", "content": prompt}], max_tokens=200)

def transcribe_voice(audio_b64: str) -> str:
    """Transcribe base64 audio via OpenRouter Whisper."""
    if not audio_b64:
        return ""
    # OpenRouter supports whisper via audio models
    try:
        resp = requests.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers=HEADERS,
            json={
                "model": "openai/whisper-large-v3",
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Transcribe this audio review accurately."},
                        {"type": "image_url", "image_url": {"url": f"data:audio/webm;base64,{audio_b64}"}},
                    ]
                }],
                "max_tokens": 300,
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[Transcription error: {e}]"
