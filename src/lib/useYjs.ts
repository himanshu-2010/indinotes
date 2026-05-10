import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { useEffect, useRef } from 'react'

export default function useYjs(room: string | null) {
  const ref = useRef<any>(null)

  useEffect(() => {
    if (!room) return
    const doc = new Y.Doc()
    const provider = new WebsocketProvider('wss://demos.yjs.dev', room, doc)
    ref.current = { doc, provider }
    return () => {
      provider.disconnect()
      doc.destroy()
      ref.current = null
    }
  }, [room])

  return ref
}
