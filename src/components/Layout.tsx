import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const Layout: React.FC<Props> = ({ children }) => {
  return (
    <div className="app-root" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <div className="app-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <main className="app-main" style={{ flex: 1, width: '100%', overflow: 'hidden', minHeight: 0 }}>{children}</main>
      </div>
    </div>
  )
}

export default Layout
