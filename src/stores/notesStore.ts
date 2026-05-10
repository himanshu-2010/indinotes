import { create } from 'zustand'
import db, { type ChapterRow } from '../lib/db'

export type Chapter = {
  id: string
  title: string
  content: string
  priorityColor: string | null
  createdAt: number
  updatedAt: number
}

const MAX_HISTORY = 25

type NotesState = {
  chapters: Chapter[]
  selectedId?: string
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
}

const useNotesStore = create<NotesState>((set: any, get: any) => ({
  chapters: [],
  selectedId: undefined,
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
    const chapter = chapters.find((c: any) => c.id === prevState.chapterId)
    if (chapter) {
      set((state: any) => ({
        chapters: state.chapters.map((c: any) => c.id === prevState.chapterId ? { ...c, content: prevState.content, updatedAt: Date.now() } : c),
        historyIndex: historyIndex - 1
      }))
      db.table('chapters').get(prevState.chapterId).then((existing: any) => {
        if (existing) db.table('chapters').put({ ...existing, content: prevState.content, updatedAt: Date.now() }).catch(() => {})
      })
    }
  },
  
  redo: () => {
    const { history, historyIndex, chapters } = get()
    if (historyIndex >= history.length - 1) return
    
    const nextState = history[historyIndex + 1]
    const chapter = chapters.find((c: any) => c.id === nextState.chapterId)
    if (chapter) {
      set((state: any) => ({
        chapters: state.chapters.map((c: any) => c.id === nextState.chapterId ? { ...c, content: nextState.content, updatedAt: Date.now() } : c),
        historyIndex: historyIndex + 1
      }))
      db.table('chapters').get(nextState.chapterId).then((existing: any) => {
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
    set((state: any) => ({ chapters: [chapter, ...state.chapters], selectedId: id, history: [], historyIndex: -1 }))
    db.table('chapters').put({ id: chapter.id, title: chapter.title, content: chapter.content, priorityColor: chapter.priorityColor, createdAt: chapter.createdAt, updatedAt: chapter.updatedAt }).catch(() => {})
    return id
  },
  updateChapter: (id: string, patch: Partial<Pick<Chapter, 'title' | 'content' | 'priorityColor'>>, addToHistory = true) => {
    if (addToHistory && patch.content) {
      const { chapters, history, historyIndex } = get()
      const chapter = chapters.find((c: any) => c.id === id)
      if (chapter) {
        const newHistory = history.slice(0, historyIndex + 1)
        newHistory.push({ content: chapter.content, chapterId: id })
        if (newHistory.length > MAX_HISTORY) newHistory.shift()
        set({ history: newHistory, historyIndex: newHistory.length - 1 })
      }
    }
    set((state: any) => ({
      chapters: state.chapters.map((n: any) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
    }))
    db.table('chapters').get(id).then((existing: any) => {
      if (existing) {
        const updated = { ...existing, ...patch, updatedAt: Date.now() }
        db.table('chapters').put(updated).catch(() => {})
      }
    })
  },
  setPriorityColor: (id: string, color: string | null) => {
    set((state: any) => ({
      chapters: state.chapters.map((c: any) => (c.id === id ? { ...c, priorityColor: color, updatedAt: Date.now() } : c)),
    }))
    db.table('chapters').get(id).then((existing: any) => {
      if (existing) {
        db.table('chapters').put({ ...existing, priorityColor: color, updatedAt: Date.now() }).catch(() => {})
      }
    })
  },
  deleteChapter: (id: string) => {
    set((state: any) => {
      const next = state.chapters.filter((n: any) => n.id !== id)
      const selectedId = state.selectedId === id ? (next[0] ? next[0].id : undefined) : state.selectedId
      return { chapters: next, selectedId }
    })
    db.table('chapters').delete(id).catch(() => {})
  },
  selectChapter: (id?: string) => set(() => ({ selectedId: id, history: [], historyIndex: -1 })),
}))

db.table('chapters').toArray().then((rows: ChapterRow[]) => {
  if (!rows || rows.length === 0) return
  const chapters = rows.map((r) => ({ id: r.id, title: r.title, content: r.content, priorityColor: r.priorityColor, createdAt: r.createdAt, updatedAt: r.updatedAt }))
  useNotesStore.setState({ chapters })
}).catch(() => {})

export default useNotesStore
