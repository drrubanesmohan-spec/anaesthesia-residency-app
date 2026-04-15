import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-brand-light p-4">
          <Icon className="h-8 w-8 text-stone-400" />
        </div>
      )}
      <p className="text-sm font-medium text-stone-600">{title}</p>
      {description && <p className="mt-1 text-xs text-stone-400">{description}</p>}
    </div>
  )
}
