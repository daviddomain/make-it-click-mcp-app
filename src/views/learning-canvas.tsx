import "@/index.css";

import {
  BadgeCheck,
  CheckCircle2,
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
  useState,
  type CSSProperties,
} from "react";
import { getAdaptor, useDisplayMode, useLayout } from "skybridge/web";

import { useCallTool, useToolInfo } from "@/helpers.js";
import { ConfidenceSliderControl } from "@/components/confidence-slider-control.js";
import {
  createConfidenceSliderResult,
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
  beginDisplayModeRequest,
  beginSessionRefresh,
  completeDisplayModeRequest,
  completeSessionSynchronization,
  createMountedPresentationState,
  deriveLearningShellLayout,
  deriveLearningShellViewModel,
  failDisplayModeRequest,
  failSessionSynchronization,
  reconcileLearningSession,
  type MountedPresentationState,
  type RequestedDisplayMode,
} from "@/domain/learning-shell.js";
import type { LearningSession } from "@/domain/learning-session.js";
import { createMultipleChoiceCheckResult } from "@/domain/multiple-choice-check.js";

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
  session,
  showQuestion,
  onSessionChange,
}: {
  block: MultipleChoiceCheckBlock;
  session: LearningSession;
  showQuestion: boolean;
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
      const response = await callToolAsync({
        sessionId: session.sessionId,
        expectedRevision: session.revision,
        interactionResult,
      });
      const result = response.structuredContent.result;
      const submittedResult =
        result.status === "ok" ? result.interactionResult : null;

      if (result.status !== "ok") {
        throw new Error(result.error.message);
      }

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

      onSessionChange(result.session);
      setSubmissionState({ status: "success", result: submittedResult });
    } catch (error) {
      setSubmissionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The answer could not be submitted. Please try again.",
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
  session,
  showQuestion,
  onSessionChange,
}: {
  block: ConfidenceSliderBlock;
  session: LearningSession;
  showQuestion: boolean;
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
      const response = await callToolAsync({
        sessionId: session.sessionId,
        expectedRevision: session.revision,
        interactionResult,
      });
      const result = response.structuredContent.result;
      const submittedResult =
        result.status === "ok" ? result.interactionResult : null;

      if (result.status !== "ok") {
        throw new Error(result.error.message);
      }

      if (
        response.isError ||
        !submittedResult ||
        submittedResult.type !== "ConfidenceSlider" ||
        submittedResult.blockId !== interactionResult.blockId ||
        submittedResult.value !== interactionResult.value
      ) {
        throw new Error("The submitted result was not confirmed.");
      }

      onSessionChange(result.session);
      setSubmissionState({ status: "success", result: submittedResult });
    } catch (error) {
      setSubmissionState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The confidence could not be submitted. Please try again.",
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
  session,
  onSessionChange,
}: {
  block: InteractionBlock;
  session: LearningSession;
  onSessionChange: (session: LearningSession) => void;
}) {
  const state = session.state;
  const showQuestion = block.question !== state.board.checkQuestion;

  switch (block.type) {
    case "MultipleChoiceCheck":
      return (
        <MultipleChoiceCheckView
          block={block}
          session={session}
          showQuestion={showQuestion}
          onSessionChange={onSessionChange}
        />
      );
    case "ConfidenceSlider":
      return (
        <ConfidenceSliderView
          block={block}
          session={session}
          showQuestion={showQuestion}
          onSessionChange={onSessionChange}
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
  const { theme, maxHeight, safeArea } = useLayout();
  const [displayMode, requestDisplayMode] = useDisplayMode();
  const { output } = useToolInfo<"start_learning_canvas">();
  const { callToolAsync: readSession } = useCallTool(
    "read_learning_session",
  );
  const adaptor = getAdaptor();
  const [session, setSession] = useState<LearningSession | null>(
    output?.session ?? null,
  );
  const [presentation, setPresentation] =
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
    void adaptor.setViewState({ presentation }).catch(() => undefined);
  }, [adaptor, presentation]);

  const requestMode = async (requestedMode: RequestedDisplayMode) => {
    if (presentation.modeRequestStatus === "pending") {
      return;
    }

    setPresentation((current) =>
      beginDisplayModeRequest(current, requestedMode),
    );

    try {
      const result = await requestDisplayMode(requestedMode);

      if (result.mode !== requestedMode) {
        throw new Error(
          `The host stayed in ${result.mode} mode instead of ${requestedMode}.`,
        );
      }

      setPresentation((current) =>
        completeDisplayModeRequest(current, requestedMode),
      );
    } catch (error) {
      const detail =
        error instanceof Error ? ` ${error.message}` : "";

      setPresentation((current) =>
        failDisplayModeRequest(
          current,
          `The host could not open ${requestedMode} mode. You can keep using this view and try again.${detail}`,
        ),
      );
    }
  };

  const acceptSessionUpdate = (incomingSession: LearningSession) => {
    setSession((mountedSession) =>
      mountedSession
        ? reconcileLearningSession(mountedSession, incomingSession).session
        : incomingSession,
    );
    setPresentation((current) =>
      completeSessionSynchronization(current, incomingSession.revision),
    );
  };

  const refreshLatest = async () => {
    if (!session || presentation.synchronizationStatus === "refreshing") {
      return;
    }

    setPresentation((current) => beginSessionRefresh(current));

    try {
      const response = await readSession({ sessionId: session.sessionId });
      const result = response.structuredContent.result;

      if (response.isError || result.status !== "ok") {
        throw new Error(
          result.status === "not_found"
            ? result.error.message
            : "The latest session could not be read.",
        );
      }

      const reconciliation = reconcileLearningSession(session, result.session);

      if (reconciliation.reason === "different-session") {
        throw new Error(
          "The refreshed result belongs to a different learning session.",
        );
      }

      setSession(reconciliation.session);
      setPresentation((current) =>
        completeSessionSynchronization(
          current,
          reconciliation.session.revision,
        ),
      );
    } catch (error) {
      setPresentation((current) =>
        failSessionSynchronization(
          current,
          error instanceof Error
            ? error.message
            : "The latest session could not be read.",
        ),
      );
    }
  };

  const layout = deriveLearningShellLayout({
    displayMode,
    maxHeight,
    safeAreaInsets: safeArea?.insets,
  });
  const shellStyle: CSSProperties = {
    maxHeight:
      layout.maxHeight === undefined ? undefined : `${layout.maxHeight}px`,
    paddingTop: `${layout.safeAreaInsets.top + 16}px`,
    paddingRight: `${layout.safeAreaInsets.right + 16}px`,
    paddingBottom: `${layout.safeAreaInsets.bottom + 16}px`,
    paddingLeft: `${layout.safeAreaInsets.left + 16}px`,
  };
  const state = session?.state;

  if (!session || !state) {
    return (
      <main
        className={`${theme === "dark" ? "dark" : ""} mx-auto box-border w-full max-w-5xl overflow-hidden bg-background text-foreground`}
        style={shellStyle}
      >
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No learning canvas state was returned by the tool.
        </p>
      </main>
    );
  }

  const viewModel = deriveLearningShellViewModel({
    session,
    mode: layout.mode,
  });
  const presentationMessage =
    presentation.recoverableError?.message ?? layout.fallbackMessage;
  const modeRequestPending = presentation.modeRequestStatus === "pending";
  const refreshPending =
    presentation.synchronizationStatus === "refreshing";
  const modeButtonClassName =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-60";

  if (viewModel.mode === "inline") {
    return (
      <main
        className={`${theme === "dark" ? "dark" : ""} mx-auto box-border w-full max-w-2xl overflow-hidden bg-background text-foreground`}
        style={shellStyle}
        data-llm={`Learning session ${session.sessionId}, revision ${session.revision}. Inline launcher for ${state.topic}.`}
      >
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Make It Click session
              </p>
              <h1 className="mt-1 truncate text-lg font-semibold text-foreground">
                {viewModel.topic}
              </h1>
            </div>
            <span className="shrink-0 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
              {viewModel.progressLabel}
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {viewModel.revisionLabel} · Open the focused workspace to continue
            this learning session.
          </p>
          <button
            type="button"
            aria-label="Open learning canvas in fullscreen"
            disabled={modeRequestPending}
            onClick={() => void requestMode("fullscreen")}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            <Maximize2 className="size-4" aria-hidden="true" />
            {modeRequestPending ? "Opening canvas..." : "Open learning canvas"}
          </button>
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

  if (viewModel.mode === "pip") {
    return (
      <main
        className={`${theme === "dark" ? "dark" : ""} mx-auto box-border w-full max-w-xl overflow-hidden bg-background text-foreground`}
        style={shellStyle}
        data-llm={`Learning session ${session.sessionId}, revision ${session.revision}. PiP companion showing ${viewModel.currentStepLabel.toLowerCase()}.`}
      >
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                Current step
              </p>
              <h1 className="mt-1 truncate text-base font-semibold text-foreground">
                {viewModel.topic}
              </h1>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {viewModel.progressLabel}
            </span>
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-normal text-primary">
              {viewModel.currentStepLabel}
            </p>
            <p className="mt-1 line-clamp-3 text-sm font-medium leading-6 text-foreground">
              {viewModel.currentStepText}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              aria-label="Return to fullscreen learning canvas"
              disabled={modeRequestPending}
              onClick={() => void requestMode("fullscreen")}
              className={modeButtonClassName}
            >
              <Maximize2 className="size-4" aria-hidden="true" />
              {modeRequestPending ? "Opening..." : "Return to fullscreen"}
            </button>
            <button
              type="button"
              aria-label="Refresh latest learning session revision"
              disabled={refreshPending}
              onClick={() => void refreshLatest()}
              className={modeButtonClassName}
            >
              <RefreshCcwDot className="size-4" aria-hidden="true" />
              {refreshPending ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {viewModel.revisionLabel}
          </p>
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

  return (
    <main
      className={`${theme === "dark" ? "dark" : ""} mx-auto box-border w-full max-w-6xl overflow-x-hidden overflow-y-auto bg-background text-foreground`}
      style={{
        ...shellStyle,
        height:
          layout.maxHeight === undefined ? "100vh" : `${layout.maxHeight}px`,
      }}
      data-llm={`Learning session ${session.sessionId}, revision ${session.revision}. Current knot: ${state.board.currentKnot}. Check question: ${state.board.checkQuestion ?? "none"}.`}
    >
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Make It Click canvas
          </p>
          <h1 className="text-xl font-semibold leading-7 text-foreground md:text-2xl">
            {state.topic}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay with one small step until it clicks.
          </p>
        </div>
        <div className="flex max-w-full flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              aria-label="Open compact picture-in-picture learning companion"
              disabled={modeRequestPending}
              onClick={() => void requestMode("pip")}
              className={modeButtonClassName}
            >
              <PictureInPicture2 className="size-4" aria-hidden="true" />
              PiP
            </button>
            <button
              type="button"
              aria-label="Return learning canvas to inline mode"
              disabled={modeRequestPending}
              onClick={() => void requestMode("inline")}
              className={modeButtonClassName}
            >
              <Minimize2 className="size-4" aria-hidden="true" />
              Inline
            </button>
            <button
              type="button"
              aria-label="Refresh latest learning session revision"
              disabled={refreshPending}
              onClick={() => void refreshLatest()}
              className={modeButtonClassName}
            >
              <RefreshCcwDot className="size-4" aria-hidden="true" />
              {refreshPending ? "Refreshing..." : "Refresh latest"}
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            Revision {session.revision}
          </span>
          {presentationMessage ? (
            <span
              className="max-w-xs text-right text-xs text-rose-700 dark:text-rose-300"
              role="alert"
            >
              {presentationMessage}
            </span>
          ) : null}
        </div>
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
                session={session}
                onSessionChange={acceptSessionUpdate}
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
