# Make It Click MCP App Spec

## Goal

Build a Skybridge MCP/ChatGPT app that turns the `make-it-click` coaching pattern into a visible learning canvas.

The coaching behavior is captured in [docs/coach-policy.md](docs/coach-policy.md) and as structured constants in `src/domain/coach-policy.ts`.

The app should help ChatGPT and the user share the same learning state:

- what the current confusion knot is,
- which tiny core idea is active,
- which single example or visual is being used,
- which check question is next,
- how earlier microturns progressed.

## Core Experience

Use a mode-aware shell around one authoritative learning session:

- Inline: a compact topic, progress, and revision summary with one action to
  open the learning canvas.
- Fullscreen: the primary two-column workspace, with the learning board on the
  left and the microturn timeline on the right.
- PiP: a compact companion with the topic, current tiny idea or question,
  progress, and a return-to-fullscreen action.

The mounted surface derives its visual hierarchy from the actual widget
container rather than viewport breakpoints. Wide fullscreen containers use a
focused learning region plus a subordinate progress rail; narrow fullscreen
containers use one column and keep progress in a compact disclosure. Inline
and PiP show the current question with only a minimal progress indicator.
Diagnostic context and reflection stay disclosed unless they are the active
task. Interface labels use one controlled German or English copy set selected
from the session content with the host locale as fallback.

The learning board should make the current model visible without replacing the conversation. The timeline should show progress and uncertainty across microturns.

The learning canvas should feel calm, focused, and inviting. Visual design is
part of the learning experience, not decoration only: the UI should guide
attention toward the active microturn, especially the current check, and help
the user stay with one small step until the concept clicks. Avoid visual
complexity that makes the board feel like a raw state or debug dashboard.
Treat the knot and tiny idea as compact context for the current check. Render
the typed interaction and its submit feedback as the primary next action, keep
the optional example close to that context, and place user reflection and
confidence in secondary UI. The progress panel should remain visible for
orientation without competing with the active check.

The long-term product direction is an interactive learning canvas, not only a passive status board in chat. Chat-driven updates are the current stepping stone. The intended next direction is view-driven, typed interactions so the user can answer checks, select options, and provide feedback directly in the canvas while still supporting the Make It Click rhythm:

```txt
diagnose -> one tiny idea -> check -> wait
```

## Architecture Layers

Separate the coaching behavior into three layers:

1. **Skill principles as app contract**

   The Make It Click rules are fixed product logic, not optional style guidance:

   - one small idea,
   - one example max,
   - one check question,
   - wait for the user's next signal.

   These rules belong in the spec, coach policy, and later in server-side validation where practical.

2. **Tool and app instructions for ChatGPT**

   The MCP app exposes purpose-built `start_learning_canvas`,
   `update_microturn`, and `read_learning_session` tools.

   Tool descriptions should tell ChatGPT when and how to use the app: use it for microturn coaching, keep the canvas current, and update the timeline instead of letting the learning state live only in the chat transcript.

   The view-backed `start_learning_canvas` tool creates one server-owned
   session from a topic, optional confusion, and optional context. It returns a
   stable session id, revision, timestamps, and structured canvas state whose
   first timeline item is an open diagnosis microturn.

   The viewless `update_microturn` tool requires the session id and expected
   revision instead of a caller-owned copy of the state. It records the latest
   user answer or typed interaction result, updates the active timeline status,
   and can append the next microturn when the caller provides one tiny idea, at
   most one example, and exactly one check question. A stale revision returns a
   structured conflict and leaves the authoritative state unchanged.

   The app-only, viewless `read_learning_session` tool returns the latest
   authoritative snapshot when the user explicitly refreshes the active
   canvas. This explicit refresh is the initial synchronization contract;
   push-style updates are not assumed. Viewless calls avoid duplicate canvas
   widgets, but the ChatGPT host still controls surrounding narration and
   status UI.

   The mounted view derives inline, fullscreen, and PiP presentations from the
   same session id and authoritative revision. Display-mode requests remain
   host-controlled and recover to the current usable presentation when
   rejected. Only a newer fetched revision replaces the mounted snapshot.
   Host max-height and safe-area insets bound each shell; fullscreen owns the
   one deliberate vertical scroll surface.

3. **Structured state instead of prompt-only behavior**

   The core value is machine-readable learning state, not a copied prompt.

   Important state fields:

   - `currentKnot`
   - `tinyCoreIdea`
   - `exampleBlock`
   - `checkQuestion`
   - `timeline`
   - `confidence`

   ChatGPT should be able to continue from the session snapshot and revision
   returned by each successful tool result without reconstructing the whole
   learning process from prose. The initial store is intentionally in-memory
   and process-local.

## Initial Learning Board Fields

- Current knot
- Tiny core idea
- Example or visual
- User's current version
- Current check question
- Confidence or status

## Microturn Timeline

Each timeline item represents one small coaching step. A step can be marked as:

- open
- understood
- uncertain
- revisit

The timeline should support the `make-it-click` rhythm:

```txt
diagnose -> one tiny idea -> check -> wait -> next tiny idea
```

## Interaction Blocks

The app should not run arbitrary React generated by the model. Instead, the model chooses from a fixed set of safe, typed interaction blocks.

Candidate blocks:

- `MultipleChoiceCheck`
- `ConfidenceSlider`
- `DragToMatch`
- `OrderTheSteps`
- `MoveObjectOnBoard`
- `LabelDiagram`
- `CompareTwoModels`
- `FillGap`
- `TinyCodePrediction`

Each block should support exactly one microturn, not a whole lesson.

The first implemented block is `MultipleChoiceCheck`. It is structured data with
a stable block id, one question, and a small list of serializable options. A
selected answer should be captured as a structured result containing the block
id and selected option, so it can be passed to `update_microturn` as
`interactionResult`. Submission is explicit: the view hands the typed result to
the tool flow and exposes the resulting structured context to the model, but it
does not grade the answer, change the timeline status, or create the next
microturn.

The second implemented block is `ConfidenceSlider`. It uses a native range
control for one question and a normalized value from `0` to `1`, with a default
step of `0.1`. Its structured result contains the stable block id, question, and
selected value. It reuses the explicit interaction-result handoff and does not
grade confidence, change timeline status, or advance the coaching flow.

## Data Model Direction

Represent learning state as data first, then render it through known components.

```txt
View-backed start -> server-owned session -> React view
  -> typed user interaction -> viewless revision-guarded update
  -> explicit app-only refresh when the active view is stale
  -> mode-specific inline, fullscreen, or PiP presentation
```

The model should receive enough structured state to continue coaching from the current board and timeline.

## Open Questions

- Which interaction blocks should ship in the first prototype?
- Should users be able to directly edit board text, or only interact through controlled blocks?
- How much state should persist across separate app renders?
- Which host-specific features are safe to use while staying compatible across ChatGPT and MCP app clients?
