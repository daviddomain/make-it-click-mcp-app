import { z } from "zod";

import {
  interactionResultSchema,
  learningCanvasStateSchema,
  type LearningCanvasState,
} from "./learning-canvas-state.js";
import {
  applyMicroturnUpdate,
  updateMicroturnInputShape,
} from "./update-microturn.js";

export const learningSessionSchema = z.object({
  sessionId: z.string().trim().min(1),
  revision: z.number().int().positive(),
  state: learningCanvasStateSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LearningSession = z.infer<typeof learningSessionSchema>;

export const learningSessionStartOutputSchema = z.object({
  session: learningSessionSchema,
});

export const learningSessionNotFoundErrorSchema = z.object({
  code: z.literal("learning_session_not_found"),
  message: z.string(),
});

export const learningSessionConflictErrorSchema = z.object({
  code: z.literal("stale_revision"),
  message: z.string(),
  expectedRevision: z.number().int().positive(),
  currentRevision: z.number().int().positive(),
});

export const learningSessionReadResultSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ok"),
    session: learningSessionSchema,
  }),
  z.object({
    status: z.literal("not_found"),
    error: learningSessionNotFoundErrorSchema,
  }),
]);

export const learningSessionReadInputSchema = z.object({
  sessionId: z.string().trim().min(1),
});

export const learningSessionReadOutputSchema = z.object({
  result: learningSessionReadResultSchema,
});

export const learningSessionUpdateResultSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("ok"),
      session: learningSessionSchema,
      interactionResult: interactionResultSchema.nullable(),
    }),
    z.object({
      status: z.literal("not_found"),
      error: learningSessionNotFoundErrorSchema,
    }),
    z.object({
      status: z.literal("conflict"),
      error: learningSessionConflictErrorSchema,
    }),
  ],
);

export type LearningSessionReadResult = z.infer<
  typeof learningSessionReadResultSchema
>;
export type LearningSessionUpdateResult = z.infer<
  typeof learningSessionUpdateResultSchema
>;

const learningSessionUpdateInputBaseSchema = z.object({
  sessionId: z.string().trim().min(1),
  expectedRevision: z.number().int().positive(),
  userAnswer: updateMicroturnInputShape.userAnswer,
  interactionResult: updateMicroturnInputShape.interactionResult,
  timelineStatus: updateMicroturnInputShape.timelineStatus,
  nextMicroturn: updateMicroturnInputShape.nextMicroturn,
});

export const learningSessionUpdateInputShape =
  learningSessionUpdateInputBaseSchema.shape;

export const learningSessionUpdateInputSchema =
  learningSessionUpdateInputBaseSchema.refine(
    ({ userAnswer, interactionResult }) =>
      Boolean(userAnswer) || Boolean(interactionResult),
    {
      message: "Provide either userAnswer or interactionResult.",
      path: ["userAnswer"],
    },
  );

export const learningSessionUpdateOutputSchema = z.object({
  result: learningSessionUpdateResultSchema,
});

export type LearningSessionUpdateInput = z.infer<
  typeof learningSessionUpdateInputSchema
>;

export function createLearningSession({
  sessionId,
  state,
  timestamp,
}: {
  sessionId: string;
  state: LearningCanvasState;
  timestamp: string;
}): LearningSession {
  return learningSessionSchema.parse({
    sessionId,
    revision: 1,
    state,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function createLearningSessionNotFoundResult(): Extract<
  LearningSessionReadResult,
  { status: "not_found" }
> {
  return {
    status: "not_found",
    error: {
      code: "learning_session_not_found",
      message: "No learning session exists for the supplied session id.",
    },
  };
}

export function validateExpectedRevision({
  expectedRevision,
  currentRevision,
}: {
  expectedRevision: number;
  currentRevision: number;
}):
  | { status: "ok" }
  | Extract<LearningSessionUpdateResult, { status: "conflict" }> {
  if (expectedRevision === currentRevision) {
    return { status: "ok" };
  }

  return {
    status: "conflict",
    error: {
      code: "stale_revision",
      message:
        "The learning session changed before this update. Refresh the active canvas and retry from the latest revision.",
      expectedRevision,
      currentRevision,
    },
  };
}

export function applyLearningSessionUpdate({
  session,
  input,
  timestamp,
}: {
  session: LearningSession;
  input: LearningSessionUpdateInput;
  timestamp: string;
}): LearningSessionUpdateResult {
  const parsedInput = learningSessionUpdateInputSchema.parse(input);
  const revisionResult = validateExpectedRevision({
    expectedRevision: parsedInput.expectedRevision,
    currentRevision: session.revision,
  });

  if (revisionResult.status === "conflict") {
    return revisionResult;
  }

  const state = applyMicroturnUpdate({
    state: session.state,
    userAnswer: parsedInput.userAnswer,
    interactionResult: parsedInput.interactionResult,
    timelineStatus: parsedInput.timelineStatus,
    nextMicroturn: parsedInput.nextMicroturn,
  });
  const updatedSession = learningSessionSchema.parse({
    ...session,
    revision: session.revision + 1,
    state,
    updatedAt: timestamp,
  });

  return {
    status: "ok",
    session: updatedSession,
    interactionResult: parsedInput.interactionResult ?? null,
  };
}
