import React from 'react'

type Item = { id: string; label: string }

interface Props {
  items: Item[]
  onSelect?: (id: string) => void
}

const Sidebar: React.FC<Props> = ({ items, onSelect }) => {
  return (
    <aside className="app-sidebar">
      <ul>
        {items.map((it) => (
          <li key={it.id}>
            <button className="sidebar-item" onClick={() => onSelect?.(it.id)}>
              {it.label}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default Sidebar
