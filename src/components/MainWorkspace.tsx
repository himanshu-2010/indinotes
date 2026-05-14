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
import PomodoroTimer from './PomodoroTimer'
import VoiceNotes from './VoiceNotes'

import { autoColors } from '../lib/colorUtils'
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
  const folders = useNotesStore((s: NotesState) => s.folders)
  const selectedId = useNotesStore((s: NotesState) => s.selectedId)
  const loading = useNotesStore((s: NotesState) => s.loading)
  const createChapter = useNotesStore((s: NotesState) => s.createChapter)
  const updateChapter = useNotesStore((s: NotesState) => s.updateChapter)
  const deleteChapter = useNotesStore((s: NotesState) => s.deleteChapter)
  const selectChapter = useNotesStore((s: NotesState) => s.selectChapter)
  const createFolder = useNotesStore((s: NotesState) => s.createFolder)
  const deleteFolder = useNotesStore((s: NotesState) => s.deleteFolder)
  const renameFolder = useNotesStore((s: NotesState) => s.renameFolder)
  const undo = useNotesStore((s: NotesState) => s.undo)
  const redo = useNotesStore((s: NotesState) => s.redo)
  const canUndo = useNotesStore((s: NotesState) => s.canUndo)
  const canRedo = useNotesStore((s: NotesState) => s.canRedo)
  const pushHistory = useNotesStore((s: NotesState) => s.pushHistory)
  const editorRef = useRef<CanvasEditorRef>(null)
  const graphRef = useRef<GraphEditorRef>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const sidebarDragRef = useRef(false)
  const sidebarWidthRef = useRef(SIDEBAR_DEFAULT)
  const clipboardRef = useRef<Element[]>([])
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [showMoreTools, setShowMoreTools] = useState(false)
  const [showPomodoro, setShowPomodoro] = useState(false)
  const [showVoiceNotes, setShowVoiceNotes] = useState(false)
  const layerListRef = useRef<HTMLDivElement | null>(null)
  const touchDragRef = useRef<{ from: number; startY: number } | null>(null)

  const [settingsOpen, setSettingsOpen] = useState(false)

  const applyAutoColors = (bg: string) => {
    const p = autoColors(bg)
    setDrawSettings(prev => ({ ...prev, color: p.pen }))
    setTextSettings(prev => ({ ...prev, color: p.text }))
    setShapeColor(p.shape)
  }

  const applySettings = () => {
    const s = loadSettings()
    applyAutoColors(s.defaultCanvasBg)
  }

  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined)
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

  // Normalized canvas state: state-based avoids ref-in-render lint
  const [canvasElements, setCanvasElements] = useState<Element[]>([])
  const isDrawingSaveRef = useRef(false)
  const [elementsRevision, setElementsRevision] = useState(0)

  const selectedElement = useMemo(() => {
    if (!canvasSelectedId) return null
    return canvasElements.find(el => el.id === canvasSelectedId) || null
  }, [canvasSelectedId, canvasElements])

  // Reinitialize canvas elements from store on chapter switch or undo/redo
  useEffect(() => {
    if (!selected) return
    if (isDrawingSaveRef.current) {
      isDrawingSaveRef.current = false
      return
    }
    try {
      const parsed = JSON.parse(selected.content || '{}')
      const els = Array.isArray(parsed.elements) ? parsed.elements : []
      setCanvasElements(els)
    } catch {
      setCanvasElements([])
    }
    setElementsRevision(v => v + 1)
  }, [selected])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTool('select')
        setShowShortcuts(false)
        setShowMoreTools(false)
        return
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowShortcuts(v => !v)
        setShowMoreTools(false)
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvasSelectedId && activeTab === 'canvas' && tool === 'select') {
          deleteSelected()
        }
        return
      }
      const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
      if (isPrintable && tool !== 'text') {
        setTool('text')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tool, canvasSelectedId, activeTab])

  // Copy/paste/duplicate keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      if (activeTab !== 'canvas') return
      if (e.key === 'c' && !e.shiftKey) {
        if (canvasSelectedId && selectedElement) {
          e.preventDefault()
          clipboardRef.current = [selectedElement]
        }
      } else if (e.key === 'v' && !e.shiftKey) {
        if (clipboardRef.current.length > 0) {
          e.preventDefault()
          const pasted = clipboardRef.current.map(el => {
            const newId = 'el-' + Date.now().toString() + Math.random().toString(36).slice(2, 6)
            return { ...el, id: newId, x: (el as any).x + 20, y: (el as any).y + 20 }
          })
          handleElementsChange([...canvasElements, ...pasted])
          setCanvasSelectedId(pasted[0].id)
        }
      } else if (e.key === 'd' && !e.shiftKey) {
        if (canvasSelectedId && selectedElement) {
          e.preventDefault()
          const newId = 'el-' + Date.now().toString() + Math.random().toString(36).slice(2, 6)
          const dup = { ...selectedElement, id: newId, x: (selectedElement as any).x + 20, y: (selectedElement as any).y + 20 }
          handleElementsChange([...canvasElements, dup])
          setCanvasSelectedId(newId)
        }
      } else if (e.key === 'C' && e.shiftKey) {
        e.preventDefault()
        copyCanvasToClipboard()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canvasSelectedId, selectedElement, canvasElements, activeTab])

  // Touch drag-and-drop for layers
  useEffect(() => {
    const container = layerListRef.current
    if (!container) return

    const onTouchStart = (e: TouchEvent) => {
      const target = (e.target as HTMLElement).closest('.layer-item') as HTMLElement | null
      if (!target) return
      const idx = parseInt(target.dataset.layerIndex || '-1')
      if (idx < 0) return
      touchDragRef.current = { from: idx, startY: e.touches[0].clientY }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!touchDragRef.current) return
      e.preventDefault()
      const touch = e.touches[0]
      const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.layer-item') as HTMLElement | null
      if (!target) return
      const overIdx = parseInt(target.dataset.layerIndex || '-1')
      if (overIdx < 0 || overIdx === touchDragRef.current.from) return
      const from = touchDragRef.current.from
      const arr = [...canvasElements]
      const [moved] = arr.splice(from, 1)
      arr.splice(overIdx, 0, moved)
      // Update both state and ref to keep tracking correctly
      touchDragRef.current.from = overIdx
      handleElementsChange(arr)
      setElementsRevision(v => v + 1)
    }

    const onTouchEnd = () => {
      touchDragRef.current = null
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd)
    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
    }
  }, [canvasElements, showLayerPanel])

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

  const defaultBg = loadSettings().defaultCanvasBg || '#1e1e1e'
  const initialColors = autoColors(defaultBg)
  const [canvasBgColor, setCanvasBgColor] = useState(defaultBg)
  const [showGrid, setShowGrid] = useState(true)

  const [drawSettings, setDrawSettings] = useState<{color: string; width: number; mode: 'pen' | 'marker' | 'highlighter'}>({    color: initialColors.pen,
    width: 2,
    mode: 'pen' as const,
  })
  
  const [textSettings, setTextSettings] = useState({
    color: initialColors.text,
    fontSize: 18,
    fontStyle: 'normal' as const,
    fontFamily: 'Roboto',
  })
  
  const [shapeColor, setShapeColor] = useState(initialColors.shape)

  const handleElementsChange = (els: Element[]) => {
    if (!selected) return
    setCanvasElements(els)
    isDrawingSaveRef.current = true
    const updatedContent = JSON.stringify({ elements: els, graph: noteData.graph, settings: { bgColor: canvasBgColor, showGrid } })
    pushHistory(selected.content, selected.id)
    updateChapter(selected.id, { content: updatedContent }, false)
  }

  const updateSelectedElement = (updated: Element) => {
    const newElements = canvasElements.map(el => el.id === updated.id ? updated : el)
    handleElementsChange(newElements)
    setElementsRevision(v => v + 1)
  }

  const handleSettingsChange = (newBg: string, newGrid: boolean) => {
    if (!selected) return
    pushHistory(selected.content, selected.id)
    setCanvasBgColor(newBg)
    setShowGrid(newGrid)
    applyAutoColors(newBg)
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

  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selected) return
    try {
      const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
      GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await getDocument({ data: arrayBuffer }).promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      await page.render({ canvas, canvasContext: ctx, viewport }).promise
      const dataUrl = canvas.toDataURL('image/png')
      const fitW = 800
      const s = Math.min(1, fitW / viewport.width)
      const newImage: Element = {
        id: 'img-' + Date.now().toString(),
        type: 'image',
        x: 50,
        y: 50,
        width: Math.round(viewport.width * s),
        height: Math.round(viewport.height * s),
        src: dataUrl,
      }
      handleElementsChange([...noteData.elements, newImage])
    } catch (err) {
      console.error('PDF import failed:', err)
      alert('Failed to import PDF. Make sure it is a valid PDF file.')
    }
  }

  const sendGraphToCanvas = () => {
    const dataUrl = graphRef.current?.getCanvasImage()
    if (!dataUrl) return
    if (activeTab !== 'canvas') setActiveTab('canvas')
    // Delay snapshot capture until canvas tab is active
    setTimeout(() => {
      editorRef.current?.acceptGraphSnapshot(dataUrl)
    }, 50)
  }

  const exportContent = (format: 'pdf' | 'png' | 'json' | 'svg') => {
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
      if (activeTab === 'canvas') {
        const imgData = editorRef.current?.getStageImage()
        if (imgData) {
          doc.addImage(imgData, 'PNG', 0, 0, 800, 600)
        } else {
          doc.setFontSize(24)
          doc.text(selected.title || 'Untitled', 40, 40)
        }
      } else if (activeTab === 'graph') {
        const imgData = graphRef.current?.getCanvasImage()
        if (imgData) {
          doc.addImage(imgData, 'PNG', 0, 0, 800, 600)
        } else {
          doc.setFontSize(24)
          doc.text(selected.title || 'Untitled', 40, 40)
        }
      }
      // Add graph snapshot as second page if both canvas elements and graph exist
      if (activeTab === 'canvas') {
        const graphData = graphRef.current?.getCanvasImage()
        if (graphData) {
          doc.addPage([800, 600])
          doc.addImage(graphData, 'PNG', 0, 0, 800, 600)
        }
      }
      doc.save(selected.title + '.pdf')
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

    if (format === 'svg') {
      const imgData = getImage()
      if (imgData) {
        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="600" viewBox="0 0 800 600">
  <image width="800" height="600" xlink:href="${imgData}"/>
</svg>`
        const blob = new Blob([svg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = filename + '.svg'
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      }
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

  function deleteSelected() {
    if (!canvasSelectedId) return
    const updated = noteData.elements.filter((el: Element) => el.id !== canvasSelectedId)
    handleElementsChange(updated)
    setCanvasSelectedId(null)
  }

  const copyCanvasToClipboard = () => {
    const dataUrl = editorRef.current?.getStageImage()
    if (!dataUrl) return
    const canvas = document.createElement('canvas')
    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(blob => {
        if (blob) navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      })
    }
    img.src = dataUrl
  }

  const zoomToFit = () => {
    const bounds = editorRef.current?.getElementsBounds()
    if (!bounds || bounds.width === 0 || bounds.height === 0) return
    const padding = 40
    const viewW = window.innerWidth * 0.7
    const viewH = window.innerHeight * 0.7
    const fitScale = Math.min(viewW / (bounds.width + padding * 2), viewH / (bounds.height + padding * 2), 4)
    setZoom(Math.max(25, Math.min(400, Math.round(fitScale * 100))))
  }

  const layerMove = (direction: 'forward' | 'backward' | 'front' | 'back') => {
    if (!canvasSelectedId || !selectedElement) return
    const idx = canvasElements.findIndex(el => el.id === canvasSelectedId)
    if (idx === -1) return
    const arr = [...canvasElements]
    if (direction === 'front') {
      arr.splice(arr.length, 0, arr.splice(idx, 1)[0])
    } else if (direction === 'back') {
      arr.splice(0, 0, arr.splice(idx, 1)[0])
    } else if (direction === 'forward' && idx < arr.length - 1) {
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
    } else if (direction === 'backward' && idx > 0) {
      [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]
    } else return
    handleElementsChange(arr)
    setElementsRevision(v => v + 1)
  }

  const fontFamilies = [
    // Sans-serif
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito',
    'Ubuntu', 'Noto Sans', 'Source Sans 3', 'Raleway', 'Work Sans', 'Fira Sans',
    'IBM Plex Sans', 'DM Sans', 'Rubik', 'Quicksand', 'Manrope', 'Nunito Sans',
    'Plus Jakarta Sans', 'Figtree', 'Sora', 'Urbanist', 'Space Grotesk', 'Jost',
    'Outfit', 'Onest', 'Cabin', 'Hind', 'Mukta', 'Barlow', 'Karla', 'Mulish',
    // Serif
    'Merriweather', 'Playfair Display', 'PT Serif', 'Libre Baskerville',
    'Crimson Text', 'Lora', 'Source Serif 4', 'DM Serif Display', 'DM Serif Text',
    'Bitter', 'Alegreya', 'Tinos', 'Cardo', 'EB Garamond', 'Spectral',
    // Monospace
    'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Space Mono',
    'Cutive Mono', 'IBM Plex Mono', 'DM Mono', 'Inconsolata', 'Sometype Mono',
    // Handwriting / Display
    'Comic Neue', 'Caveat', 'Dancing Script', 'Pacifico', 'Patrick Hand',
    'Bangers', 'Fredoka', 'Righteous', 'Lilita One', 'Concert One',
    'Abril Fatface', 'Anton', 'Archivo Black', 'Passion One',
    // System fallbacks
    'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New',
    'Verdana', 'Trebuchet MS', 'Tahoma', 'Segoe UI', 'Lucida Console',
  ]

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
            items={chapters.map((n: Chapter) => ({ id: n.id, label: n.title, priorityColor: n.priorityColor, folderId: n.folderId, tags: n.tags }))}
            folders={folders.map(f => ({ id: f.id, name: f.name }))}
            selectedId={selectedId}
            selectedFolderId={selectedFolderId}
            onSelect={(id) => {
              selectChapter(id)
              if (isMobile) setShowSidebar(false)
            }}
            onNewChapter={() => createChapter('Untitled', selectedFolderId ?? undefined)}
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
            onSelectFolder={setSelectedFolderId}
            onCreateFolder={() => createFolder('New Folder')}
            onDeleteFolder={(id) => deleteFolder(id)}
            onRenameFolder={(id, name) => renameFolder(id, name)}
            onTagsChange={(id, tags) => updateChapter(id, { tags })}
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
                {activeTab === 'graph' && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={sendGraphToCanvas}
                    title="Send graph snapshot to canvas"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                    style={{ padding: screen === 'sm' ? '3px 8px' : '4px 12px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 13, marginLeft: 4 }}
                  >↳ Canvas</motion.button>
                )}
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
            <button
              onClick={() => setShowPomodoro(true)}
              title="Pomodoro timer"
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--panel)', color: 'var(--muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13,
              }}
            >⏱</button>
            <button
              onClick={() => setShowVoiceNotes(v => !v)}
              title="Voice notes"
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: '1px solid var(--border)',
                background: showVoiceNotes ? 'var(--accent)' : 'var(--panel)', color: showVoiceNotes ? '#fff' : 'var(--muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12,
              }}
            >🎤</button>
            <select 
            onChange={(e) => {
              const v = e.target.value
              e.target.value = ''
              if (v === 'backup') exportBackup()
              else if (v === 'import') backupInputRef.current?.click()
              else if (v) exportContent(v as 'pdf' | 'png' | 'json' | 'svg')
            }}
            style={{ padding: screen === 'sm' ? '4px 6px' : '6px 12px', borderRadius: 6, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 13 }}
          >
            <option value="">Export</option>
        <option value="png">PNG</option>
        <option value="pdf">PDF</option>
        <option value="svg">SVG</option>
        <option value="json">JSON</option>
            <option disabled>─────</option>
            <option value="backup">Backup All</option>
            <option value="import">Import Backup</option>
          </select>
          <input ref={backupInputRef} type="file" accept=".json" onChange={importBackup} style={{ display: 'none' }} />
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: screen === 'sm' ? 'column' : undefined }}>
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
            <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {(() => screen !== 'sm')() && activeTab === 'canvas' && (
                <div style={{ 
                  position: 'absolute', 
                  top: screen === 'md' ? 12 : 16,
                  left: '50%', 
                  transform: 'translateX(-50%) scale(' + (screen === 'md' ? '0.85' : '1') + ')',
                  display: 'flex', 
                  flexWrap: 'nowrap',
                  gap: 8, 
                  padding: '8px 16px',
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
                  <div style={{ display: 'flex', gap: screen === 'sm' ? 4 : 4, alignItems: 'center', flexWrap: 'wrap' }}>
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
                    <button onClick={() => pdfInputRef.current?.click()} style={{ padding: screen === 'sm' ? '4px 6px' : '8px 12px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: screen === 'sm' ? 11 : 14 }} title="Import PDF page as image">📄</button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} accept="image/*" />
                    <input type="file" ref={pdfInputRef} onChange={handlePdfImport} style={{ display: 'none' }} accept=".pdf,application/pdf" />
                  </div>
                  <div style={{ display: 'flex', gap: screen === 'sm' ? 4 : 10, alignItems: 'center' }}>
                    {tool === 'pen' && <input type="color" value={drawSettings.color} onChange={(e) => setDrawSettings({...drawSettings, color: e.target.value})} style={{ border: 'none', background: 'none', width: screen === 'sm' ? 18 : 24, height: screen === 'sm' ? 18 : 24, cursor: 'pointer' }} />}
                    {tool === 'pen' && (
                      <select value={drawSettings.mode} onChange={(e) => {
                        const mode = e.target.value as 'pen' | 'marker' | 'highlighter'
                        setDrawSettings({...drawSettings, mode,
                          ...(mode === 'highlighter' ? { width: 15, color: 'rgba(255, 242, 0, 0.35)' } : {}),
                          ...(mode === 'marker' ? { width: 6, color: '#ff6b6b' } : {}),
                        })
                      }} style={{ background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 6px', fontSize: screen === 'sm' ? 9 : 11 }}>
                        <option value="pen">Pen</option>
                        <option value="marker">Marker</option>
                        <option value="highlighter">Highlight</option>
                      </select>
                    )}
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
                  {tool === 'select' && selectedElement && (
                    <div style={{ display: 'flex', gap: screen === 'sm' ? 4 : 8, paddingLeft: 12, borderLeft: '1px solid var(--border)', alignItems: 'center' }}>
                      {selectedElement.type === 'text' && (
                        <>
                          <select value={(selectedElement as any).fontFamily || 'Roboto'} onChange={e => updateSelectedElement({...selectedElement, fontFamily: e.target.value} as Element)}
                            style={{ background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 4px', fontSize: screen === 'sm' ? 9 : 11, maxWidth: screen === 'lg' ? 100 : 70 }}>
                            {fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                          <select value={(selectedElement as any).fontSize} onChange={e => updateSelectedElement({...selectedElement, fontSize: parseInt(e.target.value)} as Element)}
                            style={{ background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 4px', fontSize: screen === 'sm' ? 9 : 11 }}>
                            {[12, 16, 20, 24, 32, 48].map(s => <option key={s} value={s}>{s}px</option>)}
                          </select>
                          <button onClick={() => {
                            const style = (selectedElement as any).fontStyle || 'normal'
                            const bold = style === 'bold' || style === 'bold italic'
                            updateSelectedElement({...selectedElement, fontStyle: bold ? (style === 'bold italic' ? 'italic' : 'normal') : (style === 'italic' ? 'bold italic' : 'bold')} as Element)
                          }} style={{ padding: '2px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: screen === 'sm' ? 10 : 13,
                            background: ['bold','bold italic'].includes((selectedElement as any).fontStyle || 'normal') ? 'var(--accent)' : 'var(--panel)',
                            color: ['bold','bold italic'].includes((selectedElement as any).fontStyle || 'normal') ? '#fff' : 'var(--text)' }}>B</button>
                          <button onClick={() => {
                            const style = (selectedElement as any).fontStyle || 'normal'
                            const italic = style === 'italic' || style === 'bold italic'
                            updateSelectedElement({...selectedElement, fontStyle: italic ? (style === 'bold italic' ? 'bold' : 'normal') : (style === 'bold' ? 'bold italic' : 'italic')} as Element)
                          }} style={{ padding: '2px 6px', borderRadius: 4, border: 'none', cursor: 'pointer', fontStyle: 'italic', fontSize: screen === 'sm' ? 10 : 13,
                            background: ['italic','bold italic'].includes((selectedElement as any).fontStyle || 'normal') ? 'var(--accent)' : 'var(--panel)',
                            color: ['italic','bold italic'].includes((selectedElement as any).fontStyle || 'normal') ? '#fff' : 'var(--text)' }}>I</button>
                          <input type="color" value={(selectedElement as any).fill} onChange={e => updateSelectedElement({...selectedElement, fill: e.target.value} as Element)}
                            style={{ border: 'none', background: 'none', width: screen === 'sm' ? 18 : 20, height: screen === 'sm' ? 18 : 20, cursor: 'pointer' }} />
                        </>
                      )}
                      {selectedElement.type === 'shape' && (
                        <>
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>Fill</span>
                          <input type="color" value={(selectedElement as any).fill} onChange={e => updateSelectedElement({...selectedElement, fill: e.target.value} as Element)} style={{ border: 'none', background: 'none', width: 20, height: 20, cursor: 'pointer' }} />
                          <span style={{ fontSize: 10, color: 'var(--muted)' }}>Stroke</span>
                          <input type="color" value={(selectedElement as any).stroke} onChange={e => updateSelectedElement({...selectedElement, stroke: e.target.value} as Element)} style={{ border: 'none', background: 'none', width: 20, height: 20, cursor: 'pointer' }} />
                          {screen !== 'sm' && <input type="range" min={0.5} max={10} step={0.5} value={(selectedElement as any).strokeWidth ?? 2} onChange={e => updateSelectedElement({...selectedElement, strokeWidth: parseFloat(e.target.value)} as Element)} style={{ width: 40 }} />}
                        </>
                      )}
                      {selectedElement.type === 'stroke' && (
                        <>
                          <input type="color" value={(selectedElement as any).stroke} onChange={e => updateSelectedElement({...selectedElement, stroke: e.target.value} as Element)} style={{ border: 'none', background: 'none', width: 20, height: 20, cursor: 'pointer' }} />
                          {screen !== 'sm' && <input type="range" min={1} max={20} value={(selectedElement as any).strokeWidth} onChange={e => updateSelectedElement({...selectedElement, strokeWidth: parseInt(e.target.value)} as Element)} style={{ width: 40 }} />}
                        </>
                      )}
                      {screen !== 'sm' && (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', paddingLeft: 8, borderLeft: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: 9, color: 'var(--muted)' }}>{Math.round(((selectedElement as any).opacity ?? 1) * 100)}%</span>
                          <input type="range" min={10} max={100} value={Math.round(((selectedElement as any).opacity ?? 1) * 100)}
                            onChange={e => updateSelectedElement({...selectedElement, opacity: parseInt(e.target.value) / 100} as Element)}
                            style={{ width: 50 }} />
                        </div>
                      )}
                      <button onClick={() => layerMove('backward')} title="Send backward" style={{ padding: '2px 5px', borderRadius: 4, border: 'none', background: 'var(--panel)', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, lineHeight: '14px' }}>↑</button>
                      <button onClick={() => layerMove('forward')} title="Bring forward" style={{ padding: '2px 5px', borderRadius: 4, border: 'none', background: 'var(--panel)', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, lineHeight: '14px' }}>↓</button>
                    </div>
                  )}
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
                    {canvasElements.length > 0 && screen === 'lg' && <button onClick={zoomToFit} title="Zoom to fit" style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 10 }}>Fit</button>}
                    {screen === 'lg' && <button onClick={copyCanvasToClipboard} title="Copy canvas to clipboard (Ctrl+Shift+C)" style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 10 }}>📋</button>}
                    {screen === 'lg' && <button onClick={() => setShowLayerPanel(v => !v)} title="Show layers" style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: showLayerPanel ? 'var(--accent)' : 'transparent', color: showLayerPanel ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: 10 }}>🔲</button>}
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
                  <>
                  <CanvasEditor 
                    ref={editorRef}
                    elements={canvasElements}
                    elementsRevision={elementsRevision}
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
                  />
                  {showLayerPanel && (
                    <div style={{ position: 'absolute', right: 8, top: 60, width: 200, maxHeight: 'calc(100% - 80px)', background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border-subtle)', letterSpacing: '0.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        LAYERS ({canvasElements.length})
                        <button onClick={() => setShowLayerPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, padding: 0 }}>×</button>
                      </div>
                      <div ref={layerListRef} style={{ flex: 1, overflowY: 'auto', padding: 4 }}>
                        {canvasElements.length === 0 ? (
                          <div style={{ padding: 12, textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>No elements</div>
                        ) : (
                          [...canvasElements].reverse().map((el, idx) => {
                            const realIdx = canvasElements.length - 1 - idx
                            const t = (el as any).type
                            const icon = t === 'text' ? 'T' : t === 'shape' ? ((el as any).shape === 'circle' ? '⬤' : '▣') : t === 'image' ? '🖼' : '✎'
                            const label = t === 'text' ? ((el as any).text?.slice(0, 20) || 'Text') : t === 'shape' ? ((el as any).shape || 'Shape') : t === 'image' ? 'Image' : `Stroke (${((el as any).points?.length || 0) / 2}pt)`
                            return (
                              <div key={el.id}
                                className="layer-item"
                                data-layer-id={el.id}
                                data-layer-index={realIdx}
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData('text/plain', String(realIdx))}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault()
                                  const from = parseInt(e.dataTransfer.getData('text/plain'))
                                  if (from === realIdx) return
                                  const arr = [...canvasElements]
                                  const [moved] = arr.splice(from, 1)
                                  arr.splice(realIdx, 0, moved)
                                  handleElementsChange(arr)
                                  setElementsRevision(v => v + 1)
                                }}
                                onClick={() => setCanvasSelectedId(el.id)}
                                style={{ padding: '5px 8px', cursor: 'pointer', borderRadius: 4, marginBottom: 2, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none',
                                  background: canvasSelectedId === el.id ? 'rgba(212,165,71,0.2)' : 'transparent',
                                  color: canvasSelectedId === el.id ? 'var(--accent)' : 'var(--text)',
                                  opacity: (el as any).opacity ?? 1 }}
                              >
                                <span style={{ width: 16, textAlign: 'center', fontSize: 10, flexShrink: 0, opacity: 0.5 }}>{realIdx + 1}</span>
                                <span style={{ fontSize: 11, flexShrink: 0, width: 16, textAlign: 'center' }}>{icon}</span>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={typeof label === 'string' ? label : ''}>{String(label)}</span>
                                <span style={{ fontSize: 9, color: 'var(--muted)', opacity: 0.5 }}>⠿</span>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}
                  </>
                ) : (
                  <GraphEditor ref={graphRef} content={JSON.stringify(noteData.graph)} onChange={handleGraphChange} />
                )}
              </div>
              </div>
              {screen === 'sm' && activeTab === 'canvas' && (
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap',
                  gap: 6, 
                  padding: '6px 8px',
                  paddingBottom: `calc(6px + env(safe-area-inset-bottom, 0px))`,
                  background: 'var(--bg-alt)', 
                  backdropFilter: 'blur(10px)', 
                  borderTop: '1px solid var(--border)',
                  borderRadius: '12px 12px 0 0', 
                  zIndex: 100, 
                  alignItems: 'center',
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
                }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={undo} disabled={!canUndo()} title="Undo" style={{ padding: '6px 8px', borderRadius: 6, border: 'none', background: canUndo() ? 'transparent' : 'rgba(255,255,255,0.05)', color: canUndo() ? 'var(--text)' : 'var(--muted)', cursor: canUndo() ? 'pointer' : 'not-allowed', fontSize: 13 }}>↩️</button>
                    <button onClick={redo} disabled={!canRedo()} title="Redo" style={{ padding: '6px 8px', borderRadius: 6, border: 'none', background: canRedo() ? 'transparent' : 'rgba(255,255,255,0.05)', color: canRedo() ? 'var(--text)' : 'var(--muted)', cursor: canRedo() ? 'pointer' : 'not-allowed', fontSize: 13 }}>↪️</button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={() => setTool('select')} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: tool === 'select' ? 'var(--accent)' : 'transparent', color: tool === 'select' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>🖐️</button>
                    <button onClick={() => setTool('pen')} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: tool === 'pen' ? 'var(--accent)' : 'transparent', color: tool === 'pen' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                    <button onClick={() => setTool('eraser')} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: tool === 'eraser' ? 'var(--accent)' : 'transparent', color: tool === 'eraser' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>🧼</button>
                    <button onClick={() => setTool('text')} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: tool === 'text' ? 'var(--accent)' : 'transparent', color: tool === 'text' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>📝</button>
                    <button onClick={() => setTool('shape')} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: tool === 'shape' ? 'var(--accent)' : 'transparent', color: tool === 'shape' ? '#fff' : 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>⬜</button>
                    <button onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>🖼️</button>
                    <button onClick={() => pdfInputRef.current?.click()} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 14 }}>📄</button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {canvasSelectedId && <button onClick={deleteSelected} style={{ padding: '6px 10px', background: 'rgba(211, 47, 47, 0.2)', color: '#ff5252', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 12 }}>Del</button>}
                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <button onClick={() => setZoom(Math.max(25, zoom - 25))} style={{ padding: '4px 6px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>-</button>
                      <span style={{ fontSize: 10, color: 'var(--muted)', minWidth: 28, textAlign: 'center' }}>{zoom}%</span>
                      <button onClick={() => setZoom(Math.min(400, zoom + 25))} style={{ padding: '4px 6px', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' }}>+</button>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setShowMoreTools(v => !v)} style={{ padding: '8px 10px', borderRadius: 8, border: 'none', background: showMoreTools ? 'var(--accent)' : 'var(--panel)', color: showMoreTools ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>•••</button>
                    </div>
                  </div>
                  {showMoreTools && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                      onClick={() => setShowMoreTools(false)}>
                      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, maxHeight: '60vh', overflowY: 'auto', background: 'var(--bg-alt)', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '12px 16px 24px', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 8px' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>More Tools</span>
                          <button onClick={() => setShowMoreTools(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
                        </div>
                        {tool === 'pen' && <><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Width: {drawSettings.width}px</label><input type="range" min={1} max={20} value={drawSettings.width} onChange={e => setDrawSettings({...drawSettings, width: parseInt(e.target.value)})} style={{ width: '100%' }} /></>}
                        {tool === 'text' && <><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Size</label><select value={textSettings.fontSize} onChange={e => setTextSettings({...textSettings, fontSize: parseInt(e.target.value)})} style={{ width: '100%', background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}>{[12,16,20,24,32,48].map(s => <option key={s} value={s}>{s}px</option>)}</select></>}
                        {tool === 'text' && <><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', margin: '8px 0px 4px' }}>Font</label><select value={textSettings.fontFamily} onChange={e => setTextSettings({...textSettings, fontFamily: e.target.value})} style={{ width: '100%', background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 8px', fontSize: 13 }}>{fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}</select></>}
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', margin: '12px 0 8px' }}>CANVAS</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Background</span>
                          <input type="color" value={canvasBgColor} onChange={e => handleSettingsChange(e.target.value, showGrid)} style={{ width: 32, height: 32, border: 'none', cursor: 'pointer' }} />
                          <button onClick={() => handleSettingsChange(canvasBgColor, !showGrid)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: showGrid ? 'var(--accent)' : 'var(--panel)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Grid: {showGrid ? 'ON' : 'OFF'}</button>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', margin: '12px 0 8px' }}>ACTIONS</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          <button onClick={clearAll} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}>Clear canvas</button>
                          <button onClick={() => { setZoom(100); editorRef.current?.resetView(); }} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}>Reset zoom</button>
                          {canvasElements.length > 0 && <button onClick={zoomToFit} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}>Zoom to fit</button>}
                          <button onClick={copyCanvasToClipboard} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 12 }}>📋 Copy canvas</button>
                          <button onClick={() => setShowLayerPanel(v => !v)} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', background: showLayerPanel ? 'var(--accent)' : 'var(--panel)', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Layers</button>
                        </div>
                        {selectedElement && (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', margin: '12px 0 8px' }}>SELECTED ELEMENT</div>
                            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Opacity: {Math.round(((selectedElement as any).opacity ?? 1) * 100)}%</label>
                            <input type="range" min={10} max={100} value={Math.round(((selectedElement as any).opacity ?? 1) * 100)} onChange={e => updateSelectedElement({...selectedElement, opacity: parseInt(e.target.value) / 100} as Element)} style={{ width: '100%' }} />
                            {selectedElement.type === 'stroke' && (
                              <><label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', margin: '8px 0 4px' }}>Stroke width: {(selectedElement as any).strokeWidth}px</label>
                              <input type="range" min={1} max={20} value={(selectedElement as any).strokeWidth} onChange={e => updateSelectedElement({...selectedElement, strokeWidth: parseInt(e.target.value)} as Element)} style={{ width: '100%' }} /></>
                            )}
                            {selectedElement.type === 'shape' && (
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                                <span style={{ fontSize: 12, color: 'var(--muted)' }}>Stroke</span>
                                <input type="color" value={(selectedElement as any).stroke} onChange={e => updateSelectedElement({...selectedElement, stroke: e.target.value} as Element)} style={{ width: 32, height: 32, border: 'none', cursor: 'pointer' }} />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => { setSettingsOpen(false); applySettings() }} />
      {showPomodoro && <PomodoroTimer onClose={() => setShowPomodoro(false)} />}
      {showVoiceNotes && selected && (
        <div onClick={() => setShowVoiceNotes(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, background: 'var(--bg)', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '12px 16px 24px', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 8px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>Voice Notes</span>
              <button onClick={() => setShowVoiceNotes(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <VoiceNotes chapterId={selected.id} />
          </div>
        </div>
      )}
      {showMoreTools && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowMoreTools(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, maxHeight: '60vh', overflowY: 'auto', background: 'var(--bg-alt)', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '12px 16px 24px', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 8px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>More Tools</span>
              <button onClick={() => setShowMoreTools(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>✕</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', marginBottom: 8 }}>TOOL OPTIONS</div>
            {tool === 'pen' && <><label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Width: {drawSettings.width}px</label><input type="range" min={1} max={20} value={drawSettings.width} onChange={e => setDrawSettings({...drawSettings, width: parseInt(e.target.value)})} style={{ width: '100%' }} /></>}
            {tool === 'text' && <><label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Size</label><select value={textSettings.fontSize} onChange={e => setTextSettings({...textSettings, fontSize: parseInt(e.target.value)})} style={{ width: '100%', background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}>{[12,16,20,24,32,48].map(s => <option key={s} value={s}>{s}px</option>)}</select></>}
            {tool === 'text' && <><label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', margin: '10px 0 4px' }}>Font</label><select value={textSettings.fontFamily} onChange={e => setTextSettings({...textSettings, fontFamily: e.target.value})} style={{ width: '100%', background: 'var(--panel)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}>{fontFamilies.map(f => <option key={f} value={f}>{f}</option>)}</select></>}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', margin: '16px 0 8px' }}>CANVAS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Background</span>
              <input type="color" value={canvasBgColor} onChange={e => handleSettingsChange(e.target.value, showGrid)} style={{ width: 36, height: 36, border: 'none', cursor: 'pointer' }} />
              <button onClick={() => handleSettingsChange(canvasBgColor, !showGrid)} style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--border)', background: showGrid ? 'var(--accent)' : 'var(--panel)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>Grid: {showGrid ? 'ON' : 'OFF'}</button>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', margin: '16px 0 8px' }}>ACTIONS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button onClick={clearAll} style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>Clear canvas</button>
              <button onClick={() => { setZoom(100); editorRef.current?.resetView(); }} style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>Reset zoom</button>
              {canvasElements.length > 0 && <button onClick={zoomToFit} style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>Zoom to fit</button>}
              <button onClick={copyCanvasToClipboard} style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>📋 Copy canvas</button>
              <button onClick={() => setShowLayerPanel(v => !v)} style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid var(--border)', background: showLayerPanel ? 'var(--accent)' : 'var(--panel)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>Layers</button>
              <button onClick={() => setShowPomodoro(true)} style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}>⏱ Pomodoro</button>
              <button onClick={() => setShowVoiceNotes(v => !v)} style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid var(--border)', background: showVoiceNotes ? 'var(--accent)' : 'var(--panel)', color: '#fff', cursor: 'pointer', fontSize: 13 }}>🎤 Voice note</button>
            </div>
            {selectedElement && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', margin: '16px 0 8px' }}>SELECTED ELEMENT</div>
                <label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Opacity: {Math.round(((selectedElement as any).opacity ?? 1) * 100)}%</label>
                <input type="range" min={10} max={100} value={Math.round(((selectedElement as any).opacity ?? 1) * 100)} onChange={e => updateSelectedElement({...selectedElement, opacity: parseInt(e.target.value) / 100} as Element)} style={{ width: '100%' }} />
                {selectedElement.type === 'stroke' && (
                  <><label style={{ fontSize: 13, color: 'var(--muted)', display: 'block', margin: '10px 0 4px' }}>Stroke width: {(selectedElement as any).strokeWidth}px</label>
                  <input type="range" min={1} max={20} value={(selectedElement as any).strokeWidth} onChange={e => updateSelectedElement({...selectedElement, strokeWidth: parseInt(e.target.value)} as Element)} style={{ width: '100%' }} /></>
                )}
                {selectedElement.type === 'shape' && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Stroke</span>
                    <input type="color" value={(selectedElement as any).stroke} onChange={e => updateSelectedElement({...selectedElement, stroke: e.target.value} as Element)} style={{ width: 36, height: 36, border: 'none', cursor: 'pointer' }} />
                  </div>
                )}
              </>
            )}
            <button onClick={() => setShowMoreTools(false)} style={{ marginTop: 16, width: '100%', padding: '10px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}>Close</button>
          </div>
        </div>
      )}
      {showShortcuts && (
        <div onClick={() => setShowShortcuts(false)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, maxWidth: 400, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 18, color: 'var(--text-h)' }}>Keyboard Shortcuts</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Ctrl+Z', 'Undo'],
                ['Ctrl+Y', 'Redo'],
                ['Ctrl+D', 'Duplicate selected'],
                ['Ctrl+C', 'Copy selected'],
                ['Ctrl+V', 'Paste'],
                ['Ctrl+Shift+C', 'Copy canvas to clipboard'],
                ['Delete / Backspace', 'Delete selected'],
                ['Escape', 'Deselect / close'],
                ['?', 'Toggle this dialog'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 13 }}>{desc}</span>
                  <code style={{ background: 'var(--bg-alt)', padding: '2px 8px', borderRadius: 4, fontSize: 12, whiteSpace: 'nowrap', color: 'var(--accent)' }}>{key}</code>
                </div>
              ))}
            </div>
            <button onClick={() => setShowShortcuts(false)} style={{ marginTop: 20, width: '100%', padding: '8px 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
          </div>
        </div>
      )}
    </section>
  )
}

export default MainWorkspace
