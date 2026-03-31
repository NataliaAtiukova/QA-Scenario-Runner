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
      <strong>Smoke Total: {passed}/{smokeIds.length} passed</strong>
      <span>{failed > 0 ? 'CRITICAL: at least one smoke test failed' : 'No critical smoke failures'}</span>
    </section>
  )
}
