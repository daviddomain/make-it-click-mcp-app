import type { ChangeEvent } from "react";

import type { ConfidenceSliderBlock } from "../domain/learning-canvas-state.js";
import {
  getLearningCanvasCopy,
  type LearningCanvasCopy,
} from "../domain/learning-canvas-presentation.js";

type ConfidenceSliderFeedback =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function ConfidenceSliderControl({
  block,
  value,
  feedback,
  showQuestion,
  copy = getLearningCanvasCopy("en"),
  onValueChange,
  onSubmit,
}: {
  block: ConfidenceSliderBlock;
  value: number;
  feedback: ConfidenceSliderFeedback;
  showQuestion: boolean;
  copy?: LearningCanvasCopy;
  onValueChange: (value: number) => void;
  onSubmit: () => void;
}) {
  const inputId = `confidence-slider-${block.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const percent = Math.round(value * 100);
  const isPending = feedback.status === "pending";

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onValueChange(Number(event.currentTarget.value));
  };

  return (
    <div className="mt-5">
      <div className="flex items-end justify-between gap-4">
        <label
          htmlFor={inputId}
          className={
            showQuestion
              ? "text-sm font-semibold leading-6"
              : "sr-only"
          }
        >
          {block.question}
        </label>
        <output
          htmlFor={inputId}
          className="shrink-0 text-lg font-semibold tabular-nums text-primary"
          aria-live="polite"
        >
          {percent}%
        </output>
      </div>
      <input
        id={inputId}
        type="range"
        min={0}
        max={1}
        step={block.step}
        value={value}
        disabled={isPending}
        onChange={handleChange}
        aria-valuetext={`${percent}% ${copy.confidence}`}
        className="mt-3 h-11 w-full cursor-pointer accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-70"
      />
      <div
        className="flex justify-between text-xs text-muted-foreground"
        aria-hidden="true"
      >
        <span>{copy.notConfident}</span>
        <span>{copy.veryConfident}</span>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={onSubmit}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? copy.submittingConfidence : copy.submitConfidence}
      </button>
      <div className="mt-2 min-h-5 text-xs" aria-live="polite">
        {feedback.status === "success" ? (
          <p className="text-emerald-700 dark:text-emerald-300">
            {feedback.message}
          </p>
        ) : null}
        {feedback.status === "error" ? (
          <p className="text-rose-700 dark:text-rose-300" role="alert">
            {feedback.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
