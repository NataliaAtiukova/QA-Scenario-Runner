import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { BugList } from './components/BugList'
import { BugReportForm } from './components/BugReportForm'
import { ScenarioRunner } from './components/ScenarioRunner'
import { SmokeEditor } from './components/SmokeEditor'
import { SmokeSummary } from './components/SmokeSummary'
import { TestCard } from './components/TestCard'
import { defaultSmokeTemplateFile, fullScenarios, locale, localize, type ThemeMode } from './locales'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import type {
  BugReport,
  RunResult,
  SmokeTemplate,
  SmokeTemplateFile,
  StepExecution,
  StepStatus,
  TestDefinition,
} from './types'
import { computeRunStatus, createRunResult } from './utils/runState'
import {
  cloneTemplate,
  createTemplate,
  exportTemplatesAsExcel,
  exportTemplatesAsJson,
  importTemplatesFromExcel,
  templatesToTests,
  validateSmokeTemplateFile,
} from './utils/smokeTemplates'

const RUNS_STORAGE_KEY = 'qa-runner:runs'
const BUGS_STORAGE_KEY = 'qa-runner:bugs'
const THEME_STORAGE_KEY = 'qa-runner:theme'
const SMOKE_TEMPLATES_STORAGE_KEY = 'qa-runner:smoke-templates'
const SMOKE_TEMPLATES_BACKUP_KEY = 'qa-runner:smoke-templates-backup'

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

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadArrayBuffer(filename: string, content: ArrayBuffer) {
  const blob = new Blob([content], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [runs, setRuns] = useLocalStorageState<Record<string, RunResult>>(RUNS_STORAGE_KEY, {})
  const [bugs, setBugs] = useLocalStorageState<BugReport[]>(BUGS_STORAGE_KEY, [])
  const [theme, setTheme] = useLocalStorageState<ThemeMode>(THEME_STORAGE_KEY, 'light')

  const [smokeTemplates, setSmokeTemplates] = useState<SmokeTemplate[]>(defaultSmokeTemplateFile.smokeTests)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    defaultSmokeTemplateFile.smokeTests[0]?.id ?? null,
  )
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [activeSmokeQueueIndex, setActiveSmokeQueueIndex] = useState<number | null>(null)
  const [bugContext, setBugContext] = useState<BugContext | null>(null)

  const smokeTests = useMemo(() => templatesToTests(smokeTemplates), [smokeTemplates])
  const allTests = useMemo(() => [...smokeTests, ...fullScenarios], [smokeTests])
  const testMap = useMemo(
    () => allTests.reduce<Record<string, TestDefinition>>((acc, test) => ({ ...acc, [test.id]: test }), {}),
    [allTests],
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    let ignore = false

    const loadTemplates = async () => {
      try {
        const response = await fetch('/data/smoke-tests.json', { cache: 'no-store' })
        if (response.ok) {
          const parsed = (await response.json()) as SmokeTemplateFile
          const validation = validateSmokeTemplateFile(parsed)
          if (validation.valid && validation.file && !ignore) {
            setSmokeTemplates(validation.file.smokeTests)
            setSelectedTemplateId(validation.file.smokeTests[0]?.id ?? null)
            localStorage.setItem(SMOKE_TEMPLATES_STORAGE_KEY, JSON.stringify(validation.file))
            return
          }
        }
      } catch {
        // fallback to local/default below
      }

      const localRaw = localStorage.getItem(SMOKE_TEMPLATES_STORAGE_KEY)
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw) as SmokeTemplateFile
          const validation = validateSmokeTemplateFile(parsed)
          if (validation.valid && validation.file && !ignore) {
            setSmokeTemplates(validation.file.smokeTests)
            setSelectedTemplateId(validation.file.smokeTests[0]?.id ?? null)
            return
          }
        } catch {
          // fallback to defaults below
        }
      }

      if (!ignore) {
        setSmokeTemplates(defaultSmokeTemplateFile.smokeTests)
        setSelectedTemplateId(defaultSmokeTemplateFile.smokeTests[0]?.id ?? null)
      }
    }

    loadTemplates().catch(() => undefined)
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    const validation = validateSmokeTemplateFile({ smokeTests: smokeTemplates })
    setValidationErrors(validation.valid ? [] : validation.errors)
    localStorage.setItem(SMOKE_TEMPLATES_STORAGE_KEY, JSON.stringify({ smokeTests }))
  }, [smokeTemplates])

  useEffect(() => {
    if (allTests.length === 0) {
      setSelectedTestId(null)
      return
    }

    if (!selectedTestId || !testMap[selectedTestId]) {
      setSelectedTestId(allTests[0].id)
    }
  }, [allTests, selectedTestId, testMap])

  const activeTest = selectedTestId ? testMap[selectedTestId] : null
  const activeRun = activeTest ? runs[activeTest.id] : null

  const setTemplatesWithBackup = (updater: (prev: SmokeTemplate[]) => SmokeTemplate[]) => {
    setSmokeTemplates((previous) => {
      localStorage.setItem(SMOKE_TEMPLATES_BACKUP_KEY, JSON.stringify({ smokeTests: previous }))
      const next = updater(previous)
      localStorage.setItem(SMOKE_TEMPLATES_STORAGE_KEY, JSON.stringify({ smokeTests: next }))
      return next
    })
  }

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
    if (smokeTests.length === 0) {
      return
    }

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
    if (!test) {
      setBugContext(null)
      return
    }

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

    setBugContext(null)
  }

  const setSuccessNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2000)
  }

  const handleImportJson = async (file: File) => {
    const text = await file.text()
    const parsed = JSON.parse(text) as SmokeTemplateFile
    const validation = validateSmokeTemplateFile(parsed)
    if (!validation.valid || !validation.file) {
      setValidationErrors(validation.errors)
      return
    }

    setTemplatesWithBackup(() => validation.file!.smokeTests)
    setSelectedTemplateId(validation.file.smokeTests[0]?.id ?? null)
    setSuccessNotice(locale.ui.messages.importSuccess)
  }

  const handleImportExcel = async (file: File) => {
    const buffer = await file.arrayBuffer()
    const parsed = importTemplatesFromExcel(buffer)
    const validation = validateSmokeTemplateFile(parsed)
    if (!validation.valid || !validation.file) {
      setValidationErrors(validation.errors)
      return
    }

    setTemplatesWithBackup(() => validation.file!.smokeTests)
    setSelectedTemplateId(validation.file.smokeTests[0]?.id ?? null)
    setSuccessNotice(locale.ui.messages.importSuccess)
  }

  const handleRestoreBackup = () => {
    const raw = localStorage.getItem(SMOKE_TEMPLATES_BACKUP_KEY)
    if (!raw) {
      setNotice(locale.ui.messages.noBackup)
      return
    }

    try {
      const parsed = JSON.parse(raw) as SmokeTemplateFile
      const validation = validateSmokeTemplateFile(parsed)
      if (!validation.valid || !validation.file) {
        setValidationErrors(validation.errors)
        return
      }

      setTemplatesWithBackup(() => validation.file!.smokeTests)
      setSelectedTemplateId(validation.file.smokeTests[0]?.id ?? null)
      setSuccessNotice(locale.ui.messages.restoreSuccess)
    } catch {
      setNotice(locale.ui.messages.noBackup)
    }
  }

  const handleSaveTemplate = () => {
    const validation = validateSmokeTemplateFile({ smokeTests: smokeTemplates })
    if (!validation.valid) {
      setValidationErrors(validation.errors)
      return
    }
    setSuccessNotice(locale.ui.messages.saved)
  }

  const updateTemplateAt = (templateId: string, updater: (template: SmokeTemplate) => SmokeTemplate) => {
    setTemplatesWithBackup((previous) =>
      previous.map((template) => (template.id === templateId ? updater(template) : template)),
    )
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

          <SmokeEditor
            templates={smokeTemplates}
            selectedTemplateId={selectedTemplateId}
            validationErrors={validationErrors}
            notice={notice}
            onSelectTemplate={setSelectedTemplateId}
            onCreateTemplate={() => {
              const next = createTemplate()
              setTemplatesWithBackup((previous) => [...previous, next])
              setSelectedTemplateId(next.id)
            }}
            onDuplicateTemplate={(id) => {
              const original = smokeTemplates.find((template) => template.id === id)
              if (!original) {
                return
              }
              const copy = cloneTemplate(original)
              setTemplatesWithBackup((previous) => [...previous, copy])
              setSelectedTemplateId(copy.id)
            }}
            onDeleteTemplate={(id) => {
              setTemplatesWithBackup((previous) => previous.filter((template) => template.id !== id))
              setSelectedTemplateId((current) => {
                if (current !== id) {
                  return current
                }
                const next = smokeTemplates.find((template) => template.id !== id)
                return next?.id ?? null
              })
            }}
            onSaveTemplate={handleSaveTemplate}
            onUpdateTemplateName={(id, name) => {
              updateTemplateAt(id, (template) => ({ ...template, name }))
            }}
            onAddStep={(id) => {
              updateTemplateAt(id, (template) => ({
                ...template,
                steps: [
                  ...template.steps,
                  {
                    id: `step-${Date.now()}`,
                    title: `Шаг ${template.steps.length + 1}`,
                    checks: ['Новая проверка'],
                  },
                ],
              }))
            }}
            onDeleteStep={(id, stepIndex) => {
              updateTemplateAt(id, (template) => {
                if (template.steps.length === 1) {
                  return template
                }
                return {
                  ...template,
                  steps: template.steps.filter((_, index) => index !== stepIndex),
                }
              })
            }}
            onMoveStep={(id, stepIndex, direction) => {
              updateTemplateAt(id, (template) => {
                const nextIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1
                if (nextIndex < 0 || nextIndex >= template.steps.length) {
                  return template
                }
                const nextSteps = [...template.steps]
                const current = nextSteps[stepIndex]
                nextSteps[stepIndex] = nextSteps[nextIndex]
                nextSteps[nextIndex] = current
                return {
                  ...template,
                  steps: nextSteps,
                }
              })
            }}
            onUpdateStepTitle={(id, stepIndex, title) => {
              updateTemplateAt(id, (template) => ({
                ...template,
                steps: template.steps.map((step, index) =>
                  index === stepIndex
                    ? {
                        ...step,
                        title,
                      }
                    : step,
                ),
              }))
            }}
            onAddCheck={(id, stepIndex) => {
              updateTemplateAt(id, (template) => ({
                ...template,
                steps: template.steps.map((step, index) =>
                  index === stepIndex
                    ? {
                        ...step,
                        checks: [...step.checks, 'Новая проверка'],
                      }
                    : step,
                ),
              }))
            }}
            onUpdateCheck={(id, stepIndex, checkIndex, value) => {
              updateTemplateAt(id, (template) => ({
                ...template,
                steps: template.steps.map((step, index) =>
                  index === stepIndex
                    ? {
                        ...step,
                        checks: step.checks.map((check, currentCheckIndex) =>
                          currentCheckIndex === checkIndex ? value : check,
                        ),
                      }
                    : step,
                ),
              }))
            }}
            onDeleteCheck={(id, stepIndex, checkIndex) => {
              updateTemplateAt(id, (template) => ({
                ...template,
                steps: template.steps.map((step, index) =>
                  index === stepIndex
                    ? {
                        ...step,
                        checks:
                          step.checks.length === 1
                            ? step.checks
                            : step.checks.filter((_, currentCheckIndex) => currentCheckIndex !== checkIndex),
                      }
                    : step,
                ),
              }))
            }}
            onImportJson={(file) => {
              handleImportJson(file).catch(() => undefined)
            }}
            onExportJson={() => {
              downloadText('smoke-tests.json', exportTemplatesAsJson(smokeTemplates))
            }}
            onImportExcel={(file) => {
              handleImportExcel(file).catch(() => undefined)
            }}
            onExportExcel={() => {
              downloadArrayBuffer('smoke-tests.xlsx', exportTemplatesAsExcel(smokeTemplates))
            }}
            onRestoreBackup={handleRestoreBackup}
            onExportBackup={() => {
              const backup = localStorage.getItem(SMOKE_TEMPLATES_BACKUP_KEY)
              if (!backup) {
                setNotice(locale.ui.messages.noBackup)
                return
              }
              downloadText('smoke-tests.backup.json', backup)
            }}
          />

          <BugList bugs={bugs} />
        </section>
      </div>
    </main>
  )
}

export default App
