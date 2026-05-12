/**
 * GraphEditor.tsx
 * A faithful Desmos-style graphing calculator clone.
 * Dependencies: mathjs
 */

import React, {
  useState, useRef, useEffect, useCallback,
} from "react";
import * as math from "mathjs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expression {
  id: string;
  text: string;
  color: string;
  visible: boolean;
}

interface Viewport {
  /** World-unit offset of graph origin from canvas centre */
  cx: number;
  cy: number;
  /** Pixels per world unit */
  scale: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = [
  "#c74440", "#2d70b3", "#388c46", "#fa7e19",
  "#6042a6", "#000000", "#e580c8", "#7b9fb0",
];

const NICE_STEPS = [
  0.0001, 0.0002, 0.0005,
  0.001, 0.002, 0.005,
  0.01, 0.02, 0.025, 0.05,
  0.1, 0.2, 0.25, 0.5,
  1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000,
];

const DEFAULT_VP: Viewport = { cx: 0, cy: 0, scale: 60 };

const INITIAL_EXPRS: Expression[] = [
  { id: "1", text: "y = sin(x)",       color: "#c74440", visible: true },
  { id: "2", text: "y = x^2 / 4 - 2", color: "#2d70b3", visible: true },
];

// ─── Utility ──────────────────────────────────────────────────────────────────

function gridStep(scale: number, minPx = 50): number {
  return NICE_STEPS.find((s) => s * scale >= minPx) ?? 1;
}

function parseExprRHS(raw: string): string {
  const s = raw.trim();
  if (/^y\s*=/i.test(s))      return s.replace(/^y\s*=/i, "").trim();
  if (/^f\(x\)\s*=/i.test(s)) return s.replace(/^f\(x\)\s*=/i, "").trim();
  return s;
}

function evalY(rhs: string, x: number): number | null {
  try {
    const v = math.evaluate(rhs, { x, e: Math.E, pi: Math.PI });
    return typeof v === "number" && isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface RowProps {
  expr: Expression;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, c: string) => void;
  onToggle: (id: string) => void;
  active: boolean;
  onFocus: () => void;
  onBlur: () => void;
}

const ExpressionRow: React.FC<RowProps> = ({
  expr, onUpdate, onDelete, onColorChange, onToggle,
  active, onFocus, onBlur,
}) => {
  const [picker, setPicker] = useState(false);

  return (
    <div
      style={{
        borderBottom: "1px solid var(--border)",
        background: active ? "var(--panel)" : "transparent",
        transition: "background 0.12s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", gap: 10 }}>
        <button
          onClick={() => setPicker((p) => !p)}
          title="Change colour"
          style={{
            width: 22, height: 22, borderRadius: "50%",
            background: expr.visible ? expr.color : "#ccc",
            border: "2px solid var(--border)",
            cursor: "pointer", flexShrink: 0,
            transition: "background .2s", padding: 0,
          }}
        />
        <input
          value={expr.text}
          onChange={(e) => onUpdate(expr.id, e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="y = …"
          spellCheck={false}
          style={{
            flex: 1, border: "none", outline: "none",
            background: "transparent", fontSize: 14,
            fontFamily: "'Courier New', Courier, monospace",
            color: "var(--text)", padding: "2px 0",
          }}
        />
        <button
          onClick={() => onToggle(expr.id)}
          title={expr.visible ? "Hide" : "Show"}
          style={{...iconBtnStyle, color: 'var(--muted)'}}
        >
          {expr.visible ? "👁" : "⊘"}
        </button>
        <button
          onClick={() => onDelete(expr.id)}
          title="Remove"
          style={{ ...iconBtnStyle, fontSize: 18, color: "var(--muted)" }}
        >
          ×
        </button>
      </div>
      {picker && (
        <div style={{
          padding: "8px 12px 12px", display: "flex", gap: 8,
          flexWrap: "wrap", background: "var(--panel)", borderTop: "1px solid var(--border)",
        }}>
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => { onColorChange(expr.id, c); setPicker(false); }}
              style={{
                width: 22, height: 22, borderRadius: "50%", background: c,
                border: expr.color === c ? "2.5px solid #fff" : "2px solid transparent",
                cursor: "pointer", padding: 0, boxSizing: "border-box",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const iconBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 14, padding: "0 3px", lineHeight: 1, flexShrink: 0,
};

const zoomBtnStyle: React.CSSProperties = {
  width: 30, height: 30, border: "1px solid #ccc", borderRadius: 4,
  background: "#fff", cursor: "pointer", fontSize: 18, fontWeight: 300,
  lineHeight: "28px", textAlign: "center", padding: 0, flexShrink: 0,
};

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  content?: string;
  onChange?: (content: string) => void;
}

export default function GraphEditor({ content, onChange }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const dragging     = useRef(false);
  const lastPos      = useRef({ x: 0, y: 0 });
  const [vp, setVp]  = useState<Viewport>(DEFAULT_VP);
  const vpRef        = useRef(vp);
  vpRef.current      = vp;

  const [exprs, setExprs] = useState<Expression[]>(() => {
    try { 
      const parsed = content ? JSON.parse(content) : INITIAL_EXPRS; 
      return Array.isArray(parsed) ? parsed : INITIAL_EXPRS;
    }
    catch { return INITIAL_EXPRS; }
  });
  const exprsRef = useRef(exprs);
  exprsRef.current = exprs;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [nextId, setNextId]     = useState(3);

  // ── Drawing ──────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { cx, cy, scale } = vpRef.current;
    const W = canvas.width;
    const H = canvas.height;

    const ox = W / 2 + cx * scale;
    const oy = H / 2 - cy * scale;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "var(--bg)";
    ctx.fillRect(0, 0, W, H);

    const step = gridStep(scale);
    const xMin = -ox / scale;
    const xMax = (W - ox) / scale;
    const yMin = (oy - H) / scale;
    const yMax = oy / scale;

    const startX = Math.floor(xMin / step) * step;
    const startY = Math.floor(yMin / step) * step;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    for (let gx = startX; gx <= xMax + step; gx += step) {
      const px = ox + gx * scale;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
    }
    for (let gy = startY; gy <= yMax + step; gy += step) {
      const py = oy - gy * scale;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    }

    ctx.strokeStyle = "var(--muted)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox, H); ctx.stroke();

    ctx.fillStyle = "var(--muted)";
    const arrowDraw = (points: [number, number][]) => {
      ctx.beginPath();
      ctx.moveTo(...points[0]);
      points.slice(1).forEach((p) => ctx.lineTo(...p));
      ctx.closePath(); ctx.fill();
    };
    arrowDraw([[W - 10, oy - 5], [W, oy], [W - 10, oy + 5]]);
    arrowDraw([[ox - 5, 10], [ox, 0], [ox + 5, 10]]);

    ctx.fillStyle = "#a1a1aa"; // A lighter grey for better contrast
    ctx.font = "11px system-ui, sans-serif";

    const fmt = (v: number) =>
      Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0)
        ? v.toExponential(1)
        : v % 1 === 0 ? v.toString() : v.toPrecision(3).replace(/\.?0+$/, "");

    const EPS = step * 0.01;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let gx = startX; gx <= xMax + step; gx += step) {
      if (Math.abs(gx) < EPS) continue;
      const px = ox + gx * scale;
      if (px < 4 || px > W - 14) continue;
      const labelY = Math.min(Math.max(oy + 5, 2), H - 16);
      ctx.fillText(fmt(gx), px, labelY);
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let gy = startY; gy <= yMax + step; gy += step) {
      if (Math.abs(gy) < EPS) continue;
      const py = oy - gy * scale;
      if (py < 4 || py > H - 4) continue;
      const labelX = Math.min(Math.max(ox - 5, 45), W - 2);
      ctx.fillText(fmt(gy), labelX, py);
    }

    exprsRef.current.forEach((expr) => {
      if (!expr.visible || !expr.text.trim()) return;
      const rhs = parseExprRHS(expr.text);

      ctx.beginPath();
      ctx.strokeStyle = expr.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap  = "round";

      let penDown = false;
      let prevWy: number | null = null;
      const jumpThreshold = (H / scale) * 3;

      for (let px = 0; px <= W; px++) {
        const wx = (px - ox) / scale;
        const wy = evalY(rhs, wx);

        if (wy === null) {
          if (penDown) { ctx.stroke(); ctx.beginPath(); penDown = false; }
          prevWy = null;
          continue;
        }

        if (prevWy !== null && Math.abs(wy - prevWy) > jumpThreshold) {
          ctx.stroke(); ctx.beginPath(); penDown = false;
        }

        const py2 = oy - wy * scale;
        if (!penDown) { ctx.moveTo(px, py2); penDown = true; }
        else ctx.lineTo(px, py2);
        prevWy = wy;
      }
      ctx.stroke();
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resize = () => {
      canvas.width  = parent.clientWidth;
      canvas.height = parent.clientHeight;
      draw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [vp, exprs, draw]);
  useEffect(() => { 
    const str = JSON.stringify(exprs);
    if (content !== str) onChange?.(str); 
  }, [exprs, onChange, content]);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setVp((v) => ({ ...v, cx: v.cx + dx / v.scale, cy: v.cy - dy / v.scale }));
  };

  const stopDrag = () => { dragging.current = false; };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1 / 1.15 : 1.15;
    setVp((v) => ({ ...v, scale: Math.max(4, Math.min(1000, v.scale * factor)) }));
  };

  return (
    <div style={{
      display: "flex", height: "100%", width: "100%",
      fontFamily: "'Lato', 'Segoe UI', sans-serif",
      background: "var(--bg)", color: "var(--text)", overflow: "hidden",
    }}>
      <div style={{
        width: 320, minWidth: 240, maxWidth: 400,
        background: "var(--panel)", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {exprs.map((expr) => (
            <ExpressionRow
              key={expr.id}
              expr={expr}
              onUpdate={(id, text) => setExprs(p => p.map(e => e.id === id ? { ...e, text } : e))}
              onDelete={(id) => setExprs(p => p.filter(e => e.id !== id))}
              onColorChange={(id, color) => setExprs(p => p.map(e => e.id === id ? { ...e, color } : e))}
              onToggle={(id) => setExprs(p => p.map(e => e.id === id ? { ...e, visible: !e.visible } : e))}
              active={activeId === expr.id}
              onFocus={() => setActiveId(expr.id)}
              onBlur={() => setActiveId(null)}
            />
          ))}
          <button
            onClick={() => {
                const color = PALETTE[exprs.length % PALETTE.length];
                setExprs(p => [...p, { id: String(nextId), text: "", color, visible: true }]);
                setNextId(n => n + 1);
            }}
            style={{ width: "100%", padding: "12px 16px", background: "transparent", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer", textAlign: "left", color: "var(--muted)", fontSize: 14 }}
          >
            + Add Expression
          </button>
        </div>
        <div style={{ borderTop: "1px solid var(--border)", padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, background: "var(--panel)" }}>
          <button style={{...zoomBtnStyle, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)'}} onClick={() => setVp(v => ({ ...v, scale: Math.min(1000, v.scale * 1.25) }))}>+</button>
          <button style={{...zoomBtnStyle, background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)'}} onClick={() => setVp(v => ({ ...v, scale: Math.max(4, v.scale / 1.25) }))}>−</button>
          <button style={{ ...zoomBtnStyle, width: "auto", padding: "0 10px", fontSize: 11, color: 'var(--text)', background: 'var(--panel)', border: '1px solid var(--border)' }} onClick={() => setVp(DEFAULT_VP)}>Reset</button>
        </div>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%", cursor: dragging.current ? "grabbing" : "grab" }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={stopDrag} onMouseLeave={stopDrag} onWheel={onWheel}
        />
      </div>
    </div>
  );
}
