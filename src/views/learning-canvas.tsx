import "@/index.css";

import {
  BadgeCheck,
  CheckCircle2,
  CircleHelp,
  Lightbulb,
  MessageCircleQuestion,
  NotebookText,
  PanelsTopLeft,
  RefreshCcwDot,
  UserRoundCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getAdaptor, useLayout } from "skybridge/web";

import { useCallTool, useToolInfo } from "@/helpers.js";
import { ConfidenceSliderControl } from "@/components/confidence-slider-control.js";
import {
  createConfidenceSliderResult,
  createConfidenceSliderSubmission,
  normalizeConfidenceSliderValue,
} from "@/domain/confidence-slider.js";
import type {
  ConfidenceSliderBlock,
  ConfidenceSliderResult,
  ExampleBlock,
  InteractionBlock,
  LearningCanvasState,
  MicroturnKind,
  MultipleChoiceCheckBlock,
  MultipleChoiceCheckResult,
  TimelineStatus,
} from "@/domain/learning-canvas-state.js";
import {
  createMultipleChoiceCheckResult,
  createMultipleChoiceSubmission,
} from "@/domain/multiple-choice-check.js";

const statusClassNames: Record<TimelineStatus, string> = {
  open: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200",
  understood:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  uncertain:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  revisit:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
};

const kindLabels: Record<MicroturnKind, string> = {
  diagnose: "Diagnose",
  tinyIdea: "Tiny idea",
  example: "Example",
  check: "Check",
  teachBack: "Teach-back",
  nextKnot: "Next knot",
};

const statusLabels: Record<TimelineStatus, string> = {
  open: "Open",
  understood: "Understood",
  uncertain: "Uncertain",
  revisit: "Revisit",
};

function StatusPill({ status }: { status: TimelineStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClassNames[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function ExampleBlockView({ example }: { example: ExampleBlock | null }) {
  if (!example) {
    return <p className="text-muted-foreground">No example selected yet.</p>;
  }

  if (example.kind === "code") {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-muted p-3 text-xs leading-5">
        <code>{example.code}</code>
      </pre>
    );
  }

  if (example.kind === "diagram" || example.kind === "visual") {
    return <p>{example.description}</p>;
  }

  if (example.kind === "interaction") {
    return (
      <div className="rounded-md border border-border bg-muted p-3">
        <p className="font-medium">{example.block.question}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {example.block.type}
        </p>
      </div>
    );
  }

  return <p>{example.text}</p>;
}

function MultipleChoiceCheckView({
  block,
  state,
  showQuestion,
}: {
  block: MultipleChoiceCheckBlock;
  state: LearningCanvasState;
  showQuestion: boolean;
}) {
  const [selectedOptionId, setSelectedOptionId] = useState(
    block.selectedOptionId ?? "",
  );
  const [submissionState, setSubmissionState] = useState<
    | { status: "idle" }
    | { status: "pending" }
    | { status: "success"; result: MultipleChoiceCheckResult }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const { callToolAsync } = useCallTool("update_microturn");
  const adaptor = getAdaptor();

  useEffect(() => {
    setSelectedOptionId(block.selectedOptionId ?? "");
    setSubmissionState({ status: "idle" });
  }, [block.id, block.selectedOptionId]);

  const interactionResult = useMemo(() => {
    if (!selectedOptionId) {
      return null;
    }

    try {
      return createMultipleChoiceCheckResult(block, selectedOptionId);
    } catch {
      return null;
    }
  }, [block, selectedOptionId]);

  const isPending = submissionState.status === "pending";

  const interactionDescription = (() => {
    if (submissionState.status === "success") {
      return `MultipleChoiceCheck submitted: ${JSON.stringify(submissionState.result)}`;
    }

    if (submissionState.status === "error" && interactionResult) {
      return `MultipleChoiceCheck submission failed; selection retained: ${JSON.stringify(interactionResult)}`;
    }

    if (isPending && interactionResult) {
      return `MultipleChoiceCheck submission pending: ${JSON.stringify(interactionResult)}`;
    }

    return interactionResult
      ? `MultipleChoiceCheck selected but not submitted: ${JSON.stringify(interactionResult)}`
      : "MultipleChoiceCheck waiting for one selected option.";
  })();

  const handleOptionSelection = (optionId: string) => {
    if (isPending) {
      return;
    }

    setSelectedOptionId(optionId);
    setSubmissionState({ status: "idle" });
  };

  const handleSubmit = async () => {
    if (!interactionResult || isPending) {
      return;
    }

    setSubmissionState({ status: "pending" });

    try {
      const response = await callToolAsync(
        createMultipleChoiceSubmission(
          state,
          block,
          interactionResult.selectedOptionId,
        ),
      );
      const submittedResult = response.structuredContent.interactionResult;

      if (
        response.isError ||
        !submittedResult ||
        submittedResult.type !== "MultipleChoiceCheck" ||
        submittedResult.blockId !== interactionResult.blockId ||
        submittedResult.selectedOptionId !==
          interactionResult.selectedOptionId
      ) {
        throw new Error("The submitted result was not confirmed.");
      }

      await adaptor.setViewState({
        state: response.structuredContent.state,
        interactionResult: submittedResult,
      });
      setSubmissionState({ status: "success", result: submittedResult });
    } catch {
      setSubmissionState({
        status: "error",
        message: "The answer could not be submitted. Please try again.",
      });
    }
  };

  return (
    <div
      className="mt-5 border-t border-primary/20 pt-5"
      data-llm={interactionDescription}
      aria-busy={isPending}
    >
      {showQuestion ? (
        <p className="text-sm font-semibold leading-6">{block.question}</p>
      ) : null}
      <div
        className={`${showQuestion ? "mt-3" : ""} grid gap-2.5`}
        role="radiogroup"
        aria-label={block.question}
      >
        {block.options.map((option) => {
          const isSelected = option.id === selectedOptionId;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={isPending}
              onClick={() => handleOptionSelection(option.id)}
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/60"
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-70`}
            >
              <span>{option.label}</span>
              {isSelected ? (
                <CheckCircle2
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {interactionResult ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Selected: {interactionResult.selectedLabel}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!interactionResult || isPending}
        onClick={handleSubmit}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {isPending ? "Submitting answer..." : "Submit answer"}
      </button>
      <div className="mt-2 min-h-5 text-xs" aria-live="polite">
        {submissionState.status === "success" ? (
          <p className="text-emerald-700 dark:text-emerald-300">
            Answer submitted. The coach can use the structured result.
          </p>
        ) : null}
        {submissionState.status === "error" ? (
          <p className="text-rose-700 dark:text-rose-300" role="alert">
            {submissionState.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ConfidenceSliderView({
  block,
  state,
  showQuestion,
}: {
  block: ConfidenceSliderBlock;
  state: LearningCanvasState;
  showQuestion: boolean;
}) {
  const [value, setValue] = useState(block.value);
  const [submissionState, setSubmissionState] = useState<
    | { status: "idle" }
    | { status: "pending" }
    | { status: "success"; result: ConfidenceSliderResult }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const { callToolAsync } = useCallTool("update_microturn");
  const adaptor = getAdaptor();

  useEffect(() => {
    setValue(block.value);
    setSubmissionState({ status: "idle" });
  }, [block.id, block.value]);

  const interactionResult = useMemo(
    () => createConfidenceSliderResult(block, value),
    [block, value],
  );
  const isPending = submissionState.status === "pending";

  const interactionDescription = (() => {
    if (submissionState.status === "success") {
      return `ConfidenceSlider submitted: ${JSON.stringify(submissionState.result)}`;
    }

    if (submissionState.status === "error") {
      return `ConfidenceSlider submission failed; value retained: ${JSON.stringify(interactionResult)}`;
    }

    if (isPending) {
      return `ConfidenceSlider submission pending: ${JSON.stringify(interactionResult)}`;
    }

    return `ConfidenceSlider selected but not submitted: ${JSON.stringify(interactionResult)}`;
  })();

  const handleValueChange = (nextValue: number) => {
    if (isPending) {
      return;
    }

    setValue(normalizeConfidenceSliderValue(nextValue));
    setSubmissionState({ status: "idle" });
  };

  const handleSubmit = async () => {
    if (isPending) {
      return;
    }

    setSubmissionState({ status: "pending" });

    try {
      const response = await callToolAsync(
        createConfidenceSliderSubmission(state, block, value),
      );
      const submittedResult = response.structuredContent.interactionResult;

      if (
        response.isError ||
        !submittedResult ||
        submittedResult.type !== "ConfidenceSlider" ||
        submittedResult.blockId !== interactionResult.blockId ||
        submittedResult.value !== interactionResult.value
      ) {
        throw new Error("The submitted result was not confirmed.");
      }

      await adaptor.setViewState({
        state: response.structuredContent.state,
        interactionResult: submittedResult,
      });
      setSubmissionState({ status: "success", result: submittedResult });
    } catch {
      setSubmissionState({
        status: "error",
        message: "The confidence could not be submitted. Please try again.",
      });
    }
  };

  return (
    <div
      data-llm={interactionDescription}
      aria-busy={isPending}
    >
      <ConfidenceSliderControl
        block={block}
        value={value}
        feedback={
          submissionState.status === "success"
            ? {
                status: "success",
                message:
                  "Confidence submitted. The coach can use the structured result.",
              }
            : submissionState
        }
        showQuestion={showQuestion}
        onValueChange={handleValueChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function InteractionBlockView({
  block,
  state,
}: {
  block: InteractionBlock;
  state: LearningCanvasState;
}) {
  const showQuestion = block.question !== state.board.checkQuestion;

  switch (block.type) {
    case "MultipleChoiceCheck":
      return (
        <MultipleChoiceCheckView
          block={block}
          state={state}
          showQuestion={showQuestion}
        />
      );
    case "ConfidenceSlider":
      return (
        <ConfidenceSliderView
          block={block}
          state={state}
          showQuestion={showQuestion}
        />
      );
  }
}

function ConfidenceView({
  confidence,
}: {
  confidence: LearningCanvasState["board"]["confidence"];
}) {
  const percent =
    typeof confidence.value === "number"
      ? Math.round(confidence.value * 100)
      : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium capitalize">{confidence.status}</span>
        {percent !== null ? (
          <span className="text-xs text-muted-foreground">{percent}%</span>
        ) : null}
      </div>
      {percent !== null ? (
        <div
          className="h-2 rounded-full bg-muted"
          role="meter"
          aria-label="Confidence"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
      {confidence.note ? (
        <p className="text-muted-foreground">{confidence.note}</p>
      ) : null}
    </div>
  );
}

export default function LearningCanvas() {
  const { theme } = useLayout();
  const { output } =
    useToolInfo<"start_learning_canvas" | "update_microturn">();
  const state = output?.state;

  if (!state) {
    return (
      <main
        className={`${theme === "dark" ? "dark" : ""} mx-auto w-full max-w-5xl bg-background p-6 text-foreground`}
      >
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No learning canvas state was returned by the tool.
        </p>
      </main>
    );
  }

  return (
    <main
      className={`${theme === "dark" ? "dark" : ""} mx-auto w-full max-w-6xl bg-background p-4 text-foreground md:p-6`}
      data-llm={`Learning canvas for ${state.topic}. Current knot: ${state.board.currentKnot}. Check question: ${state.board.checkQuestion ?? "none"}.`}
    >
      <header className="mb-5 border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Make It Click canvas
        </p>
        <h1 className="text-xl font-semibold leading-7 text-foreground md:text-2xl">
          {state.topic}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Stay with one small step until it clicks.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.75fr)]">
        <section aria-labelledby="learning-board-heading" className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Current microturn
              </p>
              <h2
                id="learning-board-heading"
                className="text-lg font-semibold text-foreground"
              >
                Learning board
              </h2>
            </div>
            <span className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              One idea · one check
            </span>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                <CircleHelp className="size-4" aria-hidden="true" />
                <h3>Current knot</h3>
              </div>
              <p className="text-sm leading-6 text-foreground">
                {state.board.currentKnot}
              </p>
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                <Lightbulb className="size-4" aria-hidden="true" />
                <h3>Tiny idea</h3>
              </div>
              <p className="text-sm leading-6 text-foreground">
                {state.board.tinyCoreIdea ?? (
                  <span className="text-muted-foreground">
                    Waiting for your answer before choosing the tiny idea.
                  </span>
                )}
              </p>
            </div>

            {state.board.exampleBlock ? (
              <div className="mt-4 border-t border-border pt-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  <PanelsTopLeft className="size-4" aria-hidden="true" />
                  <h3>One example</h3>
                </div>
                <div className="text-sm leading-6 text-foreground">
                  <ExampleBlockView example={state.board.exampleBlock} />
                </div>
              </div>
            ) : null}
          </div>

          <section
            aria-labelledby="current-check-heading"
            className={`mt-4 rounded-xl border p-5 shadow-sm md:p-6 ${
              state.board.checkQuestion
                ? "border-primary/45 bg-primary/5 dark:border-primary/55 dark:bg-primary/10"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-primary">
              <MessageCircleQuestion className="size-4" aria-hidden="true" />
              <span>Your next step</span>
            </div>
            <h3
              id="current-check-heading"
              className="mt-2 text-lg font-semibold text-foreground"
            >
              Your check
            </h3>
            <p className="mt-2 text-base font-medium leading-7 text-foreground md:text-lg">
              {state.board.checkQuestion ?? (
                <span className="text-muted-foreground">
                  No check question queued.
                </span>
              )}
            </p>
            {state.board.interactionBlock ? (
              <InteractionBlockView
                block={state.board.interactionBlock}
                state={state}
              />
            ) : null}
          </section>

          <details className="group mt-4 rounded-lg border border-border bg-muted/30">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
              <span>Reflection &amp; status</span>
              <span className="text-xs font-normal text-muted-foreground group-open:hidden">
                View details
              </span>
              <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">
                Hide details
              </span>
            </summary>
            <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-2">
              <section>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  <UserRoundCheck className="size-4" aria-hidden="true" />
                  <h3>User version</h3>
                </div>
                <p className="text-sm leading-6 text-foreground">
                  {state.board.userVersion ?? (
                    <span className="text-muted-foreground">
                      No user version recorded yet.
                    </span>
                  )}
                </p>
              </section>
              <section>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                  <BadgeCheck className="size-4" aria-hidden="true" />
                  <h3>Confidence / status</h3>
                </div>
                <div className="text-sm leading-6 text-foreground">
                  <ConfidenceView confidence={state.board.confidence} />
                </div>
              </section>
            </div>
          </details>
        </section>

        <aside
          aria-labelledby="learning-progress-heading"
          className="self-start rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <NotebookText
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <h2 id="learning-progress-heading" className="text-sm font-semibold">
                Learning progress
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              {state.timeline.length}{" "}
              {state.timeline.length === 1 ? "step" : "steps"}
            </span>
          </div>
          <ol className="divide-y divide-border">
            {state.timeline.map((item) => (
              <li key={item.id} className="py-3 first:pt-1 last:pb-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      {kindLabels[item.kind]}
                    </p>
                    <h3 className="mt-0.5 text-sm font-medium leading-5">
                      {item.title}
                    </h3>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                {item.summary ? (
                  <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                    {item.summary}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
            <RefreshCcwDot
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              Diagnose → one tiny idea → check → wait.
            </span>
          </div>
        </aside>
      </div>
    </main>
  );
}
