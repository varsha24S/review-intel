import { motion } from 'framer-motion'

export default function GlassCard({
  children,
  className = '',
  glow = 'green',
  animate = true,
  delay = 0,
  onClick,
  ...props
}) {
  const glowMap = {
    green:  'hover:border-neon-green/40 hover:shadow-[0_0_20px_rgba(0,255,136,0.2)]',
    pink:   'hover:border-neon-pink/40  hover:shadow-[0_0_20px_rgba(255,0,255,0.2)]',
    blue:   'hover:border-neon-blue/40  hover:shadow-[0_0_20px_rgba(0,212,255,0.2)]',
    purple: 'hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
    none:   '',
  }

  const Wrapper = animate ? motion.div : 'div'
  const animProps = animate ? {
    initial:    { opacity: 0, y: 20 },
    animate:    { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay },
    whileHover: onClick ? { scale: 1.01 } : undefined,
  } : {}

  return (
    <Wrapper
      {...animProps}
      onClick={onClick}
      className={`glass-card ${glowMap[glow]} transition-all duration-300 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </Wrapper>
  )
}

export function StatCard({ label, value, icon: Icon, color = 'green', suffix = '' }) {
  const colorMap = {
    green:  { text: 'text-neon-green',  bg: 'bg-neon-green/10',  border: 'neon-border-green' },
    pink:   { text: 'text-neon-pink',   bg: 'bg-neon-pink/10',   border: 'neon-border-pink' },
    blue:   { text: 'text-neon-blue',   bg: 'bg-neon-blue/10',   border: 'neon-border-blue' },
    purple: { text: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/40' },
    yellow: { text: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/40' },
  }
  const c = colorMap[color] || colorMap.green

  return (
    <GlassCard glow={color} className={`p-5 ${c.border}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-widest mb-1">{label}</p>
          <motion.p
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className={`text-3xl font-bold ${c.text}`}
          >
            {value}{suffix}
          </motion.p>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${c.bg}`}>
            <Icon size={20} className={c.text} />
          </div>
        )}
      </div>
    </GlassCard>
  )
}
