import { locale } from '../locales'
import type { BugReport } from '../types'

interface BugListProps {
  bugs: BugReport[]
}

export function BugList({ bugs }: BugListProps) {
  if (bugs.length === 0) {
    return (
      <section className="bug-list">
        <h3>{locale.ui.sections.bugs}</h3>
        <p>{locale.ui.messages.noBugs}</p>
      </section>
    )
  }

  return (
    <section className="bug-list">
      <h3>{locale.ui.sections.bugs}</h3>
      {bugs
        .slice()
        .reverse()
        .map((bug) => (
          <article key={bug.id} className="bug-item">
            <header>
              <strong>{bug.testName}</strong>
              <span>{new Date(bug.timestamp).toLocaleString('ru-RU')}</span>
            </header>
            <p>
              {locale.ui.labels.step}: <strong>{bug.stepName}</strong>
            </p>
            <p>
              {locale.ui.labels.expected}: {bug.expectedResult}
              <br />
              {locale.ui.labels.actual}: {bug.actualResult}
            </p>
            <button
              className="secondary"
              onClick={() => {
                navigator.clipboard.writeText(bug.ticket).catch(() => undefined)
              }}
            >
              {locale.ui.actions.copyTicket}
            </button>
            <textarea value={bug.ticket} readOnly rows={7} />
          </article>
        ))}
    </section>
  )
}
