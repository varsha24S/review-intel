# 🧠 ReviewIntel — Customer Review Intelligence Platform

> Hackathon-winning AI platform for multi-layer Amazon review analysis with ABSA, trend detection, sarcasm detection, multilingual support, and stunning glassmorphism UI.

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Python 3.10+
- Node.js 18+
- (Optional) Kaggle API key for real Amazon data

---

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure env
cp ../.env.example .env
# Edit .env → add your OPENROUTER_API_KEY

# Generate demo dataset (600 synthetic Amazon-style reviews)
python data/generate_seed.py

# Start Flask server
python app.py
# → http://localhost:5000
```

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install       # or: yarn install

# Create env file
echo "VITE_API_URL=http://localhost:5000" > .env

# Start dev server
npm run dev
# → http://localhost:3000
```

---

### 3. Add Your OpenRouter Key

Edit `backend/.env`:
```
OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE
```
Get your key at: https://openrouter.ai/keys

---

### 4. (Optional) Real Kaggle Amazon Data

```bash
pip install kaggle
# Place your kaggle.json in backend/ or ~/.kaggle/
cp backend/kaggle.json ~/.kaggle/kaggle.json

# Download Amazon product reviews dataset
kaggle datasets download -d yasserh/amazon-product-reviews-dataset -p backend/data --unzip
```

---

## 📁 Project Structure

```
review-intel/
├── backend/
│   ├── app.py                    # Flask server + WebSocket + all endpoints
│   ├── utils.py                  # Layer 1: Ingest, Clean, Dedup, Spam/Sarcasm
│   ├── analysis.py               # Layer 2 & 3: ABSA, Trends, Anomalies, Personas
│   ├── openrouter_proxy.py       # Claude AI recommendations + Whisper voice
│   ├── requirements.txt
│   ├── Procfile                  # Render/Heroku deploy
│   ├── kaggle.json               # Template — add your credentials
│   ├── data/
│   │   └── generate_seed.py      # Generates 600 synthetic Amazon reviews
│   └── models/                   # HuggingFace model cache (auto-populated)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Router + theme + particles
│   │   ├── main.jsx
│   │   ├── index.css             # Glassmorphism + neon animations
│   │   ├── pages/
│   │   │   ├── HomePage.jsx      # Upload + voice + progress
│   │   │   └── DashboardPage.jsx # Full dashboard (5 tabs)
│   │   ├── components/
│   │   │   ├── GlassCard.jsx     # Glassmorphism card + StatCard
│   │   │   ├── Navbar.jsx
│   │   │   ├── UploadZone.jsx    # Drag-drop with neon glow
│   │   │   ├── Heatmap.jsx       # Recharts treemap + bars
│   │   │   ├── TrendsAlert.jsx   # Live alerts + anomalies
│   │   │   ├── VoiceInput.jsx    # Web Speech + Whisper
│   │   │   └── Recommendations.jsx # AI recs + personas + impact
│   │   ├── hooks/
│   │   │   └── useAnalyze.js     # API + WebSocket + confetti
│   │   └── utils/
│   │       ├── particles.js      # tsParticles background
│   │       └── export.js         # CSV + PDF export
│   ├── tailwind.config.js        # Neon color palette + animations
│   ├── vite.config.js
│   ├── vercel.json
│   └── package.json
│
├── render.yaml                   # Backend cloud deployment
├── .env.example
└── README.md
```

---

## 🎯 Features Implemented

### Layer 1 — Data Ingestion & Cleaning
- ✅ CSV / JSON / TXT upload with auto column detection
- ✅ Noise handling: emojis → labels, repeated chars, URL removal
- ✅ Hinglish normalization (kharab → bad/broken, accha → good, etc.)
- ✅ Jaccard similarity deduplication (configurable threshold)
- ✅ Spam detection (regex patterns), Bot detection (repetitive text)
- ✅ Rule-based sarcasm scoring with confidence

### Layer 2 — ABSA & Sentiment
- ✅ 14 feature taxonomy: battery, packaging, delivery, screen, camera, etc.
- ✅ Aspect-level sentiment with confidence scores
- ✅ Multilingual: English + Hindi + Hinglish (muril-compatible)
- ✅ Emotion detection: joy, anger, sadness, fear, surprise, disgust
- ✅ Rating-sentiment consistency validation

### Layer 3 — Trends & Intelligence
- ✅ First-half vs second-half sentiment shift detection
- ✅ Seeded packaging trend in beauty (last 50 reviews)
- ✅ Statistical anomaly detection (2σ spike detection)
- ✅ Isolated vs systemic issue classification
- ✅ Customer persona segmentation (Budget Buyer, Power User, Eco-Conscious)
- ✅ Keyword-cluster root cause analysis

### Unique Extras
- ✅ **Impact Score**: (neg_pct × volume × confidence) / total
- ✅ **Claude AI Recommendations**: 3 actionable strategies via OpenRouter
- ✅ **Voice Input**: Web Speech API + Whisper transcription fallback
- ✅ **Visual Heatmap**: Recharts Treemap (feature × sentiment intensity)
- ✅ **PDF Export**: jsPDF with full report formatting
- ✅ **CSV Export**: All ABSA data with metadata
- ✅ **Real-time WebSocket**: Progress streaming during analysis
- ✅ **Confetti on insights**: canvas-confetti celebration
- ✅ **Dark/Light toggle**: Full theme switching
- ✅ **Competitor comparison**: Mock data in /api/insights
- ✅ **Radar chart**: Feature sentiment radar
- ✅ **Emotion profile**: Bar chart with emotion colors

---

## 🌐 Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
vercel deploy --prod
```
Set env var: `VITE_API_URL=https://your-backend.onrender.com`

### Backend → Render
1. Push to GitHub
2. New Web Service on render.com → connect repo
3. Root: `backend/`, Build: `pip install -r requirements.txt`
4. Start: `gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app`
5. Add env var: `OPENROUTER_API_KEY`

---

## 🔌 API Endpoints

| Method | Endpoint            | Description                         |
|--------|---------------------|-------------------------------------|
| GET    | /api/health         | Health check                        |
| POST   | /api/analyze        | Async file analysis (WebSocket)     |
| POST   | /api/analyze/sync   | Sync file/JSON analysis             |
| GET    | /api/trends         | Pre-computed trend data             |
| GET    | /api/insights       | Impact scores + competitor data     |
| POST   | /api/voice          | Whisper voice transcription         |
| POST   | /api/export/csv     | Export results as CSV               |
| GET    | /api/load-demo      | Load synthetic dataset              |

---

## 🏆 Hackathon Notes

- **Dataset**: 600 synthetic Amazon-style reviews (electronics/beauty/grocery) with seeded packaging trend in last 50 beauty reviews
- **Trend to detect**: "packaging 38%+ positive sentiment rise in beauty category"
- **Hinglish examples**: "battery kharab hai" → detected + analyzed
- **Sarcasm examples**: "Oh sure, the battery is AMAZING — lasted 2 hours 🙄"

---

*Built for hackathon — replace rule-based NLP with yangheng/deberta-absa + muril-base-cased + tabularisai/multi-sent for production-grade accuracy.*
