<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import AppSidebar from './layout/AppSidebar.vue'
import ServiceManageHeader from './layout/ServiceManageHeader.vue'
import TerminalPanel from './layout/TerminalPanel.vue'
import type { NewTerminalServiceInput, TerminalService } from '../types/terminal-service'

export type { NewTerminalServiceInput, TerminalService }

const STORAGE_KEY = 'desktop-tools-terminal-services'

const activeMenu = ref('services')
const services = ref<TerminalService[]>([])
const selectedId = ref<string | null>(null)
const statusMap = ref<Record<string, boolean>>({})
const terminalRenderKey = ref(0)

const selectedService = computed(
  () => services.value.find((s) => s.id === selectedId.value) ?? null
)

function loadServices(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as TerminalService[]
    if (Array.isArray(parsed)) {
      services.value = parsed.filter(
        (s) =>
          s &&
          typeof s.id === 'string' &&
          typeof s.name === 'string' &&
          typeof s.path === 'string' &&
          (s.startupCommand === undefined || typeof s.startupCommand === 'string') &&
          (s.reportEnabled === undefined || typeof s.reportEnabled === 'boolean')
      )
    }
  } catch {
    /* ignore */
  }
}

function saveServices(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(services.value))
}

onMounted(() => {
  loadServices()
  for (const s of services.value) {
    statusMap.value[s.id] = false
  }
  if (services.value.length && !selectedId.value) {
    selectedId.value = services.value[0].id
  }
  void Promise.all(
    services.value.map(async (s) => {
      statusMap.value[s.id] = await window.api.getStatus(s.id)
    })
  )
  window.api.onStatus(({ sessionId, running }) => {
    statusMap.value = { ...statusMap.value, [sessionId]: running }
  })
})

watch(
  services,
  () => {
    saveServices()
  },
  { deep: true }
)

const runningCount = computed(
  () => services.value.filter((s) => Boolean(statusMap.value[s.id])).length
)
const stoppedCount = computed(() => Math.max(0, services.value.length - runningCount.value))
const selectedRunning = computed(() =>
  Boolean(selectedService.value && statusMap.value[selectedService.value.id])
)

function serviceRunning(id: string): boolean {
  return Boolean(statusMap.value[id])
}

function handleAddService(payload: NewTerminalServiceInput): void {
  const id = crypto.randomUUID()
  const item: TerminalService = { id, ...payload }
  services.value = [...services.value, item]
  statusMap.value = { ...statusMap.value, [id]: false }
  selectedId.value = id
}

function selectService(id: string): void {
  selectedId.value = id
}

function removeService(id: string, e: Event): void {
  e.stopPropagation()
  void window.api.destroy(id)
  services.value = services.value.filter((s) => s.id !== id)
  const nextStatus = { ...statusMap.value }
  delete nextStatus[id]
  statusMap.value = nextStatus
  if (selectedId.value === id) {
    selectedId.value = services.value[0]?.id ?? null
  }
}

function stopSelected(): void {
  if (!selectedId.value) return
  void window.api.destroy(selectedId.value)
}

function restartSelected(): void {
  if (!selectedId.value) return
  void window.api.destroy(selectedId.value)
  terminalRenderKey.value += 1
}

const CTRL_C = '\x03'

function runReportCommand(kind: 'daily' | 'weekly'): void {
  if (!selectedService.value) return
  if (!selectedRunning.value) {
    ElMessage.warning('请先启动终端（会话未运行）')
    return
  }
  const id = selectedService.value.id
  const line = kind === 'daily' ? 'pnpm daily\r' : 'pnpm weekly\r'
  window.api.sendInput(id, CTRL_C)
  window.setTimeout(() => {
    window.api.sendInput(id, line)
  }, 120)
}
</script>

<template>
  <el-container class="layout-root">
    <AppSidebar :active-menu="activeMenu" />

    <el-container direction="vertical" class="layout-right">
      <ServiceManageHeader
        :running-count="runningCount"
        :stopped-count="stoppedCount"
        :service-total="services.length"
        @add-service="handleAddService"
      />

      <el-main class="layout-main">
        <section class="cards-strip">
          <div v-if="!services.length" class="cards-empty">
            暂无服务，点击右上角「添加服务」创建
          </div>
          <div v-else class="cards-scroll">
            <el-card
              v-for="s in services"
              :key="s.id"
              class="service-card"
              :class="{ 'is-active': s.id === selectedId }"
              shadow="hover"
              @click="selectService(s.id)"
            >
              <template #header>
                <div class="card-head">
                  <div class="card-name-wrap">
                    <span
                      class="card-service-dot"
                      :class="serviceRunning(s.id) ? 'is-running' : 'is-stopped'"
                    />
                    <span class="card-name">{{ s.name }}</span>
                  </div>
                  <el-button
                    type="danger"
                    link
                    size="small"
                    class="card-remove"
                    @click="removeService(s.id, $event)"
                  >
                    删除
                  </el-button>
                </div>
              </template>
              <div class="card-path" :title="s.path">{{ s.path }}</div>
              <div class="card-command">{{ s.startupCommand || '无预设启动命令' }}</div>
            </el-card>
          </div>
        </section>

        <TerminalPanel
          :selected-service="selectedService"
          :selected-running="selectedRunning"
          :terminal-render-key="terminalRenderKey"
          @restart="restartSelected"
          @stop="stopSelected"
          @report-daily="runReportCommand('daily')"
          @report-weekly="runReportCommand('weekly')"
        />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-root {
  width: 100%;
  height: 100%;
}

.layout-right {
  min-width: 0;
  background: #1e1e1e;
}

.cards-strip {
  flex-shrink: 0;
  padding: 0 0 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid #3c3c3c;
  background: transparent;
  max-height: 160px;
}

.cards-empty {
  font-size: 13px;
  color: #8a8a8a;
  padding: 8px 4px 14px;
}

.cards-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 12px;
  scrollbar-width: thin;
}

.service-card {
  flex: 0 0 220px;
  cursor: pointer;
  background: #252526 !important;
  border: 1px solid #3c3c3c !important;
  --el-card-padding: 12px;
}

.service-card :deep(.el-card__header) {
  padding: 10px 12px;
  border-bottom-color: #3c3c3c;
}

.service-card.is-active {
  border-color: #409eff !important;
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.35);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.card-name-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.card-service-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: #6e7681;
}

.card-service-dot.is-running {
  background: #3fb950;
  box-shadow: 0 0 0 1px rgba(63, 185, 80, 0.35);
}

.card-service-dot.is-stopped {
  background: #6e7681;
}

.card-name {
  font-weight: 600;
  color: #e0e0e0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-remove {
  flex-shrink: 0;
}

.card-path {
  font-size: 12px;
  color: #8a8a8a;
  line-height: 1.4;
  word-break: break-all;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-command {
  margin-top: 8px;
  font-size: 11px;
  color: #7f8c9f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.layout-main {
  padding: 10px 12px 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  background: #1e1e1e;
}
</style>
