import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2, MessageSquare, TrendingUp, Lightbulb,
  Download, FileText, ArrowLeft, Star, Flag, Smile, Globe
} from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import GlassCard, { StatCard } from '../components/GlassCard.jsx'
import Heatmap from '../components/Heatmap.jsx'
import TrendsAlert from '../components/TrendsAlert.jsx'
import Recommendations from '../components/Recommendations.jsx'
import { exportCSV, exportPDF } from '../utils/export.js'

const TABS = [
  { id: 'overview',    icon: BarChart2,     label: 'Overview' },
  { id: 'reviews',     icon: MessageSquare, label: 'Reviews' },
  { id: 'heatmap',     icon: Star,          label: 'Heatmap' },
  { id: 'trends',      icon: TrendingUp,    label: 'Trends' },
  { id: 'insights',    icon: Lightbulb,     label: 'Insights' },
]

const SENT_COLORS = { positive: '#00ff88', negative: '#ff4466', neutral: '#a0a0c0' }
const EMOTION_COLORS = { joy: '#ffd700', anger: '#ff4466', sadness: '#a0a0ff', fear: '#ff8800', surprise: '#00d4ff', disgust: '#cc44ff', neutral: '#888' }

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card p-3 text-xs">
      <p className="text-white/80 font-semibold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill || p.color }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>
      ))}
    </div>
  )
}

export default function DashboardPage({ result }) {
  const [tab, setTab] = useState('overview')
  const [reviewFilter, setReviewFilter] = useState('all')
  const navigate = useNavigate()

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-white/50 text-lg">No analysis data yet.</p>
        <button onClick={() => navigate('/')} className="btn-neon flex items-center gap-2">
          <ArrowLeft size={15} /> Run Analysis
        </button>
      </div>
    )
  }

  const { total_reviews, cleaned_reviews, spam_flagged, sarcasm_flagged,
          absa = [], trends = [], anomalies = [], personas = [],
          recommendations = '', summary = '' } = result

  // Compute charts data
  const sentCounts = absa.reduce((acc, r) => {
    const l = r.overall_sentiment?.label || 'neutral'
    acc[l] = (acc[l] || 0) + 1
    return acc
  }, {})
  const sentPieData = Object.entries(sentCounts).map(([name, value]) => ({ name, value }))

  const emotionCounts = absa.reduce((acc, r) => { acc[r.emotion || 'neutral'] = (acc[r.emotion || 'neutral'] || 0) + 1; return acc }, {})
  const emotionData = Object.entries(emotionCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)

  const featureSentMap = {}
  absa.forEach(r => {
    Object.entries(r.aspects || {}).forEach(([feat, asp]) => {
      if (!featureSentMap[feat]) featureSentMap[feat] = { pos: 0, neg: 0, neu: 0 }
      featureSentMap[feat][asp.sentiment === 'positive' ? 'pos' : asp.sentiment === 'negative' ? 'neg' : 'neu']++
    })
  })
  const featureBarData = Object.entries(featureSentMap)
    .map(([feat, v]) => ({
      name: feat.replace(/_/g, ' '),
      Positive: v.pos, Negative: v.neg, Neutral: v.neu,
      total: v.pos + v.neg + v.neu,
    }))
    .filter(d => d.total >= 3)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)

  const radarData = featureBarData.slice(0, 8).map(d => ({
    subject: d.name, pos: d.Positive, neg: d.Negative,
  }))

  const langCounts = absa.reduce((acc, r) => { acc[r.language || 'en'] = (acc[r.language || 'en'] || 0) + 1; return acc }, {})

  const filteredReviews = reviewFilter === 'all' ? absa
    : reviewFilter === 'spam' ? absa.filter(r => r.is_spam)
    : reviewFilter === 'sarcasm' ? absa.filter(r => r.is_sarcasm)
    : absa.filter(r => r.overall_sentiment?.label === reviewFilter)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')}
            className="p-2 rounded-lg glass-card text-white/50 hover:text-white transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-xl font-bold gradient-text">Analysis Dashboard</h2>
            {summary && <p className="text-xs text-white/50 mt-0.5 max-w-lg">{summary.slice(0, 120)}…</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => exportCSV(absa)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-blue/10 border border-neon-blue/30 text-neon-blue text-sm font-medium hover:bg-neon-blue/20 transition-all">
            <FileText size={14} /> CSV
          </motion.button>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => exportPDF(result)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neon-pink/10 border border-neon-pink/30 text-neon-pink text-sm font-medium hover:bg-neon-pink/20 transition-all">
            <Download size={14} /> PDF
          </motion.button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Reviews" value={total_reviews}  icon={MessageSquare} color="green" />
        <StatCard label="Cleaned"       value={cleaned_reviews} icon={BarChart2}    color="blue" />
        <StatCard label="Spam Flagged"  value={spam_flagged}   icon={Flag}          color="pink" />
        <StatCard label="Sarcasm"       value={sarcasm_flagged} icon={Smile}        color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === id
                ? 'bg-neon-green/15 text-neon-green border border-neon-green/30'
                : 'text-white/50 hover:text-white hover:bg-white/8 border border-transparent'
            }`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Sentiment pie */}
          <GlassCard className="p-5" delay={0}>
            <h3 className="font-semibold text-white mb-4 text-sm">Sentiment Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={sentPieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}>
                  {sentPieData.map(entry => (
                    <Cell key={entry.name} fill={SENT_COLORS[entry.name] || '#aaa'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Feature bar */}
          <GlassCard className="p-5 md:col-span-2" delay={0.1}>
            <h3 className="font-semibold text-white mb-4 text-sm">Feature Sentiment Breakdown</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={featureBarData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#a0a0c0', fontSize: 10 }} />
                <YAxis tick={{ fill: '#a0a0c0', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Positive" stackId="s" fill="#00ff88" radius={[0,0,0,0]} />
                <Bar dataKey="Negative" stackId="s" fill="#ff4466" />
                <Bar dataKey="Neutral"  stackId="s" fill="#a0a0c0" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Emotion bar */}
          <GlassCard className="p-5" delay={0.2}>
            <h3 className="font-semibold text-white mb-4 text-sm">Emotion Profile</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={emotionData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" tick={{ fill: '#a0a0c0', fontSize: 9 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#a0a0c0', fontSize: 10 }} width={60} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {emotionData.map(entry => (
                    <Cell key={entry.name} fill={EMOTION_COLORS[entry.name] || '#888'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Radar */}
          <GlassCard className="p-5" delay={0.25}>
            <h3 className="font-semibold text-white mb-4 text-sm">Feature Radar</h3>
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a0a0c0', fontSize: 9 }} />
                <Radar name="Positive" dataKey="pos" stroke="#00ff88" fill="#00ff8822" />
                <Radar name="Negative" dataKey="neg" stroke="#ff4466" fill="#ff446622" />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Language breakdown */}
          <GlassCard className="p-5" delay={0.3}>
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2 text-sm">
              <Globe size={14} className="text-neon-blue" /> Language Distribution
            </h3>
            <div className="space-y-3 mt-2">
              {Object.entries(langCounts).map(([lang, cnt]) => {
                const pct = (cnt / absa.length) * 100
                const labels = { en: '🇬🇧 English', hi: '🇮🇳 Hindi', 'hi-en': '🌐 Hinglish' }
                return (
                  <div key={lang}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/70">{labels[lang] || lang}</span>
                      <span className="text-white/50">{cnt} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="progress-bar">
                      <motion.div className="progress-bar-fill" initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Reviews tab */}
      {tab === 'reviews' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {['all', 'positive', 'negative', 'neutral', 'spam', 'sarcasm'].map(f => (
              <button key={f} onClick={() => setReviewFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  reviewFilter === f ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
                }`}>{f} {f === 'all' ? `(${absa.length})` : ''}</button>
            ))}
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {filteredReviews.slice(0, 100).map((r, i) => {
              const sent = r.overall_sentiment?.label || 'neutral'
              const sentColor = { positive: '#00ff88', negative: '#ff4466', neutral: '#a0a0c0' }
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                  className="glass-card p-4 flex gap-3"
                >
                  <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: sentColor[sent] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/85 leading-relaxed">{r.text?.slice(0, 200)}{r.text?.length > 200 ? '…' : ''}</p>
                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                      <span className="text-xs font-medium" style={{ color: sentColor[sent] }}>{sent}</span>
                      {r.language !== 'en' && <span className="text-xs text-neon-blue/70 bg-neon-blue/10 px-2 py-0.5 rounded-full">{r.language}</span>}
                      {r.emotion && r.emotion !== 'neutral' && <span className="text-xs text-yellow-400/70">{r.emotion}</span>}
                      {r.is_spam && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">spam</span>}
                      {r.is_sarcasm && <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">sarcasm</span>}
                      {Object.keys(r.aspects || {}).slice(0, 3).map(feat => (
                        <span key={feat} className="text-xs bg-white/8 text-white/50 px-2 py-0.5 rounded-full capitalize">
                          {feat.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {r.rating && <span className="text-xs text-yellow-400/60 ml-auto">★ {r.rating}</span>}
                    </div>
                  </div>
                </motion.div>
              )
            })}
            {filteredReviews.length === 0 && (
              <p className="text-center text-white/30 py-10">No reviews match this filter</p>
            )}
          </div>
        </div>
      )}

      {tab === 'heatmap' && <Heatmap absa={absa} />}

      {tab === 'trends' && <TrendsAlert trends={trends} anomalies={anomalies} />}

      {tab === 'insights' && (
        <Recommendations
          recommendations={recommendations}
          personas={personas}
          insights={{ impact_scores: result.impact_scores, root_causes: result.root_causes }}
        />
      )}
    </div>
  )
}
