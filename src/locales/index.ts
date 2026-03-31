import ru from './ru.json'
import type { RunStatus, StepStatus, TestDefinition } from '../types'

export type ThemeMode = 'light' | 'dark'

export const locale = ru

export function localize(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  )
}

export function getStatusLabel(status: RunStatus | StepStatus): string {
  return locale.ui.statuses[status]
}

export const smokeTests = locale.tests.smoke as TestDefinition[]
export const fullScenarios = locale.tests.scenarios as TestDefinition[]
export const allTests = [...smokeTests, ...fullScenarios]
