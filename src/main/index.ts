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

interface TerminalSession {
  process: pty.IPty
  cwd: string
  senderId: number
}

const terminalSessions = new Map<string, TerminalSession>()

function sendSessionStatus(
  webContents: Electron.WebContents,
  sessionId: string,
  running: boolean
): void {
  if (!webContents.isDestroyed()) {
    webContents.send('terminal:status', { sessionId, running })
  }
}

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
    for (const [sessionId, session] of terminalSessions.entries()) {
      try {
        session.process.kill()
      } catch {
        /* ignore */
      }
      terminalSessions.delete(sessionId)
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

  ipcMain.handle(
    'terminal:create',
    (
      event,
      sessionId: string,
      cols: number,
      rows: number,
      cwd?: string,
      startupCommand?: string
    ) => {
      if (!sessionId) return ''

      const existing = terminalSessions.get(sessionId)
      if (existing) {
        try {
          existing.process.resize(cols || 80, rows || 24)
        } catch {
          /* ignore */
        }
        sendSessionStatus(event.sender, sessionId, true)
        return existing.cwd
      }

      const workdir = resolveTerminalCwd(cwd)
      const shellPath =
        process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || 'bash'
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

      let ptyProcess: pty.IPty
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

      terminalSessions.set(sessionId, {
        process: ptyProcess,
        cwd: workdir,
        senderId: webContents.id
      })
      sendSessionStatus(webContents, sessionId, true)

      ptyProcess.onData((data) => {
        if (!webContents.isDestroyed()) {
          webContents.send('terminal:data', { sessionId, data })
        }
      })

      ptyProcess.onExit(({ exitCode }) => {
        if (!webContents.isDestroyed()) {
          webContents.send('terminal:exit', { sessionId, exitCode })
        }
        terminalSessions.delete(sessionId)
        sendSessionStatus(webContents, sessionId, false)
      })

      if (startupCommand?.trim()) {
        ptyProcess.write(startupCommand.trim() + '\r')
      }

      return workdir
    }
  )

  ipcMain.handle('terminal:get-status', (_event, sessionId: string) => {
    return terminalSessions.has(sessionId)
  })

  ipcMain.on('terminal:input', (_event, sessionId: string, data: string) => {
    terminalSessions.get(sessionId)?.process.write(data)
  })

  ipcMain.on('terminal:resize', (_event, sessionId: string, cols: number, rows: number) => {
    try {
      terminalSessions.get(sessionId)?.process.resize(cols, rows)
    } catch {
      /* ignore resize errors */
    }
  })

  ipcMain.handle('terminal:destroy', (_event, sessionId: string) => {
    const session = terminalSessions.get(sessionId)
    if (!session) return false
    try {
      session.process.kill()
    } catch {
      /* ignore */
    }
    terminalSessions.delete(sessionId)
    const target = BrowserWindow.getAllWindows().find((w) => w.webContents.id === session.senderId)
    if (target && !target.webContents.isDestroyed()) {
      sendSessionStatus(target.webContents, sessionId, false)
    }
    return true
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
  for (const [sessionId, session] of terminalSessions.entries()) {
    try {
      session.process.kill()
    } catch {
      /* ignore */
    }
    terminalSessions.delete(sessionId)
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
