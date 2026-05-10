import React from 'react'

interface Props {
  mode?: string
}

const MainWorkspace: React.FC<Props> = ({ mode }) => {
  return (
    <section className="main-workspace">
      <div className="placeholder">Main workspace placeholder (mode: {mode ?? 'default'})</div>
    </section>
  )
}

export default MainWorkspace
