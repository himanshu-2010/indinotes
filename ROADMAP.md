# Roadmap: Features & Fixes - IndiNotes

This file tracks the implementation of requested improvements and technical debt resolution.

## ✅ Completed
- **Canvas Performance**: Normalized `Map<string, Element>` state management in `CanvasEditor`.
- **Graph Rendering**: Adaptive sampling in `GraphEditor` (pixel step varies by zoom).
- **State Sync Integrity**: Serialized Dexie write queue (`sequenced()`) in `storageProvider.ts`.
- **Advanced Text Input**: Auto-expanding `<textarea>` with multi-line, Ctrl+Enter to finish.
- **Eraser Hover Preview**: Red highlight overlay on elements under eraser cursor.
- **Mobile Graph UI**: Bottom-sheet drawer for graph sidebar below 640px.
- **PDF Annotation**: PDF page import via `pdfjs-dist` inserted as `ImageEl`.
- **Graph-to-Canvas Snapshot**: Capture graph as image, place in canvas.
- **Organization System**: Folders (tree, rename, delete) + Tags (badges, inline editor, search).
- **Smart Shapes**: Shift-key for perfect aspect ratio and 45° arrow snapping.
- **Selection Toolbar**: Context-sensitive properties (font, size, bold/italic, colors, stroke width).
- **Highlighter Tool**: Pen mode with semi-transparent yellow wide stroke for highlighting.
- **Layer Panel**: Toggleable 🔲 floating panel with draggable element list for z-order management.
- **Mobile Toolbar**: Bottom-anchored toolbar with wrap layout and **••• More** dropdown for all features on small screens.
- **Copy/Paste/Duplicate**: Ctrl+C/V/D for selected elements across chapters.
- **Element Layering**: ↑/↓ buttons for send backward/bring forward.
- **Element Opacity**: Opacity slider (10-100%) for all element types.
- **Shape Stroke Customization**: Stroke color picker + width slider on selected shapes.
- **Grid Snap**: Elements snap to 40px grid when dragged with grid visible.
- **Zoom to Fit**: Auto-zoom button to fit all elements in viewport.
- **Keyboard Shortcuts Dialog**: Press `?` to show all shortcuts.
- **Drag-and-Drop Images**: Drop image files directly onto canvas.
- **Copy Canvas to Clipboard**: Ctrl+Shift+C or 📋 button.
- **Normalized Element State**: `Map<string, Element>` via `useRef`.
- **Rendering Layer Split**: Static (background/grid) + interaction (elements/transformer) Konva layers.
- **Storage Abstraction**: `StorageProvider` interface + `setStorage()` swap-in.

## 🚀 Up Next (Canvas Editor)

### Most Impactful / Least Effort
- [x] **Copy/paste/duplicate elements**: Ctrl+C/V/D for selected elements within and across chapters.
- [x] **Element layering**: ↑/↓ buttons for send backward/bring forward.
- [x] **Element opacity**: Opacity slider on selected elements.
- [x] **Zoom to fit**: Auto-zoom to fit all elements in viewport.
- [x] **Keyboard shortcuts dialog**: Press `?` to show all available shortcuts.
- [x] **Drag-and-drop images**: Drop image files directly onto canvas.
- [x] **Copy canvas to clipboard**: Ctrl+Shift+C or 📋 button.
- [x] **Shape stroke customization**: Separate stroke color and width on selected shapes.
- [x] **Grid snap**: Elements snap to grid when dragged with grid visible.

### Medium Effort
- [ ] **Multiple selection**: Shift+click or click-drag lasso to select multiple elements; group move/delete.
- [ ] **Rulers & guides**: Draggable guide lines from canvas edge with element snap.
- [ ] **Lock element**: Toggle to prevent move/resize/delete on individual elements.
- [ ] **Favorite chapters**: Star/pin chapters to top of sidebar.
- [ ] **Full-text search**: Search inside canvas text elements, not just title/tags.
- [ ] **Auto-save indicator**: "Saved" / "Unsaved" badge in toolbar.
- [ ] **Recent chapters**: Sidebar sort option by `updatedAt`.
- [ ] **Canvas mini-map**: Small overview rectangle showing viewport position.

## 📐 Graph Editor
- [ ] **Bar/chart plots**: Support scatter, bar, histogram via existing `plotly.js-dist`.
- [ ] **Animated sliders**: Parameter sweep with play/pause for expression variables.
- [ ] **Graph annotations**: Text labels and arrows on graph.
- [ ] **Derivative curves**: Show `f'(x)` for any expression.
- [ ] **Table data input**: Paste CSV data for scatter plots.

## 📦 Export & Sharing
- [ ] **Multi-page PDF**: Export all or selected chapters as a single PDF.
- [ ] **Markdown export**: Text elements as markdown + canvas image.
- [ ] **Print styles**: `@media print` CSS for canvas/graph.
- [ ] **Batch backup/restore**: Import JSON with merge/overwrite options.

## 🧰 Polish
- [ ] **Touch gesture polish**: Two-finger pan, long-press context menu, smoother pinch zoom.
- [ ] **Split view**: Canvas + graph side-by-side.
- [ ] **Undo without full content save**: Track element diffs instead of full content string snapshots.
- [ ] **Canvas infinite scroll**: Stage pans automatically when pointer nears edge during drag.

## 🎓 Student Features
- [x] **Pomodoro timer**: Study session timer overlay (25min focus / 5min break) with start/reset controls.
- [x] **Multi-page PDF export**: Export chapter as multi-page PDF with both canvas and graph content on separate pages.
- [x] **Voice notes**: Record and attach audio notes to chapters using MediaRecorder API, stored as blobs in IndexedDB.
- [x] **Graph SVG export**: Export canvas/graph as SVG (PNG embedded in vector wrapper) for report insertion.
- [ ] **Theme presets**: Additional canvas theme presets (sepia, forest, ocean, midnight) for eye-strain reduction during reading.
