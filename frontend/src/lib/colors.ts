type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'

export const statusColors: Record<string, BadgeVariant> = {
  RECEIVED: 'secondary',
  PENDING: 'warning',
  FABRICATING: 'info',
  COMPLETE: 'success',
  FAILED: 'destructive',
  CANCELLED: 'default',
}

export const jobTypeColors: Record<string, BadgeVariant> = {
  '3D Printing': 'info',
  'Laser Cut': 'warning',
  CNC: 'destructive',
  'Vinyl Cut': 'secondary',
}
