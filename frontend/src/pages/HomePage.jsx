import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Play, Database, Loader2, CheckCircle } from 'lucide-react'
import UploadZone from '../components/UploadZone.jsx'
import VoiceInput from '../components/VoiceInput.jsx'
import GlassCard from '../components/GlassCard.jsx'
import { useAnalyze } from '../hooks/useAnalyze.js'

export default function HomePage({ onResult }) {
  const [file, setFile]           = useState(null)
  const [textInput, setTextInput] = useState('')
  const [mode, setMode]           = useState('file')
  const { analyze, analyzeText, loadDemo, loading, progress, stepLabel, result } = useAnalyze()
  const navigate = useNavigate()

  useEffect(() => {
    if (result) { onResult(result); navigate('/dashboard') }
  }, [result])

  const handleAnalyze = () => {
    if (mode === 'file' && file) analyze(file)
    else if (mode !== 'file' && textInput.trim()) analyzeText(textInput.trim())
  }

  const canRun = !loading && (mode === 'file' ? !!file : !!textInput.trim())

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} className="text-center mb-8">
        <div className="text-5xl mb-3">🧠</div>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-2">
          <span className="gradient-text">Customer Review</span><br/>
          <span className="text-white">Intelligence Platform</span>
        </h1>
        <p className="text-white/50 text-base max-w-lg mx-auto">
          AI-powered ABSA · Trend detection · Multilingual · Sarcasm · Real-time insights
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 justify-center">
        {[{key:'file',label:'📁 File Upload'},{key:'text',label:'✏️ Text Input'},{key:'voice',label:'🎙️ Voice'}].map(({key,label})=>(
          <button key={key} onClick={()=>setMode(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${mode===key?'bg-neon-green/20 text-neon-green border border-neon-green/40':'bg-white/5 text-white/50 hover:bg-white/10 border border-white/10'}`}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode==='file' && (
          <motion.div key="file" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <UploadZone onFile={setFile} disabled={loading}/>
          </motion.div>
        )}
        {mode==='text' && (
          <motion.div key="text" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <GlassCard className="p-4" animate={false}>
              <textarea
                className="w-full bg-transparent text-white/90 text-sm resize-none outline-none placeholder-white/30 h-28"
                placeholder='Paste review here… e.g. "Battery kharab hai, very disappointed 😡"'
                value={textInput} onChange={e=>setTextInput(e.target.value)} disabled={loading}/>
              <p className="text-xs text-white/30 mt-1 text-right">Supports English + Hindi + Hinglish</p>
            </GlassCard>
          </motion.div>
        )}
        {mode==='voice' && (
          <motion.div key="voice" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <VoiceInput onTranscript={t=>{setTextInput(t);setMode('text')}}/>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="mt-4">
            <GlassCard className="p-5 neon-border-blue" animate={false}>
              <div className="flex items-center gap-3 mb-3">
                <Loader2 size={16} className="text-neon-blue animate-spin"/>
                <span className="text-neon-blue text-sm">{stepLabel||'Analyzing…'}</span>
                <span className="ml-auto text-xs text-white/40 font-mono">{progress}%</span>
              </div>
              <div className="progress-bar">
                <motion.div className="progress-bar-fill" animate={{width:`${progress}%`}} transition={{duration:0.5}}/>
              </div>
              <div className="flex gap-4 mt-3 flex-wrap">
                {['Clean','Dedup','ABSA','Trends','AI Recs'].map((s,i)=>(
                  <span key={s} className={`text-xs flex items-center gap-1 ${progress>=(i+1)*18?'text-neon-green':'text-white/25'}`}>
                    {progress>=(i+1)*18?<CheckCircle size={10}/>:<span className="w-2 h-2 rounded-full bg-white/15 inline-block"/>}
                    {s}
                  </span>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons */}
      <div className="flex gap-3 mt-4 flex-wrap">
        <motion.button onClick={handleAnalyze} disabled={!canRun}
          whileHover={{scale:1.02}} whileTap={{scale:0.97}}
          className="btn-neon flex items-center gap-2 flex-1 justify-center min-w-36 disabled:opacity-40 disabled:cursor-not-allowed">
          {loading?<Loader2 size={15} className="animate-spin"/>:<Play size={15}/>}
          {loading?'Analyzing…':'Run Analysis'}
        </motion.button>
        <motion.button onClick={loadDemo} disabled={loading}
          whileHover={{scale:1.02}} whileTap={{scale:0.97}}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-white/70 hover:bg-white/10 hover:text-white transition-all text-sm font-medium disabled:opacity-40">
          <Database size={14}/> Load Demo Dataset
        </motion.button>
      </div>

      <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}
        className="flex flex-wrap gap-2 mt-7 justify-center">
        {['🌐 EN+HI multilingual','🤖 Spam & bot detect','😏 Sarcasm AI','📊 ABSA confidence','🔥 Trend alerts','🎯 Impact scores','💡 Claude AI recs','📄 PDF/CSV export'].map(t=>(
          <span key={t} className="px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs text-white/45">{t}</span>
        ))}
      </motion.div>
    </div>
  )
}
