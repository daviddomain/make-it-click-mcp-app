# AGENTS.md

## Project

This repository contains `make-it-click-mcp-app`, a Skybridge MCP/ChatGPT app for turning the Make It Click coaching pattern into a visible learning canvas.

The app should help the model and the user share the same structured learning state:

- current confusion knot
- tiny core idea
- one example or visual
- one check question
- user version or prediction
- confidence/status
- microturn timeline

The app is not a generic lesson builder. It is a structured micro-coaching canvas.

## Source of truth

Use these files as the main product references:

1. `SPEC.md`
2. `docs/coach-policy.md`
3. `src/domain/coach-policy.ts`
4. the currently assigned GitHub issue

When these sources conflict, prefer the currently assigned GitHub issue for implementation scope, but do not violate the product rules in `SPEC.md` and `docs/coach-policy.md`.

## Core product rules

The Make It Click runtime contract is product logic, not optional writing style.

Every coaching microturn should follow this rhythm:

```txt
diagnose -> one tiny idea -> check -> wait -> next tiny idea
```

A coaching turn should:

1. teach exactly one small idea
2. use at most one example, code snippet, diagram, or analogy
3. ask exactly one check question
4. stop after the check question
5. wait for the user's next signal before continuing

Do not turn timeline entries into full lesson notes.

Do not generate arbitrary React/code from model output. The model may choose from fixed, typed interaction blocks only.

## Architecture direction

Prefer structured state over prompt-only behavior.

Expected flow:

```txt
Tool call -> learning state data -> React view -> user interaction -> updated state for the model
```

Keep learning state machine-readable so the model can continue from the board and timeline without reconstructing everything from prose.

## Skybridge conventions

This project uses Skybridge.

Important conventions:

- Server/tool registration lives in `src/server.ts`.
- Views live in `src/views/`.
- A view component file name should match the registered view component name.
- Shared helpers live in `src/helpers.ts`.
- Shared product/domain logic should live under `src/domain/`.
- Use `generateHelpers<AppType>()` from `skybridge/web` for typed view helpers.
- Use the existing `@/*` path alias for imports from `src`.

Do not replace Skybridge patterns with unrelated app architecture unless explicitly requested.

## Tech stack

- TypeScript
- React
- Vite
- Skybridge
- Tailwind CSS
- `@alpic-ai/ui`
- Zod

Use the existing package manager and scripts unless the issue says otherwise.

## Commands

Install dependencies:

```bash
npm install
```

Start local development:

```bash
npm run dev
```

Start local development with tunnel only when explicitly requested:

```bash
npm run dev:tunnel
```

Build:

```bash
npm run build
```

Start production build:

```bash
npm run start
```

Deploy only when explicitly requested:

```bash
npm run deploy
```

## Process Hygiene

Agents must not leave long-running local processes running after completing a task.

Avoid persistent watch commands for validation unless explicitly requested. Prefer bounded commands such as:

- `npm run build`
- one-shot smoke scripts
- targeted test commands

If a task requires starting a long-running process such as:

- `npm run dev`
- `skybridge dev`
- `tsc --watch`
- Playwright UI
- Chrome DevTools MCP
- local browser automation servers

then the agent must:

1. Track the process ID.
2. Stop the process before committing or opening a PR.
3. Verify that no project-related process started by the task is still running.
4. Mention cleanup in the final report.

The expected final state is:

- clean working tree
- no lingering dev servers
- no watchers
- no browser automation servers
- no MCP helper processes started by the agent

## Validation

Before finishing a code change, run:

```bash
npm run build
```

If the build cannot be run because dependencies are missing or the local environment is unavailable, say so clearly in the final response.

Do not claim validation passed unless the command was actually run successfully.

## Issue workflow

Work one issue at a time.

Before changing code:

1. read the assigned issue
2. read the relevant sections of `SPEC.md`
3. read `docs/coach-policy.md`
4. inspect the existing implementation
5. make a small plan

During implementation:

- stay inside the issue scope
- avoid unrelated refactors
- avoid broad redesigns
- keep diffs small and reviewable
- prefer typed data models over ad-hoc strings
- keep demo/starter code only when it is still useful
- remove or replace starter code when the issue explicitly calls for it

After implementation:

- summarize what changed
- list validation performed
- mention any follow-up issues or known limitations

## Do not do without explicit instruction

Do not:

- deploy to Alpic
- run tunnel commands
- introduce persistence/storage
- introduce auth
- add external services
- add analytics
- add a database
- add arbitrary generated React rendering
- change package manager
- perform large UI redesigns outside the assigned issue
- bundle the full coach policy as a long unstructured prompt blob

## UI implementation rules

The learning canvas should stay focused and small.

Prefer:

- clear two-column layout when implementing the canvas
- learning board on the left
- microturn timeline on the right
- compact cards or sections
- visible current state
- accessible buttons and labels
- deterministic placeholder/sample state when needed

Avoid:

- marketing landing pages
- decorative screens that do not support coaching
- large multi-step lessons inside one interaction block
- UI that hides the current microturn state from the model or user

## Interaction block rules

Interaction blocks must be safe and typed.

Allowed block families currently include:

- `MultipleChoiceCheck`
- `ConfidenceSlider`
- `DragToMatch`
- `OrderTheSteps`
- `MoveObjectOnBoard`
- `LabelDiagram`
- `CompareTwoModels`
- `FillGap`
- `TinyCodePrediction`

Each block should support exactly one microturn.

Do not allow model output to provide arbitrary executable UI code.

## Tool description rules

Tool descriptions should be concise but explicit about the runtime contract.

When adding or changing tools, descriptions should guide the model to:

- use the canvas for microturn coaching
- keep the board current
- update the timeline
- teach one small idea
- use one example max
- ask one check question
- wait after the check question

Do not inject the entire coach policy as a prompt blob.

## Code style

Keep TypeScript strict and explicit enough for safe structured state.

Prefer:

- small components
- typed props
- domain types/schemas in `src/domain/`
- Zod schemas where runtime validation is useful
- existing UI primitives from `@alpic-ai/ui`
- existing Tailwind setup

Avoid:

- `any` unless there is a clear reason
- duplicated state shape definitions
- stringly typed status values when a shared type exists
- mixing product policy, server registration, and view rendering in one large file

## Current project direction

The likely early implementation sequence is:

1. define the learning canvas state schema
2. replace the demo onboarding view with a learning canvas view
3. add `start_learning_canvas`
4. add `update_microturn`
5. add the first typed interaction block
6. wire the coach policy into tool descriptions

Follow GitHub issues as the actual source for ordering and scope.
