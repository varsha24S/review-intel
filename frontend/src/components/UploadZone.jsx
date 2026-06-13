import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, CheckCircle, X } from 'lucide-react'

export default function UploadZone({ onFile, disabled }) {
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const onDrop = useCallback((accepted) => {
    if (accepted.length) {
      setFile(accepted[0])
      onFile(accepted[0])
    }
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
    },
    multiple: false,
    disabled,
  })

  const clearFile = (e) => {
    e.stopPropagation()
    setFile(null)
    onFile(null)
  }

  return (
    <motion.div
      {...getRootProps()}
      animate={{
        borderColor: isDragActive || dragOver
          ? 'rgba(0,255,136,0.8)'
          : file
          ? 'rgba(0,212,255,0.5)'
          : 'rgba(255,255,255,0.15)',
        boxShadow: isDragActive
          ? '0 0 30px rgba(0,255,136,0.3), inset 0 0 20px rgba(0,255,136,0.05)'
          : file
          ? '0 0 20px rgba(0,212,255,0.2)'
          : '0 0 0px transparent',
      }}
      transition={{ duration: 0.25 }}
      className={`
        relative rounded-2xl border-2 border-dashed p-10 cursor-pointer
        transition-colors duration-300 text-center
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-neon-green/50'}
        ${isDragActive ? 'bg-neon-green/5' : 'bg-white/[0.03]'}
      `}
    >
      <input {...getInputProps()} />

      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="file"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="relative">
              <CheckCircle size={48} className="text-neon-blue" />
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ boxShadow: ['0 0 0px #00d4ff', '0 0 20px #00d4ff44', '0 0 0px #00d4ff'] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <p className="font-semibold text-neon-blue text-lg">{file.name}</p>
              <p className="text-sm text-white/50 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={clearFile}
              className="flex items-center gap-1 text-xs text-white/40 hover:text-red-400 transition-colors mt-1"
            >
              <X size={12} /> Remove
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Upload
                size={52}
                className={isDragActive ? 'text-neon-green' : 'text-white/30'}
              />
            </motion.div>
            <div>
              <p className="text-lg font-semibold text-white/80">
                {isDragActive ? '🎯 Drop your file here!' : 'Drag & drop reviews file'}
              </p>
              <p className="text-sm text-white/40 mt-1">
                CSV, JSON, or TXT · up to 50 MB
              </p>
            </div>
            <div className="flex gap-2 mt-1 flex-wrap justify-center">
              {['.csv', '.json', '.txt'].map(ext => (
                <span key={ext} className="px-3 py-1 rounded-full bg-white/10 text-xs text-white/60 border border-white/15">
                  {ext}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corner decorations */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-neon-green/40 rounded-tl" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-neon-green/40 rounded-tr" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-neon-green/40 rounded-bl" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-neon-green/40 rounded-br" />
    </motion.div>
  )
}
