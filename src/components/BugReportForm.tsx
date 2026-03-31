import { useState } from 'react'
import type { BugReport, StepDefinition, TestDefinition } from '../types'
import { buildTicket } from '../utils/ticket'

interface BugReportFormProps {
  test: TestDefinition
  step: StepDefinition
  onSubmit: (bug: Omit<BugReport, 'id' | 'ticket'> & { ticket: string }) => void
  onCancel: () => void
}

export function BugReportForm({ test, step, onSubmit, onCancel }: BugReportFormProps) {
  const [actualResult, setActualResult] = useState('')
  const [notes, setNotes] = useState('')

  const timestamp = new Date().toISOString()

  const ticket = buildTicket({
    testName: test.name,
    stepName: step.title,
    reproductionSteps: test.steps.map((item, index) => `${index + 1}. ${item.title}`),
    expectedResult: step.expectedResult,
    actualResult,
    timestamp,
    notes,
  })

  const canSubmit = actualResult.trim().length > 0

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    onSubmit({
      testId: test.id,
      testName: test.name,
      testType: test.type,
      stepId: step.id,
      stepName: step.title,
      timestamp,
      expectedResult: step.expectedResult,
      actualResult,
      notes,
      ticket,
    })
  }

  return (
    <aside className="bug-form">
      <h4>Bug Report</h4>
      <form onSubmit={handleSubmit}>
        <label>
          Scenario / Smoke
          <input value={test.name} readOnly />
        </label>

        <label>
          Step
          <input value={step.title} readOnly />
        </label>

        <label>
          Timestamp
          <input value={timestamp} readOnly />
        </label>

        <label>
          Expected result
          <textarea value={step.expectedResult} readOnly rows={2} />
        </label>

        <label>
          Actual result
          <textarea
            value={actualResult}
            onChange={(event) => setActualResult(event.target.value)}
            rows={3}
            placeholder="What happened instead?"
          />
        </label>

        <label>
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Optional context"
          />
        </label>

        <label>
          Ticket preview
          <textarea value={ticket} readOnly rows={10} />
        </label>

        <div className="bug-form__actions">
          <button type="submit" disabled={!canSubmit}>
            Save bug + ticket
          </button>
          <button type="button" className="secondary" onClick={onCancel}>
            Close
          </button>
        </div>
      </form>
    </aside>
  )
}
