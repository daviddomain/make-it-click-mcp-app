import assert from "node:assert/strict";
import test from "node:test";

import { sampleLearningCanvasState } from "./sample-learning-canvas-state.js";
import { deriveLearningCanvasPresentation } from "./learning-canvas-presentation.js";
import { createInitialLearningCanvasState } from "./start-learning-canvas.js";

test("derives a two-region fullscreen hierarchy from container width", () => {
  const presentation = deriveLearningCanvasPresentation({
    state: sampleLearningCanvasState,
    mode: "fullscreen",
    containerWidth: 1120,
    availableHeight: 820,
    hostLocale: "en-US",
  });

  assert.equal(presentation.workspaceLayout, "two-region");
  assert.equal(presentation.density, "comfortable");
  assert.equal(presentation.roles.tinyIdea, "primary");
  assert.equal(presentation.roles.example, "primary");
  assert.equal(presentation.roles.check, "primary");
  assert.equal(presentation.roles.progress, "secondary");
  assert.equal(presentation.roles.currentKnot, "collapsed");
  assert.equal(presentation.roles.reflection, "collapsed");
});

test("keeps narrow fullscreen, inline, and PiP deliberately compact", () => {
  const narrow = deriveLearningCanvasPresentation({
    state: sampleLearningCanvasState,
    mode: "fullscreen",
    containerWidth: 720,
    availableHeight: 620,
    hostLocale: "en-US",
  });
  const inline = deriveLearningCanvasPresentation({
    state: sampleLearningCanvasState,
    mode: "inline",
    containerWidth: 640,
    availableHeight: 360,
    hostLocale: "en-US",
  });
  const pip = deriveLearningCanvasPresentation({
    state: sampleLearningCanvasState,
    mode: "pip",
    containerWidth: 360,
    availableHeight: 420,
    hostLocale: "en-US",
  });

  assert.equal(narrow.workspaceLayout, "single-column");
  assert.equal(narrow.roles.progress, "collapsed");
  assert.equal(inline.roles.reflection, "hidden");
  assert.equal(pip.roles.currentKnot, "hidden");
  assert.equal(pip.roles.example, "hidden");
  assert.equal(pip.currentStep.label, "Current question");
});

test("makes diagnostic or reflection metadata primary only when active", () => {
  const diagnosis = createInitialLearningCanvasState({
    topic: "Event loops",
    confusion: "I do not understand when callbacks run.",
  });
  const reflection = structuredClone(sampleLearningCanvasState);
  reflection.timeline[2] = {
    ...reflection.timeline[2],
    activeField: "userVersion",
  };

  const diagnosisPresentation = deriveLearningCanvasPresentation({
    state: diagnosis,
    mode: "fullscreen",
    containerWidth: 1000,
    availableHeight: 800,
    hostLocale: "en-US",
  });
  const reflectionPresentation = deriveLearningCanvasPresentation({
    state: reflection,
    mode: "fullscreen",
    containerWidth: 1000,
    availableHeight: 800,
    hostLocale: "en-US",
  });

  assert.equal(diagnosisPresentation.roles.currentKnot, "primary");
  assert.equal(diagnosisPresentation.roles.reflection, "collapsed");
  assert.equal(reflectionPresentation.roles.currentKnot, "collapsed");
  assert.equal(reflectionPresentation.roles.reflection, "primary");
});

test("selects consistent German or English interface copy from the session", () => {
  const germanState = createInitialLearningCanvasState({
    topic: "JavaScript Ereignisschleife",
    confusion:
      "Ich verstehe nicht, warum die Aufgabe erst später ausgeführt wird.",
  });
  const german = deriveLearningCanvasPresentation({
    state: germanState,
    mode: "fullscreen",
    containerWidth: 1000,
    availableHeight: 800,
    hostLocale: "en-US",
  });
  const english = deriveLearningCanvasPresentation({
    state: sampleLearningCanvasState,
    mode: "fullscreen",
    containerWidth: 1000,
    availableHeight: 800,
    hostLocale: "de-DE",
  });

  assert.equal(german.locale, "de");
  assert.equal(german.copy.yourCheck, "Deine Checkfrage");
  assert.equal(german.progress.label, "Schritt 1 von 1");
  assert.equal(english.locale, "en");
  assert.equal(english.copy.yourCheck, "Your check");
  assert.equal(english.progress.label, "Step 3 of 3");
});
