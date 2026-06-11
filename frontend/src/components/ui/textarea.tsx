import { cn } from '../../lib/utils'
import { forwardRef, type TextareaHTMLAttributes } from 'react'

const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-950 dark:placeholder:text-neutral-500',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
}
)
Textarea.displayName = 'Textarea'

export { Textarea }
