<script setup lang="ts">
import type { OccupiedPort } from '../../types/system-port'

defineProps<{
  ports: OccupiedPort[]
  loading: boolean
}>()

const emit = defineEmits<{
  refresh: []
  close: [port: number]
}>()
</script>

<template>
  <section class="port-panel">
    <div class="port-toolbar">
      <div class="port-title">系统端口列表</div>
      <el-button :loading="loading" @click="emit('refresh')">刷新</el-button>
    </div>

    <div v-if="loading" class="port-empty">正在读取端口占用...</div>
    <div v-else-if="!ports.length" class="port-empty">当前没有检测到占用端口</div>
    <div v-else class="port-cards">
      <el-card
        v-for="item in ports"
        :key="`${item.protocol}-${item.port}-${item.pid}`"
        class="port-card"
      >
        <div class="port-card-head">
          <div>
            <div class="port-number">:{{ item.port }}</div>
            <div class="port-meta">{{ item.protocol }} · PID {{ item.pid }}</div>
          </div>
          <el-button type="danger" plain size="small" @click="emit('close', item.port)"
            >关闭</el-button
          >
        </div>
        <div class="port-address">{{ item.address }}</div>
        <div v-if="item.state" class="port-state">状态: {{ item.state }}</div>
      </el-card>
    </div>
  </section>
</template>

<style scoped>
.port-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.port-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.port-title {
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 600;
}

.port-empty {
  color: #8a8a8a;
  font-size: 13px;
  padding: 8px 4px;
}

.port-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 10px;
  overflow: auto;
}

.port-card {
  background: #252526 !important;
  border: 1px solid #3c3c3c !important;
}

.port-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.port-number {
  color: #e6edf3;
  font-weight: 600;
}

.port-meta {
  margin-top: 2px;
  color: #8a8a8a;
  font-size: 12px;
}

.port-address,
.port-state {
  margin-top: 8px;
  color: #9da7b3;
  font-size: 12px;
  word-break: break-all;
}
</style>
