import type {
  ConfidenceSliderBlock,
  ConfidenceSliderResult,
  LearningCanvasState,
} from "./learning-canvas-state.js";
import {
  confidenceSliderResultSchema,
  confidenceSliderValueSchema,
} from "./learning-canvas-state.js";
import type { UpdateMicroturnInput } from "./update-microturn.js";

export function normalizeConfidenceSliderValue(value: number): number {
  const validValue = confidenceSliderValueSchema.parse(value);

  return Number(validValue.toFixed(10));
}

export function createConfidenceSliderResult(
  block: ConfidenceSliderBlock,
  value: number,
): ConfidenceSliderResult {
  return confidenceSliderResultSchema.parse({
    type: "ConfidenceSlider",
    blockId: block.id,
    question: block.question,
    value: normalizeConfidenceSliderValue(value),
  });
}

export function createConfidenceSliderSubmission(
  state: LearningCanvasState,
  block: ConfidenceSliderBlock,
  value: number,
): Pick<UpdateMicroturnInput, "state" | "interactionResult"> {
  return {
    state,
    interactionResult: createConfidenceSliderResult(block, value),
  };
}
