export interface TerminalService {
  id: string
  name: string
  path: string
  startupCommand?: string
  /** 开启后在终端工具栏显示「生成日报 / 生成周报」 */
  reportEnabled?: boolean
}

/** 添加服务弹框提交的数据（不含 id，由主布局生成） */
export type NewTerminalServiceInput = Omit<TerminalService, 'id'>
