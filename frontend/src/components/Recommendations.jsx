import { motion } from 'framer-motion'
import { Lightbulb, Users, Target, TrendingUp, Cpu } from 'lucide-react'
import GlassCard from './GlassCard.jsx'

const PERSONA_ICONS = { 'Budget Buyer': '💰', 'Power User': '⚡', 'Eco-Conscious': '🌿' }
const PERSONA_COLORS = { 'Budget Buyer': 'yellow', 'Power User': 'blue', 'Eco-Conscious': 'green' }

function PersonaCard({ persona }) {
  const colorMap = {
    yellow: { border: 'border-yellow-400/30', text: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    blue:   { border: 'border-neon-blue/30',   text: 'text-neon-blue',   bg: 'bg-neon-blue/10' },
    green:  { border: 'border-neon-green/30',  text: 'text-neon-green',  bg: 'bg-neon-green/10' },
  }
  const c = colorMap[PERSONA_COLORS[persona.name]] || colorMap.blue
  const sentMix = persona.sentiment_mix || {}

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`p-4 rounded-xl bg-white/[0.04] border ${c.border}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{PERSONA_ICONS[persona.name] || '👤'}</span>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold ${c.text}`}>{persona.name}</h4>
            <span className="text-xs text-white/40">{persona.count} reviews</span>
          </div>
          <p className="text-xs text-white/60 mt-1">{persona.description}</p>
          <div className="flex gap-1 mt-2">
            {persona.top_concerns?.map(concern => (
              <span key={concern}
                className={`px-2 py-0.5 rounded-full text-xs ${c.bg} ${c.text}`}>
                {concern.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
          {/* Sentiment bar */}
          <div className="mt-2 flex h-1.5 rounded-full overflow-hidden bg-white/10">
            <div style={{ width: `${(sentMix.positive || 0) * 100}%`, background: '#00ff88' }} />
            <div style={{ width: `${(sentMix.negative || 0) * 100}%`, background: '#ff4466' }} />
            <div style={{ width: `${(sentMix.neutral  || 0) * 100}%`, background: '#a0a0c0' }} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ImpactBar({ feature, score }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/60 w-36 truncate capitalize">{feature.replace(/_/g, ' ')}</span>
      <div className="flex-1 progress-bar">
        <motion.div
          className="progress-bar-fill"
          initial={{ width: 0 }}
          animate={{ width: `${score * 100}%` }}
          transition={{ duration: 0.8 }}
          style={{
            background: score > 0.7 ? 'linear-gradient(90deg,#ff4466,#ff8866)'
              : score > 0.4 ? 'linear-gradient(90deg,#ffd700,#ff8866)'
              : 'linear-gradient(90deg,#00ff88,#00d4ff)',
          }}
        />
      </div>
      <span className="text-xs font-mono text-white/60 w-10 text-right">{(score * 100).toFixed(0)}%</span>
    </div>
  )
}

export default function Recommendations({ recommendations = '', personas = [], insights = {} }) {
  const lines = (recommendations || '')
    .split('\n')
    .filter(l => l.trim() && /^\d\./.test(l.trim()))
    .slice(0, 3)

  const impact = insights?.impact_scores || {}

  return (
    <div className="space-y-4">
      {/* AI Recommendations */}
      <GlassCard className="p-6 neon-border-green" delay={0.1}>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} className="text-neon-green" />
          <h3 className="font-bold text-white">AI-Generated Recommendations</h3>
          <span className="ml-auto text-xs text-white/30 font-mono">claude-3.5-sonnet</span>
        </div>
        {lines.length > 0 ? (
          <div className="space-y-3">
            {lines.map((line, i) => {
              const parts = line.split('—')
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.12 }}
                  className="flex gap-3 p-3 rounded-xl bg-neon-green/5 border border-neon-green/20"
                >
                  <span className="w-6 h-6 rounded-full bg-neon-green/20 text-neon-green text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{parts[0]?.replace(/^\d\.\s*/, '')}</p>
                    {parts[1] && <p className="text-xs text-white/60 mt-0.5">{parts[1]}</p>}
                    {parts[2] && (
                      <p className="text-xs text-neon-green/70 mt-0.5 flex items-center gap-1">
                        <Target size={10} /> {parts[2]}
                      </p>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="text-white/40 text-sm py-4 text-center">
            {recommendations
              ? <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">{recommendations}</p>
              : 'No recommendations yet — run analysis first'}
          </div>
        )}
      </GlassCard>

      {/* Impact Scores */}
      {Object.keys(impact).length > 0 && (
        <GlassCard className="p-5" delay={0.2}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-neon-pink" />
            <h3 className="font-bold text-white">Feature Impact Scores</h3>
            <span className="ml-auto text-xs text-white/40">(neg_pct × vol × conf)</span>
          </div>
          <div className="space-y-3">
            {Object.entries(impact)
              .sort(([, a], [, b]) => b - a)
              .map(([feat, score]) => (
                <ImpactBar key={feat} feature={feat} score={score} />
              ))}
          </div>
        </GlassCard>
      )}

      {/* Personas */}
      {personas.length > 0 && (
        <GlassCard className="p-5" delay={0.3}>
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-neon-blue" />
            <h3 className="font-bold text-white">Customer Personas</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {personas.map(p => <PersonaCard key={p.name} persona={p} />)}
          </div>
        </GlassCard>
      )}

      {/* Root Cause placeholder */}
      <GlassCard className="p-5" delay={0.4}>
        <div className="flex items-center gap-2 mb-4">
          <Cpu size={18} className="text-yellow-400" />
          <h3 className="font-bold text-white">Root Cause Clusters</h3>
        </div>
        <p className="text-xs text-white/40 mb-3">Complaint clusters by keyword similarity (BERT embeddings → KMeans)</p>
        <div className="text-white/50 text-sm text-center py-2">
          {insights?.root_causes?.length > 0
            ? (
              <div className="space-y-2">
                {(insights.root_causes || []).slice(0, 5).map((rc, i) => (
                  <div key={i} className="p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400 text-xs font-bold">Cluster {i + 1}</span>
                      <span className="text-xs text-white/40">{rc.count} reviews</span>
                    </div>
                    <p className="text-xs text-white/70 mt-1">{rc.possible_cause}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {rc.cluster_keywords?.map(k => (
                        <span key={k} className="px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-300/70 text-xs">{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
            : 'Run analysis to see root cause clusters'}
        </div>
      </GlassCard>
    </div>
  )
}
