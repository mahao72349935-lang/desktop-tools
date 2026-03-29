<script setup lang="ts">
import { ref } from 'vue'
import { Coin, Monitor, CircleCheck, Setting } from '@element-plus/icons-vue'
import Terminal from './Terminal.vue'

const activeMenu = ref('services')
</script>

<template>
  <el-container class="layout-root">
    <el-aside width="240px" class="layout-aside">
      <div class="aside-brand">
        <div class="brand-title">开发工作台</div>
        <div class="brand-sub">本地服务管理</div>
      </div>
      <el-menu :default-active="activeMenu" class="aside-menu" background-color="transparent" text-color="#b8b8b8"
        active-text-color="#409eff">
        <el-menu-item index="services" class="aside-menu-item">
          <el-icon>
            <Coin />
          </el-icon>
          <span>服务管理</span>
        </el-menu-item>
        <el-menu-item index="monitor" class="aside-menu-item">
          <el-icon>
            <Monitor />
          </el-icon>
          <span>系统监控</span>
        </el-menu-item>
        <el-menu-item index="todo" class="aside-menu-item">
          <el-icon>
            <CircleCheck />
          </el-icon>
          <span>待完成事项</span>
        </el-menu-item>
        <el-menu-item index="settings" class="aside-menu-item">
          <el-icon>
            <Setting />
          </el-icon>
          <span>设置</span>
        </el-menu-item>
      </el-menu>
      <div class="aside-footer">
        <el-button type="primary" class="add-service-btn" round>+ 添加服务</el-button>
      </div>
    </el-aside>

    <el-container direction="vertical" class="layout-right">
      <el-header class="layout-header">
        <div class="header-title">服务管理</div>
        <div class="header-status">
          <span class="status-item">
            <span class="dot dot-green" />
            运行中: 2
          </span>
          <span class="status-item">
            <span class="dot dot-gray" />
            已停止: 1
          </span>
        </div>
      </el-header>
      <el-main class="layout-main">
        <Terminal />
      </el-main>
    </el-container>
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
  padding: 0 12px;
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
  gap: 20px;
  font-size: 13px;
  color: #b0b0b0;
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

.layout-main {
  padding: 8px 12px 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  background: #1e1e1e;
}
</style>
