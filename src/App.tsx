import { useMemo, useState } from 'react'
import './App.css'
import { BugList } from './components/BugList'
import { BugReportForm } from './components/BugReportForm'
import { ScenarioRunner } from './components/ScenarioRunner'
import { SmokeSummary } from './components/SmokeSummary'
import { TestCard } from './components/TestCard'
import { allTests, fullScenarios, smokeTests } from './data/scenarios'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import type { BugReport, RunResult, StepExecution, StepStatus, TestDefinition } from './types'
import { computeRunStatus, createRunResult } from './utils/runState'

const RUNS_STORAGE_KEY = 'qa-runner:runs'
const BUGS_STORAGE_KEY = 'qa-runner:bugs'

interface BugContext {
  testId: string
  stepId: string
}

function createStepExecution(step: TestDefinition['steps'][number]): StepExecution {
  return {
    status: 'pending',
    checks: step.checks.reduce<Record<string, boolean>>((acc, check) => {
      acc[check] = false
      return acc
    }, {}),
  }
}

function App() {
  const [runs, setRuns] = useLocalStorageState<Record<string, RunResult>>(RUNS_STORAGE_KEY, {})
  const [bugs, setBugs] = useLocalStorageState<BugReport[]>(BUGS_STORAGE_KEY, [])

  const [activeTestId, setActiveTestId] = useState<string | null>(null)
  const [activeSmokeQueueIndex, setActiveSmokeQueueIndex] = useState<number | null>(null)
  const [bugContext, setBugContext] = useState<BugContext | null>(null)

  const testMap = useMemo(
    () => allTests.reduce<Record<string, TestDefinition>>((acc, test) => ({ ...acc, [test.id]: test }), {}),
    [],
  )

  const activeTest = activeTestId ? testMap[activeTestId] : null
  const activeRun = activeTest ? runs[activeTest.id] : null

  const updateRun = (test: TestDefinition, updater: (run: RunResult) => RunResult) => {
    setRuns((previous) => {
      const existing = previous[test.id] ?? createRunResult(test)
      const next = updater(existing)
      const status = computeRunStatus(next, test)

      return {
        ...previous,
        [test.id]: {
          ...next,
          status,
          completedAt: status === 'passed' || status === 'failed' ? new Date().toISOString() : undefined,
        },
      }
    })
  }

  const startRun = (testId: string, stepIndex = 0) => {
    const test = testMap[testId]

    if (!test) {
      return
    }

    setRuns((previous) => ({
      ...previous,
      [test.id]: createRunResult(test, stepIndex),
    }))

    setBugContext(null)
    setActiveTestId(test.id)
  }

  const rerunFromFailedStep = (testId: string, stepIndex: number) => {
    const test = testMap[testId]

    if (!test) {
      return
    }

    setRuns((previous) => {
      const existing = previous[test.id]

      if (!existing) {
        return {
          ...previous,
          [test.id]: createRunResult(test, stepIndex),
        }
      }

      const nextExecutions = { ...existing.stepExecutions }

      test.steps.forEach((step, index) => {
        if (index >= stepIndex) {
          nextExecutions[step.id] = createStepExecution(step)
        }
      })

      const next: RunResult = {
        ...existing,
        startedAt: new Date().toISOString(),
        currentStepIndex: stepIndex,
        stepExecutions: nextExecutions,
        status: 'in_progress',
        completedAt: undefined,
      }

      return { ...previous, [test.id]: next }
    })

    setBugContext(null)
    setActiveTestId(test.id)
  }

  const runAllSmokeTests = () => {
    setActiveSmokeQueueIndex(0)
    startRun(smokeTests[0].id)
  }

  const openNextSmoke = () => {
    if (activeSmokeQueueIndex === null) {
      return
    }

    const nextIndex = activeSmokeQueueIndex + 1

    if (nextIndex >= smokeTests.length) {
      setActiveSmokeQueueIndex(null)
      setActiveTestId(null)
      return
    }

    setActiveSmokeQueueIndex(nextIndex)
    startRun(smokeTests[nextIndex].id)
  }

  const navigateStep = (direction: 'prev' | 'next') => {
    if (!activeTest || !activeRun) {
      return
    }

    updateRun(activeTest, (current) => {
      const delta = direction === 'next' ? 1 : -1
      const nextIndex = Math.max(0, Math.min(current.currentStepIndex + delta, activeTest.steps.length - 1))

      return {
        ...current,
        currentStepIndex: nextIndex,
      }
    })
  }

  const toggleCheck = (stepId: string, check: string) => {
    if (!activeTest) {
      return
    }

    updateRun(activeTest, (current) => {
      const stepExecution = current.stepExecutions[stepId]

      if (!stepExecution) {
        return current
      }

      return {
        ...current,
        stepExecutions: {
          ...current.stepExecutions,
          [stepId]: {
            ...stepExecution,
            checks: {
              ...stepExecution.checks,
              [check]: !stepExecution.checks[check],
            },
          },
        },
      }
    })
  }

  const setStepStatus = (stepId: string, status: StepStatus) => {
    if (!activeTest) {
      return
    }

    updateRun(activeTest, (current) => {
      const stepExecution = current.stepExecutions[stepId]

      if (!stepExecution) {
        return current
      }

      const updated = {
        ...current,
        stepExecutions: {
          ...current.stepExecutions,
          [stepId]: {
            ...stepExecution,
            status,
          },
        },
      }

      if (status === 'passed' && current.currentStepIndex < activeTest.steps.length - 1) {
        return {
          ...updated,
          currentStepIndex: current.currentStepIndex + 1,
        }
      }

      return updated
    })
  }

  const submitBug = (payload: Omit<BugReport, 'id'>) => {
    const bug: BugReport = {
      id: `bug-${Date.now()}`,
      ...payload,
    }

    setBugs((previous) => [...previous, bug])

    const test = testMap[payload.testId]

    if (test) {
      updateRun(test, (current) => {
        const stepExecution = current.stepExecutions[payload.stepId]

        if (!stepExecution) {
          return current
        }

        return {
          ...current,
          stepExecutions: {
            ...current.stepExecutions,
            [payload.stepId]: {
              ...stepExecution,
              bugId: bug.id,
            },
          },
        }
      })
    }

    setBugContext(null)
  }

  const closeRunner = () => {
    setActiveTestId(null)
    setActiveSmokeQueueIndex(null)
    setBugContext(null)
  }

  if (activeTest && activeRun) {
    const activeStep = activeTest.steps[activeRun.currentStepIndex]
    const showBugForm = bugContext?.testId === activeTest.id && bugContext.stepId === activeStep.id

    return (
      <main className="app app--runner">
        <ScenarioRunner
          test={activeTest}
          run={activeRun}
          smokeQueueLabel={
            activeSmokeQueueIndex !== null
              ? `Smoke ${activeSmokeQueueIndex + 1}/${smokeTests.length}`
              : undefined
          }
          onBack={closeRunner}
          onToggleCheck={toggleCheck}
          onSetStepStatus={setStepStatus}
          onNavigateStep={navigateStep}
          onOpenBugForCurrentStep={() => {
            setBugContext({
              testId: activeTest.id,
              stepId: activeStep.id,
            })
          }}
          onNextSmoke={activeSmokeQueueIndex !== null ? openNextSmoke : undefined}
        />

        {showBugForm && (
          <BugReportForm
            test={activeTest}
            step={activeStep}
            onSubmit={submitBug}
            onCancel={() => setBugContext(null)}
          />
        )}
      </main>
    )
  }

  return (
    <main className="app">
      <header className="page-header">
        <h1>QA Scenario Runner</h1>
        <p>Scenario → Steps → Checks → Result → Bug → Ticket</p>
      </header>

      <section className="tests-section">
        <div className="section-title">
          <h2>Run Smoke Tests</h2>
          <button onClick={runAllSmokeTests}>Run All Smoke Tests</button>
        </div>

        <SmokeSummary runs={runs} smokeIds={smokeTests.map((test) => test.id)} />

        <div className="test-grid">
          {smokeTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              run={runs[test.id]}
              onRun={startRun}
              onRerunFromFailed={rerunFromFailedStep}
            />
          ))}
        </div>
      </section>

      <section className="tests-section">
        <div className="section-title">
          <h2>Full Scenarios</h2>
        </div>
        <div className="test-grid">
          {fullScenarios.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              run={runs[test.id]}
              onRun={startRun}
              onRerunFromFailed={rerunFromFailedStep}
            />
          ))}
        </div>
      </section>

      <BugList bugs={bugs} />
    </main>
  )
}

export default App
