import React, { useState, useEffect, useRef } from 'react'

interface GraphLine {
  id: string
  formula: string
  color: string
}

interface GraphProps {
  content?: string
  onChange?: (content: string) => void
}

const LINE_COLORS = [
  '#0ea5a4', '#f97316', '#ef4444', '#22c55e', '#3b82f6', 
  '#a855f7', '#ec4899', '#eab308', '#06b6d4', '#84cc16'
]

const GraphEditor: React.FC<GraphProps> = ({ content, onChange }) => {
  const [graphMode, setGraphMode] = useState<'2d' | '3d'>('2d')
  const [lines, setLines] = useState<GraphLine[]>([
    { id: '1', formula: 'sin(x)', color: LINE_COLORS[0] }
  ])
  const [data, setData] = useState<any[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const savedRef = useRef(false)
  const plotlyLoadedRef = useRef(false)

  const [layout] = useState<any>({
    autosize: true,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { color: '#e6edf3' },
    margin: { l: 40, r: 20, b: 40, t: 30 },
    dragmode: 'zoom',
    xaxis: { gridcolor: 'rgba(255,255,255,0.1)', zerolinecolor: 'rgba(255,255,255,0.2)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.1)', zerolinecolor: 'rgba(255,255,255,0.2)' },
    scene: { 
      xaxis: { gridcolor: 'rgba(255,255,255,0.1)', zerolinecolor: 'rgba(255,255,255,0.2)', backgroundcolor: 'rgba(0,0,0,0)' },
      yaxis: { gridcolor: 'rgba(255,255,255,0.1)', zerolinecolor: 'rgba(255,255,255,0.2)', backgroundcolor: 'rgba(0,0,0,0)' },
      zaxis: { gridcolor: 'rgba(255,255,255,0.1)', zerolinecolor: 'rgba(255,255,255,0.2)', backgroundcolor: 'rgba(0,0,0,0)' },
    }
  })

  useEffect(() => {
    if (content && !savedRef.current) {
      try {
        const parsed = JSON.parse(content)
        if (parsed.mode) setGraphMode(parsed.mode)
        if (parsed.lines && parsed.lines.length > 0) setLines(parsed.lines)
        savedRef.current = true
      } catch (e) {}
    }
  }, [])

  useEffect(() => {
    if (graphMode === '2d') {
      const newData = lines.map(line => {
        const xValues: number[] = []
        const yValues: number[] = []
        for (let x = -10; x <= 10; x += 0.1) {
          xValues.push(x)
          yValues.push(safeEval(line.formula, { x }))
        }
        return {
          x: xValues,
          y: yValues,
          type: 'scatter',
          mode: 'lines',
          line: { color: line.color, width: 3 },
          name: line.formula
        }
      })
      setData(newData)
    } else {
      const eq = lines[0]?.formula || 'sin(x)*cos(y)'
      const xValues: number[] = []
      const yValues: number[] = []
      const zValues: number[][] = []
      
      for (let i = -5; i <= 5; i += 0.5) {
        xValues.push(i)
        yValues.push(i)
      }

      for (let i = 0; i < yValues.length; i++) {
        const row: number[] = []
        for (let j = 0; j < xValues.length; j++) {
          const val = safeEval(eq, { x: xValues[j], y: yValues[i] })
          row.push(val)
        }
        zValues.push(row)
      }

      setData([{
        z: zValues,
        x: xValues,
        y: yValues,
        type: 'surface',
        colorscale: 'Viridis',
        showscale: false
      }])
    }
  }, [lines, graphMode])

  const plotContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    if (!plotContainerRef.current) {
      plotContainerRef.current = document.createElement('div')
      plotContainerRef.current.className = 'plotly-div'
      plotContainerRef.current.style.width = '100%'
      plotContainerRef.current.style.height = '100%'
      containerRef.current.appendChild(plotContainerRef.current)
    }

    if (!plotlyLoadedRef.current) return

    const Plotly = (window as any).Plotly
    if (!Plotly) return

    Plotly.newPlot(plotContainerRef.current, data, layout, { 
      responsive: true, 
      displayModeBar: false, 
      scrollZoom: true,
      displaylogo: false
    })
  }, [data, layout, plotlyLoadedRef.current])

  useEffect(() => {
    if (plotlyLoadedRef.current) return
    
    const script = document.createElement('script')
    script.src = 'https://cdn.plot.ly/plotly-2.24.1.min.js'
    script.onload = () => {
      plotlyLoadedRef.current = true
      const Plotly = (window as any).Plotly
      if (Plotly && plotContainerRef.current) {
        Plotly.newPlot(plotContainerRef.current, data, layout, { 
          responsive: true, 
          displayModeBar: false, 
          scrollZoom: true,
          displaylogo: false
        })
      }
    }
    document.head.appendChild(script)
  }, [])

  const safeEval = (eq: string, scope: any) => {
    try {
      let cleanEq = eq
        .replace(/sin/g, 'Math.sin')
        .replace(/cos/g, 'Math.cos')
        .replace(/tan/g, 'Math.tan')
        .replace(/exp/g, 'Math.exp')
        .replace(/pow/g, 'Math.pow')
        .replace(/pi/g, 'Math.PI')
        .replace(/sqrt/g, 'Math.sqrt')
        .replace(/abs/g, 'Math.abs')
        .replace(/log/g, 'Math.log')
        .replace(/\^/g, '**')
      
      const keys = Object.keys(scope)
      const vals = Object.values(scope)
      const fn = new Function(...keys, `return ${cleanEq}`)
      return fn(...vals)
    } catch (e) {
      return 0
    }
  }

  const handleAddLine = () => {
    const newId = Date.now().toString()
    const usedColors = lines.map(l => l.color)
    const availableColor = LINE_COLORS.find(c => !usedColors.includes(c)) || LINE_COLORS[0]
    setLines([...lines, { id: newId, formula: 'cos(x)', color: availableColor }])
  }

  const handleRemoveLine = (id: string) => {
    if (lines.length <= 1) return
    setLines(lines.filter(l => l.id !== id))
  }

  const handleLineChange = (id: string, field: 'formula' | 'color', value: string) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const handleSave = () => {
    onChange?.(JSON.stringify({ mode: graphMode, lines }))
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select 
              value={graphMode} 
              onChange={(e) => { setGraphMode(e.target.value as any); handleSave(); }}
              style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '8px', borderRadius: 6 }}
            >
              <option value="2d">2D (y=f(x))</option>
              <option value="3d">3D (z=f(x,y))</option>
            </select>
            <button 
              onClick={() => { handleAddLine(); handleSave(); }}
              disabled={graphMode === '3d'}
              style={{ padding: '8px 12px', background: graphMode === '3d' ? 'rgba(255,255,255,0.05)' : 'rgba(34, 197, 94, 0.2)', color: graphMode === '3d' ? '#6b7280' : '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: 6, cursor: graphMode === '3d' ? 'not-allowed' : 'pointer' }}
            >
              + Add Line
            </button>
          </div>
          
          {graphMode === '2d' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {lines.map((line, idx) => (
                <div key={line.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: line.color, fontWeight: 'bold', width: 20 }}>y{idx + 1}=</span>
                  <input 
                    value={line.formula} 
                    onChange={(e) => handleLineChange(line.id, 'formula', e.target.value)}
                    onBlur={handleSave}
                    style={{ flex: 1, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 10px', borderRadius: 4, fontSize: 14, outline: 'none' }}
                    placeholder="e.g. sin(x)"
                  />
                  <input 
                    type="color" 
                    value={line.color}
                    onChange={(e) => { handleLineChange(line.id, 'color', e.target.value); handleSave(); }}
                    style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'none' }}
                  />
                  <button 
                    onClick={() => { handleRemoveLine(line.id); handleSave(); }}
                    disabled={lines.length <= 1}
                    style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', color: lines.length <= 1 ? '#6b7280' : '#ef4444', border: 'none', borderRadius: 4, cursor: lines.length <= 1 ? 'not-allowed' : 'pointer', fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {graphMode === '3d' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#9ca3af', fontWeight: 'bold' }}>z =</span>
              <input 
                value={lines[0]?.formula || ''} 
                onChange={(e) => setLines([{ ...lines[0], formula: e.target.value }])}
                onBlur={handleSave}
                style={{ flex: 1, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 10px', borderRadius: 4, fontSize: 14, outline: 'none' }}
                placeholder="e.g. sin(x)*cos(y)"
              />
            </div>
          )}
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!plotlyLoadedRef.current && (
          <div style={{ color: 'var(--muted)' }}>Loading graph engine...</div>
        )}
      </div>
      
      <div style={{ fontSize: 12, color: '#9ca3af' }}>
        💡 {graphMode === '2d' ? 'Scroll to zoom. Click+drag to pan.' : 'Rotate 3D with left-click. Zoom with scroll.'}
      </div>
    </div>
  )
}

export default GraphEditor