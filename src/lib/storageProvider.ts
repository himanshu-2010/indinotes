/**
 * StorageProvider — abstracts persistence so the store doesn't depend on Dexie directly.
 * Swap implementations by replacing `storage` at the module level.
 */
import db, { type ChapterRow } from './db'
import { enqueueSync } from './syncService'

export interface ChapterData {
  id: string
  title: string
  content: string
  priorityColor: string | null
  createdAt: number
  updatedAt: number
  folderId: string | null
  tags: string
}

export interface FolderData {
  id: string
  name: string
  parentId: string | null
  createdAt: number
  sortOrder: number
}

export interface StorageProvider {
  loadAll: () => Promise<{ chapters: ChapterData[]; folders: FolderData[] }>
  saveChapter: (chapter: ChapterData) => Promise<void>
  deleteChapter: (id: string) => Promise<void>
  saveFolder: (folder: FolderData) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  updateChapter: (id: string, patch: Partial<ChapterData>) => Promise<void>
  updateFolder: (id: string, patch: Partial<FolderData>) => Promise<void>
  moveChaptersToRoot: (folderId: string) => Promise<void>
}

// Serial queue to prevent overlapping stale-reads
let opQueue: Promise<unknown> = Promise.resolve()

function sequenced<T>(fn: () => Promise<T>): Promise<T> {
  const p = opQueue.then(fn, fn)
  opQueue = p.catch(() => {})
  return p
}

export const storage: StorageProvider = {
  async loadAll() {
    const [chapterRows, folderRows] = await Promise.all([
      db.table('chapters').toArray(),
      db.table('folders').toArray(),
    ])
    return {
      chapters: (chapterRows || []).map(r => ({
        id: r.id, title: r.title, content: r.content,
        priorityColor: r.priorityColor, createdAt: r.createdAt, updatedAt: r.updatedAt,
        folderId: r.folderId ?? null, tags: r.tags || '',
      })),
      folders: (folderRows || []).map(r => ({
        id: r.id, name: r.name, parentId: r.parentId,
        createdAt: r.createdAt, sortOrder: r.sortOrder,
      })),
    }
  },

  async saveChapter(chapter: ChapterData) {
    await sequenced(async () => {
      await db.table('chapters').put(chapter)
      enqueueSync(chapter.id, 'create', JSON.stringify(chapter))
    })
  },

  async deleteChapter(id: string) {
    await sequenced(async () => {
      await db.table('chapters').delete(id)
      enqueueSync(id, 'delete')
    })
  },

  async saveFolder(folder: FolderData) {
    await db.table('folders').put(folder)
  },

  async deleteFolder(id: string) {
    await sequenced(async () => {
      await db.table('folders').delete(id)
    })
  },

  async updateChapter(id: string, patch: Partial<ChapterData>) {
    await sequenced(async () => {
      const existing = await db.table('chapters').get(id)
      if (existing) {
        const updated: ChapterRow = { ...existing, ...patch, updatedAt: patch.updatedAt ?? Date.now() }
        await db.table('chapters').put(updated)
        enqueueSync(id, 'update', JSON.stringify(updated))
      }
    })
  },

  async updateFolder(id: string, patch: Partial<FolderData>) {
    await sequenced(async () => {
      const existing = await db.table('folders').get(id)
      if (existing) await db.table('folders').put({ ...existing, ...patch })
    })
  },

  async moveChaptersToRoot(folderId: string) {
    await sequenced(async () => {
      const folderChapters = await db.table('chapters').where('folderId').equals(folderId).toArray()
      for (const ch of folderChapters) {
        await db.table('chapters').put({ ...ch, folderId: null })
      }
    })
  },
}

// Swap-in point for alternate backends (e.g. localStorage, remote API)
export function setStorage(impl: Partial<StorageProvider>) {
  Object.assign(storage, impl)
}
