# Make It Click MCP App

Make It Click is a Skybridge MCP/ChatGPT app for focused micro-coaching. It gives the user and the model a shared learning canvas for the current confusion, one small idea, one check, and the progress made across earlier microturns.

It is a structured coaching canvas, not a generic lesson builder.

## Coaching contract

Every microturn follows the same rhythm:

```txt
diagnose -> one tiny idea -> check -> wait -> next tiny idea
```

A turn teaches exactly one small idea, uses at most one example or visual, asks exactly one check question, and then waits for the user's next signal. The full product rules live in the [product spec](SPEC.md) and [coach policy](docs/coach-policy.md).

## Tools and state flow

The server exposes one view-backed launcher and two viewless session tools:

- `start_learning_canvas` creates an in-memory server-owned session from a required topic plus optional confusion and conversation context. It returns the stable session id, revision, timestamps, and initial structured state.
- `update_microturn` requires the session id and expected revision plus either a plain-text answer or typed interaction result. It updates the authoritative state exactly once when the revision is current and returns a structured conflict without mutation when it is stale.
- `read_learning_session` is app-only. The active canvas calls it when the user chooses **Refresh latest**, which is the initial synchronization mechanism for model-driven updates.

Only `start_learning_canvas` renders the learning canvas:

```txt
View-backed start
  -> server-owned LearningSession
  -> shared React learning canvas
  -> plain answer or typed user interaction
  -> viewless revision-guarded update_microturn
  -> explicit app-only read_learning_session refresh when needed
```

The canvas state is defined and validated with Zod in [`src/domain/learning-canvas-state.ts`](src/domain/learning-canvas-state.ts). The authoritative session and revision results live in [`src/domain/learning-session.ts`](src/domain/learning-session.ts), while [`src/learning-session-store.ts`](src/learning-session-store.ts) is the small process-local action boundary. Its board keeps the current knot, tiny core idea, optional example, check question, optional typed interaction, user version, and confidence. Its timeline records compact microturn checkpoints with `open`, `understood`, `uncertain`, or `revisit` status.

### Implemented interaction blocks

The current discriminated union contains two safe, serializable interaction blocks:

- `MultipleChoiceCheck`: one question with 2–6 explicit options; submission records the selected option as structured data.
- `ConfidenceSlider`: one question with a value from `0` to `1` and a default step of `0.1`; submission records the selected confidence as structured data.

Both submit their typed result plus the current session id and revision through `update_microturn`. The view preserves and exposes the structured result, but does not grade it, change the timeline status, or create the next microturn on its own.

## Project structure

```txt
src/
  server.ts                         MCP server and tool registration
  learning-session-store.ts         In-memory session action boundary
  helpers.ts                        Typed Skybridge view helpers
  domain/                           State/session data and pure computations
  views/
    learning-canvas.tsx             Shared learning board and timeline
    start-learning-canvas.tsx       start_learning_canvas view entry
  components/                       Reusable controlled UI components
docs/
  coach-policy.md                   Coaching runtime contract
SPEC.md                             Product and architecture source of truth
AGENTS.md                           Repository workflow and coding guidance
```

## Local setup

### Prerequisites

- Node.js `>=24.14.1`
- npm

Install dependencies from the repository root:

```bash
npm install
```

## Test and build

Run the deterministic domain and interaction tests:

```bash
npm test
```

Build the MCP server and views:

```bash
npm run build
```

These commands are the bounded default validation workflow.

## Bounded local DevTools check

When an interactive smoke check is needed, start Skybridge DevTools in the foreground:

```bash
npm run dev
```

Open the local URL printed by Skybridge, invoke `start_learning_canvas`, and optionally exercise a valid update, stale update, missing read, and **Refresh latest**. Do not assume a fixed port; use the URL reported by the command.

Stop the server with `Ctrl+C` as soon as the check is complete. Before finishing work, confirm that the command returned to the shell and that no project-related Skybridge, Node, watcher, or browser-automation process started for the check remains running.

Tunnel and deployment commands are intentionally not part of the default local workflow.

## Current limits

- Interaction submissions are not automatically graded.
- Submitting an interaction does not automatically change timeline status or advance to another microturn; the model or tool caller must evaluate the signal and provide those updates.
- The model cannot generate arbitrary React or executable UI. It can only provide data for the implemented typed interaction schemas.
- Learning sessions are stored only in the current server process and disappear when it stops; there is no durable persistence layer, database, authentication, analytics, or external service.
- Model-driven viewless updates do not push into an already-open canvas. The user must choose **Refresh latest**.
- ChatGPT controls surrounding narration and status UI; the app does not guarantee their suppression.
- The canvas supports one focused microturn at a time rather than generating a multi-step lesson.

## Sources of truth

- [Product specification](SPEC.md)
- [Coach policy](docs/coach-policy.md)
- [Repository and agent guidance](AGENTS.md)
- [Tool registration](src/server.ts)
- [Learning state schema](src/domain/learning-canvas-state.ts)
