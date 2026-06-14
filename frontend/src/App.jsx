import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ParticlesBackground from './utils/particles.jsx'

export default function App() {
  const [darkMode, setDarkMode] = useState(true)
  const [analysisResult, setAnalysisResult] = useState(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  return (
    <BrowserRouter>
      <div className={`min-h-screen relative ${darkMode ? 'dark bg-[#050510]' : 'bg-[#f0f4ff]'}`}>
        <ParticlesBackground darkMode={darkMode} />
        <div className="relative z-10">
          <Navbar darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />
          <Routes>
            <Route path="/"
              element={<HomePage onResult={setAnalysisResult} />}
            />
            <Route path="/dashboard"
              element={<DashboardPage result={analysisResult} />}
            />
          </Routes>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'rgba(10,10,30,0.9)',
              color: '#f0f0ff',
              border: '1px solid rgba(0,255,136,0.3)',
              backdropFilter: 'blur(16px)',
            },
          }}
        />
      </div>
    </BrowserRouter>
  )
}
