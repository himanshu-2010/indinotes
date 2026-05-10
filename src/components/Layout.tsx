import React, { ReactNode } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import Footer from './Footer'

interface Props {
  children: ReactNode
}

const Layout: React.FC<Props> = ({ children }) => {
  return (
    <div className="app-root">
      <Header title="IndiNotes" />
      <div className="app-body">
        <Sidebar items={[{ id: 'home', label: 'Home' }, { id: 'workspaces', label: 'Workspaces' }]} />
        <main className="app-main">{children}</main>
      </div>
      <Footer />
    </div>
  )
}

export default Layout
