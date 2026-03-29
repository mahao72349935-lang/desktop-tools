import { app, shell, BrowserWindow, ipcMain, dialog, type OpenDialogOptions } from 'electron'
import path, { dirname, join } from 'path'
import os from 'os'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as pty from 'node-pty'

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message)
})

let ptyProcess: pty.IPty | null = null

function pathExists(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

/** 解析终端工作目录；失败时回退到用户主目录（此前静默失败会导致始终落在 C:\\Users\\xxx） */
function resolveTerminalCwd(requested?: string): string {
  const home = os.homedir()
  if (!requested?.trim()) return home

  let raw = requested.trim().replace(/\uFF3C/g, '\\')
  if (process.platform === 'win32') {
    raw = raw.replace(/\//g, '\\')
  }

  let candidate: string
  if (process.platform === 'win32') {
    candidate = path.win32.isAbsolute(raw)
      ? path.win32.normalize(path.win32.resolve(raw))
      : path.win32.resolve(home, raw)
  } else {
    candidate = path.isAbsolute(raw) ? path.normalize(raw) : path.resolve(home, raw)
  }

  const tryPaths: string[] = [candidate]
  if (process.platform === 'win32') {
    tryPaths.push('\\\\?\\' + candidate)
  }

  let statPath: string | null = null
  for (const p of tryPaths) {
    if (pathExists(p)) {
      statPath = p
      break
    }
  }

  if (!statPath) {
    console.error('[terminal] cwd 不存在，已回退主目录。请求:', requested, '解析:', candidate)
    return home
  }

  try {
    const stat = fs.statSync(statPath)
    let dir = stat.isFile() ? dirname(statPath) : statPath
    if (dir.startsWith('\\\\?\\')) {
      dir = dir.slice(4)
    }
    try {
      return fs.realpathSync(dir)
    } catch {
      return dir
    }
  } catch (e) {
    console.error('[terminal] 无法读取路径，已回退主目录:', statPath, e)
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
  ipcMain.handle('dialog:selectFolder', async () => {
    const opts: OpenDialogOptions = {
      defaultPath: os.homedir(),
      properties: ['openDirectory', 'createDirectory']
    }
    const { canceled, filePaths } = await dialog.showOpenDialog(opts)
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

    const workdir = resolveTerminalCwd(cwd)
    const shellPath = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'
    const shellArgs =
      process.platform === 'win32'
        ? [
            '-NoLogo',
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-NoExit',
            '-Command',
            `Set-Location -LiteralPath '${workdir.replace(/'/g, "''")}'`
          ]
        : []

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
      return ''
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

    return workdir
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
