import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { BugList } from './components/BugList'
import { BugReportForm } from './components/BugReportForm'
import { ScenarioRunner } from './components/ScenarioRunner'
import { SmokeEditor } from './components/SmokeEditor'
import { SmokeSummary } from './components/SmokeSummary'
import { TestCard } from './components/TestCard'
import {
  defaultScenarioTemplateFile,
  defaultSmokeTemplateFile,
  locale,
  localize,
  type ThemeMode,
} from './locales'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import type {
  BugReport,
  RunResult,
  SmokeTemplate,
  SmokeTemplateFile,
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
import {
  cloneScenarioTemplate,
  createScenarioTemplate,
  exportScenarioTemplatesAsExcel,
  exportScenarioTemplatesAsJson,
  importScenarioTemplatesFromExcel,
  templatesToScenarioTests,
  validateScenarioTemplateFile,
} from './utils/scenarioTemplates'

type AppRoute = '/run' | '/edit'
type RunTab = 'smoke' | 'scenario' | 'bugs'
type ActiveMode = 'smoke' | 'scenario'
type EditTab = 'smoke' | 'scenario'

const RUNS_STORAGE_KEY = 'qa-runner:runs'
const BUGS_STORAGE_KEY = 'qa-runner:bugs'
const THEME_STORAGE_KEY = 'qa-runner:theme'
const SMOKE_TEMPLATES_STORAGE_KEY = 'qa-runner:smoke-templates'
const SMOKE_TEMPLATES_BACKUP_KEY = 'qa-runner:smoke-templates-backup'
const SCENARIO_TEMPLATES_STORAGE_KEY = 'qa-runner:scenario-templates'
const SCENARIO_TEMPLATES_BACKUP_KEY = 'qa-runner:scenario-templates-backup'

interface BugContext {
  testId: string
  stepId: string
}

function resolveInitialRoute(): AppRoute {
  const pathname = window.location.pathname
  if (pathname === '/edit') {
    return '/edit'
  }
  if (pathname !== '/run') {
    window.history.replaceState(null, '', '/run')
  }
  return '/run'
}

function ensureRunState(test: TestDefinition, run: RunResult | undefined): RunResult {
  if (run) {
    return run
  }
  return createRunResult(test)
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
  const [progressState, setProgressState] = useLocalStorageState<Record<string, RunResult>>(RUNS_STORAGE_KEY, {})
  const [bugs, setBugs] = useLocalStorageState<BugReport[]>(BUGS_STORAGE_KEY, [])
  const [theme, setTheme] = useLocalStorageState<ThemeMode>(THEME_STORAGE_KEY, 'light')

  const [route, setRoute] = useState<AppRoute>(() => resolveInitialRoute())
  const [runTab, setRunTab] = useState<RunTab>('smoke')
  const [editTab, setEditTab] = useState<EditTab>('smoke')

  const [selectedSmokeId, setSelectedSmokeId] = useState<string | null>(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [activeMode, setActiveMode] = useState<ActiveMode>('smoke')
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const [persistedTemplates, setPersistedTemplates] = useState<SmokeTemplate[]>(
    defaultSmokeTemplateFile.smokeTests,
  )
  const [draftTemplates, setDraftTemplates] = useState<SmokeTemplate[]>(defaultSmokeTemplateFile.smokeTests)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    defaultSmokeTemplateFile.smokeTests[0]?.id ?? null,
  )
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const [persistedScenarioTemplates, setPersistedScenarioTemplates] = useState<SmokeTemplate[]>(
    defaultScenarioTemplateFile.scenarios,
  )
  const [draftScenarioTemplates, setDraftScenarioTemplates] = useState<SmokeTemplate[]>(
    defaultScenarioTemplateFile.scenarios,
  )
  const [selectedScenarioTemplateId, setSelectedScenarioTemplateId] = useState<string | null>(
    defaultScenarioTemplateFile.scenarios[0]?.id ?? null,
  )
  const [scenarioValidationErrors, setScenarioValidationErrors] = useState<string[]>([])
  const [scenarioNotice, setScenarioNotice] = useState<string | null>(null)
  const [bugContext, setBugContext] = useState<BugContext | null>(null)

  const smokeTests = useMemo(() => templatesToTests(persistedTemplates), [persistedTemplates])
  const scenarioTests = useMemo(
    () => templatesToScenarioTests(persistedScenarioTemplates),
    [persistedScenarioTemplates],
  )
  const allTests = useMemo(() => [...smokeTests, ...scenarioTests], [scenarioTests, smokeTests])
  const testMap = useMemo(
    () => allTests.reduce<Record<string, TestDefinition>>((acc, test) => ({ ...acc, [test.id]: test }), {}),
    [allTests],
  )

  const activeTest = activeItemId ? testMap[activeItemId] : null
  const activeRun = activeTest ? ensureRunState(activeTest, progressState[activeTest.id]) : null
  const activeStep = activeTest && activeRun ? activeTest.steps[currentStepIndex] : null
  const isCurrentStepPassed = activeStep ? activeRun?.stepExecutions[activeStep.id]?.status === 'passed' : false
  const isEditDirty = useMemo(
    () => JSON.stringify(draftTemplates) !== JSON.stringify(persistedTemplates),
    [draftTemplates, persistedTemplates],
  )
  const isScenarioEditDirty = useMemo(
    () => JSON.stringify(draftScenarioTemplates) !== JSON.stringify(persistedScenarioTemplates),
    [draftScenarioTemplates, persistedScenarioTemplates],
  )

  useEffect(() => {
    const onPopState = () => setRoute(resolveInitialRoute())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

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
            setPersistedTemplates(validation.file.smokeTests)
            setDraftTemplates(validation.file.smokeTests)
            setSelectedTemplateId(validation.file.smokeTests[0]?.id ?? null)
            localStorage.setItem(SMOKE_TEMPLATES_STORAGE_KEY, JSON.stringify(validation.file))
            return
          }
        }
      } catch {
        // fallback below
      }

      const localRaw = localStorage.getItem(SMOKE_TEMPLATES_STORAGE_KEY)
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw) as SmokeTemplateFile
          const validation = validateSmokeTemplateFile(parsed)
          if (validation.valid && validation.file && !ignore) {
            setPersistedTemplates(validation.file.smokeTests)
            setDraftTemplates(validation.file.smokeTests)
            setSelectedTemplateId(validation.file.smokeTests[0]?.id ?? null)
            return
          }
        } catch {
          // fallback below
        }
      }

      if (!ignore) {
        setPersistedTemplates(defaultSmokeTemplateFile.smokeTests)
        setDraftTemplates(defaultSmokeTemplateFile.smokeTests)
        setSelectedTemplateId(defaultSmokeTemplateFile.smokeTests[0]?.id ?? null)
      }
    }

    loadTemplates().catch(() => undefined)
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    const loadScenarioTemplates = async () => {
      try {
        const response = await fetch('/data/scenarios.json', { cache: 'no-store' })
        if (response.ok) {
          const parsed = (await response.json()) as { scenarios: SmokeTemplate[] }
          const validation = validateScenarioTemplateFile(parsed)
          if (validation.valid && validation.file && !ignore) {
            setPersistedScenarioTemplates(validation.file.scenarios)
            setDraftScenarioTemplates(validation.file.scenarios)
            setSelectedScenarioTemplateId(validation.file.scenarios[0]?.id ?? null)
            localStorage.setItem(SCENARIO_TEMPLATES_STORAGE_KEY, JSON.stringify(validation.file))
            return
          }
        }
      } catch {
        // fallback below
      }

      const localRaw = localStorage.getItem(SCENARIO_TEMPLATES_STORAGE_KEY)
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw) as { scenarios: SmokeTemplate[] }
          const validation = validateScenarioTemplateFile(parsed)
          if (validation.valid && validation.file && !ignore) {
            setPersistedScenarioTemplates(validation.file.scenarios)
            setDraftScenarioTemplates(validation.file.scenarios)
            setSelectedScenarioTemplateId(validation.file.scenarios[0]?.id ?? null)
            return
          }
        } catch {
          // fallback below
        }
      }

      if (!ignore) {
        setPersistedScenarioTemplates(defaultScenarioTemplateFile.scenarios)
        setDraftScenarioTemplates(defaultScenarioTemplateFile.scenarios)
        setSelectedScenarioTemplateId(defaultScenarioTemplateFile.scenarios[0]?.id ?? null)
      }
    }

    loadScenarioTemplates().catch(() => undefined)
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    const validation = validateSmokeTemplateFile({ smokeTests: draftTemplates })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValidationErrors(validation.valid ? [] : validation.errors)
  }, [draftTemplates])

  useEffect(() => {
    const validation = validateScenarioTemplateFile({ scenarios: draftScenarioTemplates })
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScenarioValidationErrors(validation.valid ? [] : validation.errors)
  }, [draftScenarioTemplates])

  useEffect(() => {
    if (smokeTests.length > 0 && !selectedSmokeId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedSmokeId(smokeTests[0].id)
      if (activeMode === 'smoke' && !activeItemId) {
        setActiveItemId(smokeTests[0].id)
      }
    }
  }, [activeItemId, activeMode, selectedSmokeId, smokeTests])

  useEffect(() => {
    if (scenarioTests.length > 0 && !selectedScenarioId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedScenarioId(scenarioTests[0].id)
    }
  }, [scenarioTests, selectedScenarioId])

  useEffect(() => {
    if (draftTemplates.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTemplateId(null)
      return
    }
    if (!selectedTemplateId || !draftTemplates.some((template) => template.id === selectedTemplateId)) {
      setSelectedTemplateId(draftTemplates[0].id)
    }
  }, [draftTemplates, selectedTemplateId])

  useEffect(() => {
    if (draftScenarioTemplates.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedScenarioTemplateId(null)
      return
    }
    if (
      !selectedScenarioTemplateId ||
      !draftScenarioTemplates.some((template) => template.id === selectedScenarioTemplateId)
    ) {
      setSelectedScenarioTemplateId(draftScenarioTemplates[0].id)
    }
  }, [draftScenarioTemplates, selectedScenarioTemplateId])

  const navigate = (nextRoute: AppRoute) => {
    window.history.pushState(null, '', nextRoute)
    setRoute(nextRoute)
  }

  const setSuccessNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2000)
  }

  const initializeRunForTest = (test: TestDefinition, stepIndex = 0) => {
    setProgressState((previous) => ({
      ...previous,
      [test.id]: createRunResult(test, stepIndex),
    }))
    setCurrentStepIndex(stepIndex)
    setBugContext(null)
  }

  const activateSmoke = (smokeId: string, stepIndex = 0) => {
    const test = testMap[smokeId]
    if (!test || test.type !== 'smoke') {
      return
    }
    setRunTab('smoke')
    setActiveMode('smoke')
    setActiveItemId(smokeId)
    setSelectedSmokeId(smokeId)
    initializeRunForTest(test, stepIndex)
  }

  const activateScenario = (scenarioId: string, stepIndex = 0) => {
    const test = testMap[scenarioId]
    if (!test || test.type !== 'scenario') {
      return
    }
    setRunTab('scenario')
    setActiveMode('scenario')
    setActiveItemId(scenarioId)
    setSelectedScenarioId(scenarioId)
    initializeRunForTest(test, stepIndex)
  }

  const switchRunTab = (tab: RunTab) => {
    setRunTab(tab)
    if (tab === 'bugs') {
      return
    }
    if (tab === 'smoke') {
      const smokeId = selectedSmokeId ?? smokeTests[0]?.id
      if (smokeId) {
        setActiveMode('smoke')
        setActiveItemId(smokeId)
        setCurrentStepIndex(0)
        setBugContext(null)
      }
      return
    }
    const scenarioId = selectedScenarioId ?? scenarioTests[0]?.id
    if (scenarioId) {
      setActiveMode('scenario')
      setActiveItemId(scenarioId)
      setCurrentStepIndex(0)
      setBugContext(null)
    }
  }

  const runAllSmokeTests = () => {
    if (smokeTests.length === 0) {
      return
    }
    activateSmoke(smokeTests[0].id)
  }

  const openNextSmoke = () => {
    if (!activeItemId || activeMode !== 'smoke') {
      return
    }
    const currentIndex = smokeTests.findIndex((test) => test.id === activeItemId)
    if (currentIndex < 0) {
      return
    }
    const next = smokeTests[currentIndex + 1]
    if (!next) {
      return
    }
    activateSmoke(next.id)
  }

  const updateActiveRun = (updater: (run: RunResult, test: TestDefinition) => RunResult) => {
    if (!activeTest) {
      return
    }
    setProgressState((previous) => {
      const current = ensureRunState(activeTest, previous[activeTest.id])
      const next = updater(current, activeTest)
      const status = computeRunStatus(next, activeTest)
      return {
        ...previous,
        [activeTest.id]: {
          ...next,
          status,
          completedAt: status === 'passed' || status === 'failed' ? new Date().toISOString() : undefined,
        },
      }
    })
  }

  const toggleCheck = (stepId: string, check: string) => {
    updateActiveRun((current) => {
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
    updateActiveRun((current, test) => {
      const stepExecution = current.stepExecutions[stepId]
      if (!stepExecution) {
        return current
      }
      const updated: RunResult = {
        ...current,
        stepExecutions: {
          ...current.stepExecutions,
          [stepId]: {
            ...stepExecution,
            status,
          },
        },
      }

      if (status === 'passed' && currentStepIndex < test.steps.length - 1) {
        setCurrentStepIndex((index) => index + 1)
      }

      return updated
    })
  }

  const navigateStep = (direction: 'prev' | 'next') => {
    if (!activeTest) {
      return
    }
    if (direction === 'next' && !isCurrentStepPassed) {
      return
    }
    const delta = direction === 'next' ? 1 : -1
    setCurrentStepIndex((index) => Math.max(0, Math.min(index + delta, activeTest.steps.length - 1)))
  }

  const restartActiveRun = () => {
    if (!activeTest) {
      return
    }
    initializeRunForTest(activeTest)
  }

  const submitBug = (payload: Omit<BugReport, 'id'>) => {
    const bug: BugReport = { id: `bug-${Date.now()}`, ...payload }
    setBugs((previous) => [...previous, bug])
    updateActiveRun((current) => {
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

  const updateBug = (bugId: string, patch: Partial<BugReport>) => {
    setBugs((previous) => previous.map((bug) => (bug.id === bugId ? { ...bug, ...patch } : bug)))
  }

  const deleteBug = (bugId: string) => {
    setBugs((previous) => previous.filter((bug) => bug.id !== bugId))
  }

  const updateDraftTemplate = (templateId: string, updater: (template: SmokeTemplate) => SmokeTemplate) => {
    setDraftTemplates((previous) =>
      previous.map((template) => (template.id === templateId ? updater(template) : template)),
    )
  }

  const updateDraftScenarioTemplate = (
    templateId: string,
    updater: (template: SmokeTemplate) => SmokeTemplate,
  ) => {
    setDraftScenarioTemplates((previous) =>
      previous.map((template) => (template.id === templateId ? updater(template) : template)),
    )
  }

  const saveDraftTemplates = () => {
    const validation = validateSmokeTemplateFile({ smokeTests: draftTemplates })
    if (!validation.valid || !validation.file) {
      setValidationErrors(validation.errors)
      return
    }

    localStorage.setItem(SMOKE_TEMPLATES_BACKUP_KEY, JSON.stringify({ smokeTests: persistedTemplates }))
    localStorage.setItem(SMOKE_TEMPLATES_STORAGE_KEY, JSON.stringify(validation.file))
    setPersistedTemplates(validation.file.smokeTests)
    setDraftTemplates(validation.file.smokeTests)
    setValidationErrors([])
    setSuccessNotice(locale.ui.messages.savedChanges)
  }

  const cancelDraftChanges = () => {
    setDraftTemplates(persistedTemplates)
    setValidationErrors([])
    setNotice(null)
  }

  const saveScenarioDraftTemplates = () => {
    const validation = validateScenarioTemplateFile({ scenarios: draftScenarioTemplates })
    if (!validation.valid || !validation.file) {
      setScenarioValidationErrors(validation.errors)
      return
    }

    localStorage.setItem(
      SCENARIO_TEMPLATES_BACKUP_KEY,
      JSON.stringify({ scenarios: persistedScenarioTemplates }),
    )
    localStorage.setItem(SCENARIO_TEMPLATES_STORAGE_KEY, JSON.stringify(validation.file))
    setPersistedScenarioTemplates(validation.file.scenarios)
    setDraftScenarioTemplates(validation.file.scenarios)
    setScenarioValidationErrors([])
    setScenarioNotice(locale.ui.messages.savedChanges)
    window.setTimeout(() => setScenarioNotice(null), 2000)
  }

  const cancelScenarioDraftChanges = () => {
    setDraftScenarioTemplates(persistedScenarioTemplates)
    setScenarioValidationErrors([])
    setScenarioNotice(null)
  }

  const handleImportJson = async (file: File) => {
    const text = await file.text()
    const parsed = JSON.parse(text) as SmokeTemplateFile
    const validation = validateSmokeTemplateFile(parsed)
    if (!validation.valid || !validation.file) {
      setValidationErrors(validation.errors)
      return
    }
    setDraftTemplates(validation.file.smokeTests)
    setSelectedTemplateId(validation.file.smokeTests[0]?.id ?? null)
    setSuccessNotice(locale.ui.messages.importSuccess)
  }

  const handleImportExcel = async (file: File) => {
    const parsed = importTemplatesFromExcel(await file.arrayBuffer())
    const validation = validateSmokeTemplateFile(parsed)
    if (!validation.valid || !validation.file) {
      setValidationErrors(validation.errors)
      return
    }
    setDraftTemplates(validation.file.smokeTests)
    setSelectedTemplateId(validation.file.smokeTests[0]?.id ?? null)
    setSuccessNotice(locale.ui.messages.importSuccess)
  }

  const handleImportScenarioJson = async (file: File) => {
    const text = await file.text()
    const parsed = JSON.parse(text) as { scenarios: SmokeTemplate[] }
    const validation = validateScenarioTemplateFile(parsed)
    if (!validation.valid || !validation.file) {
      setScenarioValidationErrors(validation.errors)
      return
    }
    setDraftScenarioTemplates(validation.file.scenarios)
    setSelectedScenarioTemplateId(validation.file.scenarios[0]?.id ?? null)
    setScenarioNotice(locale.ui.messages.importSuccess)
    window.setTimeout(() => setScenarioNotice(null), 2000)
  }

  const handleImportScenarioExcel = async (file: File) => {
    const parsed = importScenarioTemplatesFromExcel(await file.arrayBuffer())
    const validation = validateScenarioTemplateFile(parsed)
    if (!validation.valid || !validation.file) {
      setScenarioValidationErrors(validation.errors)
      return
    }
    setDraftScenarioTemplates(validation.file.scenarios)
    setSelectedScenarioTemplateId(validation.file.scenarios[0]?.id ?? null)
    setScenarioNotice(locale.ui.messages.importSuccess)
    window.setTimeout(() => setScenarioNotice(null), 2000)
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
      setDraftTemplates(validation.file.smokeTests)
      setSelectedTemplateId(validation.file.smokeTests[0]?.id ?? null)
      setSuccessNotice(locale.ui.messages.restoreSuccess)
    } catch {
      setNotice(locale.ui.messages.noBackup)
    }
  }

  const handleRestoreScenarioBackup = () => {
    const raw = localStorage.getItem(SCENARIO_TEMPLATES_BACKUP_KEY)
    if (!raw) {
      setScenarioNotice(locale.ui.messages.noBackup)
      return
    }
    try {
      const parsed = JSON.parse(raw) as { scenarios: SmokeTemplate[] }
      const validation = validateScenarioTemplateFile(parsed)
      if (!validation.valid || !validation.file) {
        setScenarioValidationErrors(validation.errors)
        return
      }
      setDraftScenarioTemplates(validation.file.scenarios)
      setSelectedScenarioTemplateId(validation.file.scenarios[0]?.id ?? null)
      setScenarioNotice(locale.ui.messages.restoreSuccess)
      window.setTimeout(() => setScenarioNotice(null), 2000)
    } catch {
      setScenarioNotice(locale.ui.messages.noBackup)
    }
  }

  const showBugForm =
    activeTest && activeStep && bugContext?.testId === activeTest.id && bugContext.stepId === activeStep.id

  const runTabs = [
    { id: 'smoke' as const, label: locale.ui.sections.smoke },
    { id: 'scenario' as const, label: locale.ui.sections.scenarios },
    { id: 'bugs' as const, label: locale.ui.sections.bugs },
  ]
  const isEmbedded = window.self !== window.top

  const renderRunMode = () => (
    <>
      {runTab === 'bugs' ? (
        <section className="main-content full-width">
          <BugList bugs={bugs} onUpdateBug={updateBug} onDeleteBug={deleteBug} />
        </section>
      ) : (
        <div className="layout">
          <aside className="sidebar">
            <h1 className="sidebar-app-title">{locale.ui.appTitle}</h1>
            {runTab === 'smoke' ? (
              <section className="sidebar-section">
                <div className="section-title">
                  <h2>{locale.ui.sections.smoke}</h2>
                  <button onClick={runAllSmokeTests}>
                    <span className="btn-ic">▶</span>
                    {locale.ui.actions.runAllSmoke}
                  </button>
                </div>
                <SmokeSummary runs={progressState} smokeIds={smokeTests.map((test) => test.id)} />
                <div className="test-list">
                  {smokeTests.map((test) => (
                    <TestCard
                      key={test.id}
                      test={test}
                      run={progressState[test.id]}
                      isActive={selectedSmokeId === test.id}
                      isSmoke
                      onSelect={(testId) => activateSmoke(testId)}
                      onRun={(testId) => activateSmoke(testId)}
                      onEdit={(testId) => {
                        setEditTab('smoke')
                        setSelectedTemplateId(testId)
                        navigate('/edit')
                      }}
                      onRerunFromFailed={(testId, stepIndex) => activateSmoke(testId, stepIndex)}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="sidebar-section">
                <h2>{locale.ui.sections.scenarios}</h2>
                <div className="test-list">
                  {scenarioTests.map((test) => (
                    <TestCard
                      key={test.id}
                      test={test}
                      run={progressState[test.id]}
                      isActive={selectedScenarioId === test.id}
                      onSelect={(testId) => activateScenario(testId)}
                      onRun={(testId) => activateScenario(testId)}
                      onEdit={(testId) => {
                        setEditTab('scenario')
                        setSelectedScenarioTemplateId(testId)
                        navigate('/edit')
                      }}
                      onRerunFromFailed={(testId, stepIndex) => activateScenario(testId, stepIndex)}
                    />
                  ))}
                </div>
              </section>
            )}
          </aside>

          <section className="main-content">
            {activeTest && activeRun ? (
              <>
                <ScenarioRunner
                  test={activeTest}
                  run={activeRun}
                  currentStepIndex={currentStepIndex}
                  canGoNext={isCurrentStepPassed}
                  smokeQueueLabel={
                    activeMode === 'smoke'
                      ? localize(locale.ui.messages.smokeQueue, {
                          current: smokeTests.findIndex((test) => test.id === activeItemId) + 1,
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
                  onRestart={restartActiveRun}
                  onNextSmoke={activeMode === 'smoke' ? openNextSmoke : undefined}
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
              </section>
            )}
          </section>
        </div>
      )}
    </>
  )

  const renderEditMode = () => (
    <div className="edit-layout">
      <div className="editor-switch">
        <button
          className={`secondary ${editTab === 'smoke' ? 'editor-switch__active' : ''}`}
          onClick={() => setEditTab('smoke')}
        >
          {locale.ui.sections.smokeEditor}
        </button>
        <button
          className={`secondary ${editTab === 'scenario' ? 'editor-switch__active' : ''}`}
          onClick={() => setEditTab('scenario')}
        >
          {locale.ui.sections.scenarioEditor}
        </button>
      </div>

      {editTab === 'smoke' ? (
        <SmokeEditor
          title={locale.ui.sections.smokeEditor}
          createLabel={locale.ui.actions.createTemplate}
          selectLabel={locale.ui.labels.selectSmoke}
          templates={draftTemplates}
          selectedTemplateId={selectedTemplateId}
          validationErrors={validationErrors}
          notice={notice}
          isDirty={isEditDirty}
          onSelectTemplate={setSelectedTemplateId}
          onCreateTemplate={() => {
            const next = createTemplate()
            setDraftTemplates((previous) => [...previous, next])
            setSelectedTemplateId(next.id)
          }}
          onDuplicateTemplate={(id) => {
            const original = draftTemplates.find((template) => template.id === id)
            if (!original) {
              return
            }
            const copy = cloneTemplate(original)
            setDraftTemplates((previous) => [...previous, copy])
            setSelectedTemplateId(copy.id)
          }}
          onDeleteTemplate={(id) => {
            setDraftTemplates((previous) => previous.filter((template) => template.id !== id))
            setSelectedTemplateId((current) => {
              if (current !== id) {
                return current
              }
              const next = draftTemplates.find((template) => template.id !== id)
              return next?.id ?? null
            })
          }}
          onSaveTemplate={saveDraftTemplates}
          onCancelChanges={cancelDraftChanges}
          onUpdateTemplateName={(id, name) => {
            updateDraftTemplate(id, (template) => ({ ...template, name }))
          }}
          onAddStep={(id) => {
            updateDraftTemplate(id, (template) => ({
              ...template,
              steps: [
                ...template.steps,
                {
                  id: `step-${Date.now()}`,
                  title: `Шаг ${template.steps.length + 1}`,
                  checks: [],
                },
              ],
            }))
          }}
          onDeleteStep={(id, stepIndex) => {
            updateDraftTemplate(id, (template) => {
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
            updateDraftTemplate(id, (template) => {
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
            updateDraftTemplate(id, (template) => ({
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
            updateDraftTemplate(id, (template) => ({
              ...template,
              steps: template.steps.map((step, index) =>
                index === stepIndex
                  ? {
                      ...step,
                      checks: [...step.checks, ''],
                    }
                  : step,
              ),
            }))
          }}
          onUpdateCheck={(id, stepIndex, checkIndex, value) => {
            updateDraftTemplate(id, (template) => ({
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
            updateDraftTemplate(id, (template) => ({
              ...template,
              steps: template.steps.map((step, index) =>
                index === stepIndex
                  ? {
                      ...step,
                      checks: step.checks.filter((_, currentCheckIndex) => currentCheckIndex !== checkIndex),
                    }
                  : step,
              ),
            }))
          }}
          onImportJson={(file) => {
            handleImportJson(file).catch(() => undefined)
          }}
          onExportJson={() => {
            downloadText('smoke-tests.json', exportTemplatesAsJson(draftTemplates))
          }}
          onImportExcel={(file) => {
            handleImportExcel(file).catch(() => undefined)
          }}
          onExportExcel={() => {
            downloadArrayBuffer('smoke-tests.xlsx', exportTemplatesAsExcel(draftTemplates))
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
      ) : (
        <SmokeEditor
          title={locale.ui.sections.scenarioEditor}
          createLabel={locale.ui.actions.createScenario}
          selectLabel={locale.ui.labels.selectScenario}
          templates={draftScenarioTemplates}
          selectedTemplateId={selectedScenarioTemplateId}
          validationErrors={scenarioValidationErrors}
          notice={scenarioNotice}
          isDirty={isScenarioEditDirty}
          onSelectTemplate={setSelectedScenarioTemplateId}
          onCreateTemplate={() => {
            const next = createScenarioTemplate()
            setDraftScenarioTemplates((previous) => [...previous, next])
            setSelectedScenarioTemplateId(next.id)
          }}
          onDuplicateTemplate={(id) => {
            const original = draftScenarioTemplates.find((template) => template.id === id)
            if (!original) {
              return
            }
            const copy = cloneScenarioTemplate(original)
            setDraftScenarioTemplates((previous) => [...previous, copy])
            setSelectedScenarioTemplateId(copy.id)
          }}
          onDeleteTemplate={(id) => {
            setDraftScenarioTemplates((previous) => previous.filter((template) => template.id !== id))
            setSelectedScenarioTemplateId((current) => {
              if (current !== id) {
                return current
              }
              const next = draftScenarioTemplates.find((template) => template.id !== id)
              return next?.id ?? null
            })
          }}
          onSaveTemplate={saveScenarioDraftTemplates}
          onCancelChanges={cancelScenarioDraftChanges}
          onUpdateTemplateName={(id, name) => {
            updateDraftScenarioTemplate(id, (template) => ({ ...template, name }))
          }}
          onAddStep={(id) => {
            updateDraftScenarioTemplate(id, (template) => ({
              ...template,
              steps: [
                ...template.steps,
                {
                  id: `step-${Date.now()}`,
                  title: `Шаг ${template.steps.length + 1}`,
                  checks: [],
                },
              ],
            }))
          }}
          onDeleteStep={(id, stepIndex) => {
            updateDraftScenarioTemplate(id, (template) => {
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
            updateDraftScenarioTemplate(id, (template) => {
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
            updateDraftScenarioTemplate(id, (template) => ({
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
            updateDraftScenarioTemplate(id, (template) => ({
              ...template,
              steps: template.steps.map((step, index) =>
                index === stepIndex
                  ? {
                      ...step,
                      checks: [...step.checks, ''],
                    }
                  : step,
              ),
            }))
          }}
          onUpdateCheck={(id, stepIndex, checkIndex, value) => {
            updateDraftScenarioTemplate(id, (template) => ({
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
            updateDraftScenarioTemplate(id, (template) => ({
              ...template,
              steps: template.steps.map((step, index) =>
                index === stepIndex
                  ? {
                      ...step,
                      checks: step.checks.filter((_, currentCheckIndex) => currentCheckIndex !== checkIndex),
                    }
                  : step,
              ),
            }))
          }}
          onImportJson={(file) => {
            handleImportScenarioJson(file).catch(() => undefined)
          }}
          onExportJson={() => {
            downloadText('scenarios.json', exportScenarioTemplatesAsJson(draftScenarioTemplates))
          }}
          onImportExcel={(file) => {
            handleImportScenarioExcel(file).catch(() => undefined)
          }}
          onExportExcel={() => {
            downloadArrayBuffer('scenarios.xlsx', exportScenarioTemplatesAsExcel(draftScenarioTemplates))
          }}
          onRestoreBackup={handleRestoreScenarioBackup}
          onExportBackup={() => {
            const backup = localStorage.getItem(SCENARIO_TEMPLATES_BACKUP_KEY)
            if (!backup) {
              setScenarioNotice(locale.ui.messages.noBackup)
              return
            }
            downloadText('scenarios.backup.json', backup)
          }}
        />
      )}
    </div>
  )

  return (
    <main className="app">
      <header className="page-header">
        {!isEmbedded && (
          <div className="header-main">
            <div className="header-title">
              <h1>{locale.ui.appTitle}</h1>
              <p className="header-subtitle">Smoke + Scenario Runner</p>
            </div>
            <div className="status-strip">
              <span className={`chip ${route === '/run' ? 'chip--ok' : 'chip--warn'}`}>
                Режим: {route === '/run' ? 'Запуск' : 'Редактор'}
              </span>
              <span className="chip chip--info">Тема: {theme === 'light' ? 'Light' : 'Dark'}</span>
            </div>
          </div>
        )}

        <div className="header-bar">
          <div className="header-left">
            {route === '/run' ? (
              <nav className="run-tabs">
                {runTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`secondary run-tab ${runTab === tab.id ? 'run-tab--active' : ''}`}
                    onClick={() => switchRunTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            ) : (
              <h2 className="editor-title">{locale.ui.sections.templateEditors}</h2>
            )}
          </div>

          <div className="header-actions">
            {route === '/run' ? (
              <button className="secondary" onClick={() => navigate('/edit')}>
                <span className="btn-ic">✎</span>
                {locale.ui.actions.openSmokeEditor}
              </button>
            ) : (
              <button className="secondary" onClick={() => navigate('/run')}>
                <span className="btn-ic">←</span>
                {locale.ui.actions.backToRun}
              </button>
            )}

            <label className="theme-toggle">
              <button
                type="button"
                className="secondary theme-icon-button"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                title={locale.ui.theme.label}
              >
                <span className="btn-ic">{theme === 'light' ? '◐' : '◑'}</span>
                Тема
              </button>
            </label>
          </div>
        </div>
      </header>

      {route === '/run' ? renderRunMode() : renderEditMode()}
    </main>
  )
}

export default App
