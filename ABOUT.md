# IndiNotes

**A local-first student notebook** — vector canvas drawing, interactive graphing calculator, chapter organization, voice notes, pomodoro timer, and more. All stored locally in your browser. No account, no server, no data sent anywhere unless you opt in.

Created by [Himanshu](https://himanshu-2010.github.io).  
Open source (MIT) on [GitHub](https://github.com/himanshu-2010/indinotes).

---

## Features

### Canvas Editor
- **Drawing tools**: Pen, eraser, shape (rect/circle/triangle/pentagon/arrow), text, fill, and image import. Tools switch from the floating toolbar.
- **Highlighter**: Pen tool has a Highlight mode — wide semi-transparent yellow stroke (`rgba(255,242,0,0.35)`, 15px width, 0.6 opacity). Great for marking up PDFs and notes.
- **Selection toolbar**: When an element is selected, the toolbar shows context-specific controls. Text: font family (70+ Google Fonts), font size (12–48px), bold/italic toggles, color. Shape: fill color, stroke color + width. Stroke: color + width slider. All elements: opacity slider (10–100%) + send backward/bring forward.
- **Element layers**: ↑/↓ buttons for z-order. Dedicated Layers panel (🔲) shows all elements as a list with drag-and-drop reordering (touch-supported). Element order = render order.
- **Copy / paste / duplicate**: Ctrl+C copies selected element to an internal clipboard ref (persists across chapters). Ctrl+V pastes at +20px offset. Ctrl+D duplicates in-place at +20px.
- **Shape stroke customization**: Selected shapes show fill color, stroke color, and stroke width controls.
- **Grid snap**: Toggleable 40px grid overlay. With grid on, dragged elements snap to nearest grid point.
- **Smart shapes**: Hold Shift while drawing to constrain rect/circle/triangle/pentagon to perfect aspect ratio. Arrows snap to 45° increments.
- **Image import**: Three ways to add images — toolbar 🖼️ file picker, drag-and-drop onto canvas, or paste from clipboard. Supports all common image formats.
- **PDF import**: 📄 button renders the first page of a PDF via pdfjs-dist (dynamically imported, code-split) and inserts it as an ImageEl on the canvas. Annotate over it with drawing tools.
- **Zoom & pan**: Scroll to zoom, click-drag to pan (select tool on empty canvas). Zoom +/-/Reset buttons. Fit button auto-calculates scale from element bounds.
- **Undo / Redo**: 25-step history stack (full content snapshots). Ctrl+Z / Ctrl+Y.
- **Canvas to clipboard**: Ctrl+Shift+C or 📋 button copies visible canvas as image.

### Graphing Calculator
- **Expression list**: Type equations like `sin(x)`, `x^2`, `cos(x) + 2`. Parsed by mathjs, rendered on a custom Canvas 2D element.
- **Adaptive sampling**: Pixel step varies by zoom level. Default zoom = every pixel. Zoomed out = fewer samples for performance. Zoomed in = pixel-perfect.
- **Graph to canvas**: Capture the current graph view as a PNG snapshot and insert it into the canvas workspace.
- **SVG export**: Export graph as SVG (PNG embedded in vector wrapper) for LaTeX/report insertion.
- **Expression controls**: Each expression has a color picker and show/hide toggle.
- **Mobile drawer**: Below 640px, the expression sidebar becomes a bottom-sheet drawer.

### Organization
- **Chapters**: Notebook pages with title, content (JSON), priority color, folder assignment, and tags. Create, reorder, search, multi-select delete.
- **Folders**: Nested tree in the sidebar. Create, rename, delete. Deleting a folder moves its chapters to root.
- **Tags**: Comma-separated string field on chapters. Displayed as inline badges (up to 2, then +N overflow). Inline tag editor via 🏷️ button. Search matches both title and tags.

### Export
- **PNG**: Export canvas or graph as PNG image.
- **PDF**: Multi-page PDF export — active tab content first, then graph snapshot appended as second page (when on canvas tab).
- **SVG**: Export as SVG with embedded PNG data URL.
- **JSON**: Full chapter JSON including elements, graph, and settings.
- **Backup / Restore**: Bulk backup all chapters as JSON. Import and restore.

### Student Tools
- **Voice notes**: Record audio via MediaRecorder API (opus/webm). Stored as Blobs in IndexedDB's `voiceNotes` table. Play back, delete. Per-chapter recording list with auto-refresh.
- **Pomodoro timer**: 25-minute focus / 5-minute break cycles. Start/pause/reset. Desktop notifications when session completes. Accessible from toolbar ⏱ or 🛠️ More menu.
- **Font library**: 70+ fonts loaded from Google Fonts — sans-serif, serif, monospace, handwriting, display, and system fallbacks.

### Technical Details
- **Storage**: All data in IndexedDB via Dexie.js v4. Tables: `chapters`, `folders`, `syncQueue`, `voiceNotes`. Chapters schema: `id, title, content (JSON string), priorityColor, createdAt, updatedAt, folderId, tags`. IDs are `Date.now() + random string` (not UUID). Timestamps are epoch ms.
- **Cloud sync (optional)**: When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars are set, writes enqueue to `syncQueue` table. Push/pull Supabase `chapters` table. Last-write-wins by `updatedAt`. 30-second poll interval. Without env vars, `supabaseClient` is `null` and sync is silently skipped.
- **State management**: Zustand (no Immer). All writes through `useNotesStore`. Dexie writes serialized through internal promise chain (`sequenced()`) to prevent stale reads. Errors set `dbError` state instead of silent catch.
- **Undo architecture**: Full content-string snapshots in `history` array (max 25). `updateChapter` with `addToHistory=false` skips history (used during drawing).
- **Element state**: CanvasEditor stores elements as `Map<string, Element>` via `useRef`, not array. Derived array at render time. No JSON.stringify deep-comparison. Re-initialized via `elementsRevision` counter.
- **Canvas layers**: Two Konva `<Layer>`s — static (background + grid, `listening={false}`) and interaction (elements + transformer + overlays). Background changes don't re-render elements.
- **Storage abstraction**: All Dexie calls go through `StorageProvider` interface (`storageProvider.ts`). The store never imports Dexie directly. Swap backends via `setStorage()`.

### Tech Stack
| Layer | Technology |
|---|---|
| UI | React 19, TypeScript 6.0 |
| Build | Vite 8, ESLint (flat config) |
| Canvas | Konva.js, react-konva |
| Graph | mathjs, raw Canvas 2D |
| State | Zustand |
| Storage | Dexie.js 4 (IndexedDB) |
| Desktop | Electron, electron-builder |
| Mobile | Capacitor 8, Android SDK |
| PWA | vite-plugin-pwa, Workbox |
| Cloud (opt) | Supabase |
| PDF | pdfjs-dist, jsPDF |
| Animation | Framer Motion |
| Fonts | 70+ Google Fonts |

### Cross-Platform
- **Browser (PWA)**: Installable via "Add to Home Screen". vite-plugin-pwa with Workbox service worker for offline caching.
- **Electron desktop**: Entry at `electron/main.cjs`. Auto-updater via electron-updater (GitHub releases). Linux passes `--ozone-platform-hint=auto` and `--disable-software-rasterizer` for Wayland/Vulkan compat. Vite base: `./` for file:// protocol support.
- **Android**: Capacitor 8. Web dir is `dist`. Build with `npm run mobile:build`.

### Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Ctrl+D | Duplicate selected |
| Ctrl+C | Copy selected |
| Ctrl+V | Paste |
| Ctrl+Shift+C | Copy canvas to clipboard |
| Delete / Backspace | Delete selected |
| Escape | Deselect / close dialogs |
| ? | Toggle shortcuts dialog |

### Downloads
- Linux: .AppImage, .deb, .rpm, .snap
- Windows: .exe installer
- macOS: .dmg (not tested yet — contributions welcome)
- Android: .apk

Build from source with `npm run dist:linux`, `npm run dist:win`, `npm run dist:mac`, or `npm run mobile:build`.

---

## Contribute

IndiNotes is free and open source (MIT). All contributions welcome — code, bug reports, feature requests, documentation, or testing on platforms the author cannot test.

- [GitHub Repository](https://github.com/himanshu-2010/indinotes)
- [Report an Issue](https://github.com/himanshu-2010/indinotes/issues)
- [About Himanshu](https://himanshu-2010.github.io)
