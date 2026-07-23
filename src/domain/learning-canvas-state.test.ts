import assert from "node:assert/strict";
import test from "node:test";

import {
  learningCanvasStateSchema,
  multipleChoiceCheckResultSchema,
  type MultipleChoiceCheckBlock,
} from "./learning-canvas-state.js";
import {
  createMultipleChoiceCheckResult,
  createMultipleChoiceSubmission,
} from "./multiple-choice-check.js";
import { createInitialLearningCanvasState } from "./start-learning-canvas.js";
import { applyMicroturnUpdate } from "./update-microturn.js";

function createDiagnosticState() {
  return createInitialLearningCanvasState({
    topic: "Event loops",
    confusion: "I cannot tell when queued callbacks run.",
    context: "I know synchronous JavaScript runs first.",
  });
}

function createMultipleChoiceBlock(): MultipleChoiceCheckBlock {
  return {
    type: "MultipleChoiceCheck",
    id: "event-loop-order",
    question: "What runs next?",
    options: [
      {
        id: "sync",
        label: "The next synchronous statement",
        value: "synchronous statement",
      },
      {
        id: "timer",
        label: "The timer callback",
        value: "timer callback",
      },
    ],
  };
}

test("starts with the supplied topic, confusion knot, check, and an open diagnosis", () => {
  const state = createDiagnosticState();

  assert.equal(state.topic, "Event loops");
  assert.equal(state.id, "learning-canvas-event-loops");
  assert.equal(
    state.board.currentKnot,
    "I cannot tell when queued callbacks run.",
  );
  assert.equal(
    state.board.checkQuestion,
    "Which part feels most confusing right now: the words, the sequence, the result, or why it matters?",
  );
  assert.equal(
    state.board.userVersion,
    "I know synchronous JavaScript runs first.",
  );
  assert.deepEqual(state.timeline, [
    {
      id: "diagnose-initial-knot",
      kind: "diagnose",
      status: "open",
      title: "Diagnose the knot",
      summary:
        "Start by naming the current confusion before teaching the first tiny idea.",
      activeField: "currentKnot",
    },
  ]);
  assert.deepEqual(learningCanvasStateSchema.parse(state), state);
});

test("records a plain-text answer on the board and active timeline item", () => {
  const state = createDiagnosticState();

  const updatedState = applyMicroturnUpdate({
    state,
    userAnswer: "The callback runs after the current stack is empty.",
  });

  assert.equal(
    updatedState.board.userVersion,
    "The callback runs after the current stack is empty.",
  );
  assert.equal(updatedState.board.confidence.status, "low");
  assert.equal(
    updatedState.board.confidence.note,
    "Latest user signal recorded as uncertain.",
  );
  assert.equal(updatedState.timeline[0]?.status, "uncertain");
  assert.equal(
    updatedState.timeline[0]?.summary,
    "User signal: The callback runs after the current stack is empty.",
  );
});

test("records a structured interaction result as an understood user signal", () => {
  const state = createDiagnosticState();
  const interactionResult = multipleChoiceCheckResultSchema.parse({
    type: "MultipleChoiceCheck",
    blockId: "event-loop-order",
    question: "What runs next?",
    selectedOptionId: "timer",
    selectedValue: "timer callback",
    selectedLabel: "The timer callback",
  });

  const updatedState = applyMicroturnUpdate({
    state,
    interactionResult,
    timelineStatus: "understood",
  });

  assert.equal(
    updatedState.board.userVersion,
    "type: MultipleChoiceCheck; blockId: event-loop-order; question: What runs next?; selectedOptionId: timer; selectedValue: timer callback; selectedLabel: The timer callback",
  );
  assert.equal(updatedState.board.confidence.status, "high");
  assert.equal(updatedState.timeline[0]?.status, "understood");
  assert.match(
    updatedState.timeline[0]?.summary ?? "",
    /selectedOptionId: timer/,
  );
});

test("derives the canonical multiple-choice result from an existing option", () => {
  const result = createMultipleChoiceCheckResult(
    createMultipleChoiceBlock(),
    "timer",
  );

  assert.deepEqual(result, {
    type: "MultipleChoiceCheck",
    blockId: "event-loop-order",
    question: "What runs next?",
    selectedOptionId: "timer",
    selectedValue: "timer callback",
    selectedLabel: "The timer callback",
  });
});

test("rejects a multiple-choice result for an option outside the block", () => {
  assert.throws(
    () =>
      createMultipleChoiceCheckResult(
        createMultipleChoiceBlock(),
        "missing-option",
      ),
    /Cannot submit unknown option "missing-option"/,
  );
});

test("creates an exact typed submission without grading or advancing", () => {
  const state = createDiagnosticState();
  state.board.interactionBlock = createMultipleChoiceBlock();
  const submission = createMultipleChoiceSubmission(
    state,
    state.board.interactionBlock,
    "timer",
  );

  assert.deepEqual(Object.keys(submission), ["state", "interactionResult"]);
  assert.strictEqual(submission.state, state);

  const updatedState = applyMicroturnUpdate(submission);

  assert.equal(updatedState.timeline.length, state.timeline.length);
  assert.equal(updatedState.timeline[0]?.status, "open");
  assert.deepEqual(updatedState.board.confidence, state.board.confidence);
  assert.equal(
    updatedState.board.userVersion,
    "type: MultipleChoiceCheck; blockId: event-loop-order; question: What runs next?; selectedOptionId: timer; selectedValue: timer callback; selectedLabel: The timer callback",
  );
});

test("closes the latest open item and appends exactly one next microturn", () => {
  const state = createDiagnosticState();

  const updatedState = applyMicroturnUpdate({
    state,
    userAnswer: "I still mix up the task and microtask queues.",
    timelineStatus: "revisit",
    nextMicroturn: {
      kind: "tinyIdea",
      title: "Separate the queues",
      currentKnot: "Task and microtask ordering",
      tinyCoreIdea: "Microtasks drain before the next task begins.",
      exampleBlock: {
        kind: "text",
        text: "A resolved promise callback runs before a timer callback.",
      },
      checkQuestion: "Which callback runs first after this script?",
      summary: "Compare one promise callback with one timer callback.",
    },
  });

  assert.equal(updatedState.timeline.length, state.timeline.length + 1);
  assert.equal(updatedState.timeline[0]?.status, "revisit");
  assert.deepEqual(updatedState.timeline[1], {
    id: "tinyIdea-2",
    kind: "tinyIdea",
    status: "open",
    title: "Separate the queues",
    summary: "Compare one promise callback with one timer callback.",
    activeField: "tinyCoreIdea",
  });
  assert.equal(updatedState.board.currentKnot, "Task and microtask ordering");
  assert.equal(
    updatedState.board.tinyCoreIdea,
    "Microtasks drain before the next task begins.",
  );
  assert.deepEqual(updatedState.board.exampleBlock, {
    kind: "text",
    text: "A resolved promise callback runs before a timer callback.",
  });
  assert.equal(
    updatedState.board.checkQuestion,
    "Which callback runs first after this script?",
  );
  assert.deepEqual(updatedState.board.confidence, {
    status: "unknown",
    note: "Waiting for the next check answer.",
  });
});

test("rejects an update without a plain answer or interaction result", () => {
  const state = createDiagnosticState();

  assert.throws(
    () => applyMicroturnUpdate({ state }),
    /Provide either userAnswer or interactionResult\./,
  );
});
