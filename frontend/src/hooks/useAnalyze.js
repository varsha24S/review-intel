import { useState, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
export const API = axios.create({ baseURL: `${BASE}/api` })

export function useAnalyze() {
  const [loading, setLoading]     = useState(false)
  const [progress, setProgress]   = useState(0)
  const [stepLabel, setStepLabel] = useState('')
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)
  const socketRef = useRef(null)

  const connectSocket = (onDone) => {
    // Dynamic import so it doesn't crash if socket.io-client isn't loaded yet
    import('socket.io-client').then(({ default: io }) => {
      const socket = io(BASE, { transports: ['websocket', 'polling'] })
      socketRef.current = socket
      socket.on('progress', ({ step, pct }) => {
        setStepLabel(step)
        setProgress(pct)
      })
      socket.on('done', ({ result }) => {
        onDone(result)
        socket.disconnect()
      })
      socket.on('connect_error', () => {
        // Fall through to sync endpoint
        socket.disconnect()
      })
    }).catch(() => {})
  }

  const analyze = async (file) => {
    setLoading(true)
    setError(null)
    setProgress(0)
    setStepLabel('Uploading file…')

    try {
      connectSocket((res) => {
        setResult(res)
        setLoading(false)
        setProgress(100)
        fireConfetti()
        toast.success(`✅ Analyzed ${res.total_reviews} reviews!`)
      })

      const fd = new FormData()
      fd.append('file', file)

      // Try async endpoint first, fallback to sync
      try {
        await API.post('/analyze', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        // Result comes via socket
        // Timeout fallback after 30s
        setTimeout(async () => {
          if (loading) {
            const r = await API.post('/analyze/sync', fd, {
              headers: { 'Content-Type': 'multipart/form-data' },
            })
            setResult(r.data)
            setLoading(false)
            setProgress(100)
            fireConfetti()
          }
        }, 30000)
      } catch {
        // Direct sync fallback
        setStepLabel('Running analysis…')
        const r = await API.post('/analyze/sync', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setResult(r.data)
        setLoading(false)
        setProgress(100)
        fireConfetti()
        toast.success(`✅ Analyzed ${r.data.total_reviews} reviews!`)
      }
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Analysis failed'
      setError(msg)
      setLoading(false)
      toast.error(msg)
    }
  }

  const analyzeText = async (text) => {
    setLoading(true)
    setError(null)
    setProgress(0)
    setStepLabel('Analyzing text review…')
    try {
      const r = await API.post('/analyze/sync', {
        reviews: [{ text, rating: null, category: 'general' }],
      })
      setResult(r.data)
      setProgress(100)
      toast.success('Analysis complete!')
    } catch (e) {
      setError(e.message)
      toast.error('Analysis failed')
    } finally {
      setLoading(false)
    }
  }

  const loadDemo = async () => {
    setLoading(true)
    setStepLabel('Loading demo dataset…')
    try {
      const r = await API.get('/load-demo')
      const fd = new FormData()
      // Create a dummy file to pass to analyze/sync
      const csvContent = r.data.reviews
        .map(rv => `"${(rv.text || '').replace(/"/g, '""')}",${rv.rating || ''},${rv.category || ''},${rv.date || ''}`)
        .join('\n')
      const blob = new Blob([`text,rating,category,date\n${csvContent}`], { type: 'text/csv' })
      fd.append('file', blob, 'demo.csv')
      const res = await API.post('/analyze/sync', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data)
      setProgress(100)
      fireConfetti()
      toast.success(`✅ Demo: ${res.data.total_reviews} reviews loaded!`)
    } catch (e) {
      toast.error('Failed to load demo data')
    } finally {
      setLoading(false)
    }
  }

  return { analyze, analyzeText, loadDemo, loading, progress, stepLabel, result, error }
}

function fireConfetti() {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#00ff88', '#ff00ff', '#00d4ff', '#ffd700'],
  })
}
