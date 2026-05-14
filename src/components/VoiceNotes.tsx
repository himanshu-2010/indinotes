import { useState, useEffect, useRef, useCallback } from 'react'
import db from '../lib/db'

interface VoiceNote {
  id?: number
  chapterId: string
  audio: Blob
  duration: number
  createdAt: number
  name?: string
}

export default function VoiceNotes({ chapterId }: { chapterId: string }) {
  const [notes, setNotes] = useState<VoiceNote[]>([])
  const [recording, setRecording] = useState(false)
  const [playing, setPlaying] = useState<number | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const table = db.table('voiceNotes')
    table.where('chapterId').equals(chapterId).toArray().then(setNotes)
    // Refresh when component mounts / chapter changes
    const interval = setInterval(async () => {
      const rows = await table.where('chapterId').equals(chapterId).toArray()
      setNotes(rows)
    }, 2000)
    return () => clearInterval(interval)
  }, [chapterId])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' })
      chunksRef.current = []
      setElapsed(0)
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        if (blob.size > 0) {
          await db.table('voiceNotes').add({ chapterId, audio: blob, duration: elapsed, createdAt: Date.now() })
          const rows = await db.table('voiceNotes').where('chapterId').equals(chapterId).toArray()
          setNotes(rows)
        }
      }
      recorder.start(100)
      mediaRef.current = recorder
      setRecording(true)
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } catch { alert('Microphone access required to record audio.') }
  }, [chapterId, elapsed])

  const stopRecording = () => { mediaRef.current?.stop(); setRecording(false) }

  const play = (note: VoiceNote) => {
    if (playing === note.id) { audioRef.current?.pause(); setPlaying(null); return }
    audioRef.current?.pause()
    const url = URL.createObjectURL(note.audio)
    const audio = new Audio(url)
    audio.onended = () => { setPlaying(null); URL.revokeObjectURL(url) }
    audio.play()
    audioRef.current = audio
    setPlaying(note.id ?? null)
  }

  const deleteNote = async (id: number) => {
    await db.table('voiceNotes').delete(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {recording ? (
          <>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff4444', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--text)' }}>Recording {fmt(elapsed)}</span>
            <button onClick={stopRecording} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'rgba(211,47,47,0.2)', color: '#ff4444', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>Stop</button>
          </>
        ) : (
          <button onClick={startRecording} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: 'rgba(212,165,71,0.2)', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>🎤 Record</button>
        )}
      </div>
      {notes.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '0.5px' }}>RECORDINGS ({notes.length})</div>
          {notes.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
              <button onClick={() => play(n)} style={{ padding: '4px 8px', borderRadius: 4, border: 'none', background: playing === n.id ? 'var(--accent)' : 'var(--panel)', color: playing === n.id ? '#fff' : 'var(--text)', cursor: 'pointer', fontSize: 11 }}>{playing === n.id ? '⏹' : '▶'}</button>
              <span style={{ fontSize: 12, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name || `Recording ${new Date(n.createdAt).toLocaleDateString()}`}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{fmt(n.duration)}</span>
              {n.id && <button onClick={() => deleteNote(n.id!)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, padding: '2px' }}>×</button>}
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.3 } }
      `}</style>
    </div>
  )
}
