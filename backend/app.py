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
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route("/api/health", methods=["GET","OPTIONS"])
def health():
    return jsonify({"status": "ok", "timestamp": time.time()})

@app.route("/api/analyze/sync", methods=["POST","OPTIONS"])
def analyze_sync():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        if "file" in request.files:
            f = request.files["file"]
            path = os.path.join(UPLOAD_FOLDER, f.filename or "upload.csv")
            f.save(path)
            raw = ingest_reviews(path)
        elif request.is_json:
            raw = request.get_json().get("reviews", [])
        else:
            return jsonify({"error": "No data"}), 400

        cleaned    = clean_reviews(raw)
        deduped    = dedup_cluster(cleaned)
        flagged    = flag_spam_sarcasm(deduped)
        absa       = run_absa(flagged)
        trends     = detect_trends(absa)
        anomalies  = get_anomalies(absa)
        personas   = get_customer_personas(absa)
        root_causes= run_root_cause(absa)
        insights   = json.dumps({"trends": trends[:3], "top_issues": absa[:5]}, default=str)
        recs       = get_recommendations(insights)
        summary    = summarize_reviews(absa[:50])

        return jsonify({
            "total_reviews":   len(raw),
            "cleaned_reviews": len(deduped),
            "spam_flagged":    sum(1 for r in flagged if r.get("is_spam")),
            "sarcasm_flagged": sum(1 for r in flagged if r.get("is_sarcasm")),
            "absa":            absa[:200],
            "trends":          trends,
            "anomalies":       anomalies,
            "personas":        personas,
            "root_causes":     root_causes,
            "recommendations": recs,
            "summary":         summary,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/load-demo", methods=["GET"])
def load_demo():
    try:
        csv_path = "data/amazon_reviews_demo.csv"
        if not os.path.exists(csv_path):
            from data.generate_seed import generate_seed_data
            generate_seed_data()
        df = pd.read_csv(csv_path)
        return jsonify({"reviews": df.to_dict(orient="records"), "count": len(df)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/trends", methods=["GET"])
def trends_endpoint():
    return jsonify([
        {"feature":"packaging","category":"beauty","change_pct":38,"direction":"up","current_rate":0.46,"previous_rate":0.08,"volume":50,"alert":True,"description":"packaging 38% ↑ (beauty)"},
        {"feature":"battery","category":"electronics","change_pct":-15,"direction":"down","current_rate":0.31,"previous_rate":0.46,"volume":120,"alert":True,"description":"battery 15% ↓ (electronics)"},
    ])

@app.route("/api/insights", methods=["GET"])
def insights():
    return jsonify({"impact_scores":{"battery":0.82,"delivery_time":0.71,"packaging":0.65}})

@app.route("/api/voice", methods=["POST","OPTIONS"])
def voice():
    if request.method == "OPTIONS":
        return jsonify({}), 200
    try:
        audio_b64 = request.get_json().get("audio_b64", "")
        return jsonify({"transcript": transcribe_voice(audio_b64)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port,
                 debug=os.environ.get("FLASK_DEBUG","false").lower()=="true",
                 allow_unsafe_werkzeug=True)
