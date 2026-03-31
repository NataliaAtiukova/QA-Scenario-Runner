import type { TestDefinition } from '../types'

export const smokeTests: TestDefinition[] = [
  {
    id: 'smoke-basic-entry',
    name: 'Basic Entry Smoke',
    type: 'smoke',
    description: 'Critical bot availability and first response check.',
    estimatedMinutes: 1,
    steps: [
      {
        id: 'open-bot',
        title: 'Open bot',
        expectedResult: 'Bot opens and is interactive.',
        checks: ['Bot opened', 'UI is responsive'],
      },
      {
        id: 'trigger-start',
        title: 'Trigger /start',
        expectedResult: 'First message appears quickly with no errors.',
        checks: ['Message received', 'No delay', 'No errors'],
      },
      {
        id: 'verify-first-message',
        title: 'Verify first message appears',
        expectedResult: 'Message content is visible and complete.',
        checks: ['Text visible', 'No empty placeholders'],
      },
    ],
  },
  {
    id: 'smoke-button-interaction',
    name: 'Button Interaction Smoke',
    type: 'smoke',
    description: 'Validates primary button behavior and response changes.',
    estimatedMinutes: 1,
    steps: [
      {
        id: 'click-main-button',
        title: 'Click main button',
        expectedResult: 'Main CTA can be clicked once without duplicate actions.',
        checks: ['Button clickable', 'No blocked action'],
      },
      {
        id: 'verify-response-message',
        title: 'Verify response message',
        expectedResult: 'Response updates correctly and appears once.',
        checks: ['Message changes', 'No duplicates', 'No UI freeze'],
      },
    ],
  },
  {
    id: 'smoke-automation-trigger',
    name: 'Automation Trigger Smoke',
    type: 'smoke',
    description: 'Checks event-based automation and outgoing message.',
    estimatedMinutes: 2,
    steps: [
      {
        id: 'trigger-event',
        title: 'Trigger event (tag or action)',
        expectedResult: 'Automation event accepted.',
        checks: ['Event triggered', 'No immediate error'],
      },
      {
        id: 'wait-automation',
        title: 'Wait for automation',
        expectedResult: 'Automation executes and sends message.',
        checks: ['Automation triggered', 'Message delivered'],
      },
    ],
  },
  {
    id: 'smoke-message-rendering',
    name: 'Message Rendering Smoke',
    type: 'smoke',
    description: 'Confirms message layout, controls, and links are intact.',
    estimatedMinutes: 1,
    steps: [
      {
        id: 'receive-message',
        title: 'Receive message',
        expectedResult: 'Message renders without visual breakage.',
        checks: ['Text visible', 'Buttons visible', 'No broken layout', 'No broken links'],
      },
    ],
  },
]

export const fullScenarios: TestDefinition[] = [
  {
    id: 'scenario-smoke-full',
    name: 'Smoke Test (Full version)',
    type: 'scenario',
    description: 'Detailed version of core entry and interaction validation.',
    estimatedMinutes: 6,
    steps: [
      {
        id: 'open-bot',
        title: 'Open bot',
        expectedResult: 'Bot opens successfully.',
        checks: ['Entry point accessible', 'No errors'],
      },
      {
        id: 'start-scenario',
        title: 'Start scenario',
        expectedResult: 'Scenario starts and initial state is shown.',
        checks: ['Initial message appears', 'State is correct'],
      },
      {
        id: 'click-button',
        title: 'Click button',
        expectedResult: 'Button click triggers expected transition.',
        checks: ['Button is clickable', 'No duplicate click handling'],
      },
      {
        id: 'verify-response',
        title: 'Verify response',
        expectedResult: 'Expected follow-up response appears.',
        checks: ['Response text correct', 'Response timing acceptable'],
      },
      {
        id: 'verify-ui',
        title: 'Verify no UI issues',
        expectedResult: 'No rendering or interaction regressions.',
        checks: ['No broken layout', 'No broken links', 'No visual overlap'],
      },
    ],
  },
  {
    id: 'scenario-message-flow',
    name: 'Message Flow',
    type: 'scenario',
    description: 'End-to-end message transition and completion flow.',
    estimatedMinutes: 8,
    steps: [
      {
        id: 'start-bot',
        title: 'Start bot',
        expectedResult: 'Bot session starts cleanly.',
        checks: ['Bot online', 'No startup errors'],
      },
      {
        id: 'receive-message',
        title: 'Receive message',
        expectedResult: 'First message received.',
        checks: ['Message is visible', 'Text correct'],
      },
      {
        id: 'click-button',
        title: 'Click button',
        expectedResult: 'Action is accepted immediately.',
        checks: ['Button clickable', 'No lag'],
      },
      {
        id: 'verify-transition',
        title: 'Verify transition',
        expectedResult: 'Flow transitions to next state.',
        checks: ['Transition happened', 'No duplicate states'],
      },
      {
        id: 'verify-final-message',
        title: 'Verify final message',
        expectedResult: 'Final content appears and is valid.',
        checks: ['Text correct', 'Buttons clickable', 'No broken links'],
      },
    ],
  },
  {
    id: 'scenario-homework-flow',
    name: 'Homework Flow',
    type: 'scenario',
    description: 'Course lesson interaction and answer submission flow.',
    estimatedMinutes: 10,
    steps: [
      {
        id: 'open-course',
        title: 'Open course',
        expectedResult: 'Course page loads.',
        checks: ['Course visible', 'No loading errors'],
      },
      {
        id: 'open-lesson',
        title: 'Open lesson',
        expectedResult: 'Lesson content opens.',
        checks: ['Lesson accessible', 'Navigation works'],
      },
      {
        id: 'verify-content',
        title: 'Verify content',
        expectedResult: 'Lesson content renders correctly.',
        checks: ['Content complete', 'No broken media'],
      },
      {
        id: 'submit-answer',
        title: 'Submit answer',
        expectedResult: 'Answer submission succeeds.',
        checks: ['Submit button active', 'Submission accepted'],
      },
      {
        id: 'verify-completion',
        title: 'Verify completion',
        expectedResult: 'Completion state is confirmed.',
        checks: ['Completion visible', 'Progress updated'],
      },
    ],
  },
  {
    id: 'scenario-payment-flow',
    name: 'Payment Flow',
    type: 'scenario',
    description: 'Critical checkout validation and post-payment access.',
    estimatedMinutes: 12,
    steps: [
      {
        id: 'open-product',
        title: 'Open product',
        expectedResult: 'Product details page loads.',
        checks: ['Product info visible', 'Price visible'],
      },
      {
        id: 'start-payment',
        title: 'Start payment',
        expectedResult: 'Payment form opens.',
        checks: ['Payment CTA works', 'Form loads'],
      },
      {
        id: 'complete-payment',
        title: 'Complete payment',
        expectedResult: 'Payment is processed.',
        checks: ['No payment error', 'Transaction accepted'],
      },
      {
        id: 'verify-success',
        title: 'Verify success',
        expectedResult: 'Success confirmation appears.',
        checks: ['Success message visible', 'Order id present'],
      },
      {
        id: 'verify-access',
        title: 'Verify access',
        expectedResult: 'Purchased content is unlocked.',
        checks: ['Access granted', 'No permission errors'],
      },
    ],
  },
  {
    id: 'scenario-automation-flow',
    name: 'Automation Flow',
    type: 'scenario',
    description: 'Deeper automation trigger and condition validation.',
    estimatedMinutes: 9,
    steps: [
      {
        id: 'trigger-event',
        title: 'Trigger event',
        expectedResult: 'Event trigger is accepted.',
        checks: ['Trigger accepted', 'No immediate failure'],
      },
      {
        id: 'wait-automation',
        title: 'Wait for automation',
        expectedResult: 'Automation executes in expected time.',
        checks: ['Automation triggered', 'Execution timing acceptable'],
      },
      {
        id: 'verify-message',
        title: 'Verify message',
        expectedResult: 'Automation message delivered.',
        checks: ['Message delivered', 'Message content valid'],
      },
      {
        id: 'verify-conditions',
        title: 'Verify conditions',
        expectedResult: 'Automation conditions are applied correctly.',
        checks: ['Target condition met', 'No extra side effects'],
      },
    ],
  },
]

export const allTests: TestDefinition[] = [...smokeTests, ...fullScenarios]
