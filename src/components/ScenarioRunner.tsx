import { getStatusLabel, locale } from '../locales'
import type { RunResult, StepStatus, TestDefinition } from '../types'

interface ScenarioRunnerProps {
  test: TestDefinition
  run: RunResult
  smokeQueueLabel?: string
  onToggleCheck: (stepId: string, check: string) => void
  onSetStepStatus: (stepId: string, status: StepStatus) => void
  onNavigateStep: (direction: 'prev' | 'next') => void
  onOpenBugForCurrentStep: () => void
  onNextSmoke?: () => void
}

export function ScenarioRunner({
  test,
  run,
  smokeQueueLabel,
  onToggleCheck,
  onSetStepStatus,
  onNavigateStep,
  onOpenBugForCurrentStep,
  onNextSmoke,
}: ScenarioRunnerProps) {
  const step = test.steps[run.currentStepIndex]
  const execution = run.stepExecutions[step.id]
  const completedSteps = test.steps.filter((item) => {
    const status = run.stepExecutions[item.id]?.status
    return status === 'passed' || status === 'failed'
  }).length

  const progress = Math.round((completedSteps / test.steps.length) * 100)
  const allChecksDone = step.checks.every((check) => execution.checks[check])

  return (
    <section className="runner">
      <header className="runner__header">
        <div>
          <p className="runner__type">
            {test.type === 'smoke' ? locale.ui.labels.typeSmoke : locale.ui.labels.typeScenario}
          </p>
          <h2>{test.name}</h2>
          {smokeQueueLabel && <p className="runner__queue">{smokeQueueLabel}</p>}
        </div>
      </header>

      <div className="runner__progress">
        <p>
          {locale.ui.labels.step} {run.currentStepIndex + 1}/{test.steps.length} · {locale.ui.labels.progress}{' '}
          {progress}%
        </p>
        <div className="progress-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className={`step-card step-card--${execution.status}`}>
        <header>
          <h3>{step.title}</h3>
          <span className={`status status--${execution.status}`}>{getStatusLabel(execution.status)}</span>
        </header>

        <p className="expected">
          {locale.ui.labels.expected}: {step.expectedResult}
        </p>

        <h4>{locale.ui.labels.checklist}</h4>
        <div className="checklist">
          {step.checks.map((check) => (
            <label key={check}>
              <input
                type="checkbox"
                checked={execution.checks[check] || false}
                onChange={() => onToggleCheck(step.id, check)}
              />
              {check}
            </label>
          ))}
        </div>

        <div className="step-card__actions">
          <button className="secondary" onClick={() => onSetStepStatus(step.id, 'pending')}>
            {locale.ui.actions.resetStep}
          </button>
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
        </div>
      </article>

      <footer className="runner__footer">
        <button
          className="secondary"
          onClick={() => onNavigateStep('prev')}
          disabled={run.currentStepIndex === 0}
        >
          {locale.ui.actions.previous}
        </button>
        <button
          className="secondary"
          onClick={() => onNavigateStep('next')}
          disabled={run.currentStepIndex === test.steps.length - 1}
        >
          {locale.ui.actions.next}
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
