<script setup lang="ts">
import { ref } from 'vue'
import AddServiceDialog from './AddServiceDialog.vue'
import type { NewTerminalServiceInput } from '../../types/terminal-service'

defineProps<{
  runningCount: number
  stoppedCount: number
  serviceTotal: number
}>()

const emit = defineEmits<{
  addService: [payload: NewTerminalServiceInput]
}>()

const dialogVisible = ref(false)

function onConfirm(payload: NewTerminalServiceInput): void {
  emit('addService', payload)
}
</script>

<template>
  <el-header class="layout-header">
    <div class="header-top">
      <div class="header-title">服务管理</div>
      <el-button type="primary" round @click="dialogVisible = true">+ 添加服务</el-button>
    </div>
    <div class="header-status">
      <span class="status-item">
        <span class="dot dot-green" />
        运行中: {{ runningCount }}
      </span>
      <span class="status-item">
        <span class="dot dot-gray" />
        已停止: {{ stoppedCount }}
      </span>
      <span v-if="serviceTotal" class="status-meta">已配置 {{ serviceTotal }} 个</span>
    </div>

    <AddServiceDialog v-model="dialogVisible" @confirm="onConfirm" />
  </el-header>
</template>

<style scoped>
.layout-header {
  height: auto !important;
  min-height: unset !important;
  padding: 16px 20px 14px;
  border-bottom: 1px solid #3c3c3c;
  background: #252526;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  gap: 10px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.header-title {
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
}

.header-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px 20px;
  font-size: 13px;
  color: #b0b0b0;
}

.status-meta {
  color: #8a8a8a;
  font-size: 12px;
}

.status-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-green {
  background: #3fb950;
  box-shadow: 0 0 0 1px rgba(63, 185, 80, 0.35);
}

.dot-gray {
  background: #6e7681;
}
</style>
