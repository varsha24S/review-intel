import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react'
import GlassCard from './GlassCard.jsx'
import toast from 'react-hot-toast'
import { API } from '../hooks/useAnalyze.js'

export default function VoiceInput({ onTranscript }) {
  const [recording, setRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [level, setLevel] = useState(0)
  const recognitionRef = useRef(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const animRef = useRef(null)

  const startRecording = async () => {
    try {
      // Web Speech API (live transcript)
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-IN'  // Indian English
        recognition.onresult = (e) => {
          let interim = '', final = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript
            else interim += e.results[i][0].transcript
          }
          setTranscript((final || interim).trim())
        }
        recognition.onerror = () => toast.error('Speech recognition error')
        recognitionRef.current = recognition
        recognition.start()
      }

      // Also capture audio for Whisper fallback
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => chunksRef.current.push(e.data)
      mr.start(100)
      mediaRef.current = { recorder: mr, stream }

      // Visualize audio level
      const ctx = new AudioContext()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      src.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setLevel(Math.min(avg / 128, 1))
        animRef.current = requestAnimationFrame(tick)
      }
      tick()

      setRecording(true)
      toast.success('Recording… speak your review!')
    } catch (e) {
      toast.error('Microphone access denied')
    }
  }

  const stopRecording = async () => {
    setRecording(false)
    cancelAnimationFrame(animRef.current)
    setLevel(0)

    if (recognitionRef.current) recognitionRef.current.stop()

    const { recorder, stream } = mediaRef.current || {}
    if (!recorder) {
      if (transcript) onTranscript?.(transcript)
      return
    }

    setProcessing(true)
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      // Use local transcript if Web Speech worked well enough
      if (transcript && transcript.length > 10) {
        setProcessing(false)
        onTranscript?.(transcript)
        toast.success('Voice captured!')
        return
      }
      // Fallback: send to Whisper via backend
      try {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = async () => {
          const b64 = reader.result.split(',')[1]
          const res = await API.post('/voice', { audio_b64: b64 })
          const t = res.data.transcript || ''
          setTranscript(t)
          onTranscript?.(t)
          toast.success('Transcribed!')
        }
        reader.readAsDataURL(blob)
      } catch {
        toast.error('Transcription failed')
      } finally {
        setProcessing(false)
      }
    }
    recorder.stop()
  }

  return (
    <GlassCard className="p-5 neon-border-purple" glow="purple">
      <div className="flex items-center gap-2 mb-4">
        <Volume2 size={18} className="text-purple-400" />
        <h3 className="font-semibold text-white">Voice Review Input</h3>
        <span className="ml-auto text-xs text-white/40">Web Speech + Whisper</span>
      </div>

      <div className="flex flex-col items-center gap-4">
        {/* Mic button */}
        <motion.button
          onClick={recording ? stopRecording : startRecording}
          disabled={processing}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-16 h-16 rounded-full flex items-center justify-center disabled:opacity-50"
          style={{
            background: recording
              ? 'rgba(255,0,255,0.2)'
              : 'rgba(168,85,247,0.2)',
            border: `2px solid ${recording ? '#ff00ff' : '#a855f7'}`,
            boxShadow: recording
              ? `0 0 ${20 + level * 40}px rgba(255,0,255,${0.3 + level * 0.4})`
              : '0 0 15px rgba(168,85,247,0.2)',
          }}
        >
          {processing
            ? <Loader2 size={24} className="text-purple-400 animate-spin" />
            : recording
            ? <MicOff size={24} className="text-neon-pink" />
            : <Mic size={24} className="text-purple-400" />
          }
          {recording && (
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-neon-pink/50"
              animate={{ scale: [1, 1.3 + level * 0.5], opacity: [0.8, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </motion.button>

        <p className="text-xs text-white/50">
          {processing ? 'Transcribing…' : recording ? 'Recording — click to stop' : 'Click to record a review'}
        </p>

        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full p-3 rounded-xl bg-white/5 border border-purple-400/30 text-sm text-white/80"
            >
              <span className="text-purple-400 text-xs font-semibold block mb-1">Transcript:</span>
              {transcript}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}
