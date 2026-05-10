import { useRef, useState, useEffect, useLayoutEffect, forwardRef, useImperativeHandle, useMemo } from 'react'
import { Stage, Layer, Line, Text as KonvaText, Rect, Circle, Transformer, RegularPolygon, Arrow, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'

const useImageFn = (useImage as any).default || useImage

type Stroke = { id: string; type: 'stroke'; points: number[]; stroke: string; strokeWidth: number; mode: 'pen' | 'marker'; rotation?: number }
type TextEl = { id: string; type: 'text'; x: number; y: number; text: string; fontSize: number; fill: string; fontStyle: string; fontFamily?: string; rotation?: number }
type ShapeEl = { id: string; type: 'shape'; x: number; y: number; shape: 'rect' | 'circle' | 'triangle' | 'pentagon' | 'arrow'; width: number; height: number; fill: string; stroke: string; rotation?: number }
type ImageEl = { id: string; type: 'image'; x: number; y: number; width: number; height: number; src: string; rotation?: number }
export type Element = Stroke | TextEl | ShapeEl | ImageEl

const ImageComponent = ({ el, commonProps }: { el: ImageEl, commonProps: any }) => {
  const [img] = useImageFn(el.src)
  return <KonvaImage key={el.id} image={img} {...commonProps} x={el.x} y={el.y} width={el.width} height={el.height} />
}

interface DrawSettings {
  color: string
  width: number
  mode: 'pen' | 'marker'
}

interface TextSettings {
  color: string
  fontSize: number
  fontStyle: 'normal' | 'italic' | 'bold'
  fontFamily: string
}

interface Props {
  elements?: Element[]
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
}

export interface CanvasEditorRef {
  getStageImage: () => string | undefined
}

const CanvasEditor = forwardRef<CanvasEditorRef, Props>((props, ref) => {
  const { 
    elements = [], 
    onChange, 
    tool, 
    shapeType, 
    drawSettings, 
    textSettings, 
    shapeColor,
    selectedId,
    onSelectId,
    backgroundColor = '#ffffff',
    showGrid = false
  } = props

  const [els, setEls] = useState<Element[]>(elements)
  const stageRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isDrawingRef = useRef(false)
  const isErasingRef = useRef(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [inputPos, setInputPos] = useState<{ x: number; y: number } | null>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })

  useImperativeHandle(ref, () => ({
    getStageImage: () => {
      if (!stageRef.current) return undefined
      const oldNodes = transformerRef.current?.nodes() || []
      transformerRef.current?.nodes([])
      const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2, backgroundColor })
      transformerRef.current?.nodes(oldNodes)
      return dataUrl
    }
  }))

  useEffect(() => {
    setEls(elements)
  }, [JSON.stringify(elements)])

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
      setSize({ width: Math.max(200, Math.floor(r.width)), height: Math.max(200, Math.floor(r.height)) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const findAndRemoveElementAt = (pos: { x: number; y: number }) => {
    const stage = stageRef.current
    if (!stage) return
    const node = stage.getIntersection(pos)
    if (node && node.name() !== 'background') {
      const id = node.id()
      if (id) {
        setEls((prev) => prev.filter(e => e.id !== id))
        if (selectedId === id) onSelectId(null)
      }
    }
  }

  const handleMouseDown = (e: any) => {
    try {
      const stage = stageRef.current
      if (!stage) return
      const pos = stage.getPointerPosition()
      if (!pos) return

      if (tool === 'select') {
        const clickedOnEmpty = e.target === stage || e.target.name() === 'background'
        if (clickedOnEmpty) {
          onSelectId(null)
        }
        return
      }
      
      if (tool === 'eraser') {
        isErasingRef.current = true
        findAndRemoveElementAt(pos)
        return
      }

      if (tool === 'pen') {
        isDrawingRef.current = true
        const id = 'el-' + Date.now().toString() + Math.random().toString(36).slice(2, 6)
        const stroke: Stroke = { 
          id, 
          type: 'stroke', 
          points: [pos.x, pos.y], 
          stroke: drawSettings.color, 
          strokeWidth: drawSettings.width,
          mode: 'pen',
        }
        setEls((prev) => [...prev, stroke])
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
          stroke: '#000',
        }
        setEls((prev) => [...prev, shape])
      }
    } catch (err) {
      console.error('handleMouseDown error:', err)
    }
  }

  const handleMouseMove = () => {
    try {
      const stage = stageRef.current
      if (!stage) return
      const pos = stage.getPointerPosition()
      if (!pos) return

      if (isErasingRef.current) {
        findAndRemoveElementAt(pos)
        return
      }

      if (!isDrawingRef.current) return
      
      setEls((prevEls) => {
        const last = prevEls[prevEls.length - 1]
        if (!last) return prevEls
        
        if (last.type === 'stroke') {
          const updated: Stroke = { 
            ...last, 
            points: [...last.points, pos.x, pos.y] 
          }
          return [...prevEls.slice(0, -1), updated]
        } else if (last.type === 'shape') {
          const updated: ShapeEl = {
            ...last,
            width: Math.abs(pos.x - last.x),
            height: Math.abs(pos.y - last.y),
          }
          return [...prevEls.slice(0, -1), updated]
        }
        return prevEls
      })
    } catch (err) {
      console.error('handleMouseMove error:', err)
    }
  }

  const handleMouseUp = () => {
    if (isDrawingRef.current || isErasingRef.current) {
      isDrawingRef.current = false
      isErasingRef.current = false
      onChange?.(els)
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
      const pos = stage.getPointerPosition()
      if (!pos) return
      
      const text = prompt('Enter text:')
      if (!text) return
      
      const id = 'el-' + Date.now().toString() + Math.random().toString(36).slice(2, 6)
      const txt: TextEl = { 
        id, 
        type: 'text', 
        x: pos.x, 
        y: pos.y, 
        text, 
        fontSize: textSettings.fontSize,
        fill: textSettings.color,
        fontStyle: textSettings.fontStyle,
        fontFamily: textSettings.fontFamily,
      }
      const newEls = [...els, txt]
      setEls(newEls)
      onChange?.(newEls)
    } catch (err) {
      console.error('handleCanvasClick error:', err)
    }
  }

  const handleTransformEnd = (e: any) => {
    const node = e.target
    const id = node.id()
    const updated = els.map((el) => {
      if (el.id === id) {
        if (el.type === 'text') {
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            rotation: node.rotation(),
          }
        } else if (el.type === 'shape') {
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * node.scaleX()),
            height: Math.max(5, node.height() * node.scaleY()),
            rotation: node.rotation(),
          }
        } else if (el.type === 'image') {
          return {
            ...el,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * node.scaleX()),
            height: Math.max(5, node.height() * node.scaleY()),
            rotation: node.rotation(),
          }
        }
      }
      return el
    })
    node.scaleX(1)
    node.scaleY(1)
    setEls(updated as Element[])
    onChange?.(updated as Element[])
  }

  const startEditing = (id: string) => {
    const el = els.find((x) => x.id === id) as TextEl | undefined
    if (!el) return
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
    const updated = els.map((el) => (el.id === editingId && el.type === 'text' ? { ...el, text: editingText } : el))
    setEls(updated)
    onChange?.(updated)
    setEditingId(null)
    setInputPos(null)
  }

  const gridElements = useMemo(() => {
    if (!showGrid) return null
    const lines = []
    const step = 40
    const isDark = backgroundColor && backgroundColor.toLowerCase().startsWith('#') && parseInt(backgroundColor.slice(1), 16) < 0x808080
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
    for (let i = 0; i < size.width / step; i++) {
      lines.push(<Line key={`v-${i}`} points={[i * step, 0, i * step, size.height]} stroke={gridColor} strokeWidth={1} listening={false} />)
    }
    for (let i = 0; i < size.height / step; i++) {
      lines.push(<Line key={`h-${i}`} points={[0, i * step, size.width, i * step]} stroke={gridColor} strokeWidth={1} listening={false} />)
    }
    return lines
  }, [showGrid, size, backgroundColor])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <Stage 
        ref={stageRef} 
        width={size.width} 
        height={size.height} 
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onClick={handleCanvasClick} 
        style={{ background: backgroundColor, cursor: tool === 'pen' ? 'crosshair' : tool === 'text' ? 'text' : tool === 'eraser' ? 'cell' : tool === 'select' ? 'default' : 'pointer' }}
      >
        <Layer>
          <Rect name="background" x={0} y={0} width={size.width} height={size.height} fill={backgroundColor} listening={tool !== 'eraser'} />
          {gridElements}
          
          {els.map((el) => {
            const commonProps = {
              id: el.id,
              rotation: el.rotation || 0,
              draggable: tool === 'select',
              onDragEnd: (e: any) => {
                const updated = els.map((el2) => (el2.id === el.id ? { ...el2, x: e.target.x(), y: e.target.y() } : el2))
                setEls(updated as Element[])
                onChange?.(updated as Element[])
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
                return <Rect key={el.id} {...commonProps} x={el.x} y={el.y} width={el.width} height={el.height} fill={el.fill} stroke={el.stroke} strokeWidth={2} />
              } else if (el.shape === 'circle') {
                return <Circle key={el.id} {...commonProps} x={el.x} y={el.y} radius={Math.max(el.width, el.height) / 2} fill={el.fill} stroke={el.stroke} strokeWidth={2} />
              } else if (el.shape === 'triangle') {
                return <RegularPolygon key={el.id} {...commonProps} x={el.x} y={el.y} sides={3} radius={Math.max(el.width, el.height) / 2} fill={el.fill} stroke={el.stroke} strokeWidth={2} />
              } else if (el.shape === 'pentagon') {
                return <RegularPolygon key={el.id} {...commonProps} x={el.x} y={el.y} sides={5} radius={Math.max(el.width, el.height) / 2} fill={el.fill} stroke={el.stroke} strokeWidth={2} />
              } else if (el.shape === 'arrow') {
                return <Arrow key={el.id} {...commonProps} points={[el.x, el.y, el.x + el.width, el.y + el.height]} fill={el.fill} stroke={el.stroke} strokeWidth={2} />
              }
            } else if (el.type === 'image') {
              return <ImageComponent key={el.id} el={el} commonProps={commonProps} />
            }
            return null
          })}
          {tool === 'select' && <Transformer ref={transformerRef} rotateEnabled={true} flipEnabled={false} boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5 ? oldBox : newBox)} />}
        </Layer>
      </Stage>

      {inputPos && (
        <input
          id="canvas-text-input"
          style={{ position: 'absolute', left: inputPos.x, top: inputPos.y, zIndex: 10, padding: '4px 8px', fontSize: '16px', border: '1px solid #1976d2', outline: 'none', borderRadius: 4 }}
          value={editingText}
          onChange={(e) => setEditingText(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finishEditing()
            if (e.key === 'Escape') {
              setEditingId(null)
              setInputPos(null)
            }
          }}
        />
      )}
    </div>
  )
})

export default CanvasEditor
