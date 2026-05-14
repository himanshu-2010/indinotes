import Dexie from 'dexie'

export interface ChapterRow {
  id: string
  title: string
  content: string
  priorityColor: string | null
  createdAt: number
  updatedAt: number
  folderId: string | null
  tags: string
}

export interface SyncQueueItem {
  id?: number
  chapterId: string
  operation: 'create' | 'update' | 'delete'
  data?: string
  timestamp: number
  retries: number
}

export interface FolderRow {
  id: string
  name: string
  parentId: string | null
  createdAt: number
  sortOrder: number
}

const db = new Dexie('IndiNotesDB')

db.version(2).stores({
  chapters: 'id, title, priorityColor, updatedAt',
})

db.version(3).stores({
  chapters: 'id, title, priorityColor, updatedAt',
  syncQueue: '++id, chapterId, operation, timestamp',
})

db.version(4).stores({
  chapters: 'id, title, priorityColor, updatedAt, folderId',
  syncQueue: '++id, chapterId, operation, timestamp',
  folders: 'id, name, parentId, sortOrder',
})

db.version(5).stores({
  chapters: 'id, title, priorityColor, updatedAt, folderId',
  syncQueue: '++id, chapterId, operation, timestamp',
  folders: 'id, name, parentId, sortOrder',
  voiceNotes: '++id, chapterId, createdAt',
})

export interface VoiceNoteRow {
  id?: number
  chapterId: string
  audio: Blob
  duration: number
  createdAt: number
  name?: string
}

export default db

export const PRIORITY_COLORS = [
  { name: 'None', color: null },
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Pink', color: '#ec4899' },
]
