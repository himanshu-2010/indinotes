import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Settings {
  theme: 'dark' | 'light'
  defaultPenColor: string
  defaultCanvasBg: string
}

const DEFAULTS: Settings = {
  theme: 'dark',
  defaultPenColor: '#000000',
  defaultCanvasBg: '#1e1e1e',
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem('indinotes:settings')
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULTS
}

function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme)
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsModal({ open, onClose }: Props) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const update = (patch: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    setDirty(true)
  }

  const save = () => {
    localStorage.setItem('indinotes:settings', JSON.stringify(settings))
    applyTheme(settings.theme)
    setDirty(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-alt)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 24,
              width: 360,
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              boxShadow: 'var(--shadow)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>Settings</span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--text)' }}>
              Theme
              <button
                onClick={() => update({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
                style={{
                  padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {settings.theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--text)' }}>
              Default pen color
              <input
                type="color"
                value={settings.defaultPenColor}
                onChange={(e) => update({ defaultPenColor: e.target.value })}
                style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }}
              />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--text)' }}>
              Default canvas background
              <input
                type="color"
                value={settings.defaultCanvasBg}
                onChange={(e) => update({ defaultCanvasBg: e.target.value })}
                style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }}
              />
            </label>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13,
                }}
              >Cancel</button>
              <button
                onClick={save}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: dirty ? 'var(--accent)' : 'var(--panel)',
                  color: dirty ? '#fff' : 'var(--muted)',
                  cursor: dirty ? 'pointer' : 'default', fontSize: 13, fontWeight: 600,
                }}
              >{dirty ? 'Save' : 'Saved'}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export { DEFAULTS, type Settings, loadSettings }
