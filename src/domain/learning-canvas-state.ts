import { z } from "zod";

import { coachPolicy } from "./coach-policy.js";

export const learningCanvasStateVersion = 1;

export const timelineStatusSchema = z.enum(coachPolicy.timelineStatuses);

export const microturnKindSchema = z.enum([
  "diagnose",
  "tinyIdea",
  "example",
  "check",
  "teachBack",
  "nextKnot",
]);

export const confidenceStatusSchema = z.enum([
  "unknown",
  "low",
  "medium",
  "high",
]);

export const confidenceSchema = z.object({
  status: confidenceStatusSchema.default("unknown"),
  value: z.number().min(0).max(1).optional(),
  note: z.string().optional(),
});

export const interactionBlockTypeSchema = z.enum(coachPolicy.interactionBlocks);

// Placeholder shape for future typed interaction blocks. Each concrete block can
// later replace `data` with a stricter schema without changing the canvas shell.
export const interactionBlockSchema = z.object({
  type: interactionBlockTypeSchema,
  prompt: z.string(),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const exampleBlockSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    kind: z.literal("code"),
    code: z.string(),
    language: z.string().optional(),
  }),
  z.object({
    kind: z.literal("diagram"),
    description: z.string(),
  }),
  z.object({
    kind: z.literal("analogy"),
    text: z.string(),
  }),
  z.object({
    kind: z.literal("visual"),
    description: z.string(),
  }),
  z.object({
    kind: z.literal("interaction"),
    block: interactionBlockSchema,
  }),
]);

export const learningBoardStateSchema = z.object({
  currentKnot: z.string(),
  tinyCoreIdea: z.string().nullable().default(null),
  exampleBlock: exampleBlockSchema.nullable().default(null),
  checkQuestion: z.string().nullable().default(null),
  userVersion: z.string().nullable().default(null),
  confidence: confidenceSchema.default({ status: "unknown" }),
});

export const microturnTimelineItemSchema = z.object({
  id: z.string(),
  kind: microturnKindSchema,
  status: timelineStatusSchema,
  title: z.string(),
  summary: z.string().optional(),
  activeField: z
    .enum([
      "currentKnot",
      "tinyCoreIdea",
      "exampleBlock",
      "checkQuestion",
      "userVersion",
      "confidence",
    ])
    .optional(),
});

export const learningCanvasStateSchema = z.object({
  version: z.literal(learningCanvasStateVersion),
  id: z.string(),
  topic: z.string(),
  board: learningBoardStateSchema,
  timeline: z.array(microturnTimelineItemSchema),
});

export type TimelineStatus = z.infer<typeof timelineStatusSchema>;
export type MicroturnKind = z.infer<typeof microturnKindSchema>;
export type ConfidenceStatus = z.infer<typeof confidenceStatusSchema>;
export type Confidence = z.infer<typeof confidenceSchema>;
export type InteractionBlockType = z.infer<typeof interactionBlockTypeSchema>;
export type InteractionBlock = z.infer<typeof interactionBlockSchema>;
export type ExampleBlock = z.infer<typeof exampleBlockSchema>;
export type LearningBoardState = z.infer<typeof learningBoardStateSchema>;
export type MicroturnTimelineItem = z.infer<
  typeof microturnTimelineItemSchema
>;
export type LearningCanvasState = z.infer<typeof learningCanvasStateSchema>;
