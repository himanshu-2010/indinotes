import { useRef, useState, useEffect, useLayoutEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import { Stage, Layer, Line, Text as KonvaText, Rect, Circle, Transformer, RegularPolygon, Arrow, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'

const useImageFn = (useImage as any).default || useImage

type Stroke = { id: string; type: 'stroke'; points: number[]; stroke: string; strokeWidth: number; mode: 'pen' | 'marker' | 'highlighter'; rotation?: number; opacity?: number }
type TextEl = { id: string; type: 'text'; x: number; y: number; text: string; fontSize: number; fill: string; fontStyle: string; fontFamily?: string; rotation?: number; opacity?: number }
type ShapeEl = { id: string; type: 'shape'; x: number; y: number; shape: 'rect' | 'circle' | 'triangle' | 'pentagon' | 'arrow'; width: number; height: number; fill: string; stroke: string; rotation?: number; opacity?: number; strokeWidth?: number; dash?: number[] }
type ImageEl = { id: string; type: 'image'; x: number; y: number; width: number; height: number; src: string; rotation?: number; opacity?: number }
export type Element = Stroke | TextEl | ShapeEl | ImageEl

const ImageComponent = ({ el, commonProps }: { el: ImageEl, commonProps: any }) => {
  const [img] = useImageFn(el.src)
  return <KonvaImage key={el.id} image={img} {...commonProps} x={el.x} y={el.y} width={el.width} height={el.height} />
}

interface DrawSettings {
  color: string
  width: number
  mode: 'pen' | 'marker' | 'highlighter'
}

interface TextSettings {
  color: string
  fontSize: number
  fontStyle: 'normal' | 'italic' | 'bold'
  fontFamily: string
}

interface Props {
  elements?: Element[]
  elementsRevision?: number
  onChange?: (elements: Element[]) => void
  tool: 'select' | 'pen' | 'text' | 'shape' | 'eraser' | 'image' | 'fill'
  shapeType: 'rect' | 'circle' | 'triangle' | 'pentagon' | 'arrow'
  drawSettings: DrawSettings
  textSettings: TextSettings
  shapeColor: string
  onClearAll: () => void
  onDeleteSelected: () => void
  selectedId: string | null
  onSelectId: (id: string | null) => void
  backgroundColor?: string
  showGrid?: boolean
  zoom?: number
  onZoomChange?: (zoom: number) => void
}

export interface CanvasEditorRef {
  getStageImage: () => string | undefined
  resetView: () => void
  acceptGraphSnapshot: (dataUrl: string) => void
  getElementsBounds: () => { x: number; y: number; width: number; height: number } | null
}

const CanvasEditor = forwardRef<CanvasEditorRef, Props>((props, ref) => {
  const { 
    elements = [], 
    elementsRevision = 0,
    onChange, 
    tool, 
    shapeType, 
    drawSettings, 
    textSettings, 
    shapeColor,
    selectedId,
    onSelectId,
    backgroundColor = '#ffffff',
    showGrid = false,
    zoom = 100,
    onZoomChange
  } = props

  const scale = zoom / 100

  const baseWidth = 800
  const baseHeight = 600
  const canvasWidth = Math.round(baseWidth * scale)
  const canvasHeight = Math.round(baseHeight * scale)

  // Normalized Map-based element storage
  const elementsMapRef = useRef<Map<string, Element>>(new Map())
  const [, forceRender] = useState(0)
  const stageRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isDrawingRef = useRef(false)
  const isErasingRef = useRef(false)
  const lastStrokeIdRef = useRef<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [inputPos, setInputPos] = useState<{ x: number; y: number } | null>(null)
  const [size, setSize] = useState({ width: baseWidth, height: baseHeight })
  const [stageOffset, setStageOffset] = useState({ x: 0, y: 0 })
  const [hasInitializedOffset, setHasInitializedOffset] = useState(false)
  const isPanningRef = useRef(false)
  const lastPointerRef = useRef({ x: 0, y: 0 })
  const pinchRef = useRef<{ d0: number; cx: number; cy: number; scale0: number } | null>(null)
  const [eraserHoverId, setEraserHoverId] = useState<string | null>(null)
  const shiftHeldRef = useRef(false)

  // Initialize Map from props when revision changes (chapter switch or undo/redo)
  useMemo(() => {
    if (elements.length === 0 && elementsRevision === 0) return
    elementsMapRef.current = new Map(elements.map(el => [el.id, el]))
    lastStrokeIdRef.current = null
  }, [elementsRevision, elements.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Force render counter — incremented after every element mutation
  // eslint-disable-next-line react-hooks/refs
  const els = Array.from(elementsMapRef.current.values())

  // Simplified stagePos to just use stageOffset
  const stagePos = stageOffset

  useEffect(() => {
    if (!hasInitializedOffset && size.width > 0 && size.height > 0) {
      setStageOffset({
        x: (size.width - baseWidth * scale) / 2,
        y: (size.height - baseHeight * scale) / 2
      })
      setHasInitializedOffset(true)
    }
  }, [size, hasInitializedOffset, baseWidth, baseHeight, scale])

  // Track Shift key for shape constraining
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftHeldRef.current = true }
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') { shiftHeldRef.current = false; setEraserHoverId(null) } }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [])

  // Drag-and-drop image files onto canvas
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
    const onDrop = (e: DragEvent) => {
      e.preventDefault(); e.stopPropagation()
      const file = e.dataTransfer?.files?.[0]
      if (!file || !file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => {
        const rawPos = stageRef.current?.getPointerPosition()
        const x = rawPos ? (rawPos.x - stagePos.x) / scale : 50
        const y = rawPos ? (rawPos.y - stagePos.y) / scale : 50
        const id = 'img-' + Date.now().toString()
        const newImage: Element = {
          id, type: 'image', x, y, width: 200, height: 200,
          src: reader.result as string,
        }
        elementsMapRef.current.set(id, newImage)
        forceRender(k => k + 1)
        onChange?.(Array.from(elementsMapRef.current.values()))
      }
      reader.readAsDataURL(file)
    }
    el.addEventListener('dragover', onDragOver)
    el.addEventListener('drop', onDrop)
    return () => { el.removeEventListener('dragover', onDragOver); el.removeEventListener('drop', onDrop) }
  }, [onChange, stagePos, scale])

  // Clear eraser hover when tool changes away from eraser
  useEffect(() => {
    if (tool !== 'eraser') setEraserHoverId(null)
  }, [tool])

  // Expose graph snapshot acceptor via ref
  useImperativeHandle(ref, () => ({
    getStageImage: () => {
      if (!stageRef.current) return undefined
      const oldNodes = transformerRef.current?.nodes() || []
      transformerRef.current?.nodes([])
      const dataUrl = stageRef.current.toDataURL({
        pixelRatio: 2,
        backgroundColor,
        x: stagePos.x, y: stagePos.y,
        width: canvasWidth, height: canvasHeight,
      })
      transformerRef.current?.nodes(oldNodes)
      return dataUrl
    },
    resetView: () => {
      setStageOffset({
        x: (size.width - baseWidth) / 2,
        y: (size.height - baseHeight) / 2,
      })
    },
    acceptGraphSnapshot: (dataUrl: string) => {
      const id = 'img-' + Date.now().toString()
      const newImage: Element = {
        id, type: 'image' as const,
        x: 0, y: 0, width: 400, height: 300,
        src: dataUrl, rotation: 0,
      }
      elementsMapRef.current.set(id, newImage)
      forceRender(k => k + 1)
      onChange?.(Array.from(elementsMapRef.current.values()))
    },
    getElementsBounds: () => {
      const els = Array.from(elementsMapRef.current.values())
      if (els.length === 0) return null
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const el of els) {
        if (el.type === 'stroke' && el.points.length >= 2) {
          for (let i = 0; i < el.points.length; i += 2) {
            minX = Math.min(minX, el.points[i]); maxX = Math.max(maxX, el.points[i])
            minY = Math.min(minY, el.points[i + 1]); maxY = Math.max(maxY, el.points[i + 1])
          }
        } else if (el.type === 'text') {
          minX = Math.min(minX, el.x); maxX = Math.max(maxX, el.x + el.text.length * el.fontSize * 0.6)
          minY = Math.min(minY, el.y); maxY = Math.max(maxY, el.y + el.fontSize)
        } else if (el.type === 'shape') {
          const ex = el.shape === 'arrow' ? el.x + el.width : el.x + Math.abs(el.width)
          const ey = el.shape === 'arrow' ? el.y + el.height : el.y + Math.abs(el.height)
          minX = Math.min(minX, el.x, ex); maxX = Math.max(maxX, el.x, ex)
          minY = Math.min(minY, el.y, ey); maxY = Math.max(maxY, el.y, ey)
        } else if (el.type === 'image') {
          minX = Math.min(minX, el.x); maxX = Math.max(maxX, el.x + el.width)
          minY = Math.min(minY, el.y); maxY = Math.max(maxY, el.y + el.height)
        }
      }
      if (!isFinite(minX)) return null
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    },
  }), [scale, stagePos, canvasWidth, canvasHeight, size.width, size.height, backgroundColor, baseWidth, baseHeight, onChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
        
        const zoomSpeed = 0.001
        const delta = -e.deltaY * zoomSpeed
        const newScale = Math.max(0.05, Math.min(10, scale * (1 + delta)))
        
        if (Math.abs(newScale - scale) < 0.001) return

        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // Zoom to pointer logic
        const logicalX = (mouseX - stagePos.x) / scale
        const logicalY = (mouseY - stagePos.y) / scale

        const newStagePosX = mouseX - logicalX * newScale
        const newStagePosY = mouseY - logicalY * newScale

        setStageOffset({ x: newStagePosX, y: newStagePosY })
        onZoomChange?.(Math.round(newScale * 100))
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [scale, stagePos, onZoomChange])

  // Pinch-to-zoom on touch devices
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0], t2 = e.touches[1]
        const d = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
        pinchRef.current = {
          d0: d,
          cx: (t1.clientX + t2.clientX) / 2,
          cy: (t1.clientY + t2.clientY) / 2,
          scale0: scale,
        }
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const t1 = e.touches[0], t2 = e.touches[1]
        const d = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
        const { d0, cx, cy, scale0 } = pinchRef.current
        const newScale = Math.max(0.05, Math.min(10, scale0 * (d / d0)))
        const rect = el.getBoundingClientRect()
        const mx = cx - rect.left, my = cy - rect.top
        const logicalX = (mx - stagePos.x) / scale
        const logicalY = (my - stagePos.y) / scale
        setStageOffset({ x: mx - logicalX * newScale, y: my - logicalY * newScale })
        onZoomChange?.(Math.round(newScale * 100))
      }
    }
    const onTouchEnd = () => { pinchRef.current = null }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [scale, stagePos, onZoomChange])

  const viewRef = useRef({ size, stagePos, scale })
  
  useEffect(() => {
    viewRef.current = { size, stagePos, scale }
  }, [size, stagePos, scale])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          if (!file) continue
          const reader = new FileReader()
          reader.onload = () => {
            const id = 'img-' + Date.now().toString()
            const { size: curSize, stagePos: curStagePos, scale: curScale } = viewRef.current
            
            // Place in the center of the current view
            const logicalCenterX = (curSize.width / 2 - curStagePos.x) / curScale
            const logicalCenterY = (curSize.height / 2 - curStagePos.y) / curScale
            
            const newImage: Element = {
              id,
              type: 'image',
              x: logicalCenterX - 150,
              y: logicalCenterY - 150,
              width: 300,
              height: 300,
              src: reader.result as string
            }
            elementsMapRef.current.set(newImage.id, newImage)
            forceRender(k => k + 1)
            onChange?.(Array.from(elementsMapRef.current.values()))
          }
          reader.readAsDataURL(file)
          break
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [onChange])

  useEffect(() => {
    setSize(prev => ({ 
      width: Math.max(canvasWidth, prev.width), 
      height: Math.max(canvasHeight, prev.height) 
    }))
  }, [canvasWidth, canvasHeight])

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const selectedNode = stageRef.current.findOne('#' + selectedId)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer().batchDraw()
      } else {
        transformerRef.current.nodes([])
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
    }
  }, [selectedId, els])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ 
        width: Math.max(canvasWidth, Math.floor(r.width)), 
        height: Math.max(canvasHeight, Math.floor(r.height)) 
      })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [canvasWidth, canvasHeight])

  const findAndRemoveElementAt = (pos: { x: number; y: number }) => {
    const stage = stageRef.current
    if (!stage) return
    const node = stage.getIntersection(pos)
    if (node && node.name() !== 'background') {
      const id = node.id()
      if (id) {
        elementsMapRef.current.delete(id)
        forceRender(k => k + 1)
        if (selectedId === id) onSelectId(null)
      }
    }
  }

  const handleMouseDown = (e: any) => {
    try {
      const stage = stageRef.current
      if (!stage) return
      const rawPos = stage.getPointerPosition()
      if (!rawPos) return
      
      // Transform physical position to logical position relative to centered paper
      const pos = { 
        x: (rawPos.x - stagePos.x) / scale, 
        y: (rawPos.y - stagePos.y) / scale 
      }

      if (tool === 'select') {
        const clickedOnEmpty = e.target === stage || e.target.name() === 'background'
        if (clickedOnEmpty) {
          onSelectId(null)
          isPanningRef.current = true
          lastPointerRef.current = rawPos
        }
        return
      }
      
      if (tool === 'eraser') {
        isErasingRef.current = true
        findAndRemoveElementAt(rawPos)
        return
      }

      if (tool === 'pen') {
        isDrawingRef.current = true
        const id = 'el-' + Date.now().toString() + Math.random().toString(36).slice(2, 6)
        const hl = drawSettings.mode === 'highlighter'
        const stroke: Stroke = { 
          id, 
          type: 'stroke', 
          points: [pos.x, pos.y], 
          stroke: hl ? 'rgba(255, 242, 0, 0.35)' : drawSettings.color, 
          strokeWidth: hl ? Math.max(drawSettings.width, 12) : drawSettings.width,
          mode: drawSettings.mode,
          opacity: hl ? 0.6 : 1,
        }
        elementsMapRef.current.set(id, stroke)
        lastStrokeIdRef.current = id
        forceRender(k => k + 1)
      } else if (tool === 'shape') {
        isDrawingRef.current = true
        const id = 'el-' + Date.now().toString() + Math.random().toString(36).slice(2, 6)
        const shape: ShapeEl = {
          id,
          type: 'shape',
          x: pos.x,
          y: pos.y,
          shape: shapeType,
          width: 5,
          height: 5,
          fill: shapeColor,
          stroke: shapeColor,
        }
        elementsMapRef.current.set(id, shape)
        lastStrokeIdRef.current = id
        forceRender(k => k + 1)
      }
    } catch (err) {
      console.error('handleMouseDown error:', err)
    }
  }

  const handleMouseMove = () => {
    try {
      const stage = stageRef.current
      if (!stage) return
      const rawPos = stage.getPointerPosition()
      if (!rawPos) return
      const pos = { 
        x: (rawPos.x - stagePos.x) / scale, 
        y: (rawPos.y - stagePos.y) / scale 
      }

      if (isPanningRef.current) {
        const dx = rawPos.x - lastPointerRef.current.x
        const dy = rawPos.y - lastPointerRef.current.y
        setStageOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
        lastPointerRef.current = rawPos
        return
      }

      // Eraser hover preview
      if (tool === 'eraser' && !isErasingRef.current) {
        const stage = stageRef.current
        if (!stage) return
        const node = stage.getIntersection(rawPos)
        const id = node && node.name() !== 'background' ? node.id() : null
        setEraserHoverId(id)
        return
      }

      if (isErasingRef.current) {
        findAndRemoveElementAt(rawPos)
        return
      }

      if (!isDrawingRef.current) return
      
      const lastId = lastStrokeIdRef.current
      if (!lastId) return
      const last = elementsMapRef.current.get(lastId)
      if (!last) return
      
      if (last.type === 'stroke') {
        const updated: Stroke = { 
          ...last, 
          points: [...last.points, pos.x, pos.y] 
        }
        elementsMapRef.current.set(lastId, updated)
        forceRender(k => k + 1)
      } else if (last.type === 'shape') {
        let w = last.shape === 'arrow' ? pos.x - last.x : Math.abs(pos.x - last.x)
        let h = last.shape === 'arrow' ? pos.y - last.y : Math.abs(pos.y - last.y)
        // Shift-key: constrain to perfect square / 45° arrow
        if (shiftHeldRef.current) {
          if (last.shape === 'arrow') {
            const angle = Math.atan2(h, w)
            const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)
            const len = Math.sqrt(w * w + h * h)
            w = Math.cos(snapped) * len
            h = Math.sin(snapped) * len
          } else {
            const maxDim = Math.max(w, h)
            w = maxDim
            h = maxDim
          }
        }
        const updated: ShapeEl = { ...last, width: w, height: h }
        elementsMapRef.current.set(lastId, updated)
        forceRender(k => k + 1)
      }
    } catch (err) {
      console.error('handleMouseMove error:', err)
    }
  }

  const handleMouseUp = () => {
    if (isDrawingRef.current || isErasingRef.current || isPanningRef.current) {
      isDrawingRef.current = false
      isErasingRef.current = false
      isPanningRef.current = false
      lastStrokeIdRef.current = null
      setEraserHoverId(null)
      onChange?.(Array.from(elementsMapRef.current.values()))
    }
  }

  const handleCanvasClick = (e: any) => {
    if (tool === 'select') {
      if (e.target !== stageRef.current && e.target.name() !== 'background') {
        onSelectId(e.target.id())
      } else {
        onSelectId(null)
      }
      return
    }

    if (tool !== 'text') return
    try {
      const stage = stageRef.current
      if (!stage) return
      const rawPos = stage.getPointerPosition()
      if (!rawPos) return
      const pos = { 
        x: (rawPos.x - stagePos.x) / scale, 
        y: (rawPos.y - stagePos.y) / scale 
      }
      
      // Use an invisible input or shared input instead of prompt for professional feel
      // For now, we trigger a state to show the input at this position
      const id = 'el-' + Date.now().toString() + Math.random().toString(36).slice(2, 6)
      const txt: TextEl = { 
        id, 
        type: 'text', 
        x: pos.x, 
        y: pos.y, 
        text: '', 
        fontSize: textSettings.fontSize,
        fill: textSettings.color,
        fontStyle: textSettings.fontStyle,
        fontFamily: textSettings.fontFamily,
      }
      elementsMapRef.current.set(id, txt)
      forceRender(k => k + 1)
      setEditingId(id)
      setEditingText('')
      setInputPos({ x: pos.x, y: pos.y })
      setTimeout(() => {
        const input = document.getElementById('canvas-text-input') as HTMLInputElement | null
        input?.focus()
      }, 30)
    } catch (err) {
      console.error('handleCanvasClick error:', err)
    }
  }

  const handleTransformEnd = (e: any) => {
    const node = e.target
    const id = node.id()
    const el = elementsMapRef.current.get(id)
    if (!el) return

    let updated: Element
    if (el.type === 'text') {
      updated = { ...el, x: node.x(), y: node.y(), rotation: node.rotation() }
    } else if (el.type === 'shape') {
      updated = { ...el, x: node.x(), y: node.y(), width: Math.max(5, node.width() * node.scaleX()), height: Math.max(5, node.height() * node.scaleY()), rotation: node.rotation() }
    } else if (el.type === 'image') {
      updated = { ...el, x: node.x(), y: node.y(), width: Math.max(5, node.width() * node.scaleX()), height: Math.max(5, node.height() * node.scaleY()), rotation: node.rotation() }
    } else {
      return
    }
    node.scaleX(1)
    node.scaleY(1)
    elementsMapRef.current.set(id, updated)
    forceRender(k => k + 1)
    onChange?.(Array.from(elementsMapRef.current.values()))
  }

  const startEditing = (id: string) => {
    const el = elementsMapRef.current.get(id) as TextEl | undefined
    if (!el || el.type !== 'text') return
    setEditingId(id)
    setEditingText(el.text)
    setInputPos({ x: Math.max(0, el.x), y: Math.max(0, el.y) })
    setTimeout(() => {
      const input = document.getElementById('canvas-text-input') as HTMLInputElement | null
      input?.focus()
      input?.select()
    }, 30)
  }

  const finishEditing = () => {
    if (!editingId) return
    const el = elementsMapRef.current.get(editingId)
    if (el && el.type === 'text') {
      const updated: TextEl = { ...el, text: editingText }
      elementsMapRef.current.set(editingId, updated)
      onChange?.(Array.from(elementsMapRef.current.values()))
    }
    forceRender(k => k + 1)
    setEditingId(null)
    setInputPos(null)
  }

  const gridElements = useMemo(() => {
    if (!showGrid) return null
    const lines = []
    const step = 40
    const gridRange = 50000 // 50,000 pixels in each direction
    const isDark = backgroundColor && backgroundColor.toLowerCase().startsWith('#') && parseInt(backgroundColor.slice(1), 16) < 0x808080
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
    
    for (let i = -gridRange / step; i <= gridRange / step; i++) {
      lines.push(<Line key={`v-${i}`} points={[i * step, -gridRange, i * step, gridRange]} stroke={gridColor} strokeWidth={1 / scale} listening={false} />)
    }
    for (let i = -gridRange / step; i <= gridRange / step; i++) {
      lines.push(<Line key={`h-${i}`} points={[-gridRange, i * step, gridRange, i * step]} stroke={gridColor} strokeWidth={1 / scale} listening={false} />)
    }
    return lines
  }, [showGrid, backgroundColor, scale])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
      <Stage 
        ref={stageRef} 
        width={size.width} 
        height={size.height} 
        onPointerDown={handleMouseDown}
        onPointerMove={handleMouseMove}
        onPointerUp={handleMouseUp}
        onClick={handleCanvasClick}
        style={{ background: backgroundColor, cursor: tool === 'pen' ? 'crosshair' : tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : tool === 'select' ? 'default' : 'pointer', touchAction: 'none' }}
      >
        {/* Static layer: background + grid — isolated from element re-renders */}
        <Layer x={stagePos.x} y={stagePos.y} scaleX={scale} scaleY={scale} listening={false}>
          <Rect name="background" x={-50000} y={-50000} width={100000} height={100000} fill={backgroundColor} />
          {gridElements}
        </Layer>
        {/* Interaction layer: elements, transformer, overlays */}
        <Layer x={stagePos.x} y={stagePos.y} scaleX={scale} scaleY={scale}>
          {els.map((el) => {
            const commonProps = {
              id: el.id,
              rotation: el.rotation || 0,
              opacity: el.opacity ?? 1,
              draggable: tool === 'select',
              onDragEnd: (e: any) => {
                const existing = elementsMapRef.current.get(el.id) as Record<string, unknown>
                if (existing) {
                  let nx = e.target.x(), ny = e.target.y()
                  if (showGrid) {
                    const step = 40
                    nx = Math.round(nx / step) * step
                    ny = Math.round(ny / step) * step
                  }
                  const moved = { ...existing, x: nx, y: ny } as Element
                  elementsMapRef.current.set(el.id, moved)
                  forceRender(k => k + 1)
                  onChange?.(Array.from(elementsMapRef.current.values()))
                }
              },
              onTransformEnd: handleTransformEnd,
            }

            if (el.type === 'stroke') {
              return (
                <Line 
                  key={el.id}
                  {...commonProps}
                  points={el.points} 
                  stroke={el.stroke} 
                  strokeWidth={el.strokeWidth} 
                  tension={0.5} 
                  lineCap="round" 
                  lineJoin="round"
                />
              )
            } else if (el.type === 'text') {
              return (
                <KonvaText
                  key={el.id}
                  {...commonProps}
                  x={el.x}
                  y={el.y}
                  text={el.text}
                  fontSize={el.fontSize}
                  fill={el.fill}
                  fontStyle={el.fontStyle}
                  fontFamily={el.fontFamily || textSettings.fontFamily}
                  onDblClick={() => tool === 'select' && startEditing(el.id)}
                />
              )
            } else if (el.type === 'shape') {
              if (el.shape === 'rect') {
                return <Rect key={el.id} {...commonProps} x={el.x} y={el.y} width={el.width} height={el.height} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth ?? 2} dash={el.dash} />
              } else if (el.shape === 'circle') {
                return <Circle key={el.id} {...commonProps} x={el.x} y={el.y} radius={Math.max(el.width, el.height) / 2} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth ?? 2} dash={el.dash} />
              } else if (el.shape === 'triangle') {
                return <RegularPolygon key={el.id} {...commonProps} x={el.x} y={el.y} sides={3} radius={Math.max(el.width, el.height) / 2} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth ?? 2} dash={el.dash} />
              } else if (el.shape === 'pentagon') {
                return <RegularPolygon key={el.id} {...commonProps} x={el.x} y={el.y} sides={5} radius={Math.max(el.width, el.height) / 2} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth ?? 2} dash={el.dash} />
              } else if (el.shape === 'arrow') {
                return <Arrow key={el.id} {...commonProps} points={[el.x, el.y, el.x + el.width, el.y + el.height]} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth ?? 2} dash={el.dash} />
              }
            } else if (el.type === 'image') {
              return <ImageComponent key={el.id} el={el} commonProps={commonProps} />
            }
            return null
          })}
          {tool === 'select' && <Transformer ref={transformerRef} rotateEnabled={true} flipEnabled={false} boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5 ? oldBox : newBox)} />}
          {/* Eraser hover highlight */}
          {eraserHoverId && tool === 'eraser' && (() => {
            const hoveredEl = elementsMapRef.current.get(eraserHoverId)
            if (!hoveredEl) return null
            let bx = 0, by = 0, bw = 10, bh = 10
            if (hoveredEl.type === 'stroke' && hoveredEl.points.length >= 2) {
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
              for (let i = 0; i < hoveredEl.points.length; i += 2) {
                minX = Math.min(minX, hoveredEl.points[i]); maxX = Math.max(maxX, hoveredEl.points[i])
                minY = Math.min(minY, hoveredEl.points[i + 1]); maxY = Math.max(maxY, hoveredEl.points[i + 1])
              }
              bx = minX; by = minY; bw = maxX - minX; bh = maxY - minY
            } else if (hoveredEl.type === 'text') {
              bx = hoveredEl.x; by = hoveredEl.y; bw = hoveredEl.text.length * hoveredEl.fontSize * 0.6; bh = hoveredEl.fontSize
            } else if (hoveredEl.type === 'shape') {
              bx = hoveredEl.x; by = hoveredEl.y; bw = hoveredEl.width; bh = hoveredEl.height
            } else if (hoveredEl.type === 'image') {
              bx = hoveredEl.x; by = hoveredEl.y; bw = hoveredEl.width; bh = hoveredEl.height
            }
            const pad = 6
            return <Rect key="__eraser-hover" x={bx - pad} y={by - pad} width={bw + pad * 2} height={bh + pad * 2} fill="rgba(255,0,0,0.12)" stroke="rgba(255,0,0,0.5)" strokeWidth={2 / scale} listening={false} />
          })()}
        </Layer>
      </Stage>

      {inputPos && (
        <textarea
          id="canvas-text-input"
          autoFocus
          style={{ 
            position: 'absolute', 
            left: inputPos.x * scale + stagePos.x, 
            top: inputPos.y * scale + stagePos.y, 
            zIndex: 100, 
            padding: `${4 * scale}px ${8 * scale}px`, 
            fontSize: `${16 * scale}px`, 
            border: '1px solid var(--accent)', 
            outline: 'none', 
            borderRadius: 4 * scale,
            background: backgroundColor,
            color: textSettings.color,
            cursor: 'text',
            resize: 'none',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            minWidth: `${100 * scale}px`
          }}
          value={editingText}
          onChange={(e) => {
            setEditingText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault()
              finishEditing()
            }
            if (e.key === 'Escape') {
              setEditingId(null)
              setInputPos(null)
            }
          }}
          ref={(el) => {
            if (el) {
              el.style.height = 'auto'
              el.style.height = el.scrollHeight + 'px'
            }
          }}
        />
      )}


    </div>
  )
})

export default CanvasEditor
