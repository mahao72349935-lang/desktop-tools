export interface OccupiedPort {
  port: number
  pid: number
  protocol: 'TCP' | 'UDP'
  address: string
  state?: string
}
