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
