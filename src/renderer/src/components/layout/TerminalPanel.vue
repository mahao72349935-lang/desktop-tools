<script setup lang="ts">
import Terminal from '../Terminal.vue'
import type { TerminalService } from '../../types/terminal-service'

defineProps<{
  selectedService: TerminalService | null
  selectedRunning: boolean
  terminalRenderKey: number
}>()

const emit = defineEmits<{
  restart: []
  stop: []
  'report-daily': []
  'report-weekly': []
}>()
</script>

<template>
  <div class="terminal-wrap">
    <div v-if="!selectedService" class="terminal-placeholder">
      <p>请选择一个服务卡片以打开终端</p>
      <p class="hint">终端会在该服务的目录下启动（路径为文件时会使用其所在文件夹）</p>
    </div>
    <div v-else class="terminal-stack">
      <div class="terminal-toolbar">
        <span class="toolbar-status">
          <span class="status-dot" :class="selectedRunning ? 'is-running' : 'is-stopped'" />
          {{ selectedRunning ? '运行中' : '已停止' }}
        </span>
        <div class="toolbar-actions">
          <template v-if="selectedService.reportEnabled">
            <el-button size="small" @click="emit('report-daily')">生成日报</el-button>
            <el-button size="small" @click="emit('report-weekly')">生成周报</el-button>
          </template>
          <el-button size="small" @click="emit('restart')">重启</el-button>
          <el-button size="small" type="danger" plain @click="emit('stop')">停止</el-button>
        </div>
      </div>
      <Terminal
        :key="`${selectedService.id}-${terminalRenderKey}`"
        :session-id="selectedService.id"
        :cwd="selectedService.path"
        :title="selectedService.name"
        :startup-command="selectedService.startupCommand"
        :active="true"
      />
    </div>
  </div>
</template>

<style scoped>
.terminal-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.terminal-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.terminal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 6px 8px;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  background: #252526;
}

.toolbar-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #c8c8c8;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #6e7681;
}

.status-dot.is-running {
  background: #3fb950;
  box-shadow: 0 0 0 1px rgba(63, 185, 80, 0.35);
}

.status-dot.is-stopped {
  background: #6e7681;
}

.toolbar-actions {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.terminal-placeholder {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #8a8a8a;
  font-size: 14px;
  text-align: center;
  padding: 24px;
}

.terminal-placeholder .hint {
  font-size: 12px;
  color: #6e7681;
}
</style>
