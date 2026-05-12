import React, { useMemo, useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import useNotesStore from '../stores/notesStore'
import type { Chapter, NotesState } from '../stores/notesStore'
import CanvasEditor from './CanvasEditor'
import type { CanvasEditorRef, Element } from './CanvasEditor'
import GraphEditor, { type GraphEditorRef } from './GraphEditor'
import SyncIndicator from './SyncIndicator'
import SettingsModal, { loadSettings } from './SettingsModal'
import { jsPDF } from 'jspdf'

const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 480
const SIDEBAR_DEFAULT = 260

function useScreenSize() {
  const [size, setSize] = useState<'sm' | 'md' | 'lg'>(() =>
    window.innerWidth < 480 ? 'sm' : window.innerWidth < 768 ? 'md' : 'lg'
  )
  useEffect(() => {
    const onResize = () => {
      setSize(window.innerWidth < 480 ? 'sm' : window.innerWidth < 768 ? 'md' : 'lg')
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

interface Props {
  onGoHome?: () => void
}

const MainWorkspace: React.FC<Props> = ({ onGoHome }) => {
  const screen = useScreenSize()
  const isMobile = screen !== 'lg'

  const chapters = useNotesStore((s: NotesState) => s.chapters)
  const selectedId = useNotesStore((s: NotesState) => s.selectedId)
  const loading = useNotesStore((s: NotesState) => s.loading)
  const createChapter = useNotesStore((s: NotesState) => s.createChapter)
  const updateChapter = useNotesStore((s: NotesState) => s.updateChapter)
  const deleteChapter = useNotesStore((s: NotesState) => s.deleteChapter)
  const selectChapter = useNotesStore((s: NotesState) => s.selectChapter)
  const undo = useNotesStore((s: NotesState) => s.undo)
  const redo = useNotesStore((s: NotesState) => s.redo)
  const canUndo = useNotesStore((s: NotesState) => s.canUndo)
  const canRedo = useNotesStore((s: NotesState) => s.canRedo)
  const pushHistory = useNotesStore((s: NotesState) => s.pushHistory)
  const editorRef = useRef<CanvasEditorRef>(null)
  const graphRef = useRef<GraphEditorRef>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sidebarDragRef = useRef(false)
  const sidebarWidthRef = useRef(SIDEBAR_DEFAULT)

  const [settingsOpen, setSettingsOpen] = useState(false)

  const applySettings = () => {
    const s = loadSettings()
    setDrawSettings(prev => ({ ...prev, color: s.defaultPenColor }))
  }

  const [activeTab, setActiveTab] = useState<'canvas' | 'graph'>('canvas')
  const [tool, setTool] = useState<'select' | 'pen' | 'eraser' | 'text' | 'shape' | 'image' | 'fill'>('select')
  const [shapeType, setShapeType] = useState<'rect' | 'circle' | 'triangle' | 'pentagon' | 'arrow'>('rect')
  const [canvasSelectedId, setCanvasSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try { return parseInt(localStorage.getItem('indinotes:sidebarWidth') || '', 10) || SIDEBAR_DEFAULT } catch { return SIDEBAR_DEFAULT }
  })
  const [showSidebar, setShowSidebar] = useState(!isMobile)

  useEffect(() => {
    setShowSidebar(!isMobile)
  }, [isMobile])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!sidebarDragRef.current) return
      const w = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, e.clientX))
      setSidebarWidth(w)
      sidebarWidthRef.current = w
    }
    const onMouseUp = () => {
      if (sidebarDragRef.current) {
        sidebarDragRef.current = false
        localStorage.setItem('indinotes:sidebarWidth', String(sidebarWidthRef.current))
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  const selected = chapters.find((n: Chapter) => n.id === selectedId)

  const noteData = useMemo(() => {
    if (!selected) return { elements: [], graph: { formula: 'sin(x)', mode: '2d', lines: [{ id: '1', formula: 'sin(x)', color: '#D4A547' }] }, settings: { bgColor: '#1e1e1e', showGrid: true } }
    try {
      const parsed = JSON.parse(selected.content || '{}')
      return {
        elements: Array.isArray(parsed.elements) ? parsed.elements : [],
        graph: parsed.graph || { formula: 'sin(x)', mode: '2d', lines: [{ id: '1', formula: 'sin(x)', color: '#D4A547' }] },
        settings: parsed.settings || { bgColor: '#1e1e1e', showGrid: true }
      }
    } catch {
      if (typeof selected.content === 'string' && selected.content.startsWith('{')) {
         return { elements: [], graph: { formula: 'sin(x)', mode: '2d', lines: [{ id: '1', formula: 'sin(x)', color: '#D4A547' }] }, settings: { bgColor: '#1e1e1e', showGrid: true } }
      }
      return { 
        elements: [{ id: 't0', type: 'text', x: 20, y: 20, text: selected.content, fontSize: 18 }], 
        graph: { formula: 'sin(x)', mode: '2d', lines: [{ id: '1', formula: 'sin(x)', color: '#D4A547' }] },
        settings: { bgColor: '#1e1e1e', showGrid: true }
      }
    }
  }, [selected])

  React.useEffect(() => {
    if (noteData.settings) {
      setCanvasBgColor(noteData.settings.bgColor || '#ffffff')
      setShowGrid(!!noteData.settings.showGrid)
    }
  }, [selectedId])

  const [canvasBgColor, setCanvasBgColor] = useState('#1e1e1e')
  const [showGrid, setShowGrid] = useState(true)

  const [drawSettings, setDrawSettings] = useState({    color: loadSettings().defaultPenColor,
    width: 2,
    mode: 'pen' as const,
  })
  
  const [textSettings, setTextSettings] = useState({
    color: '#000000',
    fontSize: 18,
    fontStyle: 'normal' as const,
    fontFamily: 'Roboto',
  })
  
  const [shapeColor, setShapeColor] = useState('#D4A547')

  const handleElementsChange = (els: Element[]) => {
    if (!selected) return
    const updatedContent = JSON.stringify({ ...noteData, elements: els, settings: { bgColor: canvasBgColor, showGrid } })
    pushHistory(selected.content, selected.id)
    updateChapter(selected.id, { content: updatedContent }, false)
  }

  const handleSettingsChange = (newBg: string, newGrid: boolean) => {
    if (!selected) return
    pushHistory(selected.content, selected.id)
    setCanvasBgColor(newBg)
    setShowGrid(newGrid)
    const updatedContent = JSON.stringify({ ...noteData, settings: { bgColor: newBg, showGrid: newGrid } })
    updateChapter(selected.id, { content: updatedContent }, false)
  }

  const handleGraphChange = (graphContent: string) => {
    if (!selected) return
    const graphData = JSON.parse(graphContent)
    const updatedContent = JSON.stringify({ ...noteData, graph: graphData })
    updateChapter(selected.id, { content: updatedContent })
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selected) return
    const reader = new FileReader()
    reader.onload = () => {
      const id = 'img-' + Date.now().toString()
      const newImage: Element = {
        id,
        type: 'image',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        src: reader.result as string
      }
      handleElementsChange([...noteData.elements, newImage])
    }
    reader.readAsDataURL(file)
  }

  const exportContent = (format: 'pdf' | 'png' | 'json') => {
    if (!selected) return
    const filename = selected.title || 'chapter'
    
    const getImage = () => {
      if (activeTab === 'canvas') return editorRef.current?.getStageImage()
      if (activeTab === 'graph') return graphRef.current?.getCanvasImage()
      return undefined
    }
    
    if (format === 'png') {
      const imgData = getImage()
      if (imgData) {
        const link = document.createElement('a')
        link.download = filename + '.png'
        link.href = imgData
        link.click()
        return
      }
    }
    
    if (format === 'pdf') {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [800, 600] })
      const imgData = getImage()
      if (imgData) {
        doc.addImage(imgData, 'PNG', 0, 0, 800, 600)
        doc.save(filename + '.pdf')
        return
      }
      doc.setFontSize(24)
      doc.text(selected.title || 'Untitled', 40, 40)
      doc.setFontSize(14)
      doc.save(filename + '.pdf')
    }
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify({ chapter: selected, elements: noteData.elements, graph: noteData.graph, settings: noteData.settings }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = filename + '.json'
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const exportBackup = () => {
    const data = chapters.map((c: Chapter) => ({ id: c.id, title: c.title, content: c.content, priorityColor: c.priorityColor, createdAt: c.createdAt, updatedAt: c.updatedAt }))
    const blob = new Blob([JSON.stringify({ version: 1, exportedAt: Date.now(), chapters: data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = 'IndiNotes-backup.json'
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string)
        if (!parsed.chapters || !Array.isArray(parsed.chapters)) { alert('Invalid backup file'); return }
        parsed.chapters.forEach((ch: Chapter) => {
          createChapter(ch.title)
          const id = useNotesStore.getState().chapters[0]?.id
          if (id) updateChapter(id, { content: ch.content || '', priorityColor: ch.priorityColor || null })
        })
        alert(`Imported ${parsed.chapters.length} chapters`)
      } catch { alert('Failed to parse backup file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const backupInputRef = useRef<HTMLInputElement>(null)

  const clearAll = () => {
    if (!confirm('Clear everything?')) return
    handleElementsChange([])
  }

  const deleteSelected = () => {
    if (!canvasSelectedId) return
    const updated = noteData.elements.filter((el: Element) => el.id !== canvasSelectedId)
    handleElementsChange(updated)
    setCanvasSelectedId(null)
  }

  const fontFamilies = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Comic Neue', 'Arial']

  const startSidebarDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    sidebarDragRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <section className="main-workspace" style={{ height: '100%', display: 'flex', overflow: 'hidden', position: 'relative', minHeight: 0 }}>
      {(!isMobile || showSidebar) && (
        <div style={{
          position: isMobile ? 'absolute' as const : 'relative' as const,
          zIndex: 1000,
          height: isMobile ? '100dvh' : '100%',
          width: isMobile ? '80%' : sidebarWidth,
          minWidth: isMobile ? 240 : undefined,
          maxWidth: isMobile ? 320 : sidebarWidth,
          flexShrink: 0,
          minHeight: 0,
          transition: sidebarDragRef.current ? 'none' : 'width 0.05s',
          boxShadow: isMobile ? '4px 0 15px rgba(0,0,0,0.5)' : 'none'
        }}>
          <Sidebar
            items={chapters.map((n: Chapter) => ({ id: n.id, label: n.title, priorityColor: n.priorityColor }))}
            selectedId={selectedId}
            onSelect={(id) => {
              selectChapter(id)
              if (isMobile) setShowSidebar(false)
            }}
            onNewChapter={() => createChapter('Untitled')}
            onDeleteChapter={(ids) => {
              if (ids.length === 0) return
              if (confirm(`Delete ${ids.length} chapter(s)? This cannot be undone.`)) {
                ids.forEach(id => deleteChapter(id))
                if (ids.includes(selectedId || '')) {
                  selectChapter(undefined)
                }
              }
            }}
            onReorder={(from, to) => {
              const updated = [...chapters]
              const [moved] = updated.splice(from, 1)
              updated.splice(to, 0, moved)
              useNotesStore.setState({ chapters: updated })
            }}
            onPriorityChange={(id, color) => {
              const chapter = chapters.find((c: Chapter) => c.id === id)
              if (chapter) {
                const parsed = JSON.parse(chapter.content || '{}')
                const updatedContent = JSON.stringify({ ...parsed, priorityColor: color })
                updateChapter(id, { content: updatedContent, priorityColor: color }, false)
              }
            }}
            showDelete={!!selected}
          />
          {!isMobile && (
            <div
              onMouseDown={startSidebarDrag}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: 5,
                cursor: 'col-resize',
                zIndex: 1001,
              }}
            >
              <div style={{
                position: 'absolute',
                top: '50%',
                right: -3,
                width: 4,
                height: 32,
                borderRadius: 2,
                background: 'var(--border)',
                transform: 'translateY(-50%)',
                opacity: 0.4,
                transition: 'opacity 0.2s',
              }} />
            </div>
          )}
        </div>
      )}
      
      {isMobile && showSidebar && (
        <div 
          onClick={() => setShowSidebar(false)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999
          }}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)', minWidth: 0 }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: screen === 'sm' ? 6 : 8,
          padding: screen === 'sm' ? '8px' : '10px 16px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: screen === 'sm' ? 6 : 12, minWidth: 0, flex: 1 }}>
            {isMobile && (
              <button 
                onClick={() => setShowSidebar(!showSidebar)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: 24,
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                ☰
              </button>
            )}
            {onGoHome && (
              <button
                onClick={onGoHome}
                title="Back to home"
                style={{
                  background: 'none', border: 'none',
                  color: 'var(--muted)', fontSize: 18,
                  cursor: 'pointer', padding: '2px 4px',
                  display: 'flex', alignItems: 'center',
                  flexShrink: 0,
                }}
              >⌂</button>
            )}
            {selected && (
              <input
                value={selected.title || ''}
                onChange={(e) => updateChapter(selected.id, { title: e.target.value })}
                style={{ fontSize: screen === 'sm' ? 14 : 16, fontWeight: 'bold', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', width: screen === 'sm' ? 80 : 160, minWidth: 60, flex: '0 1 auto' }}
                placeholder="Chapter title..."
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: screen === 'sm' ? 4 : 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {selected && (
              <motion.div layout style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
                <motion.button
                  onClick={() => setActiveTab('canvas')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  style={{ padding: screen === 'sm' ? '3px 8px' : '4px 12px', borderRadius: 6, border: 'none', background: activeTab === 'canvas' ? 'var(--accent)' : 'transparent', color: activeTab === 'canvas' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 13 }}
                >Canvas</motion.button>
                <motion.button
                  onClick={() => setActiveTab('graph')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                  style={{ padding: screen === 'sm' ? '3px 8px' : '4px 12px', borderRadius: 6, border: 'none', background: activeTab === 'graph' ? 'var(--accent)' : 'transparent', color: activeTab === 'graph' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 13 }}
                >Graph</motion.button>
              </motion.div>
            )}
            <SyncIndicator />
            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--panel)', color: 'var(--muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 14,
              }}
            >⚙</button>
            <select 
            onChange={(e) => {
              const v = e.target.value
              e.target.value = ''
              if (v === 'backup') exportBackup()
              else if (v === 'import') backupInputRef.current?.click()
              else if (v) exportContent(v as 'pdf' | 'png' | 'json')
            }}
            style={{ padding: screen === 'sm' ? '4px 6px' : '6px 12px', borderRadius: 6, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 13 }}
          >
            <option value="">Export</option>
            <option value="png">PNG</option>
            <option value="pdf">PDF</option>
            <option value="json">JSON</option>
            <option disabled>─────</option>
            <option value="backup">Backup All</option>
            <option value="import">Import Backup</option>
          </select>
          <input ref={backupInputRef} type="file" accept=".json" onChange={importBackup} style={{ display: 'none' }} />
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14, gap: 16 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--gold)' }}
              />
              Loading...
            </motion.div>
          ) : !selected ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 16 }}
            >Select or create a chapter to begin.</motion.div>
          ) : (
            <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {activeTab === 'canvas' && (
                <div style={{ 
                  position: 'absolute', 
                  top: screen === 'sm' ? 4 : 16, 
                  left: '50%', 
                  transform: 'translateX(-50%) scale(' + (screen === 'sm' ? '0.7' : screen === 'md' ? '0.85' : '1') + ')', 
                  display: 'flex', 
                  gap: screen === 'sm' ? 4 : 8, 
                  padding: screen === 'sm' ? '4px 6px' : '8px 16px', 
                  background: 'var(--bg-alt)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 12, 
                  zIndex: 100, 
                  alignItems: 'center',
                  maxWidth: '98vw',
                  overflowX: 'auto',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  transformOrigin: 'top center',
                }}>
                  <div style={{ display: 'flex', gap: screen === 'sm' ? 2 : 4, paddingRight: screen === 'sm' ? 4 : 8, borderRight: '1px solid var(--border)' }}>
                    <button onClick={undo} disabled={!canUndo()} title="Undo (Ctrl+Z)" style={{ padding: screen === 'sm' ? '4px 6px' : '6px 10px', borderRadius: 6, border: 'none', background: canUndo() ? 'transparent' : 'rgba(255,255,255,0.05)', color: canUndo() ? 'var(--text)' : 'var(--muted)', cursor: canUndo() ? 'pointer' : 'not-allowed', fontSize: screen === 'sm' ? 12 : 14 }}>↩️</button>
                    <button onClick={redo} disabled={!canRedo()} title="Redo (Ctrl+Y)" style={{ padding: screen === 'sm' ? '4px 6px' : '6px 10px', borderRadius: 6, border: 'none', background: canRedo() ? 'transparent' : 'rgba(255,255,255,0.05)', color: canRedo() ? 'var(--text)' : 'var(--muted)', cursor: canRedo() ? 'pointer' : 'not-allowed', fontSize: screen === 'sm' ? 12 : 14 }}>↪️</button>
                  </div>
                  <div style={{ display: 'flex', gap: screen === 'sm' ? 3 : 6, paddingRight: screen === 'sm' ? 4 : 12, borderRight: '1px solid var(--border)' }}>
                    <button onClick={() => setTool('select')} style={{ padding: screen === 'sm' ? '4px 6px' : '8px 12px', borderRadius: 8, border: 'none', background: tool === 'select' ? 'var(--accent)' : 'transparent', color: tool === 'select' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 14 }}>🖐️</button>
                    <button onClick={() => setTool('pen')} style={{ padding: screen === 'sm' ? '4px 6px' : '8px 12px', borderRadius: 8, border: 'none', background: tool === 'pen' ? 'var(--accent)' : 'transparent', color: tool === 'pen' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 14 }}>✏️</button>
                    <button onClick={() => setTool('eraser')} style={{ padding: screen === 'sm' ? '4px 6px' : '8px 12px', borderRadius: 8, border: 'none', background: tool === 'eraser' ? 'var(--accent)' : 'transparent', color: tool === 'eraser' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 14 }}>🧼</button>
                    <button onClick={() => setTool('text')} style={{ padding: screen === 'sm' ? '4px 6px' : '8px 12px', borderRadius: 8, border: 'none', background: tool === 'text' ? 'var(--accent)' : 'transparent', color: tool === 'text' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 14 }}>📝</button>
                    <button onClick={() => setTool('shape')} style={{ padding: screen === 'sm' ? '4px 6px' : '8px 12px', borderRadius: 8, border: 'none', background: tool === 'shape' ? 'var(--accent)' : 'transparent', color: tool === 'shape' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 14 }}>⬜</button>
                    <button onClick={() => setTool('fill')} style={{ padding: screen === 'sm' ? '4px 6px' : '8px 12px', borderRadius: 8, border: 'none', background: tool === 'fill' ? 'var(--accent)' : 'transparent', color: tool === 'fill' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 14 }}>🪣</button>
                    <button onClick={() => fileInputRef.current?.click()} style={{ padding: screen === 'sm' ? '4px 6px' : '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 14 }}>🖼️</button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
                  </div>
                  <div style={{ display: 'flex', gap: screen === 'sm' ? 4 : 10, alignItems: 'center' }}>
                    {tool === 'pen' && <input type="color" value={drawSettings.color} onChange={(e) => setDrawSettings({...drawSettings, color: e.target.value})} style={{ border: 'none', background: 'none', width: screen === 'sm' ? 18 : 24, height: screen === 'sm' ? 18 : 24, cursor: 'pointer' }} />}
                    {tool === 'pen' && screen !== 'sm' && <input type="range" min={1} max={20} value={drawSettings.width} onChange={(e) => setDrawSettings({...drawSettings, width: parseInt(e.target.value)})} style={{ width: screen === 'md' ? 40 : 60 }} />}
                    {tool === 'shape' && (
                      <>
                        <select value={shapeType} onChange={(e) => setShapeType(e.target.value as any)} style={{ background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 6px', fontSize: screen === 'sm' ? 10 : 13 }}>
                          <option value="rect">Rect</option>
                          <option value="circle">Circ</option>
                          <option value="triangle">Tri</option>
                          <option value="pentagon">Pent</option>
                          <option value="arrow">Arr</option>
                        </select>
                        <input type="color" value={shapeColor} onChange={(e) => setShapeColor(e.target.value)} style={{ border: 'none', background: 'none', width: screen === 'sm' ? 18 : 24, height: screen === 'sm' ? 18 : 24, cursor: 'pointer' }} />
                      </>
                    )}
                    {tool === 'text' && (
                      <>
                        <input type="color" value={textSettings.color} onChange={(e) => setTextSettings({...textSettings, color: e.target.value})} style={{ border: 'none', background: 'none', width: screen === 'sm' ? 18 : 24, height: screen === 'sm' ? 18 : 24, cursor: 'pointer' }} />
                        {screen !== 'sm' && <select value={textSettings.fontSize} onChange={(e) => setTextSettings({...textSettings, fontSize: parseInt(e.target.value)})} style={{ background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 6px' }}>{[12, 16, 20, 24, 32, 48].map(s => <option key={s} value={s}>{s}px</option>)}</select>}
                        {screen === 'lg' && <select value={textSettings.fontFamily} onChange={(e) => setTextSettings({...textSettings, fontFamily: e.target.value})} style={{ background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 6px', maxWidth: 100 }}>{fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}</select>}
                      </>
                    )}
                  </div>
                  {screen !== 'sm' && (
                    <div style={{ display: 'flex', gap: 8, paddingLeft: 12, borderLeft: '1px solid var(--border)', alignItems: 'center' }}>
                      <input type="color" value={canvasBgColor} onChange={(e) => handleSettingsChange(e.target.value, showGrid)} style={{ border: '1px solid var(--border)', background: 'none', width: 20, height: 20, cursor: 'pointer', borderRadius: 4 }} />
                      {screen === 'lg' && <button onClick={() => handleSettingsChange(canvasBgColor, !showGrid)} style={{ padding: '4px 8px', background: showGrid ? 'var(--accent)' : 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}>GRID</button>}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>
                    {canvasSelectedId && <button onClick={deleteSelected} style={{ padding: screen === 'sm' ? '4px 8px' : '6px 12px', background: 'rgba(211, 47, 47, 0.2)', color: '#ff5252', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: screen === 'sm' ? 10 : 13 }}>Del</button>}
                    {screen === 'lg' && <button onClick={clearAll} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Clear</button>}
                  </div>
                  <div style={{ display: 'flex', gap: screen === 'sm' ? 2 : 4, alignItems: 'center', paddingLeft: 8 }}>
                    <button onClick={() => setZoom(Math.max(25, zoom - 25))} style={{ padding: screen === 'sm' ? '2px 4px' : '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>-</button>
                    <span style={{ fontSize: screen === 'sm' ? 10 : 11, color: 'var(--muted)', minWidth: screen === 'sm' ? 24 : 40, textAlign: 'center' }}>{zoom}%</span>
                    <button onClick={() => setZoom(Math.min(400, zoom + 25))} style={{ padding: screen === 'sm' ? '2px 4px' : '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>+</button>
                    {screen === 'lg' && <button onClick={() => { setZoom(100); editorRef.current?.resetView(); }} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 10 }}>Reset</button>}
                  </div>
                </div>
              )}
              <div style={{ flex: 1, overflow: 'auto', position: 'relative', height: '100%' }}>
                <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    padding: screen === 'sm' ? 2 : 4,
                    boxSizing: 'border-box',
                    background: activeTab === 'canvas' ? canvasBgColor : 'var(--bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                {activeTab === 'canvas' ? (
                  <CanvasEditor 
                    ref={editorRef}
                    elements={noteData.elements} 
                    onChange={handleElementsChange}
                    tool={tool}
                    shapeType={shapeType}
                    drawSettings={drawSettings}
                    textSettings={textSettings}
                    shapeColor={shapeColor}
                    onClearAll={clearAll}
                    onDeleteSelected={deleteSelected}
                    selectedId={canvasSelectedId}
                    onSelectId={setCanvasSelectedId}
                    backgroundColor={canvasBgColor}
                    showGrid={showGrid}
                    zoom={zoom}
                    onZoomChange={setZoom}
                  />                ) : (
                  <GraphEditor ref={graphRef} content={JSON.stringify(noteData.graph)} onChange={handleGraphChange} />
                )}
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => { setSettingsOpen(false); applySettings() }} />
    </section>
  )
}

export default MainWorkspace
