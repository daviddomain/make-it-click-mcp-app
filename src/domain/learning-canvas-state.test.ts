import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ConfidenceSliderControl } from "../components/confidence-slider-control.js";
import {
  createConfidenceSliderResult,
  normalizeConfidenceSliderValue,
} from "./confidence-slider.js";
import {
  confidenceSliderBlockSchema,
  confidenceSliderResultSchema,
  learningCanvasStateSchema,
  multipleChoiceCheckResultSchema,
  type ConfidenceSliderBlock,
  type MultipleChoiceCheckBlock,
} from "./learning-canvas-state.js";
import {
  createMultipleChoiceCheckResult,
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

function createConfidenceSliderBlock(): ConfidenceSliderBlock {
  return confidenceSliderBlockSchema.parse({
    type: "ConfidenceSlider",
    id: "event-loop-confidence",
    question: "How confident are you about the callback order?",
    value: 0.4,
  });
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

test("applies an exact typed result without grading or advancing", () => {
  const state = createDiagnosticState();
  state.board.interactionBlock = createMultipleChoiceBlock();
  const interactionResult = createMultipleChoiceCheckResult(
    state.board.interactionBlock,
    "timer",
  );
  const updatedState = applyMicroturnUpdate({ state, interactionResult });

  assert.equal(updatedState.timeline.length, state.timeline.length);
  assert.equal(updatedState.timeline[0]?.status, "open");
  assert.deepEqual(updatedState.board.confidence, state.board.confidence);
  assert.equal(
    updatedState.board.userVersion,
    "type: MultipleChoiceCheck; blockId: event-loop-order; question: What runs next?; selectedOptionId: timer; selectedValue: timer callback; selectedLabel: The timer callback",
  );
});

test("accepts confidence slider boundaries and applies the default step", () => {
  const lowerBoundary = confidenceSliderBlockSchema.parse({
    type: "ConfidenceSlider",
    id: "lower-boundary",
    question: "How confident are you?",
    value: 0,
  });
  const upperBoundary = confidenceSliderBlockSchema.parse({
    ...lowerBoundary,
    id: "upper-boundary",
    value: 1,
  });

  assert.equal(lowerBoundary.value, 0);
  assert.equal(lowerBoundary.step, 0.1);
  assert.equal(upperBoundary.value, 1);
});

test("rejects confidence slider block and result values outside zero to one", () => {
  for (const value of [-0.01, 1.01]) {
    assert.throws(() =>
      confidenceSliderBlockSchema.parse({
        type: "ConfidenceSlider",
        id: "invalid-confidence",
        question: "How confident are you?",
        value,
      }),
    );
    assert.throws(() =>
      confidenceSliderResultSchema.parse({
        type: "ConfidenceSlider",
        blockId: "invalid-confidence",
        question: "How confident are you?",
        value,
      }),
    );
    assert.throws(() => normalizeConfidenceSliderValue(value));
  }
});

test("normalizes floating-point noise and creates the confidence result", () => {
  const block = createConfidenceSliderBlock();
  const result = createConfidenceSliderResult(
    block,
    0.30000000000000004,
  );

  assert.deepEqual(result, {
    type: "ConfidenceSlider",
    blockId: "event-loop-confidence",
    question: "How confident are you about the callback order?",
    value: 0.3,
  });
});

test("applies a confidence result without grading or advancing", () => {
  const state = createDiagnosticState();
  const block = createConfidenceSliderBlock();
  state.board.interactionBlock = block;
  const interactionResult = createConfidenceSliderResult(block, 0.7);
  const updatedState = applyMicroturnUpdate({ state, interactionResult });

  assert.equal(updatedState.timeline.length, state.timeline.length);
  assert.equal(updatedState.timeline[0]?.status, "open");
  assert.deepEqual(updatedState.board.confidence, state.board.confidence);
  assert.equal(
    updatedState.board.userVersion,
    "type: ConfidenceSlider; blockId: event-loop-confidence; question: How confident are you about the callback order?; value: 0.7",
  );
});

test("renders an accessible native confidence range and visible value", () => {
  const markup = renderToStaticMarkup(
    createElement(ConfidenceSliderControl, {
      block: createConfidenceSliderBlock(),
      value: 0.6,
      feedback: { status: "idle" },
      showQuestion: true,
      onValueChange: () => undefined,
      onSubmit: () => undefined,
    }),
  );

  assert.match(markup, /<label[^>]+for="confidence-slider-event-loop-confidence"/);
  assert.match(markup, /type="range"/);
  assert.match(markup, /min="0"/);
  assert.match(markup, /max="1"/);
  assert.match(markup, /step="0.1"/);
  assert.match(markup, /value="0.6"/);
  assert.match(markup, /aria-valuetext="60% confidence"/);
  assert.match(markup, />60%<\/output>/);
});

test("keeps the selected confidence visible while pending or after an error", () => {
  const block = createConfidenceSliderBlock();
  const pendingMarkup = renderToStaticMarkup(
    createElement(ConfidenceSliderControl, {
      block,
      value: 0.8,
      feedback: { status: "pending" },
      showQuestion: false,
      onValueChange: () => undefined,
      onSubmit: () => undefined,
    }),
  );
  const errorMarkup = renderToStaticMarkup(
    createElement(ConfidenceSliderControl, {
      block,
      value: 0.8,
      feedback: { status: "error", message: "Try again." },
      showQuestion: false,
      onValueChange: () => undefined,
      onSubmit: () => undefined,
    }),
  );

  assert.match(pendingMarkup, /value="0.8"/);
  assert.match(pendingMarkup, /disabled=""/);
  assert.match(pendingMarkup, /Submitting confidence/);
  assert.match(errorMarkup, /value="0.8"/);
  assert.match(errorMarkup, /role="alert"/);
  assert.match(errorMarkup, /Try again\./);
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
