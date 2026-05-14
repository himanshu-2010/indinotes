import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Item = { id: string; label: string; priorityColor?: string | null; folderId?: string | null; tags?: string }

type FolderItem = { id: string; name: string }

const PRIORITY_COLORS = [
  { name: 'None', color: null },
  { name: 'Red', color: '#ef4444' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Pink', color: '#ec4899' },
]

interface Props {
  items: Item[]
  folders: FolderItem[]
  selectedId?: string
  selectedFolderId?: string | null
  onSelect?: (id: string) => void
  onNewChapter?: () => void
  onDeleteChapter?: (ids: string[]) => void
  onPriorityChange?: (id: string, color: string | null) => void
  onReorder?: (fromIndex: number, toIndex: number) => void
  onSelectFolder?: (folderId: string | null) => void
  onCreateFolder?: () => void
  onDeleteFolder?: (folderId: string) => void
  onRenameFolder?: (folderId: string, name: string) => void
  onTagsChange?: (id: string, tags: string) => void
  showDelete?: boolean
}

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.03, type: 'spring' as const, stiffness: 300, damping: 24 },
  }),
}

const Sidebar: React.FC<Props> = ({ items, folders, selectedId, selectedFolderId, onSelect, onNewChapter, onDeleteChapter, onPriorityChange, onReorder, showDelete, onSelectFolder, onCreateFolder, onDeleteFolder, onRenameFolder, onTagsChange }) => {
  const [openPriorityMenu, setOpenPriorityMenu] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
  const [search, setSearch] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [openTagEditor, setOpenTagEditor] = useState<string | null>(null)
  const [editingTags, setEditingTags] = useState('')

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    if (!isMultiSelectMode) {
      onSelect?.(id)
      return
    }
    e.stopPropagation()
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [folderOpen, setFolderOpen] = useState(true)

  const handleDelete = () => {
    if (selectedIds.length > 0) {
      if (confirm(`Delete ${selectedIds.length} chapter(s)? This cannot be undone.`)) {
        onDeleteChapter?.(selectedIds)
        setSelectedIds([])
        setIsMultiSelectMode(false)
      }
    }
  }

  // Filter items by selected folder and search (label + tags)
  const filtered = items.filter(it => {
    const q = search.toLowerCase()
    const matchesLabel = it.label.toLowerCase().includes(q)
    const matchesTags = (it.tags || '').toLowerCase().includes(q)
    if (!matchesLabel && !matchesTags) return false
    if (selectedFolderId !== undefined && it.folderId !== selectedFolderId) return false
    return true
  })

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg)', 
      borderRight: '1px solid var(--border)',
      minHeight: 0,
    }}>
      {/* Folder section */}
      <div style={{ flexShrink: 0, borderBottom: folders.length > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
        <div
          onClick={() => setFolderOpen(!folderOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '0.5px', userSelect: 'none' }}
        >
          <span style={{ fontSize: 10 }}>{folderOpen ? '▾' : '▸'}</span>
          FOLDERS
          <motion.button
            onClick={(e) => { e.stopPropagation(); onCreateFolder?.() }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
            title="New folder"
          >+</motion.button>
        </div>
        <AnimatePresence>
          {folderOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
              <div
                onClick={() => onSelectFolder?.(null)}
                style={{ padding: '6px 12px 6px 24px', cursor: 'pointer', fontSize: 13, color: selectedFolderId === null ? 'var(--accent)' : 'var(--muted)', background: selectedFolderId === null ? 'rgba(212,165,71,0.1)' : 'transparent', display: 'flex', alignItems: 'center', gap: 6 }}
              >📁 All Chapters</div>
              {folders.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', padding: '2px 12px 2px 24px', background: selectedFolderId === f.id ? 'rgba(212,165,71,0.1)' : 'transparent' }}>
                  {editingFolderId === f.id ? (
                    <input
                      autoFocus
                      value={editingFolderName}
                      onChange={e => setEditingFolderName(e.target.value)}
                      onBlur={() => { onRenameFolder?.(f.id, editingFolderName); setEditingFolderId(null) }}
                      onKeyDown={e => { if (e.key === 'Enter') { onRenameFolder?.(f.id, editingFolderName); setEditingFolderId(null) } if (e.key === 'Escape') setEditingFolderId(null) }}
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'var(--bg-alt)', color: 'var(--text)', padding: '4px 6px', borderRadius: 4, fontSize: 13 }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span
                      onClick={() => onSelectFolder?.(f.id)}
                      style={{ flex: 1, cursor: 'pointer', fontSize: 13, color: selectedFolderId === f.id ? 'var(--accent)' : 'var(--text)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}
                    >📂 {f.name}</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingFolderId(f.id); setEditingFolderName(f.name) }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 10, padding: '2px 4px' }}
                    title="Rename"
                  >✎</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Delete folder "${f.name}"? Chapters will be moved to root.`)) onDeleteFolder?.(f.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}
                    title="Delete folder"
                  >×</button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div style={{ padding: '8px 8px 0 8px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chapters..."
          style={{
            flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'var(--bg-alt)', color: 'var(--text)', fontSize: 12, outline: 'none',
            minWidth: 0,
          }}
        />
        <motion.button
          onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ 
            padding: '4px 8px', 
            fontSize: 11, 
            background: isMultiSelectMode ? 'var(--accent)' : 'var(--panel)', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 4, 
            cursor: 'pointer',
          }}
        >
          {isMultiSelectMode ? '✓ Multi-select On' : '○ Multi-select'}
        </motion.button>
        <AnimatePresence>
          {isMultiSelectMode && selectedIds.length > 0 && (
            <motion.button
              key="delete-multi"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={handleDelete}
              style={{ 
                padding: '4px 8px', 
                fontSize: 11, 
                background: 'rgba(211, 47, 47, 0.2)', 
                color: '#ef4444', 
                border: 'none', 
                borderRadius: 4, 
                cursor: 'pointer'
              }}
            >
              Delete ({selectedIds.length})
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, minHeight: 0 }}>
          <AnimatePresence mode="popLayout">
            {filtered.map((it, i) => (
            <motion.div
              key={it.id}
              layout
              custom={i}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
              draggable={!isMultiSelectMode}
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => { e.preventDefault(); setDragIndex(i) }}
              onDragEnd={() => setDragIndex(null)}
              onDrop={() => { if (dragIndex !== null && dragIndex !== i && onReorder) onReorder(dragIndex, i); setDragIndex(null) }}
              onClick={(e) => toggleSelect(it.id, e)}
              whileHover={{ scale: 1.01, background: selectedIds.includes(it.id) ? 'rgba(212, 165, 71, 0.25)' : selectedId === it.id ? 'rgba(212, 165, 71, 0.2)' : 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.99 }}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                cursor: isMultiSelectMode ? 'pointer' : 'grab',
                borderLeft: it.priorityColor ? `4px solid ${it.priorityColor}` : '4px solid transparent',
                background: selectedIds.includes(it.id) ? 'rgba(212, 165, 71, 0.25)' : (selectedId === it.id ? 'rgba(212, 165, 71, 0.15)' : 'transparent'),
                borderRadius: 8,
                marginBottom: 4,
                userSelect: 'none',
                position: 'relative',
                opacity: dragIndex === i ? 0.4 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {isMultiSelectMode && (
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(it.id)}
                  onChange={() => {}}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
              )}
              <motion.div
                layout
                style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: it.priorityColor || '#555',
                  flexShrink: 0
                }}
                animate={it.priorityColor ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              />
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1, color: 'var(--text)' }}>
                  {it.label || 'Untitled'}
                </span>
                {it.tags && (it.tags || '').trim() && (it.tags || '').split(',').map(t => t.trim()).filter(Boolean).slice(0, 2).map(tag => (
                  <span key={tag} style={{ flexShrink: 0, padding: '1px 5px', borderRadius: 4, fontSize: 9, background: 'rgba(212,165,71,0.15)', color: 'var(--accent)', whiteSpace: 'nowrap', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tag}</span>
                ))}
                {(it.tags || '').split(',').filter(Boolean).length > 2 && (
                  <span style={{ flexShrink: 0, fontSize: 9, color: 'var(--muted)' }}>+{(it.tags || '').split(',').filter(Boolean).length - 2}</span>
                )}
              </div>
              <motion.button
                onClick={(e) => { 
                  e.stopPropagation()
                  setOpenPriorityMenu(openPriorityMenu === it.id ? null : it.id)
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                style={{ 
                  background: 'rgba(255,255,255,0.1)', 
                  border: 'none', 
                  borderRadius: 4, 
                  padding: '2px 6px', 
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontSize: 10
                }}
              >
                🎨
              </motion.button>
              <AnimatePresence>
                {openPriorityMenu === it.id && (
                  <motion.div
                    key="priority-menu"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.12 }}
                    style={{ 
                      position: 'absolute', 
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'var(--bg)', 
                      border: '1px solid var(--border)', 
                      borderRadius: 8, 
                      padding: 8, 
                      display: 'flex', 
                      gap: 4,
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {PRIORITY_COLORS.map((p) => (
                      <motion.button
                        key={p.name}
                        onClick={() => { onPriorityChange?.(it.id, p.color); setOpenPriorityMenu(null); }}
                        title={p.name}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: it.priorityColor === p.color ? '2px solid #fff' : '1px solid var(--border)',
                          background: p.color || 'var(--panel)',
                          cursor: 'pointer',
                          padding: p.color ? 0 : 2,
                        }}
                      >
                        {p.color === null && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px dashed var(--muted)' }} />}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation()
                  const next = openTagEditor === it.id ? null : it.id
                  setOpenTagEditor(next)
                  if (next) setEditingTags(it.tags || '')
                }}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: 4,
                  padding: '2px 6px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontSize: 10
                }}
                title="Edit tags"
              >🏷️</motion.button>
              <AnimatePresence>
                {openTagEditor === it.id && (
                  <motion.div
                    key="tag-editor"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '6px 8px',
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      autoFocus
                      value={editingTags}
                      onChange={(e) => setEditingTags(e.target.value)}
                      onBlur={() => { onTagsChange?.(it.id, editingTags); setOpenTagEditor(null) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { onTagsChange?.(it.id, editingTags); setOpenTagEditor(null) }
                        if (e.key === 'Escape') setOpenTagEditor(null)
                      }}
                      placeholder="tag1, tag2, ..."
                      style={{
                        border: 'none', outline: 'none', background: 'var(--bg-alt)',
                        color: 'var(--text)', padding: '4px 6px', borderRadius: 4, fontSize: 12, width: 140,
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}
          >
            No chapters yet.<br />Create your first one!
          </motion.div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            No chapters match "{search}"
          </div>
        ) : null}
      </div>
      
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        <motion.button
          onClick={onNewChapter}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{ 
            padding: '10px 16px', 
            borderRadius: 8, 
            background: 'var(--accent)', 
            color: '#fff', 
            border: 'none', 
            cursor: 'pointer', 
            fontWeight: 'bold',
            fontSize: 14
          }}
        >
          + New Chapter
        </motion.button>
        <AnimatePresence>
          {(showDelete || isMultiSelectMode) && (
            <motion.button
              key="delete-btn"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onClick={() => isMultiSelectMode && selectedIds.length > 0 ? handleDelete() : onDeleteChapter?.(selectedId ? [selectedId] : [])}
              disabled={isMultiSelectMode && selectedIds.length === 0 && !selectedId}
              whileHover={!isMultiSelectMode || selectedIds.length > 0 ? { scale: 1.02 } : {}}
              whileTap={!isMultiSelectMode || selectedIds.length > 0 ? { scale: 0.98 } : {}}
              style={{ 
                padding: '10px 16px', 
                borderRadius: 8, 
                background: isMultiSelectMode && selectedIds.length > 0 ? 'rgba(211, 47, 47, 0.2)' : 'rgba(211, 47, 47, 0.1)', 
                color: isMultiSelectMode && selectedIds.length > 0 ? '#ef4444' : '#9ca3af', 
                border: '1px solid rgba(211, 47, 47, 0.2)', 
                cursor: (isMultiSelectMode && selectedIds.length > 0) || selectedId ? 'pointer' : 'not-allowed',
                fontWeight: 'bold',
                fontSize: 14
              }}
            >
              {isMultiSelectMode ? `🗑️ Delete Selected (${selectedIds.length})` : '🗑️ Delete Chapter'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
    </div>
  )
}

export default Sidebar
