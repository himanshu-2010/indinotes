import { create } from 'zustand'
import { storage } from '../lib/storageProvider'
import type { ChapterData as Chapter, FolderData as Folder } from '../lib/storageProvider'

export type { Chapter, Folder }

const MAX_HISTORY = 25

export type NotesState = {
  chapters: Chapter[]
  folders: Folder[]
  selectedId?: string
  loading: boolean
  dbError: string | null
  history: { content: string, chapterId: string }[]
  historyIndex: number
  createChapter: (title?: string, folderId?: string | null) => string
  updateChapter: (id: string, patch: Partial<Pick<Chapter, 'title' | 'content' | 'priorityColor' | 'folderId' | 'tags'>>, addToHistory?: boolean) => void
  deleteChapter: (id: string) => void
  selectChapter: (id?: string) => void
  setPriorityColor: (id: string, color: string | null) => void
  createFolder: (name: string, parentId?: string | null) => void
  deleteFolder: (id: string) => void
  renameFolder: (id: string, name: string) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  pushHistory: (content: string, chapterId: string) => void
  refreshChapters: () => Promise<void>
  clearDbError: () => void
}

const useNotesStore = create<NotesState>()((set, get) => ({
  chapters: [],
  folders: [],
  selectedId: undefined,
  loading: true,
  dbError: null,
  history: [],
  historyIndex: -1,

  pushHistory: (content: string, chapterId: string) => {
    const { history, historyIndex } = get()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push({ content, chapterId })
    if (newHistory.length > MAX_HISTORY) newHistory.shift()
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex, chapters } = get()
    if (historyIndex <= 0) return
    const prevState = history[historyIndex - 1]
    const chapter = chapters.find((c) => c.id === prevState.chapterId)
    if (chapter) {
      const now = Date.now()
      set((state) => ({
        chapters: state.chapters.map((c) => c.id === prevState.chapterId ? { ...c, content: prevState.content, updatedAt: now } : c),
        historyIndex: historyIndex - 1,
      }))
      storage.updateChapter(prevState.chapterId, { content: prevState.content, updatedAt: now })
        .catch(() => { set({ dbError: 'Failed to persist undo' }) })
    }
  },

  redo: () => {
    const { history, historyIndex, chapters } = get()
    if (historyIndex >= history.length - 1) return
    const nextState = history[historyIndex + 1]
    const chapter = chapters.find((c) => c.id === nextState.chapterId)
    if (chapter) {
      const now = Date.now()
      set((state) => ({
        chapters: state.chapters.map((c) => c.id === nextState.chapterId ? { ...c, content: nextState.content, updatedAt: now } : c),
        historyIndex: historyIndex + 1,
      }))
      storage.updateChapter(nextState.chapterId, { content: nextState.content, updatedAt: now })
        .catch(() => { set({ dbError: 'Failed to persist redo' }) })
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  createChapter: (title = 'Untitled', folderId: string | null = null) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 8)
    const now = Date.now()
    const chapter: Chapter = { id, title, content: '', priorityColor: null, createdAt: now, updatedAt: now, folderId, tags: '' }
    set((state) => ({ chapters: [chapter, ...state.chapters], selectedId: id, history: [], historyIndex: -1 }))
    storage.saveChapter(chapter).catch(() => { set({ dbError: 'Failed to save chapter' }) })
    return id
  },
  updateChapter: (id: string, patch: Partial<Pick<Chapter, 'title' | 'content' | 'priorityColor' | 'folderId' | 'tags'>>, addToHistory = true) => {
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
    const now = Date.now()
    set((state) => ({
      chapters: state.chapters.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n)),
    }))
    storage.updateChapter(id, { ...patch, updatedAt: now }).catch(() => { set({ dbError: 'Failed to save changes' }) })
  },
  setPriorityColor: (id: string, color: string | null) => {
    const now = Date.now()
    set((state) => ({
      chapters: state.chapters.map((c) => (c.id === id ? { ...c, priorityColor: color, updatedAt: now } : c)),
    }))
    storage.updateChapter(id, { priorityColor: color, updatedAt: now }).catch(() => { set({ dbError: 'Failed to save priority color' }) })
  },
  deleteChapter: (id: string) => {
    set((state) => {
      const next = state.chapters.filter((n) => n.id !== id)
      const selectedId = state.selectedId === id ? (next[0] ? next[0].id : undefined) : state.selectedId
      return { chapters: next, selectedId }
    })
    storage.deleteChapter(id).catch(() => { set({ dbError: 'Failed to delete chapter' }) })
  },
  selectChapter: (id?: string) => set(() => ({ selectedId: id, history: [], historyIndex: -1 })),
  createFolder: (name: string, parentId: string | null = null) => {
    const id = 'fld-' + Date.now().toString() + Math.random().toString(36).slice(2, 6)
    const now = Date.now()
    const folder: Folder = { id, name, parentId, createdAt: now, sortOrder: 0 }
    set((state) => ({ folders: [...state.folders, folder] }))
    storage.saveFolder(folder).catch(() => { set({ dbError: 'Failed to create folder' }) })
  },
  deleteFolder: (id: string) => {
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      chapters: state.chapters.map((c) => c.folderId === id ? { ...c, folderId: null } : c),
    }))
    storage.moveChaptersToRoot(id)
      .then(() => storage.deleteFolder(id))
      .catch(() => { set({ dbError: 'Failed to delete folder' }) })
  },
  renameFolder: (id: string, name: string) => {
    set((state) => ({ folders: state.folders.map((f) => f.id === id ? { ...f, name } : f) }))
    storage.updateFolder(id, { name }).catch(() => { set({ dbError: 'Failed to rename folder' }) })
  },
  clearDbError: () => set({ dbError: null }),
  refreshChapters: async () => {
    try {
      const data = await storage.loadAll()
      const { selectedId } = get()
      if (selectedId && !data.chapters.find(c => c.id === selectedId)) {
        set({ chapters: data.chapters, folders: data.folders, selectedId: data.chapters[0]?.id })
      } else {
        set({ chapters: data.chapters, folders: data.folders })
      }
    } catch {
      set({ dbError: 'Failed to load chapters' })
    }
  },
}))

// Initial load
storage.loadAll().then((data) => {
  useNotesStore.setState({ chapters: data.chapters, folders: data.folders, loading: false })
}).catch(() => { useNotesStore.setState({ loading: false }) })

export default useNotesStore
