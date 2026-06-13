import { useEffect, useState } from 'react'

export default function ParticlesBackground({ darkMode }) {
  const [Particles, setParticles] = useState(null)
  const [initParticles, setInitParticles] = useState(null)

  useEffect(() => {
    Promise.all([
      import('@tsparticles/react'),
      import('@tsparticles/slim'),
    ]).then(([{ default: P, initParticlesEngine }, { loadSlim }]) => {
      initParticlesEngine(async (engine) => {
        await loadSlim(engine)
      }).then(() => {
        setParticles(() => P)
        setInitParticles(true)
      })
    }).catch(() => {})
  }, [])

  if (!Particles || !initParticles) {
    // CSS-only fallback background
    return (
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: darkMode
            ? 'radial-gradient(ellipse at 20% 50%, rgba(0,255,136,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(255,0,255,0.04) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(0,212,255,0.04) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at 20% 50%, rgba(0,200,100,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(200,0,200,0.06) 0%, transparent 50%)',
        }}
      />
    )
  }

  return (
    <Particles
      id="tsparticles"
      options={{
        background: { color: { value: 'transparent' } },
        fpsLimit: 40,
        interactivity: {
          events: {
            onHover: { enable: true, mode: 'repulse' },
            onClick: { enable: true, mode: 'push' },
          },
          modes: {
            repulse: { distance: 80, duration: 0.4 },
            push:    { quantity: 3 },
          },
        },
        particles: {
          color: { value: darkMode ? ['#00ff8866', '#ff00ff44', '#00d4ff44'] : ['#00cc6644', '#cc00cc33', '#0099cc33'] },
          links: {
            color: darkMode ? '#ffffff11' : '#00000011',
            distance: 120,
            enable: true,
            opacity: 0.3,
            width: 0.8,
          },
          move: { enable: true, speed: 0.6, direction: 'none', random: true, outModes: 'bounce' },
          number: { density: { enable: true }, value: 60 },
          opacity: { value: { min: 0.2, max: 0.6 }, animation: { enable: true, speed: 0.5 } },
          size:    { value: { min: 1, max: 3 }, animation: { enable: true, speed: 1 } },
        },
        detectRetina: true,
      }}
    />
  )
}
