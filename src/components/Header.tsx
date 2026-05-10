import React, { useState } from 'react'
import supabase from '../lib/supabaseClient'

interface Props {
  title?: string
}

const Header: React.FC<Props> = ({ title = 'IndiNotes' }) => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const signIn = async () => {
    if (!supabase) {
      setMessage('Supabase not configured (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)')
      return
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) setMessage(String(error.message))
      else setMessage('Check your email for sign-in link')
    } catch (e: any) {
      setMessage(String(e.message || e))
    }
  }

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setMessage('Signed out')
  }

  return (
    <header className="app-header">
      <div className="app-header-left">
        <h1 className="app-title">{title}</h1>
      </div>
      <div className="app-header-right">
        <input placeholder="you@host.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ marginRight: 8 }} />
        <button className="btn" onClick={signIn}>Sign in</button>
        <button className="btn" onClick={signOut} style={{ marginLeft: 8 }}>Sign out</button>
        <div style={{ marginLeft: 12 }}>{message}</div>
      </div>
    </header>
  )
}

export default Header
