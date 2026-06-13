import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sun, Moon, BarChart3, Home, Zap } from 'lucide-react'

export default function Navbar({ darkMode, onToggleDark }) {
  const loc = useLocation()
  const links = [
    { to: '/',          label: 'Upload',    icon: Home },
    { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  ]

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-none border-0 border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50"
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 group">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #00ff88, #ff00ff)' }}
        >
          <Zap size={16} className="text-white" />
        </motion.div>
        <span className="font-bold text-lg gradient-text">ReviewIntel</span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-2">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                loc.pathname === to
                  ? 'neon-border-green text-neon-green bg-neon-green/10'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon size={14} />
              {label}
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Theme toggle */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onToggleDark}
        className="p-2 rounded-lg glass-card text-white/70 hover:text-white"
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </motion.button>
    </motion.nav>
  )
}
