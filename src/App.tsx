import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { BugList } from './components/BugList'
import { BugReportForm } from './components/BugReportForm'
import { ScenarioRunner } from './components/ScenarioRunner'
import { SmokeSummary } from './components/SmokeSummary'
import { TestCard } from './components/TestCard'
import { allTests, fullScenarios, locale, localize, smokeTests, type ThemeMode } from './locales'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import type { BugReport, RunResult, StepExecution, StepStatus, TestDefinition } from './types'
import { computeRunStatus, createRunResult } from './utils/runState'

const RUNS_STORAGE_KEY = 'qa-runner:runs'
const BUGS_STORAGE_KEY = 'qa-runner:bugs'
const THEME_STORAGE_KEY = 'qa-runner:theme'

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
  const [theme, setTheme] = useLocalStorageState<ThemeMode>(THEME_STORAGE_KEY, 'light')

  const [selectedTestId, setSelectedTestId] = useState<string | null>(allTests[0]?.id ?? null)
  const [activeSmokeQueueIndex, setActiveSmokeQueueIndex] = useState<number | null>(null)
  const [bugContext, setBugContext] = useState<BugContext | null>(null)

  const testMap = useMemo(
    () => allTests.reduce<Record<string, TestDefinition>>((acc, test) => ({ ...acc, [test.id]: test }), {}),
    [],
  )

  const activeTest = selectedTestId ? testMap[selectedTestId] : null
  const activeRun = activeTest ? runs[activeTest.id] : null

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

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

    setSelectedTestId(test.id)
    setBugContext(null)
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

    setSelectedTestId(test.id)
    setBugContext(null)
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

  const activeStep = activeTest && activeRun ? activeTest.steps[activeRun.currentStepIndex] : null
  const showBugForm =
    activeTest && activeStep && bugContext?.testId === activeTest.id && bugContext.stepId === activeStep.id

  return (
    <main className="app">
      <header className="page-header">
        <div>
          <h1>{locale.ui.appTitle}</h1>
          <p>{locale.ui.appSubtitle}</p>
        </div>

        <label className="theme-toggle">
          <span>{locale.ui.theme.label}</span>
          <button
            type="button"
            className="secondary"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? locale.ui.theme.light : locale.ui.theme.dark}
          </button>
        </label>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <section className="sidebar-section">
            <div className="section-title">
              <h2>{locale.ui.sections.smoke}</h2>
              <button onClick={runAllSmokeTests}>{locale.ui.actions.runAllSmoke}</button>
            </div>

            <SmokeSummary runs={runs} smokeIds={smokeTests.map((test) => test.id)} />

            <div className="test-list">
              {smokeTests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  run={runs[test.id]}
                  isActive={selectedTestId === test.id}
                  onSelect={setSelectedTestId}
                  onRun={startRun}
                  onRerunFromFailed={rerunFromFailedStep}
                />
              ))}
            </div>
          </section>

          <section className="sidebar-section">
            <h2>{locale.ui.sections.scenarios}</h2>
            <div className="test-list">
              {fullScenarios.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  run={runs[test.id]}
                  isActive={selectedTestId === test.id}
                  onSelect={setSelectedTestId}
                  onRun={startRun}
                  onRerunFromFailed={rerunFromFailedStep}
                />
              ))}
            </div>
          </section>
        </aside>

        <section className="main-content">
          {activeTest && activeRun ? (
            <>
              <ScenarioRunner
                test={activeTest}
                run={activeRun}
                smokeQueueLabel={
                  activeSmokeQueueIndex !== null
                    ? localize(locale.ui.messages.smokeQueue, {
                        current: activeSmokeQueueIndex + 1,
                        total: smokeTests.length,
                      })
                    : undefined
                }
                onToggleCheck={toggleCheck}
                onSetStepStatus={setStepStatus}
                onNavigateStep={navigateStep}
                onOpenBugForCurrentStep={() => {
                  if (!activeStep) {
                    return
                  }

                  setBugContext({
                    testId: activeTest.id,
                    stepId: activeStep.id,
                  })
                }}
                onNextSmoke={activeSmokeQueueIndex !== null ? openNextSmoke : undefined}
              />

              {showBugForm && activeStep && (
                <BugReportForm
                  test={activeTest}
                  step={activeStep}
                  onSubmit={submitBug}
                  onCancel={() => setBugContext(null)}
                />
              )}
            </>
          ) : (
            <section className="empty-runner">
              <h2>{locale.ui.sections.runner}</h2>
              <p>{locale.ui.messages.emptyRunner}</p>
              {activeTest && (
                <button onClick={() => startRun(activeTest.id)}>{locale.ui.actions.runSelected}</button>
              )}
            </section>
          )}

          <BugList bugs={bugs} />
        </section>
      </div>
    </main>
  )
}

export default App
