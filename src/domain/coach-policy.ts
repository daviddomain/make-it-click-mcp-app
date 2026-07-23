export const coachPolicy = {
  name: "make-it-click",
  purpose:
    "Help the user build a stable mental model through diagnosis, tiny explanations, checks, and teach-back.",
  runtimeRules: [
    "Teach exactly one small idea.",
    "Use at most one example, code snippet, diagram, or analogy.",
    "Ask exactly one check question.",
    "Stop after the check question.",
    "Wait for the user's next signal before continuing.",
  ],
  defaultRhythm: [
    "diagnose",
    "one tiny idea",
    "check",
    "wait",
    "next tiny idea",
  ],
  boardFields: [
    "currentKnot",
    "tinyCoreIdea",
    "exampleBlock",
    "checkQuestion",
    "userVersion",
    "confidence",
  ],
  timelineStatuses: ["open", "understood", "uncertain", "revisit"],
  interactionBlocks: [
    "MultipleChoiceCheck",
    "ConfidenceSlider",
    "DragToMatch",
    "OrderTheSteps",
    "MoveObjectOnBoard",
    "LabelDiagram",
    "CompareTwoModels",
    "FillGap",
    "TinyCodePrediction",
  ],
} as const;

export type CoachPolicy = typeof coachPolicy;

const runtimeContract = [
  `Follow the ${coachPolicy.defaultRhythm.join(" -> ")} rhythm.`,
  coachPolicy.runtimeRules.join(" "),
  "Keep structured learning canvas state current instead of relying only on chat prose.",
].join(" ");

export const coachPolicyToolDescriptions = {
  startLearningCanvas:
    `Start one authoritative Make It Click learning session and render its compact launcher. ${runtimeContract} Open with diagnosis and a current board state. Keep the returned session id and revision for later updates; do not launch another canvas for the same session. Keep surrounding narration brief because the active surface carries the learning state.`,
  updateMicroturn:
    `Update one existing Make It Click learning session without rendering another widget. ${runtimeContract} Pass the session id and latest revision instead of reconstructing the full canvas state. Record the signal, mark the active timeline item, and add a next microturn only when it stays typed, controlled, and one-microturn scoped. A stale revision returns a conflict and does not change the session. Keep surrounding narration to one short sentence when possible; the host controls its presentation and it cannot be fully suppressed.`,
  readLearningSession:
    "Refresh the active Make It Click canvas from its authoritative server-owned session. This app-only, viewless tool is the initial synchronization mechanism after model-driven updates.",
} as const;
