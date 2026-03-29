import { ElectronAPI } from '@electron-toolkit/preload'

interface OccupiedPort {
  port: number
  pid: number
  protocol: 'TCP' | 'UDP'
  address: string
  state?: string
}

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
  listPorts: () => Promise<OccupiedPort[]>
  closePort: (port: number) => Promise<{ ok: boolean; killedPids: number[]; message?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: TerminalApi
  }
}
