import { useState, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

const BASE = import.meta.env.VITE_API_URL || "https://review-intel-ebsm.onrender.com"
export const API = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 60000,
})

// ── Offline demo result so UI works without backend ──────────────────────
const DEMO_RESULT = {
  total_reviews: 625, cleaned_reviews: 588, spam_flagged: 22, sarcasm_flagged: 15,
  summary: "Customers largely praise screen quality and value for money. Battery life and packaging are top concerns, with a notable 38% positive packaging trend in beauty. Overall sentiment is cautiously positive.",
  trends: [
    { feature:"packaging",  category:"beauty",      change_pct: 38,  direction:"up",   current_rate:0.46, previous_rate:0.08, volume:50,  alert:true,  description:"packaging sentiment 38% ↑ (beauty)" },
    { feature:"battery",    category:"electronics", change_pct: -15, direction:"down", current_rate:0.31, previous_rate:0.46, volume:120, alert:true,  description:"battery sentiment 15% ↓ (electronics)" },
    { feature:"delivery",   category:"grocery",     change_pct: 10,  direction:"up",   current_rate:0.55, previous_rate:0.45, volume:80,  alert:false, description:"delivery sentiment 10% ↑ (grocery)" },
    { feature:"screen",     category:"electronics", change_pct: 8,   direction:"up",   current_rate:0.72, previous_rate:0.64, volume:95,  alert:false, description:"screen sentiment 8% ↑ (electronics)" },
  ],
  anomalies: [
    { feature:"battery",    type:"spike",    severity:"high",   description:"Unusual spike in battery complaints (recent avg: 68% vs baseline 31%)", is_systemic:true },
    { feature:"packaging",  type:"recovery", severity:"low",    description:"Packaging complaints dropped sharply — possible fix took effect", is_systemic:false },
  ],
  personas: [
    { name:"Budget Buyer",   count:142, top_concerns:["value_for_money","price"],         sentiment_mix:{positive:0.2,negative:0.7,neutral:0.1}, description:"Price-sensitive customers disappointed by cost-quality ratio" },
    { name:"Power User",     count:198, top_concerns:["battery","performance"],            sentiment_mix:{positive:0.55,negative:0.35,neutral:0.1}, description:"Tech-savvy users focused on performance metrics" },
    { name:"Eco-Conscious",  count:87,  top_concerns:["packaging","delivery"],             sentiment_mix:{positive:0.4,negative:0.5,neutral:0.1}, description:"Customers concerned about packaging quality and sustainability" },
  ],
  recommendations: `1. [Fix Battery Messaging] — Highlight battery certifications in product listings — Expected Impact: 20% reduction in battery-related returns
2. [Beauty Packaging Upgrade] — Leverage positive packaging trend: add eco-friendly badge to beauty SKUs — Expected Impact: 15% increase in repeat purchases
3. [Grocery Delivery SLA] — Promote guaranteed 2-day delivery for grocery category — Expected Impact: 12% improvement in grocery NPS`,
  root_causes: [
    { cluster_keywords:["battery","drain","slow"], count:34, possible_cause:"Recurring issue around: battery, drain, slow", sample_reviews:["Battery drains too fast","Charging is very slow","Battery life terrible after update"] },
    { cluster_keywords:["packaging","damaged","box"], count:21, possible_cause:"Recurring issue around: packaging, damaged, box", sample_reviews:["Package was crushed","Box arrived dented","Item damaged due to poor packaging"] },
    { cluster_keywords:["delivery","late","delayed"], count:18, possible_cause:"Recurring issue around: delivery, late, delayed", sample_reviews:["Arrived 5 days late","Courier lost my package","Very slow dispatch"] },
  ],
  impact_scores: { battery:0.82, delivery_time:0.71, packaging:0.65, screen_quality:0.59, customer_service:0.48 },
  absa: [
    { text:"Battery drains too fast, very disappointed. kharab battery hai!", rating:2, category:"electronics", language:"hi-en", overall_sentiment:{label:"negative",score:-0.7,confidence:0.88}, emotion:"anger",    aspects:{battery:{sentiment:"negative",score:-0.8,confidence:0.9}},  is_spam:false, is_sarcasm:false, impact:0.0014 },
    { text:"Amazing screen quality! Love the display resolution 😍",          rating:5, category:"electronics", language:"en",    overall_sentiment:{label:"positive",score:0.8,confidence:0.91},  emotion:"joy",     aspects:{screen:{sentiment:"positive",score:0.85,confidence:0.92}}, is_spam:false, is_sarcasm:false, impact:0.0002 },
    { text:"Packaging was crushed, product inside damaged. Waste of money.",   rating:1, category:"beauty",     language:"en",    overall_sentiment:{label:"negative",score:-0.75,confidence:0.85},emotion:"anger",    aspects:{packaging:{sentiment:"negative",score:-0.8,confidence:0.87},value_for_money:{sentiment:"negative",score:-0.6,confidence:0.75}}, is_spam:false, is_sarcasm:false, impact:0.0013 },
    { text:"Oh sure, 'fast delivery' — arrived in 3 weeks. Amazing!! 🙄",      rating:2, category:"grocery",    language:"en",    overall_sentiment:{label:"negative",score:-0.5,confidence:0.72},  emotion:"anger",    aspects:{delivery:{sentiment:"negative",score:-0.7,confidence:0.8}}, is_spam:false, is_sarcasm:true,  impact:0.0009 },
    { text:"Best moisturizer ever! The packaging is now beautiful and sturdy.", rating:5, category:"beauty",     language:"en",    overall_sentiment:{label:"positive",score:0.9,confidence:0.94},  emotion:"joy",     aspects:{packaging:{sentiment:"positive",score:0.9,confidence:0.95}}, is_spam:false, is_sarcasm:false, impact:0.0001 },
    { text:"Buy now! Click here for 50% discount. Visit our website!!",        rating:5, category:"electronics", language:"en",   overall_sentiment:{label:"positive",score:0.2,confidence:0.3},   emotion:"neutral", aspects:{}, is_spam:true, is_sarcasm:false, impact:0 },
    { text:"Camera quality is superb. Photos are crystal clear in low light.",  rating:5, category:"electronics", language:"en",  overall_sentiment:{label:"positive",score:0.82,confidence:0.89}, emotion:"joy",     aspects:{camera:{sentiment:"positive",score:0.85,confidence:0.9}},  is_spam:false, is_sarcasm:false, impact:0.0001 },
    { text:"Bahut accha product hai, delivery fast tha. Very satisfied!",       rating:4, category:"grocery",    language:"hi-en", overall_sentiment:{label:"positive",score:0.65,confidence:0.78}, emotion:"joy",    aspects:{delivery:{sentiment:"positive",score:0.7,confidence:0.8}},  is_spam:false, is_sarcasm:false, impact:0.0003 },
    { text:"Software keeps crashing. App is buggy and needs urgent fix.",       rating:1, category:"electronics", language:"en",  overall_sentiment:{label:"negative",score:-0.8,confidence:0.87}, emotion:"anger",    aspects:{software:{sentiment:"negative",score:-0.85,confidence:0.9}}, is_spam:false, is_sarcasm:false, impact:0.0014 },
    { text:"Value for money is excellent. Taste is fresh and delicious!",       rating:5, category:"grocery",    language:"en",  overall_sentiment:{label:"positive",score:0.88,confidence:0.92}, emotion:"joy",     aspects:{taste:{sentiment:"positive",score:0.9,confidence:0.93},value_for_money:{sentiment:"positive",score:0.8,confidence:0.85}}, is_spam:false, is_sarcasm:false, impact:0.0001 },
  ],
}

export function useAnalyze() {
  const [loading, setLoading]     = useState(false)
  const [progress, setProgress]   = useState(0)
  const [stepLabel, setStepLabel] = useState('')
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)

  const simulateProgress = (steps) => {
    steps.forEach(([label, pct, delay]) => {
      setTimeout(() => { setStepLabel(label); setProgress(pct) }, delay)
    })
  }

  const analyze = async (file) => {
    setLoading(true); setError(null); setProgress(0)
    setStepLabel('Uploading file…')
    try {
      simulateProgress([
        ['Cleaning & deduplication…', 15, 200],
        ['Spam & sarcasm detection…', 30, 800],
        ['ABSA sentiment analysis…',  55, 1800],
        ['Trend & anomaly detection…',75, 3000],
        ['Generating AI recommendations…', 90, 4200],
      ])
      const fd = new FormData()
      fd.append('file', file)
      const r = await API.post('/analyze/sync', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(r.data); setProgress(100)
      fireConfetti()
      toast.success(`✅ Analyzed ${r.data.total_reviews} reviews!`)
    } catch (e) {
      // Backend unreachable → use demo data so UI still works
      toast('⚡ Backend offline — showing demo data', { icon: '🔌' })
      await fakeSleep(4500)
      setResult(DEMO_RESULT); setProgress(100)
      fireConfetti()
    } finally {
      setLoading(false)
    }
  }

  const analyzeText = async (text) => {
    setLoading(true); setError(null); setProgress(0)
    setStepLabel('Analyzing text review…')
    try {
      simulateProgress([['Running NLP pipeline…',50,400],['Generating insights…',85,1200]])
      const r = await API.post('/analyze/sync', {
        reviews: [{ text, rating: null, category: 'general' }],
      })
      setResult(r.data); setProgress(100)
      toast.success('Analysis complete!')
    } catch {
      await fakeSleep(1600)
      // Single review mock
      const sent = /kharab|bad|broken|terrible|slow|damaged|waste|disappointed/i.test(text)
        ? { label:'negative', score:-0.72, confidence:0.84 }
        : /good|great|love|amazing|excellent|accha|best/i.test(text)
        ? { label:'positive', score:0.78, confidence:0.87 }
        : { label:'neutral',  score:0.05, confidence:0.55 }
      const lang = /\b(hai|tha|kharab|accha|bahut|nahi|theek)\b/i.test(text) ? 'hi-en' : 'en'
      setResult({ ...DEMO_RESULT, absa:[{ text, rating:null, category:'general', language:lang, overall_sentiment:sent, emotion:sent.label==='negative'?'anger':sent.label==='positive'?'joy':'neutral', aspects:{}, is_spam:false, is_sarcasm:false, impact:0 }], total_reviews:1, cleaned_reviews:1, spam_flagged:0, sarcasm_flagged:0 })
      setProgress(100)
      toast.success('Text analyzed (offline mode)')
    } finally {
      setLoading(false)
    }
  }

  const loadDemo = async () => {
    setLoading(true); setError(null)
    setStepLabel('Loading demo dataset…')
    simulateProgress([
      ['Cleaning reviews…',20,300],['Detecting spam…',40,900],
      ['Running ABSA…',65,1800],['Detecting trends…',85,3000],['AI recommendations…',95,4000],
    ])
    try {
      const r = await API.get('/load-demo')
      const reviews = r.data.reviews || []
      const fd = new FormData()
      const csv = ['text,rating,category,date', ...reviews.map(rv => `"${(rv.text||'').replace(/"/g,'""')}",${rv.rating||''},${rv.category||''},${rv.date||''}`)].join('\n')
      fd.append('file', new Blob([csv],{type:'text/csv'}), 'demo.csv')
      const res = await API.post('/analyze/sync', fd, { headers:{'Content-Type':'multipart/form-data'} })
      await fakeSleep(4200)
      setResult(res.data); setProgress(100)
      fireConfetti()
      toast.success(`✅ Demo: ${res.data.total_reviews} reviews!`)
    } catch {
      await fakeSleep(4200)
      setResult(DEMO_RESULT); setProgress(100)
      fireConfetti()
      toast.success('✅ Demo loaded (offline mode)!')
    } finally {
      setLoading(false)
    }
  }

  return { analyze, analyzeText, loadDemo, loading, progress, stepLabel, result, error }
}

const fakeSleep = (ms) => new Promise(r => setTimeout(r, ms))

function fireConfetti() {
  confetti({ particleCount:120, spread:80, origin:{y:0.6}, colors:['#00ff88','#ff00ff','#00d4ff','#ffd700'] })
}
