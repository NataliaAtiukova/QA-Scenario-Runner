import * as XLSX from 'xlsx'
import type { SmokeTemplate, TestDefinition } from '../types'

const SHEET_NAME = 'Scenarios'

interface ScenarioTemplateFile {
  scenarios: SmokeTemplate[]
}

function normalizeId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
}

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

export function createScenarioTemplate(name = 'Новый сценарий'): SmokeTemplate {
  return {
    id: uniqueId('scenario'),
    name,
    steps: [
      {
        id: uniqueId('step'),
        title: 'Новый шаг',
        checks: [],
      },
    ],
  }
}

export function cloneScenarioTemplate(template: SmokeTemplate): SmokeTemplate {
  return {
    id: uniqueId('scenario'),
    name: `${template.name} (копия)`,
    steps: template.steps.map((step) => ({
      id: uniqueId('step'),
      title: step.title,
      checks: [...step.checks],
    })),
  }
}

export function validateScenarioTemplateFile(
  raw: unknown,
): { valid: boolean; errors: string[]; file?: ScenarioTemplateFile } {
  const errors: string[] = []

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['JSON должен быть объектом.'] }
  }

  const candidate = raw as { scenarios?: unknown }
  if (!Array.isArray(candidate.scenarios)) {
    return { valid: false, errors: ['Поле scenarios должно быть массивом.'] }
  }

  const scenarios: SmokeTemplate[] = candidate.scenarios.map((item, index) => {
    const row = item as { id?: unknown; name?: unknown; steps?: unknown }
    const name = typeof row.name === 'string' ? row.name.trim() : ''

    if (!name) {
      errors.push(`Сценарий #${index + 1}: пустое имя.`)
    }

    if (!Array.isArray(row.steps) || row.steps.length === 0) {
      errors.push(`Сценарий "${name || index + 1}": нужен минимум 1 шаг.`)
    }

    const steps = Array.isArray(row.steps)
      ? row.steps.map((stepItem, stepIndex) => {
          const step = stepItem as { id?: unknown; title?: unknown; checks?: unknown }
          const title = typeof step.title === 'string' ? step.title.trim() : ''
          const checksRaw = Array.isArray(step.checks) ? step.checks : []
          const checks = checksRaw
            .map((value) => (typeof value === 'string' ? value.trim() : ''))
            .filter((value) => value.length > 0)

          if (!title) {
            errors.push(`Сценарий "${name || index + 1}": шаг #${stepIndex + 1} без названия.`)
          }
          if (checks.length === 0) {
            errors.push(`Сценарий "${name || index + 1}": шаг "${title || stepIndex + 1}" без чек-листа.`)
          }

          return {
            id:
              typeof step.id === 'string' && step.id.trim().length > 0
                ? step.id
                : `${normalizeId(title || `step-${stepIndex + 1}`)}-${stepIndex + 1}`,
            title,
            checks,
          }
        })
      : []

    return {
      id:
        typeof row.id === 'string' && row.id.trim().length > 0
          ? row.id
          : normalizeId(name || `scenario-${index + 1}`) || uniqueId('scenario'),
      name,
      steps,
    }
  })

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    file: { scenarios },
  }
}

export function templatesToScenarioTests(templates: SmokeTemplate[]): TestDefinition[] {
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    type: 'scenario',
    description: `Редактируемый сценарий: ${template.name}`,
    estimatedMinutes: Math.max(2, template.steps.length * 2),
    steps: template.steps.map((step) => ({
      id: step.id,
      title: step.title,
      expectedResult: 'Все проверки шага выполнены.',
      checks: step.checks,
    })),
  }))
}

export function exportScenarioTemplatesAsJson(templates: SmokeTemplate[]): string {
  const payload: ScenarioTemplateFile = { scenarios: templates }
  return JSON.stringify(payload, null, 2)
}

export function exportScenarioTemplatesAsExcel(templates: SmokeTemplate[]): ArrayBuffer {
  const rows: Array<{ 'Scenario Name': string; Step: string; Check: string }> = []

  templates.forEach((template) => {
    template.steps.forEach((step) => {
      step.checks.forEach((check) => {
        rows.push({
          'Scenario Name': template.name,
          Step: step.title,
          Check: check,
        })
      })
    })
  })

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME)

  return XLSX.write(workbook, {
    type: 'array',
    bookType: 'xlsx',
  })
}

export function importScenarioTemplatesFromExcel(buffer: ArrayBuffer): ScenarioTemplateFile {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('В Excel-файле нет листов.')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)
  const map = new Map<string, Map<string, string[]>>()

  rows.forEach((row) => {
    const scenarioName = String(row['Scenario Name'] ?? '').trim()
    const stepTitle = String(row.Step ?? '').trim()
    const check = String(row.Check ?? '').trim()

    if (!scenarioName || !stepTitle || !check) {
      return
    }

    if (!map.has(scenarioName)) {
      map.set(scenarioName, new Map())
    }

    const stepMap = map.get(scenarioName)
    if (!stepMap) {
      return
    }

    if (!stepMap.has(stepTitle)) {
      stepMap.set(stepTitle, [])
    }

    stepMap.get(stepTitle)?.push(check)
  })

  const scenarios: SmokeTemplate[] = Array.from(map.entries()).map(([scenarioName, stepsMap]) => ({
    id: normalizeId(scenarioName) || uniqueId('scenario'),
    name: scenarioName,
    steps: Array.from(stepsMap.entries()).map(([stepTitle, checks], index) => ({
      id: normalizeId(stepTitle) || `step-${index + 1}`,
      title: stepTitle,
      checks,
    })),
  }))

  return { scenarios }
}
