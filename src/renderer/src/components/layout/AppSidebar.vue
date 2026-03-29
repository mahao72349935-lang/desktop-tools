<script setup lang="ts">
import { Coin, Monitor, CircleCheck, Setting } from '@element-plus/icons-vue'

withDefaults(
  defineProps<{
    activeMenu?: string
  }>(),
  { activeMenu: 'services' }
)

const emit = defineEmits<{
  select: [menu: string]
}>()
</script>

<template>
  <el-aside width="240px" class="layout-aside">
    <el-menu
      :default-active="activeMenu"
      class="aside-menu"
      background-color="transparent"
      text-color="#b8b8b8"
      active-text-color="#409eff"
      @select="(index) => emit('select', String(index))"
    >
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
        <span>端口列表</span>
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
  </el-aside>
</template>

<style scoped>
.layout-aside {
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  border-right: 1px solid #3c3c3c;
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
</style>
