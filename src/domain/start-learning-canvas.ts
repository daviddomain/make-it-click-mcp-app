import {
  learningCanvasStateSchema,
  learningCanvasStateVersion,
  type LearningCanvasState,
} from "./learning-canvas-state.js";

export type StartLearningCanvasInput = {
  topic: string;
  confusion?: string;
  context?: string;
};

function normalizeText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function createCanvasId(topic: string) {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `learning-canvas-${slug || "session"}`;
}

export function createInitialLearningCanvasState({
  topic,
  confusion,
  context,
}: StartLearningCanvasInput): LearningCanvasState {
  const normalizedTopic = normalizeText(topic) ?? "Untitled topic";
  const normalizedConfusion = normalizeText(confusion);
  const normalizedContext = normalizeText(context);
  const currentKnot =
    normalizedConfusion ??
    `The user wants to understand ${normalizedTopic}, but the exact confusion knot still needs diagnosis.`;

  return learningCanvasStateSchema.parse({
    version: learningCanvasStateVersion,
    id: createCanvasId(normalizedTopic),
    topic: normalizedTopic,
    board: {
      currentKnot,
      tinyCoreIdea: null,
      exampleBlock: null,
      checkQuestion:
        "Which part feels most confusing right now: the words, the sequence, the result, or why it matters?",
      interactionBlock: null,
      userVersion: normalizedContext,
      confidence: {
        status: "unknown",
        note: normalizedContext
          ? "Context captured for the first diagnosis."
          : "Waiting for the first diagnostic answer.",
      },
    },
    timeline: [
      {
        id: "diagnose-initial-knot",
        kind: "diagnose",
        status: "open",
        title: "Diagnose the knot",
        summary:
          "Start by naming the current confusion before teaching the first tiny idea.",
        activeField: "currentKnot",
      },
    ],
  } satisfies LearningCanvasState);
}
