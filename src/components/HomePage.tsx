import React from 'react'
import MainWorkspace from './MainWorkspace'

interface Props {
  title?: string
  subtitle?: string
}

const HomePage: React.FC<Props> = ({ title = 'Welcome', subtitle }) => {
  return (
    <div className="home-page">
      <section className="hero">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </section>

      <MainWorkspace />
    </div>
  )
}

export default HomePage
