import { spawn } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEV_URL = 'http://localhost:5173'

const vite = spawn('node', [resolve(ROOT, 'node_modules', '.bin', 'vite')], {
  stdio: 'inherit',
  cwd: ROOT,
  env: { ...process.env },
})

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(DEV_URL)
      if (res.ok) return
    } catch {}
    await new Promise(r => setTimeout(r, 1000))
  }
  console.error('Vite did not start in time')
  vite.kill()
  process.exit(1)
}

waitForServer().then(() => {
  const electron = spawn('node', [resolve(ROOT, 'node_modules', '.bin', 'electron'), ROOT], {
    stdio: 'inherit',
    cwd: ROOT,
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: DEV_URL,
      ELECTRON_DEV: 'true',
    },
  })

  electron.on('close', () => {
    vite.kill()
    process.exit()
  })
})

process.on('SIGINT', () => {
  vite.kill()
  process.exit()
})
