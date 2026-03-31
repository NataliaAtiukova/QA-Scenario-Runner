import type { RunResult, TestDefinition } from '../types'
import { formatRunStatus, getFirstFailedStepIndex } from '../utils/runState'

interface TestCardProps {
  test: TestDefinition
  run: RunResult | undefined
  onRun: (testId: string) => void
  onRerunFromFailed: (testId: string, stepIndex: number) => void
}

export function TestCard({ test, run, onRun, onRerunFromFailed }: TestCardProps) {
  const status = run?.status ?? 'not_started'
  const failedStepIndex = getFirstFailedStepIndex(run, test)

  return (
    <article className="test-card">
      <header className="test-card__header">
        <h3>{test.name}</h3>
        <span className={`status status--${status}`}>{formatRunStatus(status)}</span>
      </header>
      <p>{test.description}</p>
      <p className="meta">
        {test.steps.length} steps · {test.estimatedMinutes} min
      </p>
      <div className="test-card__actions">
        <button onClick={() => onRun(test.id)}>Run</button>
        {failedStepIndex !== null && (
          <button
            className="secondary"
            onClick={() => onRerunFromFailed(test.id, failedStepIndex)}
          >
            Rerun from failed step
          </button>
        )}
      </div>
    </article>
  )
}
