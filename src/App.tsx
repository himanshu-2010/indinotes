import { useEffect } from 'react'
import './App.css'
import Layout from './components/Layout'
import HomePage from './components/HomePage'
import ErrorBoundary from './components/ErrorBoundary'
import { initSync, destroySync } from './lib/syncService'

function App() {
  useEffect(() => {
    initSync()
    return () => destroySync()
  }, [])

  return (
    <ErrorBoundary>
      <Layout>
        <HomePage />
      </Layout>
    </ErrorBoundary>
  )
}

export default App
