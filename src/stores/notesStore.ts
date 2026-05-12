import { create } from 'zustand'
import db, { type ChapterRow } from '../lib/db'
import { enqueueSync } from '../lib/syncService'

export type Chapter = {
  id: string
  title: string
  content: string
  priorityColor: string | null
  createdAt: number
  updatedAt: number
}

const MAX_HISTORY = 25

export type NotesState = {
  chapters: Chapter[]
  selectedId?: string
  loading: boolean
  history: { content: string, chapterId: string }[]
  historyIndex: number
  createChapter: (title?: string) => string
  updateChapter: (id: string, patch: Partial<Pick<Chapter, 'title' | 'content' | 'priorityColor'>>, addToHistory?: boolean) => void
  deleteChapter: (id: string) => void
  selectChapter: (id?: string) => void
  setPriorityColor: (id: string, color: string | null) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  pushHistory: (content: string, chapterId: string) => void
  refreshChapters: () => Promise<void>
}

const useNotesStore = create<NotesState>()((set, get) => ({
  chapters: [],
  selectedId: undefined,
  loading: true,
  history: [],
  historyIndex: -1,
  
  pushHistory: (content: string, chapterId: string) => {
    const { history, historyIndex } = get()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ content, chapterId })
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift()
    }
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },
  
  undo: () => {
    const { history, historyIndex, chapters } = get()
    if (historyIndex <= 0) return
    
    const prevState = history[historyIndex - 1]
    const chapter = chapters.find((c) => c.id === prevState.chapterId)
    if (chapter) {
      set((state) => ({
        chapters: state.chapters.map((c) => c.id === prevState.chapterId ? { ...c, content: prevState.content, updatedAt: Date.now() } : c),
        historyIndex: historyIndex - 1
      }))
      db.table('chapters').get(prevState.chapterId).then((existing) => {
        if (existing) db.table('chapters').put({ ...existing, content: prevState.content, updatedAt: Date.now() }).catch(() => {})
      })
    }
  },
  
  redo: () => {
    const { history, historyIndex, chapters } = get()
    if (historyIndex >= history.length - 1) return
    
    const nextState = history[historyIndex + 1]
    const chapter = chapters.find((c) => c.id === nextState.chapterId)
    if (chapter) {
      set((state) => ({
        chapters: state.chapters.map((c) => c.id === nextState.chapterId ? { ...c, content: nextState.content, updatedAt: Date.now() } : c),
        historyIndex: historyIndex + 1
      }))
      db.table('chapters').get(nextState.chapterId).then((existing) => {
        if (existing) db.table('chapters').put({ ...existing, content: nextState.content, updatedAt: Date.now() }).catch(() => {})
      })
    }
  },
  
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,
  
  createChapter: (title = 'Untitled') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 8)
    const now = Date.now()
    const chapter: Chapter = { id, title, content: '', priorityColor: null, createdAt: now, updatedAt: now }
    set((state) => ({ chapters: [chapter, ...state.chapters], selectedId: id, history: [], historyIndex: -1 }))
    db.table('chapters').put({ id: chapter.id, title: chapter.title, content: chapter.content, priorityColor: chapter.priorityColor, createdAt: chapter.createdAt, updatedAt: chapter.updatedAt }).then(() => {
      enqueueSync(id, 'create', JSON.stringify(chapter))
    }).catch(() => {})
    return id
  },
  updateChapter: (id: string, patch: Partial<Pick<Chapter, 'title' | 'content' | 'priorityColor'>>, addToHistory = true) => {
    if (addToHistory && patch.content) {
      const { chapters, history, historyIndex } = get()
      const chapter = chapters.find((c) => c.id === id)
      if (chapter) {
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push({ content: chapter.content, chapterId: id })
        if (newHistory.length > MAX_HISTORY) newHistory.shift()
        set({ history: newHistory, historyIndex: newHistory.length - 1 })
      }
    }
    set((state) => ({
      chapters: state.chapters.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
    }))
    const updatedAt = Date.now()
    db.table('chapters').get(id).then((existing) => {
      if (existing) {
        const updated = { ...existing, ...patch, updatedAt }
        db.table('chapters').put(updated).then(() => {
          enqueueSync(id, 'update', JSON.stringify(updated))
        }).catch(() => {})
      }
    })
  },
  setPriorityColor: (id: string, color: string | null) => {
    const updatedAt = Date.now()
    set((state) => ({
      chapters: state.chapters.map((c) => (c.id === id ? { ...c, priorityColor: color, updatedAt } : c)),
    }))
    db.table('chapters').get(id).then((existing) => {
      if (existing) {
        const updated = { ...existing, priorityColor: color, updatedAt }
        db.table('chapters').put(updated).then(() => {
          enqueueSync(id, 'update', JSON.stringify(updated))
        }).catch(() => {})
      }
    })
  },
  deleteChapter: (id: string) => {
    set((state) => {
      const next = state.chapters.filter((n) => n.id !== id)
      const selectedId = state.selectedId === id ? (next[0] ? next[0].id : undefined) : state.selectedId
      return { chapters: next, selectedId }
    })
    db.table('chapters').delete(id).catch(() => {})
    enqueueSync(id, 'delete')
  },
  selectChapter: (id?: string) => set(() => ({ selectedId: id, history: [], historyIndex: -1 })),
  refreshChapters: async () => {
    const rows = await db.table('chapters').toArray()
    if (!rows || rows.length === 0) {
      set({ chapters: [] })
      return
    }
    const chapters = rows.map((r: ChapterRow) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      priorityColor: r.priorityColor,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))
    const { selectedId } = get()
    if (selectedId && !chapters.find((c: Chapter) => c.id === selectedId)) {
      set({ chapters, selectedId: chapters[0]?.id })
    } else {
      set({ chapters })
    }
  },
}))

db.table('chapters').toArray().then((rows: ChapterRow[]) => {
  if (rows && rows.length > 0) {
    const chapters = rows.map((r) => ({ id: r.id, title: r.title, content: r.content, priorityColor: r.priorityColor, createdAt: r.createdAt, updatedAt: r.updatedAt }))
    useNotesStore.setState({ chapters, loading: false })
  } else {
    useNotesStore.setState({ loading: false })
  }
}).catch(() => { useNotesStore.setState({ loading: false }) })

export default useNotesStore
