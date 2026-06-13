"""
Customer Review Intelligence Platform - Flask Backend
"""
import os, json, time, threading
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

from utils import ingest_reviews, clean_reviews, dedup_cluster, flag_spam_sarcasm
from analysis import run_absa, detect_trends, get_anomalies, get_customer_personas, run_root_cause
from openrouter_proxy import get_recommendations, summarize_reviews, transcribe_voice

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

UPLOAD_FOLDER = "uploads"
RESULTS_CACHE = {}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── Health ────────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": time.time()})

# ─── Analyze uploaded file ─────────────────────────────────────────────────
@app.route("/api/analyze", methods=["POST"])
def analyze():
    try:
        if "file" in request.files:
            f = request.files["file"]
            path = os.path.join(UPLOAD_FOLDER, f.filename)
            f.save(path)
            raw = ingest_reviews(path)
        elif request.is_json:
            raw = request.get_json().get("reviews", [])
        else:
            return jsonify({"error": "No data provided"}), 400

        # Emit progress via WebSocket
        def run_pipeline():
            socketio.emit("progress", {"step": "Cleaning & deduplication…", "pct": 10})
            cleaned = clean_reviews(raw)
            deduped = dedup_cluster(cleaned)

            socketio.emit("progress", {"step": "Spam & sarcasm detection…", "pct": 25})
            flagged = flag_spam_sarcasm(deduped)

            socketio.emit("progress", {"step": "ABSA sentiment analysis…", "pct": 50})
            absa = run_absa(flagged)

            socketio.emit("progress", {"step": "Trend & anomaly detection…", "pct": 75})
            trends = detect_trends(absa)
            anomalies = get_anomalies(absa)
            personas = get_customer_personas(absa)
            root_causes = run_root_cause(absa)

            socketio.emit("progress", {"step": "Generating AI recommendations…", "pct": 90})
            insights_text = json.dumps({"trends": trends[:3], "top_issues": absa[:5]}, default=str)
            recommendations = get_recommendations(insights_text)
            summary = summarize_reviews(absa[:50])

            result = {
                "total_reviews": len(raw),
                "cleaned_reviews": len(deduped),
                "spam_flagged": sum(1 for r in flagged if r.get("is_spam")),
                "sarcasm_flagged": sum(1 for r in flagged if r.get("is_sarcasm")),
                "absa": absa[:200],
                "trends": trends,
                "anomalies": anomalies,
                "personas": personas,
                "root_causes": root_causes,
                "recommendations": recommendations,
                "summary": summary,
            }
            cache_key = str(int(time.time()))
            RESULTS_CACHE[cache_key] = result
            socketio.emit("done", {"key": cache_key, "result": result})

        t = threading.Thread(target=run_pipeline)
        t.start()
        return jsonify({"status": "processing", "message": "Analysis started. Listen on WebSocket."})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── Synchronous analyze (fallback, no WS) ─────────────────────────────────
@app.route("/api/analyze/sync", methods=["POST"])
def analyze_sync():
    try:
        if "file" in request.files:
            f = request.files["file"]
            path = os.path.join(UPLOAD_FOLDER, f.filename)
            f.save(path)
            raw = ingest_reviews(path)
        elif request.is_json:
            raw = request.get_json().get("reviews", [])
        else:
            return jsonify({"error": "No data"}), 400

        cleaned = clean_reviews(raw)
        deduped = dedup_cluster(cleaned)
        flagged = flag_spam_sarcasm(deduped)
        absa = run_absa(flagged)
        trends = detect_trends(absa)
        anomalies = get_anomalies(absa)
        personas = get_customer_personas(absa)
        root_causes = run_root_cause(absa)
        insights_text = json.dumps({"trends": trends[:3], "top_issues": absa[:5]}, default=str)
        recommendations = get_recommendations(insights_text)
        summary = summarize_reviews(absa[:50])

        return jsonify({
            "total_reviews": len(raw),
            "cleaned_reviews": len(deduped),
            "spam_flagged": sum(1 for r in flagged if r.get("is_spam")),
            "sarcasm_flagged": sum(1 for r in flagged if r.get("is_sarcasm")),
            "absa": absa[:200],
            "trends": trends,
            "anomalies": anomalies,
            "personas": personas,
            "root_causes": root_causes,
            "recommendations": recommendations,
            "summary": summary,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── Trends endpoint ────────────────────────────────────────────────────────
@app.route("/api/trends", methods=["GET"])
def trends_endpoint():
    # Return demo trends if no analysis done yet
    demo = [
        {"feature": "packaging", "category": "beauty", "change_pct": 38, "direction": "up",
         "current": 0.46, "previous": 0.08, "period": "last 50 reviews", "alert": True},
        {"feature": "battery", "category": "electronics", "change_pct": -15, "direction": "down",
         "current": 0.31, "previous": 0.46, "period": "last 30 days", "alert": True},
        {"feature": "delivery", "category": "grocery", "change_pct": 10, "direction": "up",
         "current": 0.55, "previous": 0.45, "period": "last 7 days", "alert": False},
    ]
    return jsonify(demo)

# ─── Insights endpoint ──────────────────────────────────────────────────────
@app.route("/api/insights", methods=["GET"])
def insights():
    demo_insights = {
        "top_negative_features": ["battery", "delivery_time", "packaging"],
        "top_positive_features": ["screen_quality", "value_for_money", "taste"],
        "impact_scores": {
            "battery": 0.82, "delivery_time": 0.71, "packaging": 0.65,
            "screen_quality": 0.59, "customer_service": 0.48
        },
        "competitor_comparison": {
            "our_product": {"battery": 2.8, "screen": 4.1, "value": 3.9},
            "competitor_A": {"battery": 3.5, "screen": 3.8, "value": 3.2},
            "competitor_B": {"battery": 3.1, "screen": 4.3, "value": 2.9},
        }
    }
    return jsonify(demo_insights)

# ─── Voice transcription ────────────────────────────────────────────────────
@app.route("/api/voice", methods=["POST"])
def voice():
    try:
        audio_b64 = request.get_json().get("audio_b64", "")
        transcript = transcribe_voice(audio_b64)
        return jsonify({"transcript": transcript})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── Export CSV ─────────────────────────────────────────────────────────────
@app.route("/api/export/csv", methods=["POST"])
def export_csv():
    try:
        data = request.get_json().get("data", [])
        df = pd.DataFrame(data)
        path = "/tmp/review_export.csv"
        df.to_csv(path, index=False)
        return send_file(path, as_attachment=True, download_name="review_insights.csv")
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ─── Load seed dataset ──────────────────────────────────────────────────────
@app.route("/api/load-demo", methods=["GET"])
def load_demo():
    try:
        csv_path = "data/amazon_reviews_demo.csv"
        if not os.path.exists(csv_path):
            from data.generate_seed import generate_seed_data
            generate_seed_data()
        df = pd.read_csv(csv_path)
        reviews = df.to_dict(orient="records")
        return jsonify({"reviews": reviews, "count": len(reviews)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true")
