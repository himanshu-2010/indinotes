import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STYLE_COLLECTIONS, autoColors } from '../lib/colorUtils'

interface Settings {
  theme: 'dark' | 'light'
  defaultPenColor: string
  defaultCanvasBg: string
}

const DEFAULTS: Settings = {
  theme: 'dark',
  defaultPenColor: '#ffffff',
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
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const update = (patch: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
    setDirty(true)
    setSelectedStyle(null)
  }

  const applyStyleCollection = (style: typeof STYLE_COLLECTIONS[number]) => {
    const p = autoColors(style.bgColor)
    setSettings(prev => ({
      ...prev,
      defaultCanvasBg: style.bgColor,
      defaultPenColor: p.pen,
    }))
    setSelectedStyle(style.id)
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
              width: 400,
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: 'var(--shadow)',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-h)' }}>Settings</span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: 8 }}>STYLE COLLECTIONS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {STYLE_COLLECTIONS.map(s => (
                  <motion.button
                    key={s.id}
                    onClick={() => applyStyleCollection(s)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '8px 10px', borderRadius: 8, border: selectedStyle === s.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                      background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 12, textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, background: s.bgColor, border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      {[s.palette.pen, s.palette.text, s.palette.shape].map((c, i) => (
                        <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.15)' }} />
                      ))}
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
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

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>
                Canvas background
                <input
                  type="color"
                  value={settings.defaultCanvasBg}
                  onChange={(e) => update({ defaultCanvasBg: e.target.value })}
                  style={{ width: 32, height: 32, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }}
                />
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
            </div>

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
