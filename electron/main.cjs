const { app, BrowserWindow, Menu } = require('electron')
const path = require('path')

function createWindow() {
  // Remove the default menu bar in production (packaged app)
  if (app.isPackaged) {
    Menu.setApplicationMenu(null)
  }
  
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../build-resources/icon.png'),
  })

  // Load the built Vite app
  win.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
