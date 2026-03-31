import { locale } from '../locales'
import type { TicketPayload } from '../types'

export function buildTicket(payload: TicketPayload): string {
  return [
    '### Тикет QA',
    '',
    `${locale.ui.labels.scenarioSmoke}: ${payload.testName}`,
    `${locale.ui.labels.step}: ${payload.stepName}`,
    `${locale.ui.labels.timestamp}: ${payload.timestamp}`,
    '',
    'Шаги воспроизведения:',
    ...payload.reproductionSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    `${locale.ui.labels.expected}: ${payload.expectedResult}`,
    `${locale.ui.labels.actual}: ${payload.actualResult}`,
    '',
    `${locale.ui.labels.notes}: ${payload.notes || '-'}`,
  ].join('\n')
}
