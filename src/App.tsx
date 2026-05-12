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
        <HomePage title="InkCanvas — IndiNotes" subtitle="A local-first PWA for note taking and graphing" />
      </Layout>
    </ErrorBoundary>
  )
}

export default App
