import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import MainWorkspace from './MainWorkspace'

export default function HomePage() {
  const btnStyle: React.CSSProperties = {
    padding: '10px 18px', borderRadius: 8,
    background: 'var(--panel)', border: '1px solid var(--border)',
    color: 'var(--text)', textDecoration: 'none',
    fontSize: 13, fontWeight: 500,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  }
  const [launched, setLaunched] = useState(() => {
    try { return sessionStorage.getItem('indinotes:launched') === 'true' } catch { return false }
  })

  useEffect(() => {
    if (launched) sessionStorage.setItem('indinotes:launched', 'true')
  }, [launched])

  if (launched) return <MainWorkspace onGoHome={() => { setLaunched(false); try { sessionStorage.removeItem('indinotes:launched') } catch {} }} />

  return (
    <div style={{
      height: '100dvh', width: '100%', overflow: 'auto',
      background: 'var(--bg)',
      color: 'var(--text)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Hero */}
      <section style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '60px 24px 40px', textAlign: 'center', gap: 8, flexShrink: 0,
      }}>
        <motion.img
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          src="logo-192.png"
          alt="IndiNotes"
          style={{ width: 80, height: 80, borderRadius: 16, marginBottom: 8 }}
        />
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ margin: 0, fontSize: 36, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.5px' }}
        >IndiNotes</motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ margin: 0, fontSize: 16, color: 'var(--muted)', maxWidth: 480, lineHeight: 1.5 }}
        >A local-first student notebook with a vector canvas and interactive graphing calculator.</motion.p>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setLaunched(true)}
          style={{
            marginTop: 20, padding: '12px 40px', borderRadius: 10,
            border: 'none', background: 'var(--accent)', color: '#fff',
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(212, 165, 71, 0.3)',
          }}
        >Launch App</motion.button>
      </section>

      {/* Features */}
      <section style={{
        padding: '40px 24px', maxWidth: 900, margin: '0 auto', width: '100%',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>Why IndiNotes?</h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12,
        }}>
          {[
            { title: 'Canvas Drawing', desc: 'Freehand pen strokes, shapes, text, and images on an infinite canvas with zoom and pan.' },
            { title: 'Graphing Calculator', desc: 'Plot multiple equations with real-time rendering. Supports sin, cos, x^2, and any mathjs expression.' },
            { title: 'Chapter Organization', desc: 'Keep notes organized with chapters, priority color tags, search, and drag-and-drop reordering.' },
            { title: 'Export & Backup', desc: 'Export canvas or graph as PNG, PDF, or JSON. Full backup and restore for all chapters.' },
            { title: 'Desktop & Mobile', desc: 'Available as a PWA in the browser, an Electron desktop app, or an Android APK.' },
            { title: 'Optional Cloud Sync', desc: 'Sync notes across devices via Supabase. Works fully offline without it.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              style={{
                padding: 16, borderRadius: 10,
                background: 'var(--panel)', border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How to Use */}
      <section style={{
        padding: '40px 24px', maxWidth: 900, margin: '0 auto', width: '100%',
      }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>How to Use</h2>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: 'var(--muted)', lineHeight: 2 }}>
          <li>Click <strong style={{ color: 'var(--text)' }}>+ New Chapter</strong> in the sidebar to create a notebook page.</li>
          <li>Use the toolbar to switch between <strong style={{ color: 'var(--text)' }}>Canvas</strong> (drawing) and <strong style={{ color: 'var(--text)' }}>Graph</strong> (equations).</li>
          <li>Select a tool (pen, shape, text, eraser) and draw on the canvas. Use <strong style={{ color: 'var(--text)' }}>Ctrl+Z</strong> to undo.</li>
          <li>In the Graph tab, type equations like <code style={{ fontSize: 13 }}>y = sin(x)</code> and see them plotted instantly.</li>
          <li>Export your work as <strong style={{ color: 'var(--text)' }}>PNG</strong>, <strong style={{ color: 'var(--text)' }}>PDF</strong>, or <strong style={{ color: 'var(--text)' }}>JSON</strong> from the top menu.</li>
        </ol>
      </section>

      {/* Download */}
      <section style={{
        padding: '40px 24px 60px', maxWidth: 900, margin: '0 auto', width: '100%',
      }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>Download</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--muted)' }}>
          Get the standalone desktop or mobile app for offline use and persistent storage.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <motion.a
            href="release/IndiNotes-0.0.0.AppImage"
            download="IndiNotes.AppImage"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={btnStyle}
          >Linux (.AppImage)</motion.a>
          <motion.a
            href="release/indinotes_0.0.0_amd64.deb"
            download="IndiNotes.deb"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={btnStyle}
          >Linux (.deb)</motion.a>
          <motion.a
            href="release/indinotes-0.0.0.x86_64.rpm"
            download="IndiNotes.rpm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={btnStyle}
          >Linux (.rpm)</motion.a>
          <motion.a
            href="release/indinotes_0.0.0_amd64.snap"
            download="IndiNotes.snap"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={btnStyle}
          >Linux (.snap)</motion.a>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          Windows (.exe) and Android (.apk) available from{' '}
          <a href="https://github.com/himanshu-2010/indinotes/releases" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'none' }}
          >GitHub Releases</a>.
          Build from source with <code style={{ fontSize: 12 }}>npm run dist:win</code> (requires Wine on Linux) or
          <code style={{ fontSize: 12 }}> npm run mobile:build</code> (requires Android SDK / JDK 17).
        </div>
      </section>

      {/* Footer */}
      <div style={{
        padding: '16px 24px', textAlign: 'center',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: 12, color: 'var(--muted)', flexShrink: 0,
      }}>
        IndiNotes &mdash; open source on{' '}
        <a href="https://github.com/himanshu-2010/indinotes" target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'none' }}
        >GitHub</a>
      </div>
    </div>
  )
}
