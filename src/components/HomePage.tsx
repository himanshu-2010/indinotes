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
          style={{ margin: 0, fontSize: 16, color: 'var(--muted)', maxWidth: 520, lineHeight: 1.5 }}
        >A local-first student notebook with a vector drawing canvas, interactive graphing calculator, chapter organization, voice notes, and more — all stored locally in your browser.</motion.p>
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

      {/* About */}
      <section style={{ padding: '40px 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>About</h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
          IndiNotes is a <strong style={{ color: 'var(--text)' }}>local-first student notebook</strong> built with React 19, TypeScript 6, Vite 8, Konva.js, and Dexie.js (IndexedDB). It runs entirely in your browser — no server, no sign-up, no data sent anywhere. Everything you draw, write, or record stays in your browser's local database.
        </p>
        <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
          Created by <a href="https://himanshu-2010.github.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Himanshu</a>. Available as a PWA in any browser, an Electron desktop app for Linux / Windows / macOS, or an Android APK via Capacitor.
        </p>
      </section>

      {/* Creator */}
      <section style={{ padding: '0 24px 40px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24, borderRadius: 12, background: 'var(--panel)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            <img src="himanshu.png" alt="Himanshu" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--border)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 700, color: 'var(--text-h)' }}>Himanshu Kumar</h3>
              <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500, marginBottom: 6 }}>🇮🇳 10th Grade &middot; Jamshedpur, India</div>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
                A 10th-grade student from India with a deep passion for technology and problem-solving. Interests revolve around electronics, robotics, Arduino, and embedded systems — bringing ideas to life through hands-on projects. From RC battle bots to smart farm automation, always tinkering with something new. Math and CS are favorite subjects, dreams of working at NVIDIA to contribute to cutting-edge innovation.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
                <span>🤖 Robotics</span><span>⚡ Arduino</span><span>🌐 IoT</span><span>🏀 Basketball</span><span>💻 Web Dev</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', padding: '12px 0', borderTop: '1px solid var(--border-subtle)' }}>
            <span>📧 himanshujsr462@gmail.com</span>
            <a href="https://github.com/himanshu-2010" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>🐱 GitHub</a>
            <a href="https://himanshu-2010.github.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>🌐 Portfolio</a>
            <span>🎯 Dream Goal: Work at NVIDIA</span>
            <span>📚 Fav Subjects: Math &amp; CS</span>
          </div>
        </div>
      </section>

      {/* Passion & Goals */}
      <section style={{ padding: '0 24px 40px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <CreatorDropdown />
      </section>

      {/* Canvas Features */}
      <section style={{ padding: '0 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>Canvas Editor</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
          {[
            { title: 'Drawing Tools', desc: 'Pen, eraser, shape (rect, circle, triangle, pentagon, arrow), text, fill, and image tools. Switch instantly from the toolbar.' },
            { title: 'Highlighter', desc: 'A dedicated highlight mode in the pen tool — wide semi-transparent yellow stroke for marking up notes and readings.' },
            { title: 'Selection Toolbar', desc: 'When you select any element, the toolbar adapts: font family, size, bold/italic, and color for text; fill and stroke color for shapes; color and width for strokes.' },
            { title: 'Element Layers', desc: 'Reorder elements with ↑/↓ buttons or the dedicated Layers panel. Drag-and-drop layers to change z-order. Works on touch devices too.' },
            { title: 'Opacity Control', desc: 'Every element supports opacity from 10% to 100%. Adjust via the selection toolbar or the More menu on mobile.' },
            { title: 'Copy / Paste / Duplicate', desc: 'Ctrl+C copies selected elements to an internal clipboard. Ctrl+V pastes at a +20px offset. Ctrl+D duplicates in place. Works across chapters.' },
            { title: 'Shape Stroke', desc: 'Selected shapes show fill + stroke color pickers and a stroke width slider. Customize how your shapes look.' },
            { title: 'Grid & Snap', desc: 'Toggleable 40px grid overlay. When the grid is on, dragged elements snap to grid points for precise alignment.' },
            { title: 'Smart Shapes', desc: 'Hold Shift while drawing to constrain rectangles, circles, triangles, and pentagons to perfect aspect ratio. Arrows snap to 45-degree increments.' },
            { title: 'Zoom & Pan', desc: 'Scroll to zoom, click-drag to pan (select tool on empty canvas). Zoom buttons (+ / - / Reset) and a Fit button that auto-scales to show all elements.' },
            { title: 'Undo / Redo', desc: '25-step history stack. Ctrl+Z to undo, Ctrl+Y to redo. Undo stores full content snapshots for reliability.' },
            { title: 'Image Import', desc: 'Import images via the toolbar button, drag-and-drop directly onto the canvas, paste from clipboard (Ctrl+V), or import PDF pages via pdfjs-dist.' },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.02 }}
              style={{ padding: 14, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Graph Features */}
      <section style={{ padding: '40px 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>Graphing Calculator</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
          {[
            { title: 'Expression List', desc: 'Type equations like sin(x), x^2, cos(x) + 2 and see them plotted in real time using mathjs parsing and custom Canvas 2D rendering.' },
            { title: 'Adaptive Sampling', desc: 'The graph uses adaptive pixel-step sampling — at default zoom it samples every pixel, zoomed out it samples fewer points for performance, zoomed in it renders pixel-perfect.' },
            { title: 'Graph to Canvas', desc: 'Capture the current graph view as a PNG snapshot and insert it directly into your canvas workspace — great for annotated graph notes.' },
            { title: 'SVG Export', desc: 'Export the graph as an SVG file (with embedded PNG) for insertion into LaTeX documents, reports, or vector editors.' },
            { title: 'Color & Visibility', desc: 'Each expression has its own color picker and show/hide toggle. Multiple expressions overlay naturally.' },
            { title: 'Mobile Drawer', desc: 'On small screens (&lt;640px), the expression sidebar becomes a bottom-sheet drawer for a comfortable one-handed experience.' },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.02 }}
              style={{ padding: 14, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Organization & Export */}
      <section style={{ padding: '0 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>Organization &amp; Export</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
          {[
            { title: 'Chapters', desc: 'Notebook pages with title, content, priority color, folder assignment, and tags. Create, reorder, delete, and search from the sidebar.' },
            { title: 'Folders', desc: 'Group chapters into folders with a nested tree in the sidebar. Create, rename, and delete folders. Deleting a folder moves its chapters to root.' },
            { title: 'Tags', desc: 'Assign comma-separated tags to any chapter. Tags appear as inline badges in the sidebar (up to 2 visible, +N overflow). Edit tags inline and search by tag name.' },
            { title: 'Export Options', desc: 'Export the current canvas or graph as PNG, multi-page PDF (canvas + graph), SVG, or full chapter JSON. Bulk backup and restore all chapters.' },
            { title: 'Canvas to Clipboard', desc: 'Copy the visible canvas as an image to your clipboard with Ctrl+Shift+C or the 📋 button in the toolbar.' },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.02 }}
              style={{ padding: 14, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Student Tools */}
      <section style={{ padding: '40px 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>Student Tools</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
          {[
            { title: 'Voice Notes', desc: 'Record audio notes directly in the browser and attach them to any chapter. Uses the MediaRecorder API. Recordings are stored as blobs in IndexedDB. Play back or delete from the voice notes panel.' },
            { title: 'Pomodoro Timer', desc: 'Built-in study timer with 25-minute focus and 5-minute break cycles. Start, pause, and reset controls. Desktop notifications when a session completes. Accessible from the toolbar or More menu.' },
            { title: 'PDF Annotation', desc: 'Import any PDF document — the first page is rendered via pdfjs-dist and inserted as an image layer on the canvas. Draw, highlight, and annotate directly on top of it.' },
            { title: 'Font Library', desc: 'Choose from 70+ fonts including sans-serif (Inter, Roboto, Open Sans), serif (Merriweather, Playfair), monospace (JetBrains Mono, Fira Code), handwriting, and display fonts. All loaded from Google Fonts.' },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 + i * 0.02 }}
              style={{ padding: 14, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Technical Details */}
      <section style={{ padding: '0 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>Technical Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 10 }}>
          {[
            { title: 'Local Storage', desc: 'All data stored in IndexedDB via Dexie.js v4. Chapters, folders, and voice notes. No account needed. Everything works fully offline.' },
            { title: 'Architecture', desc: 'Zustand state management (no Immer). Konva.js via react-konva for vector canvas. Raw Canvas 2D for graph rendering. Elements stored as Map<string, Element> for O(1) lookups.' },
            { title: 'Cross-Platform', desc: 'PWA (browser), Electron desktop (Windows/Linux/macOS), Android via Capacitor. Vite base: ./ for file:// protocol support in Electron builds.' },
          ].map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.02 }}
              style={{ padding: 14, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: 'var(--panel)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)', marginBottom: 6 }}>Tech Stack</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
            React 19 &middot; TypeScript 6.0 &middot; Vite 8 &middot; ESLint &middot; Konva.js + react-konva &middot; mathjs &middot; Zustand &middot; Dexie.js 4 &middot; jsPDF &middot; pdfjs-dist &middot; Framer Motion &middot; Electron + electron-builder &middot; Capacitor 8 &middot; 70+ Google Fonts &middot; Workbox PWA
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section style={{ padding: '40px 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>Keyboard Shortcuts</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6 }}>
          {[
            ['Ctrl+Z', 'Undo'],
            ['Ctrl+Y', 'Redo'],
            ['Ctrl+D', 'Duplicate selected'],
            ['Ctrl+C', 'Copy selected'],
            ['Ctrl+V', 'Paste'],
            ['Ctrl+Shift+C', 'Copy canvas to clipboard'],
            ['Delete / Backspace', 'Delete selected'],
            ['Escape', 'Deselect / close dialogs'],
            ['?', 'Toggle shortcuts dialog'],
          ].map(([key, desc]) => (
            <div key={key as string} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '4px 0' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{desc as string}</span>
              <code style={{ fontSize: 11, background: 'var(--bg-alt)', padding: '2px 6px', borderRadius: 4, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{key as string}</code>
            </div>
          ))}
        </div>
      </section>

      {/* Download */}
      <section style={{
        padding: '0 24px', maxWidth: 900, margin: '0 auto', width: '100%',
      }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>Download</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--muted)' }}>
          Get the standalone desktop or mobile app for offline use and persistent storage.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <motion.a href="release/IndiNotes-0.0.0.AppImage" download="IndiNotes.AppImage" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={btnStyle}>🐧 Linux (.AppImage)</motion.a>
          <motion.a href="release/indinotes_0.0.0_amd64.deb" download="IndiNotes.deb" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={btnStyle}>🐧 Linux (.deb)</motion.a>
          <motion.a href="release/indinotes-0.0.0.x86_64.rpm" download="IndiNotes.rpm" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={btnStyle}>🐧 Linux (.rpm)</motion.a>
          <motion.a href="release/indinotes_0.0.0_amd64.snap" download="IndiNotes.snap" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={btnStyle}>🐧 Linux (.snap)</motion.a>
          <motion.a href="release/IndiNotes-Setup-0.0.0.exe" download="IndiNotes-Setup.exe" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={btnStyle}>🪟 Windows (.exe)</motion.a>
          <motion.a href="release/IndiNotes-0.0.0.dmg" download="IndiNotes.dmg" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ ...btnStyle, opacity: 0.7 }}>🍎 macOS (.dmg) <span style={{ fontSize: 10, background: 'rgba(212,165,71,0.2)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 4 }}>not tested yet</span></motion.a>
          <motion.a href="release/IndiNotes-0.0.0.apk" download="IndiNotes.apk" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={btnStyle}>📱 Android (.apk)</motion.a>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          Build from source: <code style={{ fontSize: 12 }}>npm run dist:linux</code> &middot; <code style={{ fontSize: 12 }}>npm run dist:win</code> (Wine) &middot; <code style={{ fontSize: 12 }}>npm run dist:mac</code> (macOS) &middot; <code style={{ fontSize: 12 }}>npm run mobile:build</code> (Android SDK / JDK 17)
        </div>
      </section>

      {/* Contribute */}
      <section style={{ padding: '40px 24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 600, color: 'var(--text-h)' }}>Contribute</h2>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
          IndiNotes is free and open source (MIT). All contributions are welcome — code, bug reports, feature requests, documentation, or testing on platforms the author cannot test (macOS, Windows, iOS).
          If you can help test or fix any platform-specific issues, your help is greatly appreciated.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <motion.a href="https://github.com/himanshu-2010/indinotes" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={btnStyle}>⭐ GitHub</motion.a>
          <motion.a href="https://github.com/himanshu-2010/indinotes/issues" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={btnStyle}>🐛 Report Issue</motion.a>
          <motion.a href="https://himanshu-2010.github.io" target="_blank" rel="noopener noreferrer" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={btnStyle}>👤 About Himanshu</motion.a>
        </div>
      </section>

      {/* Footer */}
      <div style={{
        padding: '16px 24px', textAlign: 'center',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: 12, color: 'var(--muted)', flexShrink: 0,
      }}>
        IndiNotes by <a href="https://himanshu-2010.github.io" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Himanshu</a> &mdash; open source on{' '}
        <a href="https://github.com/himanshu-2010/indinotes" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>GitHub</a>
      </div>
    </div>
  )
}

function CreatorDropdown() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius: 12, background: 'var(--panel)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', color: 'var(--text-h)', cursor: 'pointer', fontSize: 15, fontWeight: 600,
        }}
      >
        <span>My Passion &amp; Goals</span>
        <span style={{ transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.2s', fontSize: 12 }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 20px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.8 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: 'var(--text-h)' }}>A Journey into Technology, Innovation, and Creation</h4>
          <p style={{ margin: '0 0 12px' }}>
            Technology is more than an interest for me; it is a field of exploration, creativity, and continuous learning. My passion lies in understanding how systems work and transforming ideas into real-world projects. I enjoy combining curiosity with practical implementation to build solutions that are both useful and innovative.
          </p>

          <h4 style={{ margin: '16px 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>Passion for Technology and Engineering</h4>
          <p style={{ margin: '0 0 8px' }}>
            I have a strong passion for electronics, software development, and emerging technologies. I enjoy working on projects involving microcontrollers, robotics, web development, artificial intelligence, and system customization. Building prototypes and experimenting with hardware and software gives me the opportunity to learn beyond theory and gain real experience.
          </p>
          <p style={{ margin: '0 0 6px', fontWeight: 500, color: 'var(--text)' }}>My interests include:</p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
            <li>Full-stack web development using modern technologies</li>
            <li>Electronics and embedded systems projects</li>
            <li>Robotics and automation</li>
            <li>Artificial Intelligence and local AI models</li>
            <li>Linux customization and system optimization</li>
            <li>Designing and developing practical applications</li>
          </ul>

          <h4 style={{ margin: '16px 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>Goals and Future Vision</h4>
          <p style={{ margin: '0 0 8px' }}>
            My goal is to become a highly skilled technology creator who can develop both software and hardware solutions. I aim to continuously expand my knowledge and improve my technical abilities through real projects and hands-on experience.
          </p>
          <p style={{ margin: '0 0 6px', fontWeight: 500, color: 'var(--text)' }}>My future objectives include:</p>
          <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
            <li>Building innovative applications and products</li>
            <li>Developing expertise in software engineering and electronics</li>
            <li>Creating useful technology solutions that solve real problems</li>
            <li>Exploring advanced technologies and AI systems</li>
            <li>Converting ideas into complete, functional products</li>
          </ul>

          <h4 style={{ margin: '16px 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>Learning Philosophy</h4>
          <p style={{ margin: '0 0 12px' }}>
            I believe learning becomes more powerful when combined with practical implementation. Instead of only studying concepts, I prefer building projects, experimenting with ideas, troubleshooting problems, and gaining experience through creation.
          </p>

          <h4 style={{ margin: '16px 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>Conclusion</h4>
          <p style={{ margin: 0 }}>
            My journey is driven by curiosity, innovation, and the desire to create. I do not simply want to use technology; I want to understand it, improve it, and build something meaningful from it. Every project becomes a step toward developing skills and achieving larger goals in the world of technology and engineering.
          </p>
        </div>
      )}
    </div>
  )
}
