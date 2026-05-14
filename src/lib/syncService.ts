import supabase from './supabaseClient'
import db, { type SyncQueueItem, type ChapterRow } from './db'
import useNotesStore from '../stores/notesStore'

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'offline' | 'error'

let _status: SyncStatus = navigator.onLine ? 'synced' : 'offline'
let _listeners: Array<(status: SyncStatus) => void> = []
let _processing = false
let _timer: ReturnType<typeof setInterval> | null = null

function notify() {
  _listeners.forEach(fn => fn(_status))
}

function setStatus(s: SyncStatus) {
  if (_status !== s) {
    _status = s
    notify()
  }
}

export function getSyncStatus(): SyncStatus {
  return _status
}

export function onSyncStatusChange(fn: (status: SyncStatus) => void): () => void {
  _listeners.push(fn)
  return () => { _listeners = _listeners.filter(f => f !== fn) }
}

export async function enqueueSync(
  chapterId: string,
  operation: SyncQueueItem['operation'],
  data?: string,
) {
  if (!supabase) return
  const item: SyncQueueItem = {
    chapterId,
    operation,
    data,
    timestamp: Date.now(),
    retries: 0,
  }
  await db.table('syncQueue').add(item)
  setStatus('pending')
  if (navigator.onLine) {
    processSyncQueue()
  }
}

async function processSyncQueue() {
  if (_processing) return
  _processing = true
  setStatus('syncing')

  try {
    const queue: SyncQueueItem[] = await db.table('syncQueue')
      .orderBy('id')
      .toArray()

    if (queue.length === 0) {
      setStatus(navigator.onLine ? 'synced' : 'offline')
      _processing = false
      return
    }

    if (!supabase) {
      await db.table('syncQueue').clear()
      setStatus(navigator.onLine ? 'synced' : 'offline')
      _processing = false
      return
    }

    for (const item of queue) {
      try {
        await pushChange(item)
        await db.table('syncQueue').delete(item.id!)
      } catch {
        await db.table('syncQueue').update(item.id!, { retries: item.retries + 1 })
      }
    }

    await pullRemoteChanges()
  } finally {
    _processing = false
    const remaining = await db.table('syncQueue').count()
    if (!navigator.onLine) {
      setStatus('offline')
    } else if (remaining > 0) {
      setStatus('pending')
    } else {
      setStatus('synced')
    }
  }
}

async function pushChange(item: SyncQueueItem) {
  if (!supabase) return

  if (item.operation === 'delete') {
    await supabase.from('chapters').delete().eq('id', item.chapterId)
    return
  }

  let data: Record<string, unknown>
  if (item.data) {
    try { data = JSON.parse(item.data) as Record<string, unknown> } catch { return }
  } else {
    const row = await db.table('chapters').get(item.chapterId)
    if (!row) return
    data = row
  }

  await supabase.from('chapters').upsert({
    id: data.id,
    title: data.title,
    content: data.content,
    priority_color: data.priorityColor,
    created_at: data.createdAt,
    updated_at: data.updatedAt,
  }, { onConflict: 'id' })
}

async function pullRemoteChanges() {
  if (!supabase) return

  const { data: remote, error } = await supabase
    .from('chapters')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error || !remote) return

  for (const r of remote) {
    const local: ChapterRow | undefined = await db.table('chapters').get(r.id)
    if (!local) {
      const chapter: ChapterRow = {
        id: r.id,
        title: r.title || '',
        content: r.content || '',
        priorityColor: r.priority_color || null,
        createdAt: r.created_at || Date.now(),
        updatedAt: r.updated_at || Date.now(),
        folderId: null,
        tags: '',
      }
      await db.table('chapters').put(chapter)
    } else if ((r.updated_at || 0) > local.updatedAt) {
      await db.table('chapters').put({
        id: r.id,
        title: r.title || local.title,
        content: r.content || local.content,
        priorityColor: r.priority_color || local.priorityColor,
        createdAt: r.created_at || local.createdAt,
        updatedAt: r.updated_at || local.updatedAt,
        folderId: local.folderId,
        tags: local.tags,
      })
    }
  }

  useNotesStore.getState().refreshChapters()
}

function handleOnline() {
  if (!supabase) {
    setStatus('synced')
    return
  }
  setStatus('pending')
  processSyncQueue()
}

function handleOffline() {
  setStatus('offline')
}

export function initSync() {
  if (typeof window === 'undefined') return

  if (!supabase) {
    setStatus('synced')
    return
  }

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  if (navigator.onLine) {
    setTimeout(() => processSyncQueue(), 1000)
  } else {
    setStatus('offline')
  }

  _timer = setInterval(() => {
    if (navigator.onLine) processSyncQueue()
  }, 30000)
}

export function destroySync() {
  if (typeof window === 'undefined') return
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  if (_timer) clearInterval(_timer)
}
