import type {
  LearningCanvasState,
  MultipleChoiceCheckBlock,
  MultipleChoiceCheckResult,
} from "./learning-canvas-state.js";
import { multipleChoiceCheckResultSchema } from "./learning-canvas-state.js";
import type { UpdateMicroturnInput } from "./update-microturn.js";

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

export function createMultipleChoiceSubmission(
  state: LearningCanvasState,
  block: MultipleChoiceCheckBlock,
  selectedOptionId: string,
): Pick<UpdateMicroturnInput, "state" | "interactionResult"> {
  return {
    state,
    interactionResult: createMultipleChoiceCheckResult(
      block,
      selectedOptionId,
    ),
  };
}
