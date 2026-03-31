import type { TicketPayload } from '../types'

export function buildTicket(payload: TicketPayload): string {
  return [
    '### QA Bug Ticket',
    '',
    `Scenario: ${payload.testName}`,
    `Step: ${payload.stepName}`,
    `Timestamp: ${payload.timestamp}`,
    '',
    'Reproduction Steps:',
    ...payload.reproductionSteps.map((step, index) => `${index + 1}. ${step}`),
    '',
    `Expected: ${payload.expectedResult}`,
    `Actual: ${payload.actualResult}`,
    '',
    `Notes: ${payload.notes || 'N/A'}`,
  ].join('\n')
}
