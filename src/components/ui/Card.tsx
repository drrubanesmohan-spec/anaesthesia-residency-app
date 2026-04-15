import { type HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-stone-200 bg-brand-light p-4', className)}
      {...props}
    >
      {children}
    </div>
  )
}
