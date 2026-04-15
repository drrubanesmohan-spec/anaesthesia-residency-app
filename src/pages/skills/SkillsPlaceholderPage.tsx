import { AppShell } from '../../components/layout/AppShell'
import { Stethoscope } from 'lucide-react'

export function SkillsPlaceholderPage() {
  return (
    <AppShell title="Skills Log">
      <div className="flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-accent/10">
          <Stethoscope className="h-10 w-10 text-brand-accent" />
        </div>
        <h2 className="text-xl font-bold text-stone-900">Coming in Phase 2</h2>
        <p className="mt-3 text-sm text-stone-500 max-w-xs">
          The skills log module is under development. Residents will be able to log procedures
          and supervisors will sign them off here.
        </p>
        <div className="mt-6 rounded-xl border border-stone-200 bg-brand-light px-4 py-3">
          <p className="text-xs text-stone-400">Expected features:</p>
          <ul className="mt-2 space-y-1 text-left text-xs text-stone-500">
            <li>• Log procedures with competency level</li>
            <li>• Supervisor sign-off and comments</li>
            <li>• Progress tracking per skill category</li>
            <li>• Export for assessment portfolios</li>
          </ul>
        </div>
      </div>
    </AppShell>
  )
}
