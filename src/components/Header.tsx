import React from 'react'

interface Props {
  title?: string
}

const Header: React.FC<Props> = ({ title = 'IndiNotes' }) => {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <h1 className="app-title">{title}</h1>
      </div>
      <div className="app-header-right">
        <button className="btn">New</button>
        <button className="btn">Open</button>
        <button className="btn">Share</button>
      </div>
    </header>
  )
}

export default Header
