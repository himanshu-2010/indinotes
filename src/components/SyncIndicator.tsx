import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSyncStatus, onSyncStatusChange } from '../lib/syncService'
import type { SyncStatus } from '../lib/syncService'

const LABELS: Record<SyncStatus, string> = {
  synced: 'Synced',
  pending: 'Pending',
  syncing: 'Syncing',
  offline: 'Offline',
  error: 'Error',
}

const STATUS_COLORS: Record<SyncStatus, string> = {
  synced: '#22c55e',
  pending: '#eab308',
  syncing: '#3b82f6',
  offline: '#ef4444',
  error: '#ef4444',
}

export default function SyncIndicator() {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus())
  const [prevStatus, setPrevStatus] = useState(status)

  useEffect(() => {
    return onSyncStatusChange(setStatus)
  }, [])

  useEffect(() => {
    if (status !== prevStatus) {
      const t = setTimeout(() => setPrevStatus(status), 300)
      return () => clearTimeout(t)
    }
  }, [status, prevStatus])

  const color = STATUS_COLORS[status]

  return (
    <motion.div
      layout
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 12,
        fontSize: 11,
        background: 'rgba(255,255,255,0.05)',
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {status === 'syncing' ? (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}
        />
      ) : (
        <motion.span
          layout
          style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}
        />
      )}
      <AnimatePresence mode="wait">
        <motion.span
          key={status}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
        >
          {LABELS[status]}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  )
}
