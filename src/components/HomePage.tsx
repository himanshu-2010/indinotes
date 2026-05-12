import React from 'react'
import MainWorkspace from './MainWorkspace'

interface Props {
  title?: string
  subtitle?: string
}

const HomePage: React.FC<Props> = () => {
  return (
    <div className="home-page" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <MainWorkspace />
    </div>
  )
}

export default HomePage
