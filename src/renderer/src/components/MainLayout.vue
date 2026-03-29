<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { Coin, Monitor, CircleCheck, Setting, FolderOpened } from '@element-plus/icons-vue'
import Terminal from './Terminal.vue'

export interface TerminalService {
  id: string
  name: string
  path: string
}

const STORAGE_KEY = 'desktop-tools-terminal-services'

const activeMenu = ref('services')
const services = ref<TerminalService[]>([])
const selectedId = ref<string | null>(null)

const dialogVisible = ref(false)
const formRef = ref<FormInstance>()
const form = ref({ name: '', path: '' })

const rules: FormRules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  path: [{ required: true, message: '请输入目录或文件路径', trigger: 'blur' }]
}

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
          s && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.path === 'string'
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
})

watch(
  services,
  () => {
    saveServices()
  },
  { deep: true }
)

const runningCount = computed(() => (selectedService.value ? 1 : 0))
const stoppedCount = computed(() => Math.max(0, services.value.length - runningCount.value))

function openAddDialog(): void {
  form.value = { name: '', path: '' }
  dialogVisible.value = true
}

async function pickFolder(): Promise<void> {
  try {
    const p = await window.api.selectFolder()
    if (p) form.value.path = p
  } catch (err) {
    console.error(err)
    ElMessage.error('无法打开文件夹选择框')
  }
}

async function confirmAdd(): Promise<void> {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  const normalizedPath = form.value.path
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .replace(/^'(.*)'$/, '$1')
  const id = crypto.randomUUID()
  const item: TerminalService = {
    id,
    name: form.value.name.trim(),
    path: normalizedPath
  }
  services.value = [...services.value, item]
  selectedId.value = id
  dialogVisible.value = false
}

function selectService(id: string): void {
  selectedId.value = id
}

function removeService(id: string, e: Event): void {
  e.stopPropagation()
  services.value = services.value.filter((s) => s.id !== id)
  if (selectedId.value === id) {
    selectedId.value = services.value[0]?.id ?? null
  }
}
</script>

<template>
  <el-container class="layout-root">
    <el-aside width="240px" class="layout-aside">
      <div class="aside-brand">
        <div class="brand-title">开发工作台</div>
        <div class="brand-sub">本地服务管理</div>
      </div>
      <el-divider class="aside-divider" />
      <el-menu
        :default-active="activeMenu"
        class="aside-menu"
        background-color="transparent"
        text-color="#b8b8b8"
        active-text-color="#409eff"
      >
        <el-menu-item index="services" class="aside-menu-item">
          <el-icon><Coin /></el-icon>
          <span>服务管理</span>
        </el-menu-item>
        <el-menu-item index="monitor" class="aside-menu-item">
          <el-icon><Monitor /></el-icon>
          <span>系统监控</span>
        </el-menu-item>
        <el-menu-item index="todo" class="aside-menu-item">
          <el-icon><CircleCheck /></el-icon>
          <span>待完成事项</span>
        </el-menu-item>
        <el-menu-item index="settings" class="aside-menu-item">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </el-menu-item>
      </el-menu>
      <div class="aside-footer">
        <el-button type="primary" class="add-service-btn" round @click="openAddDialog">
          + 添加服务
        </el-button>
      </div>
    </el-aside>

    <el-container direction="vertical" class="layout-right">
      <el-header class="layout-header">
        <div class="header-title">服务管理</div>
        <div class="header-status">
          <span class="status-item">
            <span class="dot dot-green" />
            运行中: {{ runningCount }}
          </span>
          <span class="status-item">
            <span class="dot dot-gray" />
            已停止: {{ stoppedCount }}
          </span>
          <span v-if="services.length" class="status-meta">已配置 {{ services.length }} 个</span>
        </div>
      </el-header>

      <el-main class="layout-main">
        <section class="cards-strip">
          <div v-if="!services.length" class="cards-empty">暂无服务，点击左侧「添加服务」创建</div>
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
                  <span class="card-name">{{ s.name }}</span>
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
            </el-card>
          </div>
        </section>

        <div class="terminal-wrap">
          <div v-if="!selectedService" class="terminal-placeholder">
            <p>请选择一个服务卡片以打开终端</p>
            <p class="hint">终端会在该服务的目录下启动（路径为文件时会使用其所在文件夹）</p>
          </div>
          <Terminal
            v-else
            :key="selectedService.id"
            :cwd="selectedService.path"
            :title="selectedService.name"
          />
        </div>
      </el-main>
    </el-container>

    <el-dialog
      v-model="dialogVisible"
      title="添加服务"
      width="480px"
      class="add-dialog"
      append-to-body
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px" @submit.prevent>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：前端 dev server" clearable />
        </el-form-item>
        <el-form-item label="路径" prop="path">
          <div class="path-row">
            <el-input v-model="form.path" placeholder="项目目录，或任意文件路径" clearable />
            <el-button
              type="primary"
              plain
              native-type="button"
              :icon="FolderOpened"
              @click.prevent.stop="pickFolder"
            >
              浏览
            </el-button>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button native-type="button" @click="dialogVisible = false">取消</el-button>
        <el-button native-type="button" type="primary" @click="confirmAdd">确定</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<style scoped>
.layout-root {
  width: 100%;
  height: 100%;
}

.layout-aside {
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  border-right: 1px solid #3c3c3c;
}

.aside-brand {
  padding: 20px 16px 12px;
  flex-shrink: 0;
}

.brand-title {
  font-size: 18px;
  font-weight: 700;
  color: #409eff;
  letter-spacing: 0.02em;
}

.brand-sub {
  margin-top: 6px;
  font-size: 12px;
  color: #8a8a8a;
}

.aside-divider {
  margin: 0 12px;
  border-color: #3c3c3c;
}

.aside-menu {
  flex: 1;
  min-height: 0;
  border-right: none;
  padding: 8px 0;
}

.aside-menu :deep(.el-menu-item) {
  margin: 4px 10px;
  border-radius: 6px;
  height: 44px;
}

.aside-menu :deep(.el-menu-item.is-active) {
  background: rgba(64, 158, 255, 0.12) !important;
  border: 1px solid rgba(64, 158, 255, 0.45);
  color: #409eff !important;
}

.aside-menu :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.06);
}

.aside-footer {
  padding: 12px 14px 16px;
  flex-shrink: 0;
}

.add-service-btn {
  width: 100%;
  font-weight: 500;
}

.layout-right {
  min-width: 0;
  background: #1e1e1e;
}

.layout-header {
  height: auto !important;
  min-height: unset !important;
  padding: 16px 20px 14px;
  border-bottom: 1px solid #3c3c3c;
  background: #252526;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 10px;
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

.layout-main {
  padding: 10px 12px 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  background: #1e1e1e;
}

.terminal-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.path-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.path-row .el-input {
  flex: 1;
  min-width: 0;
}
</style>

<style>
.add-dialog .el-dialog {
  background: #252526;
  border: 1px solid #3c3c3c;
}

.add-dialog .el-dialog__title {
  color: #e0e0e0;
}
</style>
