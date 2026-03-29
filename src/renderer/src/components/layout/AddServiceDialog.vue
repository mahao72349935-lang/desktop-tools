<script setup lang="ts">
import { ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { FolderOpened } from '@element-plus/icons-vue'
import type { NewTerminalServiceInput } from '../../types/terminal-service'

const visible = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  confirm: [payload: NewTerminalServiceInput]
}>()

const formRef = ref<FormInstance>()
const form = ref({ name: '', path: '', startupCommand: '', reportEnabled: false })

const rules: FormRules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  path: [{ required: true, message: '请输入目录或文件路径', trigger: 'blur' }]
}

watch(visible, (v) => {
  if (v) {
    form.value = { name: '', path: '', startupCommand: '', reportEnabled: false }
  }
})

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
  const payload: NewTerminalServiceInput = {
    name: form.value.name.trim(),
    path: normalizedPath,
    startupCommand: form.value.startupCommand.trim() || undefined,
    reportEnabled: form.value.reportEnabled
  }
  emit('confirm', payload)
  visible.value = false
}
</script>

<template>
  <el-dialog
    v-model="visible"
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
      <el-form-item label="启动命令">
        <el-input v-model="form.startupCommand" placeholder="例如：pnpm dev（可选）" clearable />
      </el-form-item>
      <el-form-item label="日报周报">
        <el-switch v-model="form.reportEnabled" active-text="开启" inactive-text="关闭" />
        <span class="form-hint">
          开启后可在终端工具栏使用「生成日报 / 生成周报」（默认 pnpm daily / pnpm weekly）
        </span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button native-type="button" @click="visible = false">取消</el-button>
      <el-button native-type="button" type="primary" @click="confirmAdd">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #8a8a8a;
  line-height: 1.4;
}

.path-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.path-row :deep(.el-input) {
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
