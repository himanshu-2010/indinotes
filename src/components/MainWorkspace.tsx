import React, { useMemo, useRef, useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import useNotesStore from '../stores/notesStore'
import CanvasEditor from './CanvasEditor'
import type { CanvasEditorRef, Element } from './CanvasEditor'
import GraphEditor from './GraphEditor'
import { jsPDF } from 'jspdf'

interface Props {
  mode?: string
}

const MainWorkspace: React.FC<Props> = (_props) => {
  const chapters = useNotesStore((s: any) => s.chapters)
  const selectedId = useNotesStore((s: any) => s.selectedId)
  const createChapter = useNotesStore((s: any) => s.createChapter)
  const updateChapter = useNotesStore((s: any) => s.updateChapter)
  const deleteChapter = useNotesStore((s: any) => s.deleteChapter)
  const selectChapter = useNotesStore((s: any) => s.selectChapter)
  const undo = useNotesStore((s: any) => s.undo)
  const redo = useNotesStore((s: any) => s.redo)
  const canUndo = useNotesStore((s: any) => s.canUndo)
  const canRedo = useNotesStore((s: any) => s.canRedo)
  const pushHistory = useNotesStore((s: any) => s.pushHistory)
  const editorRef = useRef<CanvasEditorRef>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [activeTab, setActiveTab] = useState<'canvas' | 'graph'>('canvas')
  const [tool, setTool] = useState<'select' | 'pen' | 'eraser' | 'text' | 'shape' | 'image' | 'fill'>('select')
  const [shapeType, setShapeType] = useState<'rect' | 'circle' | 'triangle' | 'pentagon' | 'arrow'>('rect')
  const [canvasSelectedId, setCanvasSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(100)

  const [drawSettings, setDrawSettings] = useState({    color: '#000000',
    width: 2,
    mode: 'pen' as const,
  })
  
  const [textSettings, setTextSettings] = useState({
    color: '#000000',
    fontSize: 18,
    fontStyle: 'normal' as const,
    fontFamily: 'Roboto',
  })
  
  const [shapeColor, setShapeColor] = useState('#0ea5a4')
  const [canvasBgColor, setCanvasBgColor] = useState('#1e1e1e')
  const [showGrid, setShowGrid] = useState(true)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setShowSidebar(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const selected = chapters.find((n: any) => n.id === selectedId)

  const noteData = useMemo(() => {
    if (!selected) return { elements: [], graph: { formula: 'sin(x)', mode: '2d', lines: [{ id: '1', formula: 'sin(x)', color: '#0ea5a4' }] }, settings: { bgColor: '#1e1e1e', showGrid: true } }
    try {
      const parsed = JSON.parse(selected.content || '{}')
      return {
        elements: Array.isArray(parsed.elements) ? parsed.elements : [],
        graph: parsed.graph || { formula: 'sin(x)', mode: '2d', lines: [{ id: '1', formula: 'sin(x)', color: '#0ea5a4' }] },
        settings: parsed.settings || { bgColor: '#1e1e1e', showGrid: true }
      }
    } catch (e) {
      if (typeof selected.content === 'string' && selected.content.startsWith('{')) {
         return { elements: [], graph: { formula: 'sin(x)', mode: '2d', lines: [{ id: '1', formula: 'sin(x)', color: '#0ea5a4' }] }, settings: { bgColor: '#1e1e1e', showGrid: true } }
      }
      return { 
        elements: [{ id: 't0', type: 'text', x: 20, y: 20, text: selected.content, fontSize: 18 }], 
        graph: { formula: 'sin(x)', mode: '2d', lines: [{ id: '1', formula: 'sin(x)', color: '#0ea5a4' }] },
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
    
    if (format === 'png' && activeTab === 'canvas' && editorRef.current) {
      const imgData = editorRef.current.getStageImage()
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
      if (activeTab === 'canvas' && editorRef.current) {
        const imgData = editorRef.current.getStageImage()
        if (imgData) {
          doc.addImage(imgData, 'PNG', 0, 0, 800, 600)
          doc.save(filename + '-canvas.pdf')
          return
        }
      }
      doc.setFontSize(24)
      doc.text(selected.title || 'Untitled', 40, 40)
      doc.setFontSize(14)
      if (activeTab === 'graph') {
        doc.text(`Graph: y = ${noteData.graph.lines?.[0]?.formula || 'sin(x)'}`, 40, 80)
      }
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

  const clearAll = () => {
    if (!confirm('Clear everything?')) return
    handleElementsChange([])
  }

  const deleteSelected = () => {
    if (!canvasSelectedId) return
    const updated = noteData.elements.filter((el: any) => el.id !== canvasSelectedId)
    handleElementsChange(updated)
    setCanvasSelectedId(null)
  }

  const fontFamilies = ['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Comic Neue', 'Arial']

  return (
    <section className="main-workspace" style={{ height: '100%', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      {(!isMobile || showSidebar) && (
        <div style={{
          position: isMobile ? 'absolute' : 'relative',
          zIndex: 1000,
          height: '100%',
          width: isMobile ? '80%' : '22%',
          minWidth: isMobile ? '240px' : '200px',
          maxWidth: isMobile ? '300px' : '300px',
          transition: 'transform 0.3s ease-in-out',
          boxShadow: isMobile ? '4px 0 15px rgba(0,0,0,0.5)' : 'none'
        }}>
          <Sidebar
            items={chapters.map((n: any) => ({ id: n.id, label: n.title, priorityColor: n.priorityColor }))}
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
            onPriorityChange={(id, color) => {
              const chapter = chapters.find((c: any) => c.id === id)
              if (chapter) {
                const parsed = JSON.parse(chapter.content || '{}')
                const updatedContent = JSON.stringify({ ...parsed, priorityColor: color })
                updateChapter(id, { content: updatedContent, priorityColor: color }, false)
              }
            }}
            showDelete={!!selected}
          />
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                  alignItems: 'center'
                }}
              >
                ☰
              </button>
            )}
            {selected && (
              <input
                value={selected.title || ''}
                onChange={(e) => updateChapter(selected.id, { title: e.target.value })}
                style={{ fontSize: 16, fontWeight: 'bold', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none', width: isMobile ? 100 : 160 }}
                placeholder="Chapter title..."
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {selected && (
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
                <button onClick={() => setActiveTab('canvas')} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: activeTab === 'canvas' ? 'var(--accent)' : 'transparent', color: activeTab === 'canvas' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>Canvas</button>
                <button onClick={() => setActiveTab('graph')} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: activeTab === 'graph' ? 'var(--accent)' : 'transparent', color: activeTab === 'graph' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: 13 }}>Graph</button>
              </div>
            )}
            <select 
            onChange={(e) => { if (e.target.value) { exportContent(e.target.value as any); e.target.value = ''; } }}
            disabled={!selected}
            style={{ padding: '6px 12px', borderRadius: 6, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', cursor: selected ? 'pointer' : 'not-allowed', fontSize: 13 }}
          >
            <option value="">Export</option>
            <option value="png">PNG</option>
            <option value="pdf">PDF</option>
            <option value="json">JSON</option>
          </select>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 16 }}>Select or create a chapter to begin.</div>
          ) : (
            <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {activeTab === 'canvas' && (
                <div style={{ 
                  position: 'absolute', 
                  top: isMobile ? 8 : 16, 
                  left: '50%', 
                  transform: 'translateX(-50%) scale(' + (isMobile ? '0.8' : '1') + ')', 
                  display: 'flex', 
                  gap: 8, 
                  padding: isMobile ? '4px 8px' : '8px 16px', 
                  background: 'rgba(15, 23, 32, 0.9)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 12, 
                  zIndex: 100, 
                  alignItems: 'center',
                  maxWidth: '95vw',
                  overflowX: 'auto',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
                }}>
                  <div style={{ display: 'flex', gap: 4, paddingRight: isMobile ? 4 : 8, borderRight: '1px solid var(--border)' }}>
                    <button onClick={undo} disabled={!canUndo()} title="Undo (Ctrl+Z)" style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: canUndo() ? 'transparent' : 'rgba(255,255,255,0.05)', color: canUndo() ? 'var(--text)' : 'var(--muted)', cursor: canUndo() ? 'pointer' : 'not-allowed' }}>↩️</button>
                    <button onClick={redo} disabled={!canRedo()} title="Redo (Ctrl+Y)" style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: canRedo() ? 'transparent' : 'rgba(255,255,255,0.05)', color: canRedo() ? 'var(--text)' : 'var(--muted)', cursor: canRedo() ? 'pointer' : 'not-allowed' }}>↪️</button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, paddingRight: isMobile ? 4 : 12, borderRight: '1px solid var(--border)' }}>
                    <button onClick={() => setTool('select')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: tool === 'select' ? 'var(--accent)' : 'transparent', color: tool === 'select' ? '#fff' : 'var(--muted)', cursor: 'pointer' }}>🖐️</button>
                    <button onClick={() => setTool('pen')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: tool === 'pen' ? 'var(--accent)' : 'transparent', color: tool === 'pen' ? '#fff' : 'var(--muted)', cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => setTool('eraser')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: tool === 'eraser' ? 'var(--accent)' : 'transparent', color: tool === 'eraser' ? '#fff' : 'var(--muted)', cursor: 'pointer' }}>🧼</button>
                    <button onClick={() => setTool('text')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: tool === 'text' ? 'var(--accent)' : 'transparent', color: tool === 'text' ? '#fff' : 'var(--muted)', cursor: 'pointer' }}>📝</button>
                    <button onClick={() => setTool('shape')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: tool === 'shape' ? 'var(--accent)' : 'transparent', color: tool === 'shape' ? '#fff' : 'var(--muted)', cursor: 'pointer' }}>⬜</button>
                    <button onClick={() => setTool('fill')} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: tool === 'fill' ? 'var(--accent)' : 'transparent', color: tool === 'fill' ? '#fff' : 'var(--muted)', cursor: 'pointer' }}>🪣</button>
                    <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>🖼️</button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
                  </div>
                  <div style={{ display: 'flex', gap: isMobile ? 6 : 10, alignItems: 'center' }}>
                    {tool === 'pen' && <input type="color" value={drawSettings.color} onChange={(e) => setDrawSettings({...drawSettings, color: e.target.value})} style={{ border: 'none', background: 'none', width: 24, height: 24, cursor: 'pointer' }} />}
                    {tool === 'pen' && !isMobile && <input type="range" min={1} max={20} value={drawSettings.width} onChange={(e) => setDrawSettings({...drawSettings, width: parseInt(e.target.value)})} style={{ width: 60 }} />}
                    {tool === 'shape' && (
                      <>
                        <select value={shapeType} onChange={(e) => setShapeType(e.target.value as any)} style={{ background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: isMobile ? 11 : 13 }}>
                          <option value="rect">Rect</option>
                          <option value="circle">Circ</option>
                          <option value="triangle">Tri</option>
                          <option value="pentagon">Pent</option>
                          <option value="arrow">Arr</option>
                        </select>
                        <input type="color" value={shapeColor} onChange={(e) => setShapeColor(e.target.value)} style={{ border: 'none', background: 'none', width: 24, height: 24, cursor: 'pointer' }} />
                      </>
                    )}
                    {tool === 'text' && (
                      <>
                        <input type="color" value={textSettings.color} onChange={(e) => setTextSettings({...textSettings, color: e.target.value})} style={{ border: 'none', background: 'none', width: 24, height: 24, cursor: 'pointer' }} />
                        {!isMobile && <select value={textSettings.fontSize} onChange={(e) => setTextSettings({...textSettings, fontSize: parseInt(e.target.value)})} style={{ background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px' }}>{[12, 16, 20, 24, 32, 48].map(s => <option key={s} value={s}>{s}px</option>)}</select>}
                        {!isMobile && <select value={textSettings.fontFamily} onChange={(e) => setTextSettings({...textSettings, fontFamily: e.target.value})} style={{ background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', maxWidth: 100 }}>{fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}</select>}
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, paddingLeft: isMobile ? 4 : 12, borderLeft: '1px solid var(--border)', alignItems: 'center' }}>
                    <input type="color" value={canvasBgColor} onChange={(e) => handleSettingsChange(e.target.value, showGrid)} style={{ border: '1px solid var(--border)', background: 'none', width: 20, height: 20, cursor: 'pointer', borderRadius: 4 }} />
                    {!isMobile && <button onClick={() => handleSettingsChange(canvasBgColor, !showGrid)} style={{ padding: '4px 8px', background: showGrid ? 'var(--accent)' : 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}>GRID</button>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, paddingLeft: isMobile ? 4 : 12, borderLeft: '1px solid var(--border)' }}>
                    {canvasSelectedId && <button onClick={deleteSelected} style={{ padding: '6px 12px', background: 'rgba(211, 47, 47, 0.2)', color: '#ff5252', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: isMobile ? 10 : 13 }}>Del</button>}
                    {!isMobile && <button onClick={clearAll} style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Clear</button>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', paddingLeft: 8 }}>
                    <button onClick={() => setZoom(Math.max(25, zoom - 25))} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>-</button>
                    <span style={{ fontSize: 11, color: 'var(--muted)', minWidth: isMobile ? 30 : 40, textAlign: 'center' }}>{zoom}%</span>
                    <button onClick={() => setZoom(Math.min(400, zoom + 25))} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>+</button>
                    {!isMobile && <button onClick={() => { setZoom(100); editorRef.current?.resetView(); }} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 10 }}>Reset</button>}
                  </div>
                </div>
              )}
              <div style={{ flex: 1, overflow: 'auto', position: 'relative', height: '100%' }}>
                <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    padding: '4px',
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
                  <GraphEditor content={JSON.stringify(noteData.graph)} onChange={handleGraphChange} />
                )}
              </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default MainWorkspace
