import type { RunResult, TestDefinition } from '../types'
import { getStatusLabel, locale } from '../locales'
import { getFirstFailedStepIndex } from '../utils/runState'

interface TestCardProps {
  test: TestDefinition
  run: RunResult | undefined
  isActive: boolean
  isSmoke?: boolean
  onSelect: (testId: string) => void
  onRun: (testId: string) => void
  onEdit?: (testId: string) => void
  onRerunFromFailed: (testId: string, stepIndex: number) => void
}

export function TestCard({
  test,
  run,
  isActive,
  isSmoke = false,
  onSelect,
  onRun,
  onEdit,
  onRerunFromFailed,
}: TestCardProps) {
  const status = run?.status ?? 'not_started'
  const failedStepIndex = getFirstFailedStepIndex(run, test)

  return (
    <article
      className={`test-card ${isActive ? 'test-card--active' : ''}`}
      onClick={() => onSelect(test.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onSelect(test.id)
        }
      }}
    >
      <header className="test-card__header">
        <h3>{test.name}</h3>
        <span className={`status status--${status}`}>{getStatusLabel(status)}</span>
      </header>
      <p className="meta">
        {test.steps.length} {locale.ui.labels.steps}
      </p>
      <div className="test-card__actions">
        <button
          onClick={(event) => {
            event.stopPropagation()
            onRun(test.id)
          }}
        >
          {locale.ui.actions.run}
        </button>
        {isSmoke && onEdit && (
          <button
            className="secondary"
            onClick={(event) => {
              event.stopPropagation()
              onEdit(test.id)
            }}
          >
            {locale.ui.actions.editSmoke}
          </button>
        )}
        {failedStepIndex !== null && (
          <button
            className="secondary"
            onClick={(event) => {
              event.stopPropagation()
              onRerunFromFailed(test.id, failedStepIndex)
            }}
          >
            {locale.ui.actions.rerunFromFailed}
          </button>
        )}
      </div>
    </article>
  )
}
