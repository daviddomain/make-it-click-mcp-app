import "@/index.css";

import {
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Lightbulb,
  Maximize2,
  MessageCircleQuestion,
  Minimize2,
  NotebookText,
  PanelsTopLeft,
  PictureInPicture2,
  RefreshCcwDot,
  UserRoundCheck,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  getAdaptor,
  useDisplayMode,
  useLayout,
  useUser,
} from "skybridge/web";

import { ConfidenceSliderControl } from "@/components/confidence-slider-control.js";
import {
  createConfidenceSliderResult,
  normalizeConfidenceSliderValue,
} from "@/domain/confidence-slider.js";
import {
  deriveLearningCanvasPresentation,
  getLearningCanvasCopy,
  type LearningCanvasCopy,
  type LearningCanvasPresentation,
} from "@/domain/learning-canvas-presentation.js";
import type {
  ConfidenceSliderBlock,
  ConfidenceSliderResult,
  ExampleBlock,
  InteractionBlock,
  LearningCanvasState,
  MultipleChoiceCheckBlock,
  MultipleChoiceCheckResult,
  TimelineStatus,
} from "@/domain/learning-canvas-state.js";
import {
  beginDisplayModeRequest,
  beginSessionRefresh,
  completeDisplayModeRequest,
  completeSessionSynchronization,
  createMountedPresentationState,
  deriveLearningShellLayout,
  failDisplayModeRequest,
  failSessionSynchronization,
  reconcileLearningSession,
  type MountedPresentationState,
  type RequestedDisplayMode,
} from "@/domain/learning-shell.js";
import type { LearningSession } from "@/domain/learning-session.js";
import { createMultipleChoiceCheckResult } from "@/domain/multiple-choice-check.js";
import { useCallTool, useToolInfo } from "@/helpers.js";

const statusClassNames: Record<TimelineStatus, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200",
  understood:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  uncertain:
    "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  revisit:
    "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
};

const focusRingClassName =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const modeButtonClassName = `inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-lg bg-muted/70 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted ${focusRingClassName} disabled:cursor-wait disabled:opacity-60`;

function useContainerWidth() {
  const containerRef = useRef<HTMLElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>();

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const updateWidth = (width: number) => {
      setContainerWidth((current) =>
        current === width ? current : Math.round(width),
      );
    };

    updateWidth(element.getBoundingClientRect().width);

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        updateWidth(entry.contentRect.width);
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { containerRef, containerWidth };
}

function StatusPill({
  status,
  copy,
}: {
  status: TimelineStatus;
  copy: LearningCanvasCopy;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClassNames[status]}`}
    >
      {copy.statusLabels[status]}
    </span>
  );
}

function ExampleBlockView({
  example,
  copy,
}: {
  example: ExampleBlock | null;
  copy: LearningCanvasCopy;
}) {
  if (!example) {
    return <p className="text-muted-foreground">{copy.noExample}</p>;
  }

  if (example.kind === "code") {
    return (
      <pre className="whitespace-pre-wrap break-words rounded-xl bg-background/80 p-4 text-xs leading-5 ring-1 ring-border/60">
        <code>{example.code}</code>
      </pre>
    );
  }

  if (example.kind === "diagram" || example.kind === "visual") {
    return <p>{example.description}</p>;
  }

  if (example.kind === "interaction") {
    return (
      <div className="rounded-xl bg-background/70 p-4">
        <p className="font-medium">{example.block.question}</p>
      </div>
    );
  }

  return <p>{example.text}</p>;
}

function MultipleChoiceCheckView({
  block,
  session,
  showQuestion,
  copy,
  onSessionChange,
}: {
  block: MultipleChoiceCheckBlock;
  session: LearningSession;
  showQuestion: boolean;
  copy: LearningCanvasCopy;
  onSessionChange: (session: LearningSession) => void;
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
    if (!isPending) {
      setSelectedOptionId(optionId);
      setSubmissionState({ status: "idle" });
    }
  };

  const handleSubmit = async () => {
    if (!interactionResult || isPending) {
      return;
    }

    setSubmissionState({ status: "pending" });

    try {
      const response = await callToolAsync({
        sessionId: session.sessionId,
        expectedRevision: session.revision,
        interactionResult,
      });
      const result = response.structuredContent.result;
      const submittedResult =
        result.status === "ok" ? result.interactionResult : null;

      if (
        response.isError ||
        result.status !== "ok" ||
        !submittedResult ||
        submittedResult.type !== "MultipleChoiceCheck" ||
        submittedResult.blockId !== interactionResult.blockId ||
        submittedResult.selectedOptionId !== interactionResult.selectedOptionId
      ) {
        throw new Error(copy.answerError);
      }

      onSessionChange(result.session);
      setSubmissionState({ status: "success", result: submittedResult });
    } catch {
      setSubmissionState({
        status: "error",
        message: copy.answerError,
      });
    }
  };

  return (
    <div
      className="mt-5"
      data-llm={interactionDescription}
      aria-busy={isPending}
    >
      {showQuestion ? (
        <p className="text-sm font-semibold leading-6">{block.question}</p>
      ) : null}
      <div
        className={`${showQuestion ? "mt-3" : ""} grid gap-2`}
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
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                isSelected
                  ? "bg-primary/12 text-foreground ring-2 ring-primary"
                  : "bg-background/80 text-foreground ring-1 ring-border/70 hover:bg-muted/70"
              } ${focusRingClassName} disabled:cursor-wait disabled:opacity-70`}
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
          {copy.selected}: {interactionResult.selectedLabel}
        </p>
      ) : null}
      <button
        type="button"
        disabled={!interactionResult || isPending}
        onClick={handleSubmit}
        className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 ${focusRingClassName} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {isPending ? copy.submittingAnswer : copy.submitAnswer}
      </button>
      <div className="mt-2 min-h-5 text-xs" aria-live="polite">
        {submissionState.status === "success" ? (
          <p className="text-emerald-700 dark:text-emerald-300">
            {copy.answerSubmitted}
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
  session,
  showQuestion,
  copy,
  onSessionChange,
}: {
  block: ConfidenceSliderBlock;
  session: LearningSession;
  showQuestion: boolean;
  copy: LearningCanvasCopy;
  onSessionChange: (session: LearningSession) => void;
}) {
  const [value, setValue] = useState(block.value);
  const [submissionState, setSubmissionState] = useState<
    | { status: "idle" }
    | { status: "pending" }
    | { status: "success"; result: ConfidenceSliderResult }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const { callToolAsync } = useCallTool("update_microturn");

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
    if (!isPending) {
      setValue(normalizeConfidenceSliderValue(nextValue));
      setSubmissionState({ status: "idle" });
    }
  };

  const handleSubmit = async () => {
    if (isPending) {
      return;
    }

    setSubmissionState({ status: "pending" });

    try {
      const response = await callToolAsync({
        sessionId: session.sessionId,
        expectedRevision: session.revision,
        interactionResult,
      });
      const result = response.structuredContent.result;
      const submittedResult =
        result.status === "ok" ? result.interactionResult : null;

      if (
        response.isError ||
        result.status !== "ok" ||
        !submittedResult ||
        submittedResult.type !== "ConfidenceSlider" ||
        submittedResult.blockId !== interactionResult.blockId ||
        submittedResult.value !== interactionResult.value
      ) {
        throw new Error(copy.confidenceError);
      }

      onSessionChange(result.session);
      setSubmissionState({ status: "success", result: submittedResult });
    } catch {
      setSubmissionState({
        status: "error",
        message: copy.confidenceError,
      });
    }
  };

  return (
    <div data-llm={interactionDescription} aria-busy={isPending}>
      <ConfidenceSliderControl
        block={block}
        value={value}
        feedback={
          submissionState.status === "success"
            ? {
                status: "success",
                message: copy.confidenceSubmitted,
              }
            : submissionState
        }
        showQuestion={showQuestion}
        copy={copy}
        onValueChange={handleValueChange}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function InteractionBlockView({
  block,
  session,
  copy,
  onSessionChange,
}: {
  block: InteractionBlock;
  session: LearningSession;
  copy: LearningCanvasCopy;
  onSessionChange: (session: LearningSession) => void;
}) {
  const showQuestion = block.question !== session.state.board.checkQuestion;

  switch (block.type) {
    case "MultipleChoiceCheck":
      return (
        <MultipleChoiceCheckView
          block={block}
          session={session}
          showQuestion={showQuestion}
          copy={copy}
          onSessionChange={onSessionChange}
        />
      );
    case "ConfidenceSlider":
      return (
        <ConfidenceSliderView
          block={block}
          session={session}
          showQuestion={showQuestion}
          copy={copy}
          onSessionChange={onSessionChange}
        />
      );
  }
}

function ConfidenceView({
  confidence,
  copy,
}: {
  confidence: LearningCanvasState["board"]["confidence"];
  copy: LearningCanvasCopy;
}) {
  const percent =
    typeof confidence.value === "number"
      ? Math.round(confidence.value * 100)
      : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">
          {copy.confidenceLabels[confidence.status]}
        </span>
        {percent !== null ? (
          <span className="text-xs text-muted-foreground">{percent}%</span>
        ) : null}
      </div>
      {percent !== null ? (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="meter"
          aria-label={copy.confidence}
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

function ProgressSummary({
  presentation,
}: {
  presentation: LearningCanvasPresentation;
}) {
  const { progress, copy } = presentation;
  const percent =
    progress.total === 0 ? 0 : (progress.completed / progress.total) * 100;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{progress.label}</span>
        <span>{progress.completed}/{progress.total}</span>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={copy.learningProgress}
        aria-valuemin={0}
        aria-valuemax={progress.total}
        aria-valuenow={progress.completed}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function ProgressList({
  state,
  presentation,
}: {
  state: LearningCanvasState;
  presentation: LearningCanvasPresentation;
}) {
  const { copy } = presentation;

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <NotebookText
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="text-sm font-semibold">{copy.learningProgress}</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {presentation.progress.countLabel}
        </span>
      </div>
      <ProgressSummary presentation={presentation} />
      <ol className="mt-4 divide-y divide-border/60">
        {state.timeline.map((item) => (
          <li key={item.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {copy.kindLabels[item.kind]}
                </p>
                <h3 className="mt-0.5 text-sm font-medium leading-5">
                  {item.title}
                </h3>
              </div>
              <StatusPill status={item.status} copy={copy} />
            </div>
            {item.summary ? (
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                {item.summary}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-4 border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground">
        {copy.rhythm}
      </p>
    </>
  );
}

function DisclosureSummary({
  title,
  copy,
}: {
  title: string;
  copy: LearningCanvasCopy;
}) {
  return (
    <summary
      className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden ${focusRingClassName}`}
    >
      <span>{title}</span>
      <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
        <span className="group-open:hidden">{copy.viewDetails}</span>
        <span className="hidden group-open:inline">{copy.hideDetails}</span>
        <ChevronDown
          className="size-4 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </span>
    </summary>
  );
}

function ReflectionDisclosure({
  state,
  presentation,
}: {
  state: LearningCanvasState;
  presentation: LearningCanvasPresentation;
}) {
  const { copy, roles } = presentation;

  return (
    <details
      className="group rounded-xl bg-muted/35"
      open={roles.reflection === "primary" || undefined}
    >
      <DisclosureSummary title={copy.reflectionAndContext} copy={copy} />
      <div className="grid gap-5 border-t border-border/60 px-4 py-4">
        {roles.currentKnot !== "primary" ? (
          <section>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CircleHelp className="size-4" aria-hidden="true" />
              <h3>{copy.currentKnot}</h3>
            </div>
            <p className="text-sm leading-6 text-foreground">
              {state.board.currentKnot}
            </p>
          </section>
        ) : null}
        <section>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <UserRoundCheck className="size-4" aria-hidden="true" />
            <h3>{copy.userVersion}</h3>
          </div>
          <p className="text-sm leading-6 text-foreground">
            {state.board.userVersion ?? (
              <span className="text-muted-foreground">
                {copy.noUserVersion}
              </span>
            )}
          </p>
        </section>
        <section>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BadgeCheck className="size-4" aria-hidden="true" />
            <h3>{copy.confidenceStatus}</h3>
          </div>
          <div className="text-sm leading-6 text-foreground">
            <ConfidenceView
              confidence={state.board.confidence}
              copy={copy}
            />
          </div>
        </section>
      </div>
    </details>
  );
}

function ActiveWorkspace({
  session,
  presentation,
  onSessionChange,
}: {
  session: LearningSession;
  presentation: LearningCanvasPresentation;
  onSessionChange: (session: LearningSession) => void;
}) {
  const state = session.state;
  const { copy, roles, density } = presentation;
  const sectionGap = density === "compact" ? "gap-3" : "gap-4";

  return (
    <section
      aria-labelledby="learning-board-heading"
      className={`min-w-0 grid ${sectionGap}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.currentMicroturn}
          </p>
          <h2
            id="learning-board-heading"
            className="mt-0.5 text-lg font-semibold text-foreground"
          >
            {copy.tinyIdea}
          </h2>
        </div>
        <span className="rounded-full bg-muted/70 px-2.5 py-1 text-xs text-muted-foreground">
          {copy.oneIdeaOneCheck}
        </span>
      </div>

      {roles.currentKnot === "primary" ? (
        <section className="rounded-2xl bg-muted/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CircleHelp className="size-4" aria-hidden="true" />
            <h3>{copy.currentKnot}</h3>
          </div>
          <p className="text-sm leading-6 text-foreground">
            {state.board.currentKnot}
          </p>
        </section>
      ) : null}

      {roles.tinyIdea !== "hidden" ? (
        <section className="rounded-2xl bg-muted/40 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Lightbulb className="size-4" aria-hidden="true" />
            <h3>{copy.tinyIdea}</h3>
          </div>
          <p className="text-base font-medium leading-7 text-foreground">
            {state.board.tinyCoreIdea}
          </p>
          {roles.example === "primary" ? (
            <div className="mt-4 border-t border-border/60 pt-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <PanelsTopLeft className="size-4" aria-hidden="true" />
                <h3>{copy.oneExample}</h3>
              </div>
              <div className="text-sm leading-6 text-foreground">
                <ExampleBlockView
                  example={state.board.exampleBlock}
                  copy={copy}
                />
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {roles.tinyIdea === "hidden" && roles.currentKnot !== "primary" ? (
        <p className="rounded-xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {copy.waitingForIdea}
        </p>
      ) : null}

      <section
        aria-labelledby="current-check-heading"
        className="rounded-2xl bg-primary/8 p-5 ring-1 ring-primary/30 shadow-sm"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <MessageCircleQuestion className="size-4" aria-hidden="true" />
          <span>{copy.nextStep}</span>
        </div>
        <h3
          id="current-check-heading"
          className="mt-2 text-xl font-semibold text-foreground"
        >
          {copy.yourCheck}
        </h3>
        <p className="mt-2 text-base font-medium leading-7 text-foreground">
          {state.board.checkQuestion ?? (
            <span className="text-muted-foreground">{copy.noCheck}</span>
          )}
        </p>
        {state.board.interactionBlock ? (
          <InteractionBlockView
            block={state.board.interactionBlock}
            session={session}
            copy={copy}
            onSessionChange={onSessionChange}
          />
        ) : null}
      </section>

      <ReflectionDisclosure state={state} presentation={presentation} />
    </section>
  );
}

export default function LearningCanvas() {
  const { theme, maxHeight, safeArea } = useLayout();
  const { locale: hostLocale } = useUser();
  const [displayMode, requestDisplayMode] = useDisplayMode();
  const { output } = useToolInfo<"start_learning_canvas">();
  const { callToolAsync: readSession } = useCallTool(
    "read_learning_session",
  );
  const adaptor = getAdaptor();
  const { containerRef, containerWidth } = useContainerWidth();
  const [session, setSession] = useState<LearningSession | null>(
    output?.session ?? null,
  );
  const [mountedPresentation, setMountedPresentation] =
    useState<MountedPresentationState>(() =>
      createMountedPresentationState(output?.session.revision ?? 1),
    );

  useEffect(() => {
    if (output?.session) {
      setSession((mountedSession) =>
        mountedSession
          ? reconcileLearningSession(mountedSession, output.session).session
          : output.session,
      );
    }
  }, [output?.session]);

  useEffect(() => {
    void adaptor
      .setViewState({ presentation: mountedPresentation })
      .catch(() => undefined);
  }, [adaptor, mountedPresentation]);

  const layout = deriveLearningShellLayout({
    displayMode,
    maxHeight,
    safeAreaInsets: safeArea?.insets,
  });
  const fallbackLocale = hostLocale.toLowerCase().startsWith("de")
    ? "de"
    : "en";
  const fallbackCopy = getLearningCanvasCopy(fallbackLocale);
  const presentation = session
    ? deriveLearningCanvasPresentation({
        state: session.state,
        mode: layout.mode,
        containerWidth,
        availableHeight: layout.availableHeight,
        hostLocale,
      })
    : null;
  const copy = presentation?.copy ?? fallbackCopy;

  const requestMode = async (requestedMode: RequestedDisplayMode) => {
    if (mountedPresentation.modeRequestStatus === "pending") {
      return;
    }

    setMountedPresentation((current) =>
      beginDisplayModeRequest(current, requestedMode),
    );

    try {
      const result = await requestDisplayMode(requestedMode);

      if (result.mode !== requestedMode) {
        throw new Error(copy.modeError);
      }

      setMountedPresentation((current) =>
        completeDisplayModeRequest(current, requestedMode),
      );
    } catch {
      setMountedPresentation((current) =>
        failDisplayModeRequest(current, copy.modeError),
      );
    }
  };

  const acceptSessionUpdate = (incomingSession: LearningSession) => {
    setSession((mountedSession) =>
      mountedSession
        ? reconcileLearningSession(mountedSession, incomingSession).session
        : incomingSession,
    );
    setMountedPresentation((current) =>
      completeSessionSynchronization(current, incomingSession.revision),
    );
  };

  const refreshLatest = async () => {
    if (
      !session ||
      mountedPresentation.synchronizationStatus === "refreshing"
    ) {
      return;
    }

    setMountedPresentation((current) => beginSessionRefresh(current));

    try {
      const response = await readSession({ sessionId: session.sessionId });
      const result = response.structuredContent.result;

      if (response.isError || result.status !== "ok") {
        throw new Error(copy.synchronizationError);
      }

      const reconciliation = reconcileLearningSession(session, result.session);

      if (reconciliation.reason === "different-session") {
        throw new Error(copy.differentSessionError);
      }

      setSession(reconciliation.session);
      setMountedPresentation((current) =>
        completeSessionSynchronization(
          current,
          reconciliation.session.revision,
        ),
      );
    } catch (error) {
      setMountedPresentation((current) =>
        failSessionSynchronization(
          current,
          error instanceof Error
            ? error.message
            : copy.synchronizationError,
        ),
      );
    }
  };

  const shellStyle: CSSProperties = {
    maxHeight:
      layout.maxHeight === undefined ? undefined : `${layout.maxHeight}px`,
    paddingTop: `${layout.safeAreaInsets.top + 16}px`,
    paddingRight: `${layout.safeAreaInsets.right + 16}px`,
    paddingBottom: `${layout.safeAreaInsets.bottom + 20}px`,
    paddingLeft: `${layout.safeAreaInsets.left + 16}px`,
  };
  const rootClassName = `${theme === "dark" ? "dark" : ""} mx-auto box-border w-full overflow-x-hidden bg-transparent font-sans text-foreground`;

  if (!session || !presentation) {
    return (
      <main
        ref={containerRef}
        lang={fallbackLocale}
        className={`${rootClassName} max-w-5xl overflow-hidden`}
        style={shellStyle}
      >
        <p className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
          {copy.noCanvasState}
        </p>
      </main>
    );
  }

  const state = session.state;
  const presentationMessage =
    mountedPresentation.recoverableError?.message ??
    (layout.fallbackMessage ? copy.modeError : null);
  const modeRequestPending =
    mountedPresentation.modeRequestStatus === "pending";
  const refreshPending =
    mountedPresentation.synchronizationStatus === "refreshing";

  if (layout.mode === "inline") {
    return (
      <main
        ref={containerRef}
        lang={presentation.locale}
        className={`${rootClassName} max-w-2xl overflow-hidden`}
        style={shellStyle}
        data-llm={`Learning session ${session.sessionId}, revision ${session.revision}. Inline launcher for ${state.topic}.`}
      >
        <section className="rounded-2xl bg-card/90 p-4 ring-1 ring-border/60 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.sessionEyebrow}
              </p>
              <h1 className="mt-1 truncate text-lg font-semibold text-foreground">
                {state.topic}
              </h1>
            </div>
            <span className="shrink-0 rounded-full bg-muted/70 px-2.5 py-1 text-xs text-muted-foreground">
              {presentation.progress.label}
            </span>
          </div>
          <div className="mt-3 rounded-xl bg-muted/35 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {presentation.currentStep.label}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-medium leading-6">
              {presentation.currentStep.text}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-label={copy.openLearningCanvas}
              disabled={modeRequestPending}
              onClick={() => void requestMode("fullscreen")}
              className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 ${focusRingClassName} disabled:cursor-wait disabled:opacity-60`}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
              {modeRequestPending
                ? copy.openingCanvas
                : copy.openLearningCanvas}
            </button>
            <span className="text-xs text-muted-foreground">
              {copy.revision} {session.revision}
            </span>
          </div>
          <div className="sr-only" aria-live="polite">
            {modeRequestPending ? copy.openingCanvas : ""}
          </div>
          {presentationMessage ? (
            <p
              className="mt-3 text-sm text-rose-700 dark:text-rose-300"
              role="alert"
            >
              {presentationMessage}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  if (layout.mode === "pip") {
    return (
      <main
        ref={containerRef}
        lang={presentation.locale}
        className={`${rootClassName} max-w-xl overflow-hidden`}
        style={shellStyle}
        data-llm={`Learning session ${session.sessionId}, revision ${session.revision}. PiP companion showing the current question.`}
      >
        <section className="rounded-2xl bg-card/90 p-4 ring-1 ring-border/60 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {copy.currentStep}
              </p>
              <h1 className="mt-1 truncate text-base font-semibold">
                {state.topic}
              </h1>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {presentation.progress.label}
            </span>
          </div>
          <div className="mt-3 rounded-xl bg-primary/8 px-3 py-3 ring-1 ring-primary/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {presentation.currentStep.label}
            </p>
            <p className="mt-1 line-clamp-3 text-sm font-medium leading-6">
              {presentation.currentStep.text}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              aria-label={copy.returnToFullscreen}
              disabled={modeRequestPending}
              onClick={() => void requestMode("fullscreen")}
              className={modeButtonClassName}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
              {modeRequestPending ? copy.opening : copy.returnToFullscreen}
            </button>
            <button
              type="button"
              aria-label={copy.refresh}
              disabled={refreshPending}
              onClick={() => void refreshLatest()}
              className={modeButtonClassName}
            >
              <RefreshCcwDot className="size-4" aria-hidden="true" />
              {refreshPending ? copy.refreshing : copy.refresh}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {copy.revision} {session.revision}
          </p>
          <div className="sr-only" aria-live="polite">
            {refreshPending ? copy.refreshing : ""}
          </div>
          {presentationMessage ? (
            <p
              className="mt-2 text-xs text-rose-700 dark:text-rose-300"
              role="alert"
            >
              {presentationMessage}
            </p>
          ) : null}
        </section>
      </main>
    );
  }

  const isWide = presentation.workspaceLayout === "two-region";

  return (
    <main
      ref={containerRef}
      lang={presentation.locale}
      className={`${rootClassName} max-w-7xl overflow-y-auto`}
      style={{
        ...shellStyle,
        height:
          layout.maxHeight === undefined ? "100vh" : `${layout.maxHeight}px`,
        overscrollBehavior: "contain",
      }}
      data-layout={presentation.workspaceLayout}
      data-llm={`Learning session ${session.sessionId}, revision ${session.revision}. Current knot: ${state.board.currentKnot}. Check question: ${state.board.checkQuestion ?? "none"}.`}
    >
      <header
        className={`mb-5 flex gap-4 border-b border-border/60 pb-4 ${
          isWide
            ? "items-start justify-between"
            : "flex-col items-stretch"
        }`}
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {copy.canvasEyebrow}
          </p>
          <h1 className="mt-0.5 text-2xl font-semibold leading-8 text-foreground">
            {state.topic}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.focusedWorkspaceHint}
          </p>
        </div>
        <div
          className={`flex max-w-full flex-col gap-2 ${
            isWide ? "items-end" : "items-start"
          }`}
        >
          <div className="flex max-w-full flex-wrap gap-2">
            <button
              type="button"
              aria-label={copy.pictureInPicture}
              disabled={modeRequestPending}
              onClick={() => void requestMode("pip")}
              className={modeButtonClassName}
            >
              <PictureInPicture2 className="size-4" aria-hidden="true" />
              {copy.pictureInPicture}
            </button>
            <button
              type="button"
              aria-label={copy.inline}
              disabled={modeRequestPending}
              onClick={() => void requestMode("inline")}
              className={modeButtonClassName}
            >
              <Minimize2 className="size-4" aria-hidden="true" />
              {copy.inline}
            </button>
            <button
              type="button"
              aria-label={copy.refreshLatest}
              disabled={refreshPending}
              onClick={() => void refreshLatest()}
              className={modeButtonClassName}
            >
              <RefreshCcwDot className="size-4" aria-hidden="true" />
              {refreshPending ? copy.refreshing : copy.refreshLatest}
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            {copy.revision} {session.revision}
          </span>
          <div className="sr-only" aria-live="polite">
            {modeRequestPending
              ? copy.opening
              : refreshPending
                ? copy.refreshing
                : ""}
          </div>
          {presentationMessage ? (
            <span
              className="max-w-sm text-xs text-rose-700 dark:text-rose-300"
              role="alert"
            >
              {presentationMessage}
            </span>
          ) : null}
        </div>
      </header>

      <div
        className={`grid gap-5 ${
          isWide
            ? "grid-cols-[minmax(0,1fr)_minmax(280px,340px)] items-start"
            : "grid-cols-1"
        }`}
      >
        <ActiveWorkspace
          session={session}
          presentation={presentation}
          onSessionChange={acceptSessionUpdate}
        />

        {presentation.roles.progress === "secondary" ? (
          <aside
            aria-label={copy.learningProgress}
            className="rounded-2xl bg-muted/30 p-4"
          >
            <ProgressList state={state} presentation={presentation} />
          </aside>
        ) : (
          <details className="group rounded-xl bg-muted/30">
            <DisclosureSummary
              title={`${copy.learningProgress} · ${presentation.progress.label}`}
              copy={copy}
            />
            <div className="border-t border-border/60 px-4 py-4">
              <ProgressList state={state} presentation={presentation} />
            </div>
          </details>
        )}
      </div>
    </main>
  );
}
