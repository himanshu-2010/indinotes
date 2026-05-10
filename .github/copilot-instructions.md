# copilot-instructions

Purpose
- Provide Copilot sessions with a concise, actionable summary of this repository: build/test/lint surface commands (if present), high-level architecture, and repository-specific conventions.

1) Build, test, and lint commands
- No package.json or CI scripts were detected at repo root during analysis; no concrete npm/pnpm/yarn scripts found.
- When scripts are added, Copilot should try these common commands (adjust per package manager):
  - Dev server: npm run dev or pnpm dev (Vite)
  - Build: npm run build
  - Lint: npm run lint
  - Test (full): npm test or npm run test
  - Run a single test (examples):
    - Jest: npm test -- -t "<test name regex>"
    - Vitest: npx vitest -t "<test name regex>" or npm run test -- -t "<pattern>"
  - If CI/Makefile present, prefer the project's documented targets.

2) High-level architecture (authoritative sources: PLAN.md, SPEC.md)
- Frontend: React 18 + Vite (component-driven). Typescript typings described in SPEC.md.
- Storage: Local-first architecture using IndexedDB via Dexie.js; a Sync adapter pushes serialized chapter JSON to Supabase (Postgres + Storage + Realtime).
- Canvas & UI: Konva.js for vector layers + HTML5 <canvas> for raster strokes. Layers: Background, Grid, StrokeCanvas, VectorLayers, UIOverlay, PresenceOverlay.
- Graphing: Plotly.js (WebGL) with a custom formula parser and slider bindings; exports can be interactive HTML bundles.
- State: Zustand with Immer middleware. Undo implemented as a bounded ring buffer (max 25 Immer patches) with deterministic inverse patches.
- Realtime: Yjs WebSocket for live cursors/edits; access tokens and Supabase RLS manage sharing and approvals.
- PWA: Workbox/service worker, background sync, quota monitoring, offline-first behavior.
- Export pipeline: PNG/SVG (raster/vector), PDF (jspdf + vector mapping), JSON backup, CSV for graph tables, Vite-bundled self-contained interactive HTML.

3) Key conventions (use these when editing or generating code)
- Data model: Chapter is the top-level unit (see SPEC.md). IDs are UUID v4; timestamps as numeric epoch ms; thumbnails stored as Blobs.
- Elements: polymorphic Element[] (Stroke | Shape | Text | Image | RulerLine). Expect zIndex ordering and explicit rotation/transform fields.
- Storage patterns: StorageProvider abstracts Dexie ↔ Supabase sync; prefer using it rather than direct DB calls.
- Store & undo: useStore (Zustand) + Immer; use provided undo/redo helpers that operate on Immer patches; do not bypass the ring buffer.
- Canvas layering: Keep raster strokes on StrokeCanvas (layer 1) and vector objects on Konva-managed layers (2-4); UI overlays (handles, crop widgets) must be separate to avoid export bleed.
- Background work: Heavy smoothing/pressure calculations run in Web Worker; offload CPU-bound operations there.
- Graph conventions: Plot configs are in GraphConfig[]; sliders bind to reactive variables — exports should bake slider values when producing static outputs.
- Sync & access flow: Sharing flow uses access_requests table (pending → approved/denied). Tokens map to limited JWTs; owner-approval is authoritative.
- Supabase: tables: users, chapters (jsonb), access_requests, assets (bucket storage); RLS policies enforce owner-only writes.

4) Files to consult first
- PLAN.md, SPEC.md — high-level decisions and schema (authoritative for architecture and data model)
- src/ (if present) — frontend code; look for providers: PWAProvider, AuthProvider, StorageProvider, components/MainWorkspace

5) AI/assistant config checks
- No specialized assistant config files detected (CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, CONVENTIONS.md, etc.). If those are added, merge important rules into this file.

Notes for Copilot sessions
- Prefer using PLAN.md and SPEC.md as the source of truth for architecture and data model.
- If code-generation touches persistence or undo, follow the store/undo conventions above to avoid data loss or inconsistent histories.

--
(Generated from repository files: PLAN.md, SPEC.md)
