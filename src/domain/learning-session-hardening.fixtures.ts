import type { LearningSessionUpdateInput } from "./learning-session.js";
import type {
  ConfidenceSliderResult,
  MultipleChoiceCheckResult,
} from "./learning-canvas-state.js";
import type {
  HostLayoutData,
  LearningShellMode,
} from "./learning-shell.js";
import { createInitialLearningCanvasState } from "./start-learning-canvas.js";

export const hardeningSessionId = "learning-session-31";
export const missingHardeningSessionId = "missing-learning-session-31";
export const hardeningTimestamps = [
  "2026-07-25T08:00:00.000Z",
  "2026-07-25T08:01:00.000Z",
  "2026-07-25T08:02:00.000Z",
  "2026-07-25T08:03:00.000Z",
] as const;

export const hardeningInitialState = createInitialLearningCanvasState({
  topic: "JavaScript event loop",
  confusion: "I do not know why a timer callback waits.",
  context: "I think the timer interrupts the current function.",
});

export const multipleChoiceResultFixture = {
  type: "MultipleChoiceCheck",
  blockId: "event-loop-order",
  question: "What runs before the timer callback?",
  selectedOptionId: "stack",
  selectedValue: "current-stack",
  selectedLabel: "The current call stack",
} as const satisfies MultipleChoiceCheckResult;

export const confidenceResultFixture = {
  type: "ConfidenceSlider",
  blockId: "event-loop-confidence",
  question: "How confident are you about the queue rule?",
  value: 0.8,
} as const satisfies ConfidenceSliderResult;

export const hardeningSequentialUpdates = [
  {
    sessionId: hardeningSessionId,
    expectedRevision: 1,
    userAnswer: "The current call stack finishes before queued work runs.",
    timelineStatus: "understood",
    nextMicroturn: {
      kind: "tinyIdea",
      title: "Queue after stack",
      tinyCoreIdea:
        "A timer callback can run only after the current call stack is empty.",
      checkQuestion: multipleChoiceResultFixture.question,
      interactionBlock: {
        type: "MultipleChoiceCheck",
        id: multipleChoiceResultFixture.blockId,
        question: multipleChoiceResultFixture.question,
        options: [
          {
            id: "stack",
            label: multipleChoiceResultFixture.selectedLabel,
            value: multipleChoiceResultFixture.selectedValue,
          },
          {
            id: "timer",
            label: "The timer callback",
            value: "timer-callback",
          },
        ],
      },
    },
  },
  {
    sessionId: hardeningSessionId,
    expectedRevision: 2,
    interactionResult: multipleChoiceResultFixture,
    timelineStatus: "understood",
    nextMicroturn: {
      kind: "check",
      title: "Check the queue rule",
      tinyCoreIdea:
        "A zero-millisecond delay makes a callback eligible; it does not interrupt running JavaScript.",
      checkQuestion: confidenceResultFixture.question,
      interactionBlock: {
        type: "ConfidenceSlider",
        id: confidenceResultFixture.blockId,
        question: confidenceResultFixture.question,
        value: 0.5,
        step: 0.1,
      },
    },
  },
  {
    sessionId: hardeningSessionId,
    expectedRevision: 3,
    interactionResult: confidenceResultFixture,
    timelineStatus: "understood",
    nextMicroturn: {
      kind: "teachBack",
      title: "Teach back the rule",
      tinyCoreIdea:
        "Execution order depends on the current stack and queued work, not only on the timer delay.",
      checkQuestion:
        "In one sentence, why does setTimeout(callback, 0) still wait?",
    },
  },
] as const satisfies readonly LearningSessionUpdateInput[];

export const staleHardeningUpdate = {
  sessionId: hardeningSessionId,
  expectedRevision: 1,
  userAnswer: "This stale answer must not replace revision four.",
} as const satisfies LearningSessionUpdateInput;

export type HardeningPresentationFixture = {
  name: string;
  hostLayout: HostLayoutData;
  containerWidth: number;
  expectedMode: LearningShellMode;
  expectedWorkspaceLayout: "two-region" | "single-column";
  expectedDensity: "compact" | "comfortable";
};

export const hardeningPresentationFixtures = [
  {
    name: "inline launcher",
    hostLayout: {
      displayMode: "inline",
      maxHeight: 360,
      safeAreaInsets: { top: 8, right: 12, bottom: 12, left: 12 },
    },
    containerWidth: 640,
    expectedMode: "inline",
    expectedWorkspaceLayout: "single-column",
    expectedDensity: "compact",
  },
  {
    name: "wide fullscreen workspace",
    hostLayout: {
      displayMode: "fullscreen",
      maxHeight: 900,
      safeAreaInsets: { top: 20, right: 16, bottom: 28, left: 16 },
    },
    containerWidth: 1120,
    expectedMode: "fullscreen",
    expectedWorkspaceLayout: "two-region",
    expectedDensity: "comfortable",
  },
  {
    name: "narrow fullscreen workspace",
    hostLayout: {
      displayMode: "fullscreen",
      maxHeight: 660,
      safeAreaInsets: { top: 12, right: 12, bottom: 16, left: 12 },
    },
    containerWidth: 720,
    expectedMode: "fullscreen",
    expectedWorkspaceLayout: "single-column",
    expectedDensity: "compact",
  },
  {
    name: "compact PiP companion",
    hostLayout: {
      displayMode: "pip",
      maxHeight: 440,
      safeAreaInsets: { top: 8, right: 8, bottom: 8, left: 8 },
    },
    containerWidth: 360,
    expectedMode: "pip",
    expectedWorkspaceLayout: "single-column",
    expectedDensity: "compact",
  },
] as const satisfies readonly HardeningPresentationFixture[];
