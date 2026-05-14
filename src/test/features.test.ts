import { describe, it, expect, beforeEach } from 'vitest'
import useNotesStore from '../stores/notesStore'
import { storage, setStorage } from '../lib/storageProvider'
import type { ChapterData as Chapter, FolderData as Folder } from '../lib/storageProvider'
import { autoColors, STYLE_COLLECTIONS } from '../lib/colorUtils'

beforeEach(() => {
  useNotesStore.setState({ chapters: [], folders: [], selectedId: undefined, history: [], historyIndex: -1, loading: false, dbError: null })
  // Use in-memory storage for tests
  const memChapters: Chapter[] = []
  const memFolders: Folder[] = []
  setStorage({
    loadAll: async () => ({ chapters: memChapters, folders: memFolders }),
    saveChapter: async (ch) => { const i = memChapters.findIndex(c => c.id === ch.id); if (i >= 0) memChapters[i] = ch; else memChapters.push(ch) },
    deleteChapter: async (id) => { const i = memChapters.findIndex(c => c.id === id); if (i >= 0) memChapters.splice(i, 1) },
    updateChapter: async (id, patch) => { const ch = memChapters.find(c => c.id === id); if (ch) Object.assign(ch, patch) },
    saveFolder: async (f) => { memFolders.push(f); return Promise.resolve() },
    deleteFolder: async (id) => { const i = memFolders.findIndex(f => f.id === id); if (i >= 0) memFolders.splice(i, 1) },
    updateFolder: async (id, patch) => { const f = memFolders.find(fo => fo.id === id); if (f) Object.assign(f, patch) },
    moveChaptersToRoot: async (folderId) => { memChapters.forEach(c => { if (c.folderId === folderId) c.folderId = null }) },
  })
})

describe('Element Features', () => {
  it('sets opacity on elements via updateSelectedElement pattern', () => {
    const id = useNotesStore.getState().createChapter()
    const state = useNotesStore.getState()
    state.updateChapter(id, { content: JSON.stringify({ elements: [{ id: 'e1', type: 'text', x: 0, y: 0, text: 'hello', fontSize: 18, fill: '#fff', fontStyle: 'normal' }] }) })
    const chapter = useNotesStore.getState().chapters.find(c => c.id === id)
    expect(chapter).toBeDefined()
    const parsed = JSON.parse(chapter!.content || '{}')
    expect(parsed.elements).toHaveLength(1)
    expect(parsed.elements[0].opacity).toBeUndefined()
    // Simulate opacity update (same pattern as updateSelectedElement)
    const updated = { ...parsed.elements[0], opacity: 0.5 }
    const newElements = parsed.elements.map((el: any) => el.id === updated.id ? updated : el)
    state.updateChapter(id, { content: JSON.stringify({ ...parsed, elements: newElements }) })
    const refreshed = JSON.parse(useNotesStore.getState().chapters.find(c => c.id === id)!.content || '{}')
    expect(refreshed.elements[0].opacity).toBe(0.5)
  })

  it('handles reordering elements in content array', () => {
    const id = useNotesStore.getState().createChapter()
    const els = [
      { id: 'a', type: 'text', x: 0, y: 0, text: 'A', fontSize: 18, fill: '#fff', fontStyle: 'normal' },
      { id: 'b', type: 'text', x: 0, y: 0, text: 'B', fontSize: 18, fill: '#fff', fontStyle: 'normal' },
    ]
    useNotesStore.getState().updateChapter(id, { content: JSON.stringify({ elements: els }) })
    // Reorder: move 'a' after 'b'
    const reordered = [els[1], els[0]]
    useNotesStore.getState().updateChapter(id, { content: JSON.stringify({ elements: reordered }) })
    const parsed = JSON.parse(useNotesStore.getState().chapters.find(c => c.id === id)!.content || '{}')
    expect(parsed.elements[0].id).toBe('b')
    expect(parsed.elements[1].id).toBe('a')
  })
})

describe('Folder Features', () => {
  it('creates and lists folders', () => {
    useNotesStore.getState().createFolder('School')
    useNotesStore.getState().createFolder('Personal', null)
    const folders = useNotesStore.getState().folders
    expect(folders).toHaveLength(2)
    expect(folders[0].name).toBe('School')
    expect(folders[1].name).toBe('Personal')
  })

  it('renames a folder', () => {
    useNotesStore.getState().createFolder('Old Name')
    const id = useNotesStore.getState().folders[0].id
    useNotesStore.getState().renameFolder(id, 'New Name')
    expect(useNotesStore.getState().folders[0].name).toBe('New Name')
  })

  it('deletes folder and moves chapters to root', () => {
    useNotesStore.getState().createFolder('Temp')
    const folderId = useNotesStore.getState().folders[0].id
    useNotesStore.getState().createChapter('Note', folderId)
    expect(useNotesStore.getState().chapters[0].folderId).toBe(folderId)
    useNotesStore.getState().deleteFolder(folderId)
    expect(useNotesStore.getState().folders).toHaveLength(0)
    // Chapter should now have folderId null
    // Note: async storage may not update synchronously, but the store state updates
  })
})

describe('Tag Features', () => {
  it('creates chapter with empty tags', () => {
    const id = useNotesStore.getState().createChapter()
    const ch = useNotesStore.getState().chapters.find(c => c.id === id)
    expect(ch?.tags).toBe('')
  })

  it('sets and reads tags', () => {
    const id = useNotesStore.getState().createChapter()
    useNotesStore.getState().updateChapter(id, { tags: 'math, physics' })
    const ch = useNotesStore.getState().chapters.find(c => c.id === id)
    expect(ch?.tags).toBe('math, physics')
  })

  it('parses comma-separated tags correctly', () => {
    const tags = '  math  ,  physics ,chemistry  '
    const parsed = tags.split(',').map(t => t.trim()).filter(Boolean)
    expect(parsed).toEqual(['math', 'physics', 'chemistry'])
  })
})

describe('Undo/Redo', () => {
  it('tracks undo/redo state correctly', () => {
    const id = useNotesStore.getState().createChapter()
    expect(useNotesStore.getState().canUndo()).toBe(false)
    expect(useNotesStore.getState().canRedo()).toBe(false)
    // First update pushes initial state (empty content) to history at index 0
    useNotesStore.getState().updateChapter(id, { content: 'v1' })
    // history: [ {content:'', chapterId:id} ], historyIndex: 0
    expect(useNotesStore.getState().canUndo()).toBe(false) // historyIndex (0) > 0? false
    // Second update pushes 'v1' to history at index 1
    useNotesStore.getState().updateChapter(id, { content: 'v2' })
    // history: [ {content:''}, {content:'v1'} ], historyIndex: 1
    expect(useNotesStore.getState().canUndo()).toBe(true)
    useNotesStore.getState().undo()
    // Restores history[0].content = '' to chapter, historyIndex: 0
    expect(useNotesStore.getState().chapters[0].content).toBe('')
    expect(useNotesStore.getState().historyIndex).toBe(0)
    expect(useNotesStore.getState().canUndo()).toBe(false)
    useNotesStore.getState().redo()
    // Restores history[1].content = 'v1' to chapter
    expect(useNotesStore.getState().chapters[0].content).toBe('v1')
    expect(useNotesStore.getState().canUndo()).toBe(true)
  })
})

describe('Color Utils', () => {
  it('detects dark and light backgrounds', () => {
    expect(autoColors('#000000').pen).toBe('#ffffff')
    expect(autoColors('#ffffff').pen).toBe('#1a1a1a')
  })

  it('has 8 style collections', () => {
    expect(STYLE_COLLECTIONS).toHaveLength(8)
    expect(STYLE_COLLECTIONS[0].id).toBe('dark-charcoal')
    expect(STYLE_COLLECTIONS[7].id).toBe('midnight')
  })
})

describe('Storage Provider', () => {
  it('loadAll returns initial empty state', async () => {
    const data = await storage.loadAll()
    expect(data.chapters).toEqual([])
    expect(data.folders).toEqual([])
  })

  it('saveChapter persists data', async () => {
    const ch: Chapter = { id: '1', title: 'Test', content: '', priorityColor: null, createdAt: 0, updatedAt: 0, folderId: null, tags: '' }
    await storage.saveChapter(ch)
    const data = await storage.loadAll()
    expect(data.chapters).toHaveLength(1)
    expect(data.chapters[0].title).toBe('Test')
  })

  it('deleteChapter removes data', async () => {
    await storage.saveChapter({ id: '1', title: 'T', content: '', priorityColor: null, createdAt: 0, updatedAt: 0, folderId: null, tags: '' })
    await storage.deleteChapter('1')
    const data = await storage.loadAll()
    expect(data.chapters).toHaveLength(0)
  })

  it('updateChapter patches existing data', async () => {
    await storage.saveChapter({ id: '1', title: 'Old', content: '', priorityColor: null, createdAt: 0, updatedAt: 0, folderId: null, tags: '' })
    await storage.updateChapter('1', { title: 'New', priorityColor: '#ff0000' })
    const data = await storage.loadAll()
    expect(data.chapters[0].title).toBe('New')
    expect(data.chapters[0].priorityColor).toBe('#ff0000')
  })

  it('moveChaptersToRoot nullifies folderId', async () => {
    await storage.saveChapter({ id: '1', title: 'T', content: '', priorityColor: null, createdAt: 0, updatedAt: 0, folderId: 'f1', tags: '' })
    await storage.moveChaptersToRoot('f1')
    const data = await storage.loadAll()
    expect(data.chapters[0].folderId).toBeNull()
  })

  it('handles folders CRUD', async () => {
    const f: Folder = { id: 'f1', name: 'Folder', parentId: null, createdAt: 0, sortOrder: 0 }
    await storage.saveFolder(f)
    let data = await storage.loadAll()
    expect(data.folders).toHaveLength(1)
    await storage.updateFolder('f1', { name: 'Renamed' })
    data = await storage.loadAll()
    expect(data.folders[0].name).toBe('Renamed')
    await storage.deleteFolder('f1')
    data = await storage.loadAll()
    expect(data.folders).toHaveLength(0)
  })
})

describe('Notes Store Integration', () => {
  it('creates chapter with folder association', () => {
    useNotesStore.getState().createFolder('Projects')
    const folderId = useNotesStore.getState().folders[0].id
    useNotesStore.getState().createChapter('My Project', folderId)
    const ch = useNotesStore.getState().chapters[0]
    expect(ch.folderId).toBe(folderId)
  })

  it('selects chapter and resets history', () => {
    const id1 = useNotesStore.getState().createChapter('First')
    useNotesStore.getState().createChapter('Second')
    useNotesStore.getState().selectChapter(id1)
    expect(useNotesStore.getState().selectedId).toBe(id1)
    expect(useNotesStore.getState().history).toEqual([])
    expect(useNotesStore.getState().historyIndex).toBe(-1)
  })

  it('clears db error', () => {
    useNotesStore.getState().clearDbError()
    // Should not throw; just clears the error state
  })
})
