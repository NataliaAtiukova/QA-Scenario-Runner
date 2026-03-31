export type TestType = 'scenario' | 'smoke'

export type StepStatus = 'pending' | 'passed' | 'failed'

export type RunStatus = 'not_started' | 'in_progress' | 'passed' | 'failed'

export interface StepDefinition {
  id: string
  title: string
  expectedResult: string
  checks: string[]
}

export interface TestDefinition {
  id: string
  name: string
  type: TestType
  description: string
  estimatedMinutes: number
  steps: StepDefinition[]
}

export interface StepExecution {
  status: StepStatus
  checks: Record<string, boolean>
  bugId?: string
}

export interface RunResult {
  testId: string
  startedAt?: string
  completedAt?: string
  status: RunStatus
  currentStepIndex: number
  stepExecutions: Record<string, StepExecution>
}

export interface BugReport {
  id: string
  testId: string
  testName: string
  testType: TestType
  stepId: string
  stepName: string
  timestamp: string
  expectedResult: string
  actualResult: string
  notes: string
  ticket: string
}

export interface TicketPayload {
  testName: string
  stepName: string
  reproductionSteps: string[]
  expectedResult: string
  actualResult: string
  timestamp: string
  notes: string
}

export interface SmokeTemplateStep {
  id: string
  title: string
  checks: string[]
}

export interface SmokeTemplate {
  id: string
  name: string
  steps: SmokeTemplateStep[]
}

export interface SmokeTemplateFile {
  smokeTests: SmokeTemplate[]
}
