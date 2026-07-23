import type {
  MultipleChoiceCheckBlock,
  MultipleChoiceCheckResult,
} from "./learning-canvas-state.js";
import { multipleChoiceCheckResultSchema } from "./learning-canvas-state.js";

export function createMultipleChoiceCheckResult(
  block: MultipleChoiceCheckBlock,
  selectedOptionId: string,
): MultipleChoiceCheckResult {
  const selectedOption = block.options.find(
    (option) => option.id === selectedOptionId,
  );

  if (!selectedOption) {
    throw new Error(
      `Cannot submit unknown option "${selectedOptionId}" for block "${block.id}".`,
    );
  }

  return multipleChoiceCheckResultSchema.parse({
    type: "MultipleChoiceCheck",
    blockId: block.id,
    question: block.question,
    selectedOptionId: selectedOption.id,
    ...(selectedOption.value === undefined
      ? {}
      : { selectedValue: selectedOption.value }),
    selectedLabel: selectedOption.label,
  });
}
