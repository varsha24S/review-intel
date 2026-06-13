import { motion } from 'framer-motion'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import GlassCard from './GlassCard.jsx'
import { Grid3x3 } from 'lucide-react'

const COLORS = {
  positive: { fill: '#00ff8840', stroke: '#00ff88' },
  negative: { fill: '#ff446640', stroke: '#ff4466' },
  neutral:  { fill: '#a0a0c040', stroke: '#a0a0c0' },
}

function CustomContent({ x, y, width, height, name, sentiment, confidence, depth }) {
  if (depth !== 1 || width < 30 || height < 20) return null
  const c = COLORS[sentiment] || COLORS.neutral
  return (
    <g>
      <rect
        x={x + 2} y={y + 2}
        width={width - 4} height={height - 4}
        style={{ fill: c.fill, stroke: c.stroke, strokeWidth: 1.5, rx: 8 }}
        rx={8}
      />
      {width > 60 && height > 30 && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 6}
            textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
            {name}
          </text>
          <text x={x + width / 2} y={y + height / 2 + 10}
            textAnchor="middle" fill={c.stroke} fontSize={9}>
            {(confidence * 100).toFixed(0)}%
          </text>
        </>
      )}
    </g>
  )
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload || {}
  const c = COLORS[d.sentiment] || COLORS.neutral
  return (
    <div className="glass-card p-3 text-sm border" style={{ borderColor: c.stroke }}>
      <p className="font-bold" style={{ color: c.stroke }}>{d.name}</p>
      <p className="text-white/70">Sentiment: <span style={{ color: c.stroke }}>{d.sentiment}</span></p>
      <p className="text-white/70">Volume: <span className="text-white">{d.size}</span></p>
      <p className="text-white/70">Confidence: <span className="text-white">{(d.confidence * 100).toFixed(0)}%</span></p>
    </div>
  )
}

export default function Heatmap({ absa = [] }) {
  // Aggregate feature × sentiment counts
  const featureMap = {}
  absa.forEach(r => {
    Object.entries(r.aspects || {}).forEach(([feat, asp]) => {
      if (!featureMap[feat]) featureMap[feat] = { pos: 0, neg: 0, neu: 0, conf: [], total: 0 }
      featureMap[feat][asp.sentiment === 'positive' ? 'pos' : asp.sentiment === 'negative' ? 'neg' : 'neu']++
      featureMap[feat].conf.push(asp.confidence)
      featureMap[feat].total++
    })
  })

  const data = Object.entries(featureMap)
    .filter(([, v]) => v.total >= 2)
    .map(([feat, v]) => {
      const dominant = v.pos >= v.neg && v.pos >= v.neu ? 'positive'
        : v.neg >= v.pos && v.neg >= v.neu ? 'negative' : 'neutral'
      const avgConf = v.conf.reduce((a, b) => a + b, 0) / v.conf.length
      return {
        name: feat.replace(/_/g, ' '),
        size: v.total,
        sentiment: dominant,
        confidence: avgConf,
      }
    })
    .sort((a, b) => b.size - a.size)
    .slice(0, 20)

  // Legend bars per feature
  const bars = Object.entries(featureMap)
    .filter(([, v]) => v.total >= 2)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)

  return (
    <GlassCard className="p-6" delay={0.2}>
      <div className="flex items-center gap-2 mb-5">
        <Grid3x3 size={18} className="text-neon-pink" />
        <h3 className="font-bold text-lg text-white">Feature Sentiment Heatmap</h3>
        <div className="ml-auto flex gap-3 text-xs">
          {Object.entries(COLORS).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: c.stroke }} />
              <span className="text-white/60 capitalize">{s}</span>
            </span>
          ))}
        </div>
      </div>

      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={280}>
            <Treemap
              data={data}
              dataKey="size"
              content={<CustomContent />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>

          {/* Bar breakdown */}
          <div className="mt-6 space-y-2">
            {bars.map(([feat, v]) => {
              const total = v.total || 1
              const posW = (v.pos / total) * 100
              const negW = (v.neg / total) * 100
              const neuW = (v.neu / total) * 100
              return (
                <div key={feat} className="flex items-center gap-3">
                  <span className="text-xs text-white/60 w-28 truncate capitalize">{feat.replace(/_/g, ' ')}</span>
                  <div className="flex-1 h-3 rounded-full overflow-hidden bg-white/10 flex">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${posW}%` }}
                      transition={{ duration: 0.8 }}
                      className="h-full" style={{ background: '#00ff88' }}
                    />
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${negW}%` }}
                      transition={{ duration: 0.8, delay: 0.1 }}
                      className="h-full" style={{ background: '#ff4466' }}
                    />
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${neuW}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-full" style={{ background: '#a0a0c0' }}
                    />
                  </div>
                  <span className="text-xs text-white/40 w-8 text-right">{total}</span>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="h-64 flex items-center justify-center text-white/30 text-sm">
          No aspect data yet — upload reviews to see the heatmap
        </div>
      )}
    </GlassCard>
  )
}
