import { app, shell, BrowserWindow, ipcMain, dialog, type OpenDialogOptions } from 'electron'
import { dirname, join, resolve } from 'path'
import os from 'os'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as pty from 'node-pty'

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message)
})

let ptyProcess: pty.IPty | null = null

function resolveTerminalCwd(requested?: string): string {
  const home = os.homedir()
  if (!requested?.trim()) return home
  let target = resolve(requested.trim())
  try {
    if (!fs.existsSync(target)) return home
    const stat = fs.statSync(target)
    if (stat.isFile()) target = dirname(target)
    else if (!stat.isDirectory()) return home
    return fs.realpathSync(target)
  } catch {
    return home
  }
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    if (ptyProcess) {
      ptyProcess.kill()
      ptyProcess = null
    }
  })
}

function setupTerminalIpc(): void {
  ipcMain.handle('dialog:selectFolder', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const opts: OpenDialogOptions = {
      properties: ['openDirectory', 'createDirectory']
    }
    const { canceled, filePaths } = win
      ? await dialog.showOpenDialog(win, opts)
      : await dialog.showOpenDialog(opts)
    if (canceled || filePaths.length === 0) return ''
    return filePaths[0]
  })

  ipcMain.handle('terminal:create', (event, cols: number, rows: number, cwd?: string) => {
    if (ptyProcess) {
      try {
        ptyProcess.kill()
      } catch {
        /* ignore */
      }
      ptyProcess = null
    }

    const shellPath =
      process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'

    const shellArgs =
      process.platform === 'win32' ? ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass'] : []

    const workdir = resolveTerminalCwd(cwd)

    const termEnv: Record<string, string> = {
      ...(process.env as Record<string, string>),
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      ...(process.platform === 'win32'
        ? {
            POWERSHELL_UPDATECHECK: 'Off',
            POWERSHELL_TELEMETRY_OPTOUT: '1'
          }
        : {})
    }

    try {
      ptyProcess = pty.spawn(shellPath, shellArgs, {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: workdir,
        env: termEnv
      })
    } catch (err) {
      console.error('Failed to spawn pty:', err)
      return
    }

    const webContents = event.sender

    ptyProcess.onData((data) => {
      if (!webContents.isDestroyed()) {
        webContents.send('terminal:data', data)
      }
    })

    ptyProcess.onExit(({ exitCode }) => {
      if (!webContents.isDestroyed()) {
        webContents.send('terminal:exit', exitCode)
      }
      ptyProcess = null
    })
  })

  ipcMain.on('terminal:input', (_event, data: string) => {
    ptyProcess?.write(data)
  })

  ipcMain.on('terminal:resize', (_event, cols: number, rows: number) => {
    try {
      ptyProcess?.resize(cols, rows)
    } catch {
      /* ignore resize errors */
    }
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupTerminalIpc()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (ptyProcess) {
    try {
      ptyProcess.kill()
    } catch {
      /* ignore */
    }
    ptyProcess = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
