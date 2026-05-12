const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')

// Handle Wayland + Vulkan incompatibility on Linux
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
  app.commandLine.appendSwitch('disable-software-rasterizer')
}

const DEV = process.env.ELECTRON_DEV === 'true'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (DEV) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  if (!DEV) {
    autoUpdater.checkForUpdates()

    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available. Download now?`,
        buttons: ['Download', 'Later'],
      }).then(({ response }) => {
        if (response === 0) autoUpdater.downloadUpdate()
      })
    })

    autoUpdater.on('update-not-available', () => {})

    autoUpdater.on('download-progress', (progress) => {
      win.setProgressBar(progress.percent / 100)
    })

    autoUpdater.on('update-downloaded', () => {
      dialog.showMessageBox(win, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. Restart to install?',
        buttons: ['Restart', 'Later'],
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
    })

    autoUpdater.on('error', () => {})
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
