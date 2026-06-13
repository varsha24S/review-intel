import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Play, Database, Loader2, CheckCircle, Sparkles, FileText } from 'lucide-react'
import UploadZone from '../components/UploadZone.jsx'
import VoiceInput from '../components/VoiceInput.jsx'
import GlassCard from '../components/GlassCard.jsx'
import { useAnalyze } from '../hooks/useAnalyze.js'

export default function HomePage({ onResult }) {
  const [file, setFile] = useState(null)
  const [textInput, setTextInput] = useState('')
  const [mode, setMode] = useState('file') // file | text | voice
  const { analyze, analyzeText, loadDemo, loading, progress, stepLabel, result, error } = useAnalyze()
  const navigate = useNavigate()

  const handleAnalyze = async () => {
    let res
    if (mode === 'file' && file) {
      await analyze(file)
    } else if ((mode === 'text' || mode === 'voice') && textInput.trim()) {
      await analyzeText(textInput.trim())
    }
  }

  const handleResult = (res) => {
    onResult(res)
    setTimeout(() => navigate('/dashboard'), 800)
  }

  // Auto-navigate when result arrives
  if (result && !loading) {
    handleResult(result)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="inline-block text-5xl mb-4"
        >
          🧠
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
          <span className="gradient-text">Customer Review</span>
          <br />
          <span className="text-white">Intelligence Platform</span>
        </h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto">
          AI-powered ABSA · Trend detection · Multilingual · Sarcasm detection · Real-time insights
        </p>
      </motion.div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-5 justify-center">
        {[
          { key: 'file',  label: '📁 File Upload' },
          { key: 'text',  label: '✏️ Text Input' },
          { key: 'voice', label: '🎙️ Voice' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              mode === key
                ? 'bg-neon-green/20 text-neon-green border border-neon-green/40'
                : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <AnimatePresence mode="wait">
        {mode === 'file' && (
          <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <UploadZone onFile={setFile} disabled={loading} />
          </motion.div>
        )}
        {mode === 'text' && (
          <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard className="p-4" animate={false}>
              <textarea
                className="w-full bg-transparent text-white/90 text-sm resize-none outline-none placeholder-white/30 h-32"
                placeholder="Paste a review here… e.g. 'Battery kharab hai, very disappointed with delivery 😡'"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                disabled={loading}
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                <span className="text-xs text-white/30">{textInput.length} chars</span>
                <span className="text-xs text-white/30">Supports English + Hindi + Hinglish</span>
              </div>
            </GlassCard>
          </motion.div>
        )}
        {mode === 'voice' && (
          <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <VoiceInput onTranscript={(t) => { setTextInput(t); setMode('text') }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5"
          >
            <GlassCard className="p-5 neon-border-blue" animate={false}>
              <div className="flex items-center gap-3 mb-3">
                <Loader2 size={18} className="text-neon-blue animate-spin" />
                <span className="text-neon-blue text-sm font-medium">{stepLabel || 'Analyzing…'}</span>
                <span className="ml-auto text-xs text-white/40 font-mono">{progress}%</span>
              </div>
              <div className="progress-bar">
                <motion.div
                  className="progress-bar-fill"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              {progress > 0 && (
                <div className="flex gap-4 mt-3 flex-wrap">
                  {['Cleaning', 'Dedup', 'ABSA', 'Trends', 'AI Recs'].map((s, i) => (
                    <span key={s} className={`text-xs flex items-center gap-1 ${progress >= (i + 1) * 18 ? 'text-neon-green' : 'text-white/30'}`}>
                      {progress >= (i + 1) * 18 ? <CheckCircle size={10} /> : <span className="w-2 h-2 rounded-full bg-white/20 inline-block" />}
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-3 mt-5 flex-wrap">
        <motion.button
          onClick={handleAnalyze}
          disabled={loading || (mode === 'file' ? !file : !textInput.trim())}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-neon flex items-center gap-2 flex-1 justify-center min-w-36 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {loading ? 'Analyzing…' : 'Run Analysis'}
        </motion.button>

        <motion.button
          onClick={loadDemo}
          disabled={loading}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-white/70 hover:bg-white/10 hover:text-white transition-all text-sm font-medium disabled:opacity-40"
        >
          <Database size={15} />
          Load Demo Dataset
        </motion.button>
      </div>

      {/* Feature pills */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap gap-2 mt-8 justify-center"
      >
        {[
          '🌐 Multilingual (EN+HI)', '🤖 Spam & Bot detection', '😏 Sarcasm AI',
          '📊 ABSA w/ confidence', '🔥 Trend alerts', '🎯 Impact scores',
          '🧩 Root cause clusters', '💡 Claude AI recs', '📄 PDF/CSV export',
        ].map(tag => (
          <span key={tag}
            className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-xs text-white/50">
            {tag}
          </span>
        ))}
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
        >
          ⚠️ {error}
        </motion.div>
      )}
    </div>
  )
}
