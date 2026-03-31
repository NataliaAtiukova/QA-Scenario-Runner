# QA Scenario Runner

Manual UI QA execution tool built with React + TypeScript.

## What it does

- Structured test catalog split into:
  - Smoke Tests (critical, fast checks)
  - Full Scenarios (deeper validation flows)
- Step-by-step execution with checklist toggles
- Pass/Fail step results with failed-step highlighting
- Auto bug form on fail
- Built-in ticket generator (copyable block)
- Smoke suite summary with CRITICAL state when any smoke fails
- Local persistence for last run results and captured bugs
- Rerun from failed step

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## macOS one-file launch

Use a single file:

- [QA Scenario Runner.command](/Volumes/KINGSTON/QA%20Scenario%20Runner/QA%20Scenario%20Runner.command)

How to run:

1. Double-click `QA Scenario Runner.command`
2. It will install dependencies (if needed), build, start preview server, and open browser.

## Project structure

```text
src/
  components/
    BugList.tsx
    BugReportForm.tsx
    ScenarioRunner.tsx
    SmokeSummary.tsx
    TestCard.tsx
  data/
    scenarios.ts
    scenario-examples.json
  hooks/
    useLocalStorageState.ts
  utils/
    runState.ts
    ticket.ts
  App.tsx
  App.css
  main.tsx
  index.css
```

## Data

- Source of truth used by UI: `src/data/scenarios.ts`
- JSON examples: `src/data/scenario-examples.json`
