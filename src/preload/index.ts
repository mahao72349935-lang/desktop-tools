import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const terminalApi = {
  create: (cols: number, rows: number): Promise<void> =>
    ipcRenderer.invoke('terminal:create', cols, rows),

  onData: (callback: (data: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: string): void => callback(data)
    ipcRenderer.on('terminal:data', handler)
    return () => {
      ipcRenderer.removeListener('terminal:data', handler)
    }
  },

  onExit: (callback: (exitCode: number) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, exitCode: number): void =>
      callback(exitCode)
    ipcRenderer.on('terminal:exit', handler)
    return () => {
      ipcRenderer.removeListener('terminal:exit', handler)
    }
  },

  sendInput: (data: string): void => {
    ipcRenderer.send('terminal:input', data)
  },

  resize: (cols: number, rows: number): void => {
    ipcRenderer.send('terminal:resize', cols, rows)
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
