import { z } from "zod";

import {
  learningCanvasStateSchema,
  type LearningCanvasState,
} from "./learning-canvas-state.js";
import {
  applyMicroturnUpdate,
  type UpdateMicroturnInput,
} from "./update-microturn.js";

export const spikeDisplayModeSchema = z.enum([
  "inline",
  "fullscreen",
  "pip",
]);

export const spikeSynchronizationStatusSchema = z.enum([
  "in-sync",
  "refreshing",
  "stale",
  "error",
]);

export const spikeUpdateSourceSchema = z.enum([
  "launch",
  "widget",
  "composer",
]);

export const learningSessionSpikeEnvelopeSchema = z.object({
  sessionId: z.string().trim().min(1),
  revision: z.number().int().positive(),
  state: learningCanvasStateSchema,
  displayMode: spikeDisplayModeSchema,
  synchronizationStatus: spikeSynchronizationStatusSchema,
  lastUpdateSource: spikeUpdateSourceSchema,
});

export type SpikeDisplayMode = z.infer<typeof spikeDisplayModeSchema>;
export type SpikeSynchronizationStatus = z.infer<
  typeof spikeSynchronizationStatusSchema
>;
export type SpikeUpdateSource = z.infer<typeof spikeUpdateSourceSchema>;
export type LearningSessionSpikeEnvelope = z.infer<
  typeof learningSessionSpikeEnvelopeSchema
>;

export function createLearningSessionSpikeEnvelope({
  sessionId,
  state,
}: {
  sessionId: string;
  state: LearningCanvasState;
}): LearningSessionSpikeEnvelope {
  return learningSessionSpikeEnvelopeSchema.parse({
    sessionId,
    revision: 1,
    state,
    displayMode: "inline",
    synchronizationStatus: "in-sync",
    lastUpdateSource: "launch",
  });
}

export function advanceLearningSessionSpikeEnvelope({
  envelope,
  source,
  update,
}: {
  envelope: LearningSessionSpikeEnvelope;
  source: Exclude<SpikeUpdateSource, "launch">;
  update: Omit<UpdateMicroturnInput, "state">;
}): LearningSessionSpikeEnvelope {
  const state = applyMicroturnUpdate({
    ...update,
    state: envelope.state,
  });

  return learningSessionSpikeEnvelopeSchema.parse({
    ...envelope,
    revision: envelope.revision + 1,
    state,
    synchronizationStatus: "in-sync",
    lastUpdateSource: source,
  });
}

export function setLearningSessionSpikeDisplayMode(
  envelope: LearningSessionSpikeEnvelope,
  displayMode: SpikeDisplayMode,
): LearningSessionSpikeEnvelope {
  return learningSessionSpikeEnvelopeSchema.parse({
    ...envelope,
    displayMode,
  });
}

export const spikeCapabilityResultSchema = z.enum([
  "pass",
  "conditional-pass",
  "fail",
]);

export const learningSessionSpikeObservationsSchema = z.object({
  realChatGptHost: z.boolean(),
  inlineLaunch: spikeCapabilityResultSchema,
  fullscreenRequest: spikeCapabilityResultSchema,
  pipRequest: spikeCapabilityResultSchema,
  directWidgetUpdate: spikeCapabilityResultSchema,
  composerUpdate: spikeCapabilityResultSchema,
  threeConsecutiveRevisions: spikeCapabilityResultSchema,
  noAdditionalLargeWidgets: spikeCapabilityResultSchema,
  activeSurfaceLatestRevision: spikeCapabilityResultSchema,
  surroundingNarration: spikeCapabilityResultSchema,
});

export const learningSessionSpikeDecisionSchema = z.object({
  recommendation: z.enum(["go", "conditional-go", "no-go"]),
  shouldProceedToIssue28: z.boolean(),
  failedCapabilities: z.array(z.string()),
  conditionalCapabilities: z.array(z.string()),
});

export type LearningSessionSpikeObservations = z.infer<
  typeof learningSessionSpikeObservationsSchema
>;
export type LearningSessionSpikeDecision = z.infer<
  typeof learningSessionSpikeDecisionSchema
>;

const blockingCapabilities = [
  "inlineLaunch",
  "fullscreenRequest",
  "directWidgetUpdate",
  "composerUpdate",
  "threeConsecutiveRevisions",
  "noAdditionalLargeWidgets",
  "activeSurfaceLatestRevision",
] as const satisfies readonly (keyof LearningSessionSpikeObservations)[];

const evaluatedCapabilities = [
  ...blockingCapabilities,
  "pipRequest",
  "surroundingNarration",
] as const satisfies readonly (keyof LearningSessionSpikeObservations)[];

export function evaluateLearningSessionSpike(
  input: LearningSessionSpikeObservations,
): LearningSessionSpikeDecision {
  const observations = learningSessionSpikeObservationsSchema.parse(input);
  const failedCapabilities = evaluatedCapabilities.filter(
    (capability) => observations[capability] === "fail",
  );
  const conditionalCapabilities = evaluatedCapabilities.filter(
    (capability) => observations[capability] === "conditional-pass",
  );
  const hasBlockingFailure =
    !observations.realChatGptHost ||
    blockingCapabilities.some(
      (capability) => observations[capability] === "fail",
    );

  if (hasBlockingFailure) {
    return {
      recommendation: "no-go",
      shouldProceedToIssue28: false,
      failedCapabilities,
      conditionalCapabilities,
    };
  }

  if (failedCapabilities.length > 0 || conditionalCapabilities.length > 0) {
    return {
      recommendation: "conditional-go",
      shouldProceedToIssue28: true,
      failedCapabilities,
      conditionalCapabilities,
    };
  }

  return {
    recommendation: "go",
    shouldProceedToIssue28: true,
    failedCapabilities,
    conditionalCapabilities,
  };
}
