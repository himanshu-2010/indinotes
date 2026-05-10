# 📘 PLAN.md

## 1. Project Overview
**InkCanvas** is a cross-platform, offline-first student notebook with infinite canvas drawing, full image manipulation, and interactive 2D/3D graphing. It operates as a PWA, stores data locally by default, and syncs to a free-tier cloud backend only when explicitly saved. Real-time collaboration uses secure share links with an owner-approval workflow. Google Auth is added last.

## 2. Core Architecture Decisions
| Domain | Choice | Rationale |
|---|---|---|
| **Framework** | React 18 + Vite | Component-driven, fast HMR, strong ecosystem |
| **Local Storage** | IndexedDB (Dexie.js) | Structured, handles blobs, offline-first, versionable |
| **Cloud Backend** | Supabase (PostgreSQL + Realtime + Storage) | Generous free tier, built-in auth, realtime WebSockets, row-level security |
| **Canvas Engine** | Konva.js (vector) + HTML5 Canvas (raster strokes) | Hybrid performance, hit-testing, layer isolation |
| **Graph Engine** | Plotly.js (WebGL backend) + custom formula parser | Native 2D/3D support, animated sliders, export-ready, battle-tested |
| **State** | Zustand + Immer | Lightweight, predictable snapshots, easy serialization |
| **Undo/Redo** | Fixed 25-step ring buffer via Immer patches | Memory-safe, deterministic, matches requirement |
| **PWA** | Workbox + Service Worker | Cache-first assets, background sync, installable |

## 3. Compliance & Security Strategy
- **Data Minimization:** Zero telemetry. Only chapter content, metadata, and access tokens stored. No IP tracking, no analytics, no third-party cookies.
- **Access Control:** Share links generate `pending` tokens. Owner reviews requests in-app. Approval grants `view` or `edit` role via JWT.
- **Storage:** All data encrypted in transit (TLS 1.3). Local data encrypted via Web Crypto API (optional user passphrase).
- **Legal Alignment:** GDPR/FERPA-compliant by design: explicit consent, right-to-delete (local + cloud), no minor-specific data collection.

## 4. Development Phases
| Phase | Focus | Deliverables |
|---|---|---|
| **1. Foundation (W1–2)** | PWA shell, IndexedDB, viewport, stroke engine, 25-step undo | Offline canvas, manual save, core tools (pen, select, shape, text) |
| **2. Rich Media (W3–4)** | Image import, non-destructive crop, ruler, highlights, fill | Full image pipeline, crop UI, guide lines, tool options bar |
| **3. Graphs & Export (W5–6)** | Plotly integration, formula/CSV input, animated sliders, all exports | 2D/3D graphs, PDF/PNG/SVG/JSON/CSV/HTML pipeline, self-contained HTML |
| **4. Sync & Access (W7–8)** | Supabase integration, request/approve flow, manual/autosave toggle | Cloud sync, role-based links, background sync fallback |
| **5. Polish & Auth (W9)** | Mobile parity, WCAG AA, Google Login, performance tuning | Install prompt, touch gestures, screen reader support, final deploy |

## 5. Risk Mitigation
- **Large Canvas Lag:** Quadtree culling, stroke chunking, Web Workers for smoothing/pressure.
- **Export Bloat:** HTML export uses a lightweight vanilla JS runtime (no full React mount). Images converted to WebP/AVIF on export.
- **Sync Conflicts:** CRDT (Yjs) for live edits. Major offline conflicts trigger side-by-side resolver.
- **Storage Limits:** Browser quota monitoring. Auto-compress thumbnails. Warn at 80%.
