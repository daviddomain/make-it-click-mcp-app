import { z } from "zod";

import {
  confidenceSchema,
  exampleBlockSchema,
  interactionBlockSchema,
  learningCanvasStateSchema,
  microturnKindSchema,
  type LearningCanvasState,
  type MicroturnKind,
} from "./learning-canvas-state.js";

const completedTimelineStatusSchema = z.enum([
  "understood",
  "uncertain",
  "revisit",
]);

export const nextMicroturnInputSchema = z.object({
  kind: microturnKindSchema.default("tinyIdea"),
  title: z.string().trim().min(1).optional(),
  currentKnot: z.string().trim().min(1).optional(),
  tinyCoreIdea: z.string().trim().min(1),
  exampleBlock: exampleBlockSchema.nullable().optional(),
  checkQuestion: z.string().trim().min(1),
  interactionBlock: interactionBlockSchema.nullable().optional(),
  confidence: confidenceSchema.optional(),
  summary: z.string().trim().min(1).optional(),
});

const updateMicroturnInputBaseSchema = z.object({
  state: learningCanvasStateSchema,
  userAnswer: z.string().trim().min(1).optional(),
  interactionResult: z.record(z.string(), z.unknown()).optional(),
  timelineStatus: completedTimelineStatusSchema.optional(),
  nextMicroturn: nextMicroturnInputSchema.optional(),
});

export const updateMicroturnInputShape = updateMicroturnInputBaseSchema.shape;

export const updateMicroturnInputSchema = updateMicroturnInputBaseSchema.refine(
  ({ userAnswer, interactionResult }) =>
    Boolean(userAnswer) || Boolean(interactionResult),
  {
    message: "Provide either userAnswer or interactionResult.",
    path: ["userAnswer"],
  },
);

export type UpdateMicroturnInput = z.infer<typeof updateMicroturnInputSchema>;

function formatInteractionResult(
  interactionResult: UpdateMicroturnInput["interactionResult"],
) {
  if (!interactionResult) {
    return null;
  }

  return Object.entries(interactionResult)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join("; ");
}

function summarizeUserSignal({
  userAnswer,
  interactionResult,
}: Pick<UpdateMicroturnInput, "userAnswer" | "interactionResult">) {
  const interactionSummary = formatInteractionResult(interactionResult);

  if (userAnswer && interactionSummary) {
    return `${userAnswer} (${interactionSummary})`;
  }

  return userAnswer ?? interactionSummary ?? null;
}

function inferConfidenceStatus(
  timelineStatus: NonNullable<UpdateMicroturnInput["timelineStatus"]>,
) {
  if (timelineStatus === "understood") {
    return "high";
  }

  if (timelineStatus === "uncertain" || timelineStatus === "revisit") {
    return "low";
  }

  return "unknown";
}

function createTimelineId(kind: MicroturnKind, timelineLength: number) {
  return `${kind}-${timelineLength + 1}`;
}

function findLatestOpenTimelineIndex(
  timeline: LearningCanvasState["timeline"],
) {
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    if (timeline[index]?.status === "open") {
      return index;
    }
  }

  return -1;
}

export function applyMicroturnUpdate(
  input: UpdateMicroturnInput,
): LearningCanvasState {
  const {
    state,
    userAnswer,
    interactionResult,
    timelineStatus,
    nextMicroturn,
  } = updateMicroturnInputSchema.parse(input);
  const userSignal = summarizeUserSignal({ userAnswer, interactionResult });
  const resolvedTimelineStatus = timelineStatus ?? "uncertain";
  const timeline = state.timeline.map((item) => ({ ...item }));
  const latestOpenIndex = findLatestOpenTimelineIndex(timeline);
  const statusIndex =
    latestOpenIndex >= 0 ? latestOpenIndex : timeline.length - 1;

  if (statusIndex >= 0) {
    const currentSummary = timeline[statusIndex]?.summary;
    timeline[statusIndex] = {
      ...timeline[statusIndex],
      status: resolvedTimelineStatus,
      summary: userSignal
        ? `User signal: ${userSignal}`
        : currentSummary ?? "Updated after the user's latest signal.",
    };
  }

  const board: LearningCanvasState["board"] = {
    ...state.board,
    userVersion: userSignal ?? state.board.userVersion,
    confidence: {
      status: inferConfidenceStatus(resolvedTimelineStatus),
      value: state.board.confidence.value,
      note: userSignal
        ? `Latest user signal recorded as ${resolvedTimelineStatus}.`
        : state.board.confidence.note,
    },
  };

  if (nextMicroturn) {
    board.currentKnot = nextMicroturn.currentKnot ?? board.currentKnot;
    board.tinyCoreIdea = nextMicroturn.tinyCoreIdea;
    board.exampleBlock = nextMicroturn.exampleBlock ?? null;
    board.checkQuestion = nextMicroturn.checkQuestion;
    board.interactionBlock = nextMicroturn.interactionBlock ?? null;
    board.confidence = nextMicroturn.confidence ?? {
      status: "unknown",
      note: "Waiting for the next check answer.",
    };

    timeline.push({
      id: createTimelineId(nextMicroturn.kind, timeline.length),
      kind: nextMicroturn.kind,
      status: "open",
      title: nextMicroturn.title ?? "Next tiny idea",
      summary:
        nextMicroturn.summary ??
        "Continue with one tiny idea, at most one example, and one check question.",
      activeField: "tinyCoreIdea",
    });
  }

  return learningCanvasStateSchema.parse({
    ...state,
    board,
    timeline,
  } satisfies LearningCanvasState);
}
