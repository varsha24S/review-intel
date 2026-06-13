import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertTriangle, Bell, Clock } from 'lucide-react'
import GlassCard from './GlassCard.jsx'

const NOW = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

function TrendBadge({ direction, pct }) {
  const up = direction === 'up'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
      ${up ? 'bg-neon-green/15 text-neon-green' : 'bg-red-400/15 text-red-400'}`}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {up ? '+' : ''}{pct}%
    </span>
  )
}

function AnomalyBadge({ severity }) {
  const map = {
    high:   'bg-red-500/20 text-red-400 border-red-500/40',
    medium: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    low:    'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs border font-semibold ${map[severity] || map.medium}`}>
      {severity?.toUpperCase()}
    </span>
  )
}

export default function TrendsAlert({ trends = [], anomalies = [] }) {
  const alerts = trends.filter(t => t.alert)

  return (
    <div className="space-y-4">
      {/* Live Alerts */}
      <GlassCard className="p-5 neon-border-pink" delay={0.1}>
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Bell size={18} className="text-neon-pink" />
          </motion.div>
          <h3 className="font-bold text-white">Live Trend Alerts</h3>
          {alerts.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded-full bg-neon-pink/20 text-neon-pink text-xs font-bold">
              {alerts.length} active
            </span>
          )}
        </div>

        <AnimatePresence>
          {alerts.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-4">No critical alerts — all trends stable ✓</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((t, i) => (
                <motion.div
                  key={`${t.feature}-${i}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <AlertTriangle size={16} className="text-orange-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white capitalize text-sm">
                        {t.feature?.replace(/_/g, ' ')}
                      </span>
                      <TrendBadge direction={t.direction} pct={Math.abs(t.change_pct)} />
                      <span className="text-xs text-white/40 capitalize">{t.category}</span>
                    </div>
                    <p className="text-xs text-white/50 mt-1">{t.description}</p>
                    <p className="text-xs text-neon-blue/60 mt-1 flex items-center gap-1">
                      <Clock size={10} /> Since {NOW}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </GlassCard>

      {/* All Trends */}
      <GlassCard className="p-5" delay={0.2}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-neon-blue" />
          <h3 className="font-bold text-white">All Detected Trends</h3>
        </div>
        {trends.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-4">Run analysis to detect trends</p>
        ) : (
          <div className="space-y-2">
            {trends.map((t, i) => (
              <motion.div
                key={`trend-${i}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.07] transition-colors"
              >
                <div>
                  <span className="text-sm font-medium text-white capitalize">
                    {t.feature?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-white/40 ml-2">({t.category})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-white/40">
                      {(t.previous_rate * 100).toFixed(0)}% → {(t.current_rate * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-white/30">{t.volume} reviews</p>
                  </div>
                  <TrendBadge direction={t.direction} pct={Math.abs(t.change_pct)} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Anomalies */}
      {anomalies.length > 0 && (
        <GlassCard className="p-5 border-orange-500/20" delay={0.3}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-orange-400" />
            <h3 className="font-bold text-white">Anomaly Detection</h3>
          </div>
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.07 }}
                className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 flex items-start gap-3"
              >
                <AnomalyBadge severity={a.severity} />
                <div>
                  <p className="text-sm text-white/80">{a.description}</p>
                  <p className="text-xs text-white/40 mt-1">
                    {a.is_systemic ? '🔴 Systemic issue' : '🟡 Isolated incident'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
