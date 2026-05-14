import { useState, useEffect, useRef, useCallback } from 'react'

const FOCUS = 25 * 60
const BREAK = 5 * 60

export default function PomodoroTimer({ onClose }: { onClose: () => void }) {
  const [time, setTime] = useState(FOCUS)
  const [phase, setPhase] = useState<'focus' | 'break'>('focus')
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  const start = useCallback(() => {
    clearTimer()
    intervalRef.current = setInterval(() => {
      setTime(t => {
        if (t <= 1) {
          clearTimer()
          setRunning(false)
          if (Notification.permission === 'granted') new Notification('Pomodoro', { body: phase === 'focus' ? 'Focus session complete! Take a break.' : 'Break over! Time to focus.' })
          setPhase(prev => prev === 'focus' ? 'break' : 'focus')
          return phase === 'focus' ? BREAK : FOCUS
        }
        return t - 1
      })
    }, 1000)
    setRunning(true)
  }, [phase, clearTimer])

  const pause = useCallback(() => { clearTimer(); setRunning(false) }, [clearTimer])
  const reset = useCallback(() => { clearTimer(); setRunning(false); setTime(phase === 'focus' ? FOCUS : BREAK) }, [phase, clearTimer])

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission()
    return clearTimer
  }, [clearTimer])

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const progress = phase === 'focus' ? (1 - time / FOCUS) * 100 : (1 - time / BREAK) * 100

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 280, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '1px', marginBottom: 4, textTransform: 'uppercase' }}>{phase === 'focus' ? 'Focus' : 'Break'}</div>
        <div style={{ fontSize: 56, fontWeight: 300, color: 'var(--text-h)', fontVariantNumeric: 'tabular-nums', letterSpacing: '2px' }}>{fmt(time)}</div>
        <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, margin: '12px 0 20px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: phase === 'focus' ? 'var(--accent)' : 'var(--green)', borderRadius: 2, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {running ? (
            <button onClick={pause} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}>Pause</button>
          ) : (
            <button onClick={start} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}>Start</button>
          )}
          <button onClick={reset} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: 14 }}>Reset</button>
        </div>
        <button onClick={onClose} style={{ marginTop: 14, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>Close</button>
      </div>
    </div>
  )
}
