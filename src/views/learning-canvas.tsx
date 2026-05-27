import "@/index.css";

import {
  BadgeCheck,
  CircleDot,
  CircleHelp,
  Lightbulb,
  MessageCircleQuestion,
  NotebookText,
  PanelsTopLeft,
  RefreshCcwDot,
  UserRoundCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useLayout } from "skybridge/web";

import { useToolInfo } from "@/helpers.js";
import type {
  ExampleBlock,
  LearningCanvasState,
  MicroturnKind,
  TimelineStatus,
} from "@/domain/learning-canvas-state.js";

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

function FieldCard({
  icon: Icon,
  label,
  tone = "default",
  className = "",
  children,
}: {
  icon: typeof CircleDot;
  label: string;
  tone?: "default" | "primary" | "secondary";
  className?: string;
  children: ReactNode;
}) {
  const toneClassNames = {
    default: "bg-card shadow-sm",
    primary:
      "border-primary/40 bg-primary/5 shadow-sm dark:border-primary/50 dark:bg-primary/10",
    secondary: "bg-muted/40 shadow-none",
  }[tone];

  return (
    <section
      className={`rounded-lg border border-border p-4 ${toneClassNames} ${className}`}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        <h2>{label}</h2>
      </div>
      <div className="text-sm leading-6 text-foreground">{children}</div>
    </section>
  );
}

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
        <p className="font-medium">{example.block.prompt}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {example.block.type}
        </p>
      </div>
    );
  }

  return <p>{example.text}</p>;
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
      <div className="mb-4 flex flex-col gap-1 border-b border-border pb-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Make It Click canvas
        </p>
        <h1 className="text-xl font-semibold leading-7 text-foreground md:text-2xl">
          {state.topic}
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.8fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldCard icon={CircleHelp} label="What's confusing">
            {state.board.currentKnot}
          </FieldCard>
          <FieldCard icon={Lightbulb} label="Tiny idea">
            {state.board.tinyCoreIdea ?? (
              <span className="text-muted-foreground">Not chosen yet.</span>
            )}
          </FieldCard>
          <FieldCard
            icon={PanelsTopLeft}
            label="One example"
            className="sm:col-span-2"
          >
            <ExampleBlockView example={state.board.exampleBlock} />
          </FieldCard>
          <div className="sm:col-span-2">
            <FieldCard
              icon={MessageCircleQuestion}
              label="Your check"
              tone="primary"
            >
              <p className="text-base font-medium leading-7">
                {state.board.checkQuestion ?? (
                  <span className="text-muted-foreground">
                    No check question queued.
                  </span>
                )}
              </p>
            </FieldCard>
          </div>
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
            <FieldCard
              icon={UserRoundCheck}
              label="User version"
              tone="secondary"
            >
              {state.board.userVersion ?? (
                <span className="text-muted-foreground">
                  No user version recorded yet.
                </span>
              )}
            </FieldCard>
            <FieldCard icon={BadgeCheck} label="Confidence / status" tone="secondary">
              <ConfidenceView confidence={state.board.confidence} />
            </FieldCard>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <NotebookText
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold">Learning progress</h2>
          </div>
          <ol className="flex flex-col gap-3">
            {state.timeline.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {kindLabels[item.kind]}
                    </p>
                    <h3 className="mt-1 text-sm font-medium leading-5">
                      {item.title}
                    </h3>
                  </div>
                  <StatusPill status={item.status} />
                </div>
                {item.summary ? (
                  <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    {item.summary}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <RefreshCcwDot className="size-4 shrink-0" aria-hidden="true" />
            Diagnose {"->"} one tiny idea {"->"} check {"->"} wait.
          </div>
        </aside>
      </div>
    </main>
  );
}
