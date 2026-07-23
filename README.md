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

The server exposes two tools:

- `start_learning_canvas` starts a session from a required topic plus optional confusion and conversation context. It returns an initial structured state with an open diagnosis microturn.
- `update_microturn` receives the existing state and either a plain-text answer or a typed interaction result. It records the user's signal, can update the active timeline status, and can append one caller-provided next microturn.

Both tools render the same learning canvas through separate Skybridge view entry points:

```txt
Tool call
  -> structured LearningCanvasState
  -> shared React learning canvas
  -> plain answer or typed user interaction
  -> update_microturn
  -> updated state for the model and view
```

The state is defined and validated with Zod in [`src/domain/learning-canvas-state.ts`](src/domain/learning-canvas-state.ts). Its board keeps the current knot, tiny core idea, optional example, check question, optional typed interaction, user version, and confidence. Its timeline records compact microturn checkpoints with `open`, `understood`, `uncertain`, or `revisit` status.

### Implemented interaction blocks

The current discriminated union contains two safe, serializable interaction blocks:

- `MultipleChoiceCheck`: one question with 2–6 explicit options; submission records the selected option as structured data.
- `ConfidenceSlider`: one question with a value from `0` to `1` and a default step of `0.1`; submission records the selected confidence as structured data.

Both submit through `update_microturn`. The view preserves and exposes the structured result, but does not grade it, change the timeline status, or create the next microturn on its own.

## Project structure

```txt
src/
  server.ts                         MCP server and tool registration
  helpers.ts                        Typed Skybridge view helpers
  domain/                           State schemas and coaching computations
  views/
    learning-canvas.tsx             Shared learning board and timeline
    start-learning-canvas.tsx       start_learning_canvas view entry
    update-learning-canvas.tsx      update_microturn view entry
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

Open the local URL printed by Skybridge, invoke `start_learning_canvas`, and optionally submit one interaction to `update_microturn`. Do not assume a fixed port; use the URL reported by the command.

Stop the server with `Ctrl+C` as soon as the check is complete. Before finishing work, confirm that the command returned to the shell and that no project-related Skybridge, Node, watcher, or browser-automation process started for the check remains running.

Tunnel and deployment commands are intentionally not part of the default local workflow.

## Current limits

- Interaction submissions are not automatically graded.
- Submitting an interaction does not automatically change timeline status or advance to another microturn; the model or tool caller must evaluate the signal and provide those updates.
- The model cannot generate arbitrary React or executable UI. It can only provide data for the implemented typed interaction schemas.
- Learning state is passed between tool calls and view updates; there is no persistence layer, database, authentication, analytics, or external service.
- The canvas supports one focused microturn at a time rather than generating a multi-step lesson.

## Sources of truth

- [Product specification](SPEC.md)
- [Coach policy](docs/coach-policy.md)
- [Repository and agent guidance](AGENTS.md)
- [Tool registration](src/server.ts)
- [Learning state schema](src/domain/learning-canvas-state.ts)
