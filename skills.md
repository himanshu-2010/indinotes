Skills for InkCanvas / IndiNotes

Purpose
- A concise, actionable skill matrix and onboarding checklist tailored to this repository (sources: PLAN.md, SPEC.md). Use this to assign tasks, evaluate contributors, or prompt Copilot to generate targeted code.

How to use this file
- Read top-to-bottom for onboarding. Use the "Proficiency checklist" items as concrete tasks to demonstrate competency. When asking Copilot for code that touches persistence, undo, canvas, or exports, reference the specific section and file names listed here.

Core technologies & repo-specific responsibilities

1) React 18 + Vite (frontend shell)
- Role in repo: primary UI framework and build tool for the PWA.
- Files to inspect: look for src/, components/MainWorkspace, providers (PWAProvider, AuthProvider, StorageProvider).
- Concrete tasks: wire a new TopBar control; add a route; create a small feature behind an existing provider.
- Pitfalls: avoid mounting heavy libs in main thread during initial render; prefer lazy-loading large panels.

2) TypeScript typings & data model
- Role: enforce Chapter and Element shapes; SPEC.md contains canonical interfaces.
- Files to inspect: SPEC.md, types/* (if present), StorageProvider serialization code.
- Concrete tasks: add a new Element subtype (e.g., Sticker) and update serialization + Dexie schema.
- Conventions: IDs are UUID v4; timestamps are epoch ms; thumbnails are Blobs.

3) IndexedDB via Dexie.js (local-first persistence)
- Role: local persistence and primary offline store.
- Files to inspect: StorageProvider, Dexie schema and migration handlers.
- Concrete tasks: add a migration that adds a new column to chapters table; implement a background compaction job.
- Conventions: All writes should go through StorageProvider; never manipulate Dexie directly from components.

4) Supabase (cloud sync, storage, RLS)
- Role: cloud sync target; holds chapters, access_requests, assets buckets.
- Files to inspect: Sync adapters, cloud API wrappers, RLS-aware save/pull functions.
- Concrete tasks: implement a saveToCloud() retry hook; add signed URL handling for assets.
- Conventions: push serialized Chapter JSON; respect version vectors and invoke ConflictResolver on mismatch.

5) Canvas stack: Konva.js + HTML5 <canvas>
- Role: Konva for vector UI, <canvas> for raster stroke rendering.
- Files to inspect: CanvasContainer, StrokeCanvas, VectorLayer components, Web Worker smoothing code.
- Concrete tasks: implement a new stroke brush; add hit-testing for a custom shape.
- Conventions: Raster strokes remain on StrokeCanvas; vector shapes in Konva layers (zIndex ordering matters).

6) Plotly.js + Graphing subsystem
- Role: 2D/3D graphs, slider binding, interactive HTML export.
- Files to inspect: GraphTab, FormulaParser, SliderUI.
- Concrete tasks: add a parametric plot example; ensure exported HTML includes the right slider bindings.
- Conventions: slider-bound variables must be baked for static exports.

7) State management: Zustand + Immer
- Role: global state store and undo history implementation.
- Files to inspect: store/ or useStore implementation, undo/redo helpers.
- Concrete tasks: create a new selector; write a unit test that verifies undo/redo applies patches in inverse.
- Conventions: use Immer patches for undo stack (max 25). Do not bypass helpers.

8) Realtime & CRDT: Yjs + Realtime sync
- Role: live collaboration and presence overlays.
- Files to inspect: Yjs WebSocket integration, PresenceOverlay.
- Concrete tasks: simulate a conflict and verify ConflictResolver UI appears and resolves correctly.
- Conventions: authoritative owner approvals are enforced via access_requests and JWTs.

9) PWA & Service Worker (Workbox)
- Role: offline caching, background sync, installability.
- Files to inspect: service worker registration, Workbox config, PWAProvider.
- Concrete tasks: mimic offline scenario and validate background sync retry logic.

10) Web Workers & performance offload
- Role: smoothing/pressure maps, heavy CPU tasks.
- Files to inspect: worker scripts, invocation wrappers, messages contracts.
- Concrete tasks: benchmark smoothing on large stroke inputs; ensure worker message contracts match typed interfaces.

11) Export pipeline (PNG/SVG/PDF/HTML/JSON/CSV)
- Role: serialization + bundling for different formats; HTML uses Vite bundle of a lightweight runtime.
- Files to inspect: Export modal, exporter utilities, jspdf integration.
- Concrete tasks: add an option to include/exclude thumbnails in JSON backups; write an export test asserting JSON schema.
- Conventions: interactive HTML preserves sliders; static exports should bake current UI state.

Proficiency checklist (concrete verification tasks)
- Onboarding: locate PLAN.md and SPEC.md, open StorageProvider and useStore implementations.
- Persistence: write a chapter locally via Dexie and confirm Dexie UI shows the new record.
- Sync: modify a chapter, call saveToCloud(), and confirm version increments and no conflict triggers.
- Undo: perform 30 small edits; verify undo history keeps only 25; test redo restores states.
- Canvas: add a new stroke programmatically and confirm rendering and export correctness.
- Graph: create a simple y=f(x) Plotly plot and export interactive HTML; sliders should work in exported file.
- Worker: simulate large stroke smoothing; ensure main thread stays responsive.

Onboarding tasks for a newcomer
- Read PLAN.md and SPEC.md fully.
- Run the dev environment once package scripts are present (npm/pnpm/yarn as repo dictates).
- Navigate to StorageProvider and the undo stack implementation; run local Dexie queries in console.
- Explore Export modal and run a small JSON export to inspect the schema.

Where to add tests and quick wins
- Add unit tests around store patch generation and undo/redo mechanics.
- Add integration tests for export outputs (JSON schema + static HTML bundles).
- Add a smoke test for background sync when offline.

Maintenance notes
- Keep SPEC.md and Dexie schema migrations in sync when element shapes change.
- When changing undo semantics, update consumers and the persistence format simultaneously.

References (in-repo)
- PLAN.md, SPEC.md — canonical architecture and schema

---

