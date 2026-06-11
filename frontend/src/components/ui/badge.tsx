import { cn } from '../../lib/utils'
import type { HTMLAttributes } from 'react'

const variants: Record<string, string> = {
  default: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300',
  secondary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  destructive: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  info: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
}

type BadgeVariant = keyof typeof variants

function Badge({
  className,
  variant = 'default',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
export type { BadgeVariant }
