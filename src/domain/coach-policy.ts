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
    `Start a Make It Click learning canvas for microturn coaching. ${runtimeContract} Open with diagnosis and a current board state.`,
  updateMicroturn:
    `Update an existing Make It Click learning canvas after the user's latest plain answer or typed interaction result. ${runtimeContract} Record the signal, mark the active timeline item, and add a next microturn only when it stays typed, controlled, and one-microturn scoped. The view records interaction data; do not rely on it to auto-grade or auto-advance.`,
} as const;
