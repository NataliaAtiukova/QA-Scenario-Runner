import type { RunResult, RunStatus, StepExecution, TestDefinition } from '../types'

function buildStepExecution(step: TestDefinition['steps'][number]): StepExecution {
  return {
    status: 'pending',
    checks: step.checks.reduce<Record<string, boolean>>((acc, check) => {
      acc[check] = false
      return acc
    }, {}),
  }
}

export function createRunResult(test: TestDefinition, stepIndex = 0): RunResult {
  const stepExecutions = test.steps.reduce<Record<string, StepExecution>>((acc, step) => {
    acc[step.id] = buildStepExecution(step)
    return acc
  }, {})

  return {
    testId: test.id,
    startedAt: new Date().toISOString(),
    status: 'in_progress',
    currentStepIndex: stepIndex,
    stepExecutions,
  }
}

export function computeRunStatus(run: RunResult, test: TestDefinition): RunStatus {
  const statuses = test.steps.map((step) => run.stepExecutions[step.id]?.status || 'pending')

  if (statuses.every((status) => status === 'passed')) {
    return 'passed'
  }

  if (statuses.includes('failed')) {
    return 'failed'
  }

  if (statuses.some((status) => status === 'passed')) {
    return 'in_progress'
  }

  return 'not_started'
}

export function getFirstFailedStepIndex(run: RunResult | undefined, test: TestDefinition): number | null {
  if (!run) {
    return null
  }

  const index = test.steps.findIndex((step) => run.stepExecutions[step.id]?.status === 'failed')
  return index >= 0 ? index : null
}
