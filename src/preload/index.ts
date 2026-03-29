import { contextBridge, ipcRenderer, clipboard } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const terminalApi = {
  create: (
    sessionId: string,
    cols: number,
    rows: number,
    cwd?: string,
    startupCommand?: string
  ): Promise<string> =>
    ipcRenderer.invoke('terminal:create', sessionId, cols, rows, cwd, startupCommand),

  destroy: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('terminal:destroy', sessionId),

  getStatus: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('terminal:get-status', sessionId),

  selectFolder: (): Promise<string> => ipcRenderer.invoke('dialog:selectFolder'),

  writeClipboardText: (text: string): void => {
    clipboard.writeText(text)
  },

  readClipboardText: (): string => clipboard.readText(),

  onData: (sessionId: string, callback: (data: string) => void): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { sessionId: string; data: string }
    ): void => {
      if (payload.sessionId === sessionId) callback(payload.data)
    }
    ipcRenderer.on('terminal:data', handler)
    return () => {
      ipcRenderer.removeListener('terminal:data', handler)
    }
  },

  onExit: (sessionId: string, callback: (exitCode: number) => void): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { sessionId: string; exitCode: number }
    ): void => {
      if (payload.sessionId === sessionId) callback(payload.exitCode)
    }
    ipcRenderer.on('terminal:exit', handler)
    return () => {
      ipcRenderer.removeListener('terminal:exit', handler)
    }
  },

  onStatus: (
    callback: (payload: { sessionId: string; running: boolean }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { sessionId: string; running: boolean }
    ): void => callback(payload)
    ipcRenderer.on('terminal:status', handler)
    return () => {
      ipcRenderer.removeListener('terminal:status', handler)
    }
  },

  sendInput: (sessionId: string, data: string): void => {
    ipcRenderer.send('terminal:input', sessionId, data)
  },

  resize: (sessionId: string, cols: number, rows: number): void => {
    ipcRenderer.send('terminal:resize', sessionId, cols, rows)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', terminalApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = terminalApi
}
