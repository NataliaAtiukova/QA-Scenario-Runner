import * as XLSX from 'xlsx'
import type { SmokeTemplate, SmokeTemplateFile, TestDefinition } from '../types'

const SHEET_NAME = 'SmokeTests'

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

export function createTemplate(name = 'Новый смок'): SmokeTemplate {
  return {
    id: uniqueId('smoke'),
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

export function cloneTemplate(template: SmokeTemplate): SmokeTemplate {
  return {
    id: uniqueId('smoke'),
    name: `${template.name} (копия)`,
    steps: template.steps.map((step) => ({
      id: uniqueId('step'),
      title: step.title,
      checks: [...step.checks],
    })),
  }
}

export function validateSmokeTemplateFile(
  raw: unknown,
): { valid: boolean; errors: string[]; file?: SmokeTemplateFile } {
  const errors: string[] = []

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['JSON должен быть объектом.'] }
  }

  const candidate = raw as { smokeTests?: unknown }
  if (!Array.isArray(candidate.smokeTests)) {
    return { valid: false, errors: ['Поле smokeTests должно быть массивом.'] }
  }

  const smokeTests: SmokeTemplate[] = candidate.smokeTests.map((item, index) => {
    const row = item as { id?: unknown; name?: unknown; steps?: unknown }
    const name = typeof row.name === 'string' ? row.name.trim() : ''

    if (!name) {
      errors.push(`Смок #${index + 1}: пустое имя.`)
    }

    if (!Array.isArray(row.steps) || row.steps.length === 0) {
      errors.push(`Смок "${name || index + 1}": нужен минимум 1 шаг.`)
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
            errors.push(`Смок "${name || index + 1}": шаг #${stepIndex + 1} без названия.`)
          }
          if (checks.length === 0) {
            errors.push(`Смок "${name || index + 1}": шаг "${title || stepIndex + 1}" без чек-листа.`)
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
          : normalizeId(name || `smoke-${index + 1}`) || uniqueId('smoke'),
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
    file: { smokeTests },
  }
}

export function templatesToTests(templates: SmokeTemplate[]): TestDefinition[] {
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    type: 'smoke',
    description: `Шаблон смок-теста: ${template.name}`,
    estimatedMinutes: Math.max(1, Math.min(2, template.steps.length)),
    steps: template.steps.map((step) => ({
      id: step.id,
      title: step.title,
      expectedResult: 'Все проверки шага выполнены.',
      checks: step.checks,
    })),
  }))
}

export function exportTemplatesAsJson(templates: SmokeTemplate[]): string {
  const payload: SmokeTemplateFile = { smokeTests: templates }
  return JSON.stringify(payload, null, 2)
}

export function exportTemplatesAsExcel(templates: SmokeTemplate[]): ArrayBuffer {
  const rows: Array<{ 'Smoke Name': string; Step: string; Check: string }> = []

  templates.forEach((template) => {
    template.steps.forEach((step) => {
      step.checks.forEach((check) => {
        rows.push({
          'Smoke Name': template.name,
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

export function importTemplatesFromExcel(buffer: ArrayBuffer): SmokeTemplateFile {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error('В Excel-файле нет листов.')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)
  const map = new Map<string, Map<string, string[]>>()

  rows.forEach((row) => {
    const smokeName = String(row['Smoke Name'] ?? '').trim()
    const stepTitle = String(row.Step ?? '').trim()
    const check = String(row.Check ?? '').trim()
    if (!smokeName || !stepTitle || !check) {
      return
    }

    if (!map.has(smokeName)) {
      map.set(smokeName, new Map())
    }

    const stepMap = map.get(smokeName)
    if (!stepMap) {
      return
    }

    if (!stepMap.has(stepTitle)) {
      stepMap.set(stepTitle, [])
    }
    stepMap.get(stepTitle)?.push(check)
  })

  const smokeTests: SmokeTemplate[] = Array.from(map.entries()).map(([smokeName, stepsMap]) => ({
    id: normalizeId(smokeName) || uniqueId('smoke'),
    name: smokeName,
    steps: Array.from(stepsMap.entries()).map(([stepTitle, checks], index) => ({
      id: normalizeId(stepTitle) || `step-${index + 1}`,
      title: stepTitle,
      checks,
    })),
  }))

  return { smokeTests }
}
