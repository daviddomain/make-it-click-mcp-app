import "@/index.css";

import { useEffect, useState } from "react";
import { useDisplayMode, useLayout } from "skybridge/web";

import { useCallTool, useToolInfo } from "@/helpers.js";
import type {
  LearningSessionSpikeEnvelope,
  SpikeDisplayMode,
} from "@/domain/learning-session-spike.js";

type RequestStatus =
  | { state: "idle"; message: string }
  | { state: "pending"; message: string }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

const idleRequestStatus: RequestStatus = {
  state: "idle",
  message: "No host display-mode request sent yet.",
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function ModeButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export default function LearningSessionSpike() {
  const { theme } = useLayout();
  const [displayMode, requestDisplayMode] = useDisplayMode();
  const { output } = useToolInfo<"start_learning_session_spike">();
  const { callToolAsync: advanceSession } = useCallTool(
    "advance_learning_session_spike",
  );
  const { callToolAsync: readSession } = useCallTool(
    "read_learning_session_spike",
  );
  const [envelope, setEnvelope] =
    useState<LearningSessionSpikeEnvelope | null>(
      output?.envelope ?? null,
    );
  const [requestStatus, setRequestStatus] =
    useState<RequestStatus>(idleRequestStatus);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (output?.envelope) {
      setEnvelope(output.envelope);
    }
  }, [output?.envelope]);

  if (!envelope) {
    return (
      <main
        className={`${theme === "dark" ? "dark" : ""} bg-background p-4 text-foreground`}
      >
        No spike session was returned.
      </main>
    );
  }

  const requestMode = async (mode: SpikeDisplayMode) => {
    setRequestStatus({
      state: "pending",
      message: `Requesting ${mode} from the ChatGPT host...`,
    });

    try {
      const accepted = await requestDisplayMode(mode);
      const response = await readSession({
        sessionId: envelope.sessionId,
        displayMode: accepted.mode,
      });
      setEnvelope(response.structuredContent.envelope);
      setRequestStatus({
        state: "success",
        message: `Host accepted ${mode} and reported ${accepted.mode}.`,
      });
    } catch (error) {
      setRequestStatus({
        state: "error",
        message: `Host rejected ${mode}: ${errorMessage(error)}`,
      });
    }
  };

  const runDirectWidgetTurn = async () => {
    setIsAdvancing(true);

    try {
      const response = await advanceSession({
        sessionId: envelope.sessionId,
        source: "widget",
        userAnswer: "Store items and derive itemCount from items.length.",
        timelineStatus: "understood",
        nextMicroturn: {
          kind: "tinyIdea",
          title: "Recompute from the source",
          tinyCoreIdea:
            "A value derived from current state should be recalculated from that state.",
          checkQuestion: "What should cause itemCount to change?",
          summary:
            "The direct widget path advanced one deterministic microturn.",
        },
      });
      setEnvelope(response.structuredContent.envelope);
    } catch (error) {
      setRequestStatus({
        state: "error",
        message: `Direct widget update failed: ${errorMessage(error)}`,
      });
    } finally {
      setIsAdvancing(false);
    }
  };

  const refreshLatestRevision = async () => {
    setIsRefreshing(true);
    setEnvelope((current) =>
      current
        ? { ...current, synchronizationStatus: "refreshing" }
        : current,
    );

    try {
      const response = await readSession({
        sessionId: envelope.sessionId,
        displayMode:
          displayMode === "modal" ? envelope.displayMode : displayMode,
      });
      setEnvelope(response.structuredContent.envelope);
    } catch (error) {
      setEnvelope((current) =>
        current ? { ...current, synchronizationStatus: "error" } : current,
      );
      setRequestStatus({
        state: "error",
        message: `Refresh failed: ${errorMessage(error)}`,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const rootClassName = `${theme === "dark" ? "dark" : ""} bg-background text-foreground`;
  const commonStatus = (
    <div className="grid gap-1 text-xs text-muted-foreground">
      <p>
        Session: <code>{envelope.sessionId}</code>
      </p>
      <p>
        Revision: <strong>{envelope.revision}</strong> · Host mode:{" "}
        <strong>{displayMode}</strong> · Sync:{" "}
        <strong>{envelope.synchronizationStatus}</strong>
      </p>
      <p aria-live="polite">{requestStatus.message}</p>
    </div>
  );

  if (displayMode === "inline") {
    return (
      <main
        className={`${rootClassName} mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-lg border border-border p-4`}
        data-llm={`Issue 27 spike session ${envelope.sessionId}, revision ${envelope.revision}, inline launcher.`}
      >
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Issue 27 technical spike
          </p>
          <h1 className="text-base font-semibold">
            Open the single learning workspace
          </h1>
        </div>
        {commonStatus}
        <div className="flex flex-wrap gap-2">
          <ModeButton
            disabled={requestStatus.state === "pending"}
            onClick={() => void requestMode("fullscreen")}
          >
            Request fullscreen
          </ModeButton>
          <ModeButton
            disabled={requestStatus.state === "pending"}
            onClick={() => void requestMode("pip")}
          >
            Request PiP
          </ModeButton>
        </div>
      </main>
    );
  }

  if (displayMode === "pip") {
    return (
      <main
        className={`${rootClassName} grid gap-3 p-4`}
        data-llm={`Issue 27 spike session ${envelope.sessionId}, revision ${envelope.revision}, PiP companion.`}
      >
        <div>
          <p className="text-xs uppercase text-muted-foreground">PiP companion</p>
          <h1 className="font-semibold">{envelope.state.topic}</h1>
          <p className="mt-1 text-sm">
            Revision {envelope.revision}:{" "}
            {envelope.state.board.checkQuestion ?? "No active check."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ModeButton
            disabled={isRefreshing}
            onClick={() => void refreshLatestRevision()}
          >
            {isRefreshing ? "Refreshing..." : "Refresh latest"}
          </ModeButton>
          <ModeButton
            disabled={requestStatus.state === "pending"}
            onClick={() => void requestMode("fullscreen")}
          >
            Fullscreen
          </ModeButton>
          <ModeButton
            disabled={requestStatus.state === "pending"}
            onClick={() => void requestMode("inline")}
          >
            Inline
          </ModeButton>
        </div>
        {commonStatus}
      </main>
    );
  }

  return (
    <main
      className={`${rootClassName} min-h-screen p-5`}
      data-llm={`Issue 27 spike session ${envelope.sessionId}, revision ${envelope.revision}, fullscreen workspace. Current check: ${envelope.state.board.checkQuestion ?? "none"}.`}
    >
      <div className="mx-auto grid max-w-5xl gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Fullscreen spike workspace
            </p>
            <h1 className="text-xl font-semibold">{envelope.state.topic}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <ModeButton
              disabled={requestStatus.state === "pending"}
              onClick={() => void requestMode("pip")}
            >
              Request PiP
            </ModeButton>
            <ModeButton
              disabled={requestStatus.state === "pending"}
              onClick={() => void requestMode("inline")}
            >
              Return inline
            </ModeButton>
          </div>
        </header>

        {commonStatus}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="grid gap-3 rounded-lg border border-border p-4">
            <div>
              <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                Current knot
              </h2>
              <p className="mt-1 text-sm">
                {envelope.state.board.currentKnot}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                Tiny idea
              </h2>
              <p className="mt-1 text-sm">
                {envelope.state.board.tinyCoreIdea ?? "Waiting for one answer."}
              </p>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                Current check
              </h2>
              <p className="mt-1 font-medium">
                {envelope.state.board.checkQuestion ?? "No active check."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <ModeButton
                disabled={isAdvancing || envelope.revision !== 1}
                onClick={() => void runDirectWidgetTurn()}
              >
                {isAdvancing
                  ? "Advancing..."
                  : "Run direct-widget turn"}
              </ModeButton>
              <ModeButton
                disabled={isRefreshing}
                onClick={() => void refreshLatestRevision()}
              >
                {isRefreshing ? "Refreshing..." : "Refresh latest revision"}
              </ModeButton>
            </div>
          </section>

          <aside className="rounded-lg border border-border p-4">
            <h2 className="text-sm font-semibold">Microturn timeline</h2>
            <ol className="mt-2 grid gap-2 text-sm">
              {envelope.state.timeline.map((item) => (
                <li key={item.id} className="border-t border-border pt-2">
                  <span className="font-medium">{item.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.status}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </main>
  );
}
