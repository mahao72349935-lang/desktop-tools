<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const props = defineProps<{
  sessionId: string
  cwd: string
  title: string
  active: boolean
  startupCommand?: string
}>()

/** VS Code 默认 Dark 主题终端色（见 vscode terminalColorRegistry ansiColorMap） */
const vscodeDarkTerminalTheme = {
  background: '#1e1e1e',
  foreground: '#cccccc',
  cursor: '#ffffff',
  selectionBackground: '#264f78',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5'
}

const terminalRef = ref<HTMLDivElement>()
const actualCwd = ref('')
let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let disposeData: (() => void) | null = null
let disposeExit: (() => void) | null = null
let resizeObserver: ResizeObserver | null = null

function focusTerminal(): void {
  terminal?.focus()
}

onMounted(async () => {
  if (!terminalRef.value) return

  terminal = new Terminal({
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    theme: vscodeDarkTerminalTheme
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.open(terminalRef.value)

  terminal.attachCustomKeyEventHandler((e) => {
    if (e.type !== 'keydown' || !terminal) return true
    const ctrlOrCmd = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()
    const noAlt = !e.altKey

    if (ctrlOrCmd && noAlt && key === 'c') {
      const selected = terminal.getSelection()
      const text = selected || window.getSelection()?.toString() || ''
      if (text) {
        try {
          void navigator.clipboard.writeText(text).catch(() => window.api.writeClipboardText(text))
        } catch {
          window.api.writeClipboardText(text)
        }
        if (terminal.hasSelection()) terminal.clearSelection()
        return false
      }
    }

    if (ctrlOrCmd && noAlt && key === 'v') {
      const pasted = window.api.readClipboardText()
      if (pasted) {
        window.api.sendInput(props.sessionId, pasted)
        return false
      }
    }

    return true
  })

  disposeData = window.api.onData(props.sessionId, (data) => {
    terminal?.write(data)
  })

  disposeExit = window.api.onExit(props.sessionId, () => {
    terminal?.write('\r\n[进程已退出]')
  })

  terminal.onData((data) => {
    window.api.sendInput(props.sessionId, data)
  })

  terminal.onResize(({ cols, rows }) => {
    window.api.resize(props.sessionId, cols, rows)
  })

  resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit()
  })
  resizeObserver.observe(terminalRef.value)

  await new Promise((r) => setTimeout(r, 50))
  fitAddon.fit()
  actualCwd.value = await window.api.create(
    props.sessionId,
    terminal.cols,
    terminal.rows,
    props.cwd,
    props.startupCommand
  )
  if (props.active) {
    terminal.focus()
  }
})

watch(
  () => props.active,
  async (active) => {
    if (!active || !terminal || !fitAddon) return
    await nextTick()
    fitAddon.fit()
    terminal.focus()
    window.api.resize(props.sessionId, terminal.cols, terminal.rows)
  }
)

onUnmounted(() => {
  disposeData?.()
  disposeExit?.()
  resizeObserver?.disconnect()
  terminal?.dispose()
})
</script>

<template>
  <div class="terminal-container" @mousedown="focusTerminal">
    <div class="terminal-header">
      <div class="terminal-tab">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path
            d="M6 9l3-3-3-3-.7.7L7.6 6 5.3 8.3zm4 .5H7v1h3z"
            transform="translate(0, 1.5) scale(1.2)"
          />
        </svg>
        <span class="tab-title">{{ title }}</span>
        <span class="tab-cwd" :title="actualCwd || cwd">{{ actualCwd || cwd }}</span>
      </div>
    </div>
    <div ref="terminalRef" class="terminal-body"></div>
  </div>
</template>

<style scoped>
.terminal-container {
  width: 100%;
  height: 100%;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  overflow: hidden;
  background: #1e1e1e;
}

.terminal-header {
  display: flex;
  align-items: center;
  padding: 0 8px;
  height: 36px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  flex-shrink: 0;
}

.terminal-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #cccccc;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  padding: 4px 8px;
  border-radius: 4px;
  background: #1e1e1e;
  min-width: 0;
  flex: 1;
}

.tab-title {
  font-weight: 600;
  flex-shrink: 0;
}

.tab-cwd {
  font-size: 11px;
  color: #8a8a8a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.terminal-body {
  flex: 1;
  min-height: 0;
  padding: 4px;
  overflow: hidden;
}

.terminal-body :deep(.xterm) {
  height: 100%;
  width: 100%;
}

.terminal-body :deep(.xterm-viewport) {
  overflow-y: auto !important;
}

.terminal-body :deep(.xterm-screen) {
  height: 100% !important;
  padding-bottom: 10px;
}
</style>
