import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceLearningSessionSpikeEnvelope,
  createLearningSessionSpikeEnvelope,
  evaluateLearningSessionSpike,
  setLearningSessionSpikeDisplayMode,
} from "./learning-session-spike.js";
import { createInitialLearningCanvasState } from "./start-learning-canvas.js";

test("advances the temporary session with a stable id and monotonic revision", () => {
  const initial = createLearningSessionSpikeEnvelope({
    sessionId: "spike-session-27",
    state: createInitialLearningCanvasState({
      topic: "React derived state",
    }),
  });
  const fullscreen = setLearningSessionSpikeDisplayMode(
    initial,
    "fullscreen",
  );
  const revisionTwo = advanceLearningSessionSpikeEnvelope({
    envelope: fullscreen,
    source: "widget",
    update: {
      userAnswer: "Store items and derive itemCount.",
      timelineStatus: "understood",
      nextMicroturn: {
        kind: "tinyIdea",
        tinyCoreIdea:
          "Derived values should be recalculated from their source state.",
        checkQuestion: "What should trigger itemCount to change?",
      },
    },
  });
  const revisionThree = advanceLearningSessionSpikeEnvelope({
    envelope: revisionTwo,
    source: "composer",
    update: {
      userAnswer: "Changing items should recalculate itemCount.",
      timelineStatus: "understood",
    },
  });

  assert.equal(revisionThree.sessionId, initial.sessionId);
  assert.equal(revisionThree.revision, 3);
  assert.equal(revisionThree.displayMode, "fullscreen");
  assert.equal(revisionThree.lastUpdateSource, "composer");
  assert.equal(
    revisionThree.state.board.userVersion,
    "Changing items should recalculate itemCount.",
  );
});

test("returns go only when every real-host capability passes", () => {
  assert.deepEqual(
    evaluateLearningSessionSpike({
      realChatGptHost: true,
      inlineLaunch: "pass",
      fullscreenRequest: "pass",
      pipRequest: "pass",
      directWidgetUpdate: "pass",
      composerUpdate: "pass",
      threeConsecutiveRevisions: "pass",
      noAdditionalLargeWidgets: "pass",
      activeSurfaceLatestRevision: "pass",
      surroundingNarration: "pass",
    }),
    {
      recommendation: "go",
      shouldProceedToIssue28: true,
      failedCapabilities: [],
      conditionalCapabilities: [],
    },
  );
});

test("returns conditional-go for a non-blocking PiP limitation", () => {
  const decision = evaluateLearningSessionSpike({
    realChatGptHost: true,
    inlineLaunch: "pass",
    fullscreenRequest: "pass",
    pipRequest: "fail",
    directWidgetUpdate: "pass",
    composerUpdate: "pass",
    threeConsecutiveRevisions: "pass",
    noAdditionalLargeWidgets: "pass",
    activeSurfaceLatestRevision: "conditional-pass",
    surroundingNarration: "conditional-pass",
  });

  assert.equal(decision.recommendation, "conditional-go");
  assert.equal(decision.shouldProceedToIssue28, true);
  assert.deepEqual(decision.failedCapabilities, ["pipRequest"]);
  assert.deepEqual(decision.conditionalCapabilities, [
    "activeSurfaceLatestRevision",
    "surroundingNarration",
  ]);
});

test("returns conditional-go for the real-host refresh and narration conditions", () => {
  const decision = evaluateLearningSessionSpike({
    realChatGptHost: true,
    inlineLaunch: "pass",
    fullscreenRequest: "pass",
    pipRequest: "pass",
    directWidgetUpdate: "pass",
    composerUpdate: "pass",
    threeConsecutiveRevisions: "pass",
    noAdditionalLargeWidgets: "pass",
    activeSurfaceLatestRevision: "conditional-pass",
    surroundingNarration: "conditional-pass",
  });

  assert.deepEqual(decision, {
    recommendation: "conditional-go",
    shouldProceedToIssue28: true,
    failedCapabilities: [],
    conditionalCapabilities: [
      "activeSurfaceLatestRevision",
      "surroundingNarration",
    ],
  });
});

test("returns no-go without real ChatGPT evidence or with a blocking failure", () => {
  const common = {
    inlineLaunch: "pass",
    fullscreenRequest: "pass",
    pipRequest: "pass",
    directWidgetUpdate: "pass",
    composerUpdate: "pass",
    threeConsecutiveRevisions: "pass",
    noAdditionalLargeWidgets: "pass",
    activeSurfaceLatestRevision: "pass",
    surroundingNarration: "pass",
  } as const;

  assert.equal(
    evaluateLearningSessionSpike({
      ...common,
      realChatGptHost: false,
    }).recommendation,
    "no-go",
  );
  assert.equal(
    evaluateLearningSessionSpike({
      ...common,
      realChatGptHost: true,
      noAdditionalLargeWidgets: "fail",
    }).recommendation,
    "no-go",
  );
});
