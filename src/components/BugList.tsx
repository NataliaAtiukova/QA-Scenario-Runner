import { locale } from '../locales'
import type { BugReport } from '../types'

interface BugListProps {
  bugs: BugReport[]
}

export function BugList({ bugs }: BugListProps) {
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
                  <button
                    className="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(bug.ticket).catch(() => undefined)
                    }}
                  >
                    {locale.ui.actions.copyTicket}
                  </button>
                </header>

                <div className="bug-item__grid">
                  <p>
                    <strong>{locale.ui.labels.expected}:</strong> {bug.expectedResult}
                  </p>
                  <p className="bug-item__actual">
                    <strong>{locale.ui.labels.actual}:</strong> {bug.actualResult}
                  </p>
                </div>
                <textarea value={bug.ticket} readOnly rows={7} />
              </article>
            ))}
        </section>
      ))}
    </section>
  )
}
