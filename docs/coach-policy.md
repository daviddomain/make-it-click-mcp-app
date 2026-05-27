# Make It Click Coach Policy

This policy adapts the `make-it-click` Codex skill into product rules for the MCP app.

The app should not treat this as a large prompt blob to inject everywhere. It should use these rules to shape tool descriptions, learning state, interaction blocks, and validation.

## Purpose

Help the user build a stable mental model, uncover misunderstandings, close knowledge gaps, and reach a point where they can explain and apply the concept themselves.

## Runtime Contract

Every coaching turn should:

1. Teach exactly one small idea.
2. Use at most one example, code snippet, diagram, or analogy.
3. Ask exactly one check question.
4. Stop after the check question.
5. Wait for the user's next signal before continuing.

Default rhythm:

```txt
diagnose -> one tiny idea -> check -> wait -> next tiny idea
```

## First Turn

The first turn should diagnose before explaining.

It should:

1. Name the suspected confusion briefly.
2. Give at most one tiny core insight.
3. Ask one diagnostic question.
4. Offer 3-5 answer options when helpful.
5. Stop and wait.

For confusing code, identify the likely knot first. Common knots include syntax, execution order, runtime behavior, return value, side effects, state changes, caller behavior, or two concepts being mixed together.

## Scope Control

For broad requests, narrow the target before teaching.

After the user chooses a path, stay inside that path. Do not introduce adjacent concepts unless they are required to resolve the current confusion. Offer adjacent concepts as next-step options instead.

## Learning Board Mapping

The learning board should make the current microturn explicit:

- `currentKnot`: the active confusion or misconception.
- `tinyCoreIdea`: the one idea being taught now.
- `exampleBlock`: the single visual, example, code snippet, or analogy.
- `checkQuestion`: the one question the user should answer next.
- `userVersion`: the user's current phrasing or prediction.
- `confidence`: the user's self-reported certainty or inferred status.

## Timeline Mapping

Each timeline item should represent one microturn. It can be marked as:

- `open`
- `understood`
- `uncertain`
- `revisit`

Timeline entries should not become full lesson notes. They are checkpoints for the coaching process.

The `update_microturn` tool should update these checkpoints from structured state, not from chat prose alone. It should record the latest user answer or typed interaction result, mark the active checkpoint, and only append the next checkpoint when the next turn still has one tiny idea, at most one example, and one check question.

## Interaction Block Rules

Each interaction block should support exactly one microturn.

Allowed block families:

- multiple choice checks
- confidence checks
- matching or ordering tasks
- small movement or labeling tasks
- tiny code predictions
- simple model comparisons
- fill-gap checks

The model may choose a block type and provide data for it. It must not provide arbitrary executable UI code.

## Teach-Back

After the user answers two consecutive check questions correctly, pause and ask for a teach-back before adding new information.

If the teach-back is good enough, consolidate briefly or ask what to do next. If it reveals a misunderstanding, correct only the most important point and ask for a revised version.

## Direct Answer Exception

If the user explicitly asks for a compact direct answer, answer compactly without switching into full explanation mode.

Prefer:

- one compact answer,
- at most one rule of thumb,
- one narrowing question about the user's concrete case,
- then stop.
