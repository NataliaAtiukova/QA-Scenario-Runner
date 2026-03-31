import type { BugReport } from '../types'

interface BugListProps {
  bugs: BugReport[]
}

export function BugList({ bugs }: BugListProps) {
  if (bugs.length === 0) {
    return (
      <section className="bug-list">
        <h3>Bug Reports</h3>
        <p>No bugs captured yet.</p>
      </section>
    )
  }

  return (
    <section className="bug-list">
      <h3>Bug Reports</h3>
      {bugs
        .slice()
        .reverse()
        .map((bug) => (
          <article key={bug.id} className="bug-item">
            <header>
              <strong>{bug.testName}</strong>
              <span>{new Date(bug.timestamp).toLocaleString()}</span>
            </header>
            <p>
              Step: <strong>{bug.stepName}</strong>
            </p>
            <p>
              Expected: {bug.expectedResult}
              <br />
              Actual: {bug.actualResult}
            </p>
            <button
              className="secondary"
              onClick={() => {
                navigator.clipboard.writeText(bug.ticket).catch(() => undefined)
              }}
            >
              Copy ticket block
            </button>
            <textarea value={bug.ticket} readOnly rows={7} />
          </article>
        ))}
    </section>
  )
}
