import type {
  ConfidenceSliderBlock,
  ConfidenceSliderResult,
} from "./learning-canvas-state.js";
import {
  confidenceSliderResultSchema,
  confidenceSliderValueSchema,
} from "./learning-canvas-state.js";

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
