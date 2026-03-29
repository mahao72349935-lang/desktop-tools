import { ElectronAPI } from '@electron-toolkit/preload'

interface TerminalApi {
  create: (
    sessionId: string,
    cols: number,
    rows: number,
    cwd?: string,
    startupCommand?: string
  ) => Promise<string>
  destroy: (sessionId: string) => Promise<boolean>
  getStatus: (sessionId: string) => Promise<boolean>
  selectFolder: () => Promise<string>
  writeClipboardText: (text: string) => void
  readClipboardText: () => string
  onStatus: (callback: (payload: { sessionId: string; running: boolean }) => void) => () => void
  onData: (sessionId: string, callback: (data: string) => void) => () => void
  onExit: (sessionId: string, callback: (exitCode: number) => void) => () => void
  sendInput: (sessionId: string, data: string) => void
  resize: (sessionId: string, cols: number, rows: number) => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: TerminalApi
  }
}
