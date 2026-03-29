import { ElectronAPI } from '@electron-toolkit/preload'

interface TerminalApi {
  create: (cols: number, rows: number) => Promise<void>
  onData: (callback: (data: string) => void) => () => void
  onExit: (callback: (exitCode: number) => void) => () => void
  sendInput: (data: string) => void
  resize: (cols: number, rows: number) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: TerminalApi
  }
}
