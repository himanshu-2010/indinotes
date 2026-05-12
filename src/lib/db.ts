import Dexie from 'dexie'

export interface ChapterRow {
  id: string
  title: string
  content: string
  priorityColor: string | null
  createdAt: number
  updatedAt: number
}

export interface SyncQueueItem {
  id?: number
  chapterId: string
  operation: 'create' | 'update' | 'delete'
  data?: string
  timestamp: number
  retries: number
}

const db = new Dexie('IndiNotesDB')

db.version(2).stores({
  chapters: 'id, title, priorityColor, updatedAt',
})

db.version(3).stores({
  chapters: 'id, title, priorityColor, updatedAt',
  syncQueue: '++id, chapterId, operation, timestamp',
})

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
