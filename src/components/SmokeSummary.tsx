import { locale, localize } from '../locales'
import type { RunResult } from '../types'

interface SmokeSummaryProps {
  runs: Record<string, RunResult>
  smokeIds: string[]
}

export function SmokeSummary({ runs, smokeIds }: SmokeSummaryProps) {
  const passed = smokeIds.filter((id) => runs[id]?.status === 'passed').length
  const failed = smokeIds.filter((id) => runs[id]?.status === 'failed').length

  return (
    <section className={`smoke-summary ${failed > 0 ? 'smoke-summary--critical' : ''}`}>
      <strong>
        {localize(locale.ui.messages.smokeTotal, {
          passed,
          total: smokeIds.length,
        })}
      </strong>
      <span>{failed > 0 ? locale.ui.messages.criticalSmoke : locale.ui.messages.noCriticalSmoke}</span>
    </section>
  )
}
