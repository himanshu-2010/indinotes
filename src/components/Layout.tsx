import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const Layout: React.FC<Props> = ({ children }) => {
  return (
    <div className="app-root" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="app-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <main className="app-main" style={{ flex: 1, width: '100%', overflow: 'hidden' }}>{children}</main>
      </div>
    </div>
  )
}

export default Layout
