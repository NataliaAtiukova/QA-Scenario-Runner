import { useState } from 'react'
import { locale } from '../locales'
import type { BugReport } from '../types'

interface BugListProps {
  bugs: BugReport[]
  onUpdateBug: (bugId: string, patch: Partial<BugReport>) => void
  onDeleteBug: (bugId: string) => void
}

export function BugList({ bugs, onUpdateBug, onDeleteBug }: BugListProps) {
  const [editingBugId, setEditingBugId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Pick<BugReport, 'expectedResult' | 'actualResult' | 'notes' | 'ticket'> | null>(
    null,
  )

  const startEdit = (bug: BugReport) => {
    setEditingBugId(bug.id)
    setDraft({
      expectedResult: bug.expectedResult,
      actualResult: bug.actualResult,
      notes: bug.notes,
      ticket: bug.ticket,
    })
  }

  const cancelEdit = () => {
    setEditingBugId(null)
    setDraft(null)
  }

  const saveEdit = () => {
    if (!editingBugId || !draft) {
      return
    }
    onUpdateBug(editingBugId, draft)
    setEditingBugId(null)
    setDraft(null)
  }

  if (bugs.length === 0) {
    return (
      <section className="bug-list">
        <h2>{locale.ui.sections.bugs}</h2>
        <p>{locale.ui.messages.noBugsInTab}</p>
      </section>
    )
  }

  const grouped = bugs.reduce<Record<string, BugReport[]>>((acc, bug) => {
    const key = `${bug.testType === 'smoke' ? locale.ui.labels.typeSmoke : locale.ui.labels.typeScenario}: ${bug.testName}`
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(bug)
    return acc
  }, {})

  return (
    <section className="bug-list">
      <h2>{locale.ui.sections.bugs}</h2>
      {Object.entries(grouped).map(([groupTitle, groupBugs]) => (
        <section key={groupTitle} className="bug-group">
          <h4>{groupTitle}</h4>
          {groupBugs
            .slice()
            .reverse()
            .map((bug) => (
              <article key={bug.id} className="bug-item">
                <header className="bug-item__header">
                  <div>
                    <strong>
                      {bug.testName} &gt; {locale.ui.labels.step} {bug.stepName}
                    </strong>
                    <p>{new Date(bug.timestamp).toLocaleString('ru-RU')}</p>
                  </div>
                  <div className="bug-item__actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(bug.ticket).catch(() => undefined)
                      }}
                    >
                      {locale.ui.actions.copyTicket}
                    </button>
                    {editingBugId === bug.id ? (
                      <>
                        <button onClick={saveEdit}>{locale.ui.actions.save}</button>
                        <button className="secondary" onClick={cancelEdit}>
                          {locale.ui.actions.cancel}
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="secondary" onClick={() => startEdit(bug)}>
                          {locale.ui.actions.edit}
                        </button>
                        <button className="secondary" onClick={() => onDeleteBug(bug.id)}>
                          {locale.ui.actions.delete}
                        </button>
                      </>
                    )}
                  </div>
                </header>

                <div className="bug-item__grid">
                  {editingBugId === bug.id && draft ? (
                    <>
                      <label>
                        <strong>{locale.ui.labels.expected}:</strong>
                        <textarea
                          rows={3}
                          value={draft.expectedResult}
                          onChange={(event) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    expectedResult: event.target.value,
                                  }
                                : prev,
                            )
                          }
                        />
                      </label>
                      <label className="bug-item__actual">
                        <strong>{locale.ui.labels.actual}:</strong>
                        <textarea
                          rows={3}
                          value={draft.actualResult}
                          onChange={(event) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    actualResult: event.target.value,
                                  }
                                : prev,
                            )
                          }
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>{locale.ui.labels.expected}:</strong> {bug.expectedResult}
                      </p>
                      <p className="bug-item__actual">
                        <strong>{locale.ui.labels.actual}:</strong> {bug.actualResult}
                      </p>
                    </>
                  )}
                </div>
                {editingBugId === bug.id && draft ? (
                  <>
                    <label>
                      <strong>{locale.ui.labels.notes}:</strong>
                      <textarea
                        rows={2}
                        value={draft.notes}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  notes: event.target.value,
                                }
                              : prev,
                          )
                        }
                      />
                    </label>
                    <label>
                      <strong>{locale.ui.labels.ticketPreview}:</strong>
                      <textarea
                        rows={7}
                        value={draft.ticket}
                        onChange={(event) =>
                          setDraft((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  ticket: event.target.value,
                                }
                              : prev,
                          )
                        }
                      />
                    </label>
                  </>
                ) : (
                  <textarea value={bug.ticket} readOnly rows={7} />
                )}
              </article>
            ))}
        </section>
      ))}
    </section>
  )
}
