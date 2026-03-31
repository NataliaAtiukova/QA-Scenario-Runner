import { getStatusLabel, locale } from '../locales'
import type { RunResult, StepStatus, TestDefinition } from '../types'

interface ScenarioRunnerProps {
  test: TestDefinition
  run: RunResult
  currentStepIndex: number
  canGoNext: boolean
  smokeQueueLabel?: string
  onToggleCheck: (stepId: string, check: string) => void
  onSetStepStatus: (stepId: string, status: StepStatus) => void
  onNavigateStep: (direction: 'prev' | 'next') => void
  onOpenBugForCurrentStep: () => void
  onRestart: () => void
  onNextSmoke?: () => void
}

export function ScenarioRunner({
  test,
  run,
  currentStepIndex,
  canGoNext,
  smokeQueueLabel,
  onToggleCheck,
  onSetStepStatus,
  onNavigateStep,
  onOpenBugForCurrentStep,
  onRestart,
  onNextSmoke,
}: ScenarioRunnerProps) {
  const step = test.steps[currentStepIndex]
  const execution = run.stepExecutions[step.id]
  const completedSteps = test.steps.filter((item) => {
    const status = run.stepExecutions[item.id]?.status
    return status === 'passed' || status === 'failed'
  }).length

  const progress = Math.round((completedSteps / test.steps.length) * 100)
  const allChecksDone = step.checks.every((check) => execution.checks[check])
  const runTitle =
    test.type === 'smoke'
      ? `Выполнение смок-теста: ${test.name}`
      : `Выполнение сценария: ${test.name}`

  return (
    <section className="runner">
      <header className="runner__header">
        <div className="progress-bar progress-bar--large">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="runner__step-line">
          {locale.ui.labels.step} {currentStepIndex + 1} из {test.steps.length} ({progress}%)
        </p>
      </header>

      <div className="runner__title-row">
        <div>
          <h2>{runTitle}</h2>
          {smokeQueueLabel && <p className="runner__queue">{smokeQueueLabel}</p>}
        </div>
        <span className={`status status--${run.status}`}>{getStatusLabel(run.status)}</span>
      </div>

      <article className={`step-card step-card--${execution.status}`}>
        <header className="step-card__header">
          <h3>
            {currentStepIndex + 1}. {step.title}
          </h3>
          <span className={`status status--${execution.status}`}>{getStatusLabel(execution.status)}</span>
        </header>

        <p className="expected">
          <strong>{locale.ui.labels.expected}:</strong> {step.expectedResult}
        </p>

        <h4 className="checklist-title">{locale.ui.labels.checklist}</h4>
        <div className="checklist">
          {step.checks.map((check) => (
            <label key={check} className="checklist-item">
              <input
                type="checkbox"
                checked={execution.checks[check] || false}
                onChange={() => onToggleCheck(step.id, check)}
              />
              {check}
            </label>
          ))}
        </div>

        <div className="step-card__actions step-card__actions--result">
          <button
            className="pass"
            onClick={() => onSetStepStatus(step.id, 'passed')}
            disabled={!allChecksDone}
            title={!allChecksDone ? locale.ui.messages.completeChecks : locale.ui.actions.pass}
          >
            {locale.ui.actions.pass}
          </button>
          <button
            className="fail"
            onClick={() => {
              onSetStepStatus(step.id, 'failed')
              onOpenBugForCurrentStep()
            }}
          >
            {locale.ui.actions.fail}
          </button>
          <button className="secondary step-reset" onClick={() => onSetStepStatus(step.id, 'pending')}>
            {locale.ui.actions.resetStep}
          </button>
        </div>
      </article>

      <footer className="runner__footer">
        <button className="secondary" onClick={() => onNavigateStep('prev')} disabled={currentStepIndex === 0}>
          {locale.ui.actions.previous}
        </button>
        <button
          className="secondary"
          onClick={() => onNavigateStep('next')}
          disabled={currentStepIndex === test.steps.length - 1 || !canGoNext}
        >
          {locale.ui.actions.next}
        </button>
        <button className="secondary" onClick={onRestart}>
          {locale.ui.actions.startOver}
        </button>
        {onNextSmoke && (
          <button className="secondary" onClick={onNextSmoke}>
            {locale.ui.actions.nextSmoke}
          </button>
        )}
      </footer>
    </section>
  )
}
