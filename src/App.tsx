import React from 'react'
import './App.css'
import Layout from './components/Layout'
import HomePage from './components/HomePage'

function App() {
  return (
    <Layout>
      <HomePage title="InkCanvas — IndiNotes" subtitle="A local-first PWA for note taking and graphing" />
    </Layout>
  )
}

export default App
