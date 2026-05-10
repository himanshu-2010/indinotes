import React, { useState } from 'react'

type Item = { id: string; label: string; priorityColor?: string | null }

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
  selectedId?: string
  onSelect?: (id: string) => void
  onNewChapter?: () => void
  onDeleteChapter?: (ids: string[]) => void
  onPriorityChange?: (id: string, color: string | null) => void
  showDelete?: boolean
}

const Sidebar: React.FC<Props> = ({ items, selectedId, onSelect, onNewChapter, onDeleteChapter, onPriorityChange, showDelete }) => {
  const [openPriorityMenu, setOpenPriorityMenu] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)

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

  const handleDelete = () => {
    if (selectedIds.length > 0) {
      if (confirm(`Delete ${selectedIds.length} chapter(s)? This cannot be undone.`)) {
        onDeleteChapter?.(selectedIds)
        setSelectedIds([])
        setIsMultiSelectMode(false)
      }
    }
  }

  return (
    <div style={{ 
      width: '22%', 
      minWidth: 200, 
      maxWidth: 300,
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg)', 
      borderRight: '1px solid var(--border)'
    }}>
      <div style={{ padding: '8px 8px 0 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
        <button 
          onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
          style={{ 
            padding: '4px 8px', 
            fontSize: 11, 
            background: isMultiSelectMode ? 'var(--accent)' : 'var(--panel)', 
            color: '#fff', 
            border: 'none', 
            borderRadius: 4, 
            cursor: 'pointer'
          }}
        >
          {isMultiSelectMode ? '✓ Multi-select On' : '○ Multi-select'}
        </button>
        {isMultiSelectMode && selectedIds.length > 0 && (
          <button 
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
          </button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {items.map((it) => (
          <div 
            key={it.id}
            onClick={(e) => toggleSelect(it.id, e)}
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 14px',
              cursor: 'pointer',
              borderLeft: it.priorityColor ? `4px solid ${it.priorityColor}` : '4px solid transparent',
              background: selectedIds.includes(it.id) ? 'rgba(14, 165, 164, 0.25)' : (selectedId === it.id ? 'rgba(14, 165, 164, 0.15)' : 'transparent'),
              borderRadius: 8,
              marginBottom: 4,
              userSelect: 'none'
            }}
            onMouseEnter={(e) => !selectedIds.includes(it.id) && (e.currentTarget.style.background = selectedId === it.id ? 'rgba(14, 165, 164, 0.2)' : 'rgba(255,255,255,0.05)')}
            onMouseLeave={(e) => !selectedIds.includes(it.id) && (e.currentTarget.style.background = selectedId === it.id ? 'rgba(14, 165, 164, 0.15)' : 'transparent')}
          >
            {isMultiSelectMode && (
              <input 
                type="checkbox" 
                checked={selectedIds.includes(it.id)}
                onChange={() => {}}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
            )}
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: it.priorityColor || '#555',
              flexShrink: 0
            }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
              {it.label || 'Untitled'}
            </span>
            <button 
              onClick={(e) => { 
                e.stopPropagation()
                setOpenPriorityMenu(openPriorityMenu === it.id ? null : it.id)
              }}
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
            </button>
            {openPriorityMenu === it.id && (
              <div style={{ 
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
                  <button
                    key={p.name}
                    onClick={() => { onPriorityChange?.(it.id, p.color); setOpenPriorityMenu(null); }}
                    title={p.name}
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
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            No chapters yet.<br />Create your first one!
          </div>
        )}
      </div>
      
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button 
          onClick={onNewChapter}
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
        </button>
        {(showDelete || isMultiSelectMode) && (
          <button 
            onClick={() => isMultiSelectMode && selectedIds.length > 0 ? handleDelete() : onDeleteChapter?.(selectedId ? [selectedId] : [])}
            disabled={isMultiSelectMode && selectedIds.length === 0 && !selectedId}
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
          </button>
        )}
      </div>
    </div>
  )
}

export default Sidebar