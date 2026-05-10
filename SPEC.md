📐 SPEC.md
1. Data Schema
IndexedDB (Dexie.js)

typescript
interface Chapter {
  id: string; // uuid v4
  name: string;
  priorityColor: string | null;
  createdAt: number;
  updatedAt: number;
  viewport: { x: number; y: number; scale: number };
  background: { color: string; gridType: string; gridColor: string; gridSize: number; gridOpacity: number };
  elements: Element[]; // strokes, shapes, text, images, rulers
  graphs: GraphConfig[];
  thumbnail: Blob | null;
  isDirty: boolean; // local changes not yet saved
}

type Element = Stroke | Shape | Text | Image | RulerLine;

interface Stroke { id: string; type: 'stroke'; tool: string; points: Point[]; color: string; baseWidth: number; opacity: number; smoothing: 'off'|'low'|'med'|'high'; style: string; zIndex: number; }
interface Shape { id: string; type: 'shape'; shapeType: string; x: number; y: number; width: number; height: number; rotation: number; fill: string; stroke: string; strokeWidth: number; strokeStyle: string; zIndex: number; }
interface Text { id: string; type: 'text'; x: number; y: number; width: number; rotation: number; htmlContent: string; fontFamily: string; fontSize: number; color: string; zIndex: number; }
interface Image { id: string; type: 'image'; x: number; y: number; width: number; height: number; rotation: number; src: string; crop: { x:number; y:number; w:number; h:number; angle:number }; zIndex: number; }
interface RulerLine { id: string; type: 'ruler'; x1: number; y1: number; x2: number; y2: number; color: string; width: number; arrows: [string, string]; isGuide: boolean; zIndex: number; }

Supabase (Cloud)
Table
	
Columns
	
RLS Policy
users
	
id (uuid), email, created_at
	
Owner only
chapters
	
id, user_id, name, priority_color, data (jsonb), updated_at, version
	
Owner R/W. Shared via access_requests
access_requests
	
id, chapter_id, guest_email, status (pending/approved/denied), role (view/edit), token
	
Owner approves. Guest reads via token
assets
	
id, chapter_id, type, blob, mime
	
Bucket storage with signed URLs
2. Component Architecture (React)

App
├── PWAProvider (ServiceWorker, InstallPrompt, QuotaMonitor)
├── AuthProvider (Google Login - Phase 5)
├── StorageProvider (IndexedDB ↔ Supabase sync adapter)
├── Sidebar (ChapterList, Sort, Search, ContextMenu)
├── MainWorkspace
│   ├── TopBar (Tools, Undo/Redo, Zoom, Tabs, Export)
│   ├── ToolOptionsBar (Contextual)
│   ├── CanvasContainer
│   │   ├── BackgroundLayer
│   │   ├── GridLayer
│   │   ├── StrokeCanvas (Layer 1)
│   │   ├── VectorLayer (Layer 2-4: Shapes, Images, Text)
│   │   ├── UIOverlay (Layer 5: Handles, Crop UI, Ruler Preview)
│   │   └── PresenceOverlay (Live cursors)
│   └── GraphTab (Plotly WebGL wrapper, FormulaParser, SliderUI)
└── Modals (Export, BackgroundSettings, ShareLink, ConflictResolver)

3. State & Undo Management

    Store: useStore = create(zustandStore) with Immer middleware.
    Undo Stack: Fixed array history: Patch[], max 25. undo() pops last patch, applies inverse. redo() reverses.
    Auto-Save: Configurable delay (off, 5s, 10s, 30s). Debounced updateIsDirty(true). Only triggers when autosaveEnabled === true.
    Sync: saveToCloud() pushes data + version vector. On pull, compares versions. If conflict, opens ConflictResolver.

4. Canvas & Graph Engines

    Canvas: Konva.js manages vector layers. HTML5 <canvas> handles raster strokes via PointerEvent pipeline. Catmull-Rom smoothing runs in Web Worker. Pressure maps to 0.3x–1.5x width.
    Graph: Plotly.js with responsive: true, displayModeBar: false. Formula parser supports y=f(x), z=f(x,y), parametric (x(t), y(t)). Sliders bind to reactive variables. Export bakes current slider values or preserves JS interactivity (HTML).

5. Sync & Access Control Flow

    User clicks Share. Generates link with ?token=pending.
    Owner sees AccessRequest in dashboard. Approves → Supabase function creates JWT with role: view/edit.
    Guest opens link → validates token → loads chapter via Supabase Realtime.
    Live edits sync via Yjs WebSocket. Manual save overrides autosave if toggled.
    Revocation instantly invalidates JWT. Active sessions disconnected.

6. Export Pipeline
Format
	
Method
	
Interactivity
PNG/SVG
	
Canvas rasterization / Vector serialization
	
Static
PDF
	
jspdf + vector mapping + pagination
	
Static, print-optimized
JSON
	
Full chapter dump
	
Backup/restore
CSV
	
Graph tables + text/image metadata
	
Spreadsheet-ready
HTML
	
Vite-bundled self-contained file. Inlined Plotly + lightweight renderer. Sliders/canvas pan/zoom fully functional.
	
Fully interactive
7. PWA & Offline Strategy

    Service Worker: Cache static assets + fonts. Network-first for sync endpoints.
    Storage: Dexie.js persists all chapters. BackgroundSync retries failed cloud pushes when online.
    Fallback: If offline, all features work. ✓ Saved locally shown. Cloud status shows 🌐 Pending sync.

8. Accessibility & Performance

    WCAG AA: 4.5:1 contrast, keyboard navigation, aria-live for coordinates, focus traps, reduced-motion support.
    Touch: 44px targets, pinch/pan native, palm rejection (pointerType filter), stylus pressure fallback.
    Performance: Spatial culling (Quadtree), requestAnimationFrame throttling, Web Worker offload, LRU image cache.