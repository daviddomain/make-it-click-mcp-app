import assert from "node:assert/strict";
import test from "node:test";

import {
  beginDisplayModeRequest,
  beginSessionRefresh,
  completeDisplayModeRequest,
  completeSessionSynchronization,
  createMountedPresentationState,
  deriveLearningShellLayout,
  deriveLearningShellViewModel,
  failDisplayModeRequest,
  failSessionSynchronization,
  reconcileLearningSession,
} from "./learning-shell.js";
import { createLearningSession } from "./learning-session.js";
import { createInitialLearningCanvasState } from "./start-learning-canvas.js";

const timestamp = "2026-07-23T20:30:00.000Z";

function createSession(revision = 1) {
  return {
    ...createLearningSession({
      sessionId: "session-29",
      state: createInitialLearningCanvasState({
        topic: "React derived state",
        confusion: "I am unsure what belongs in state.",
      }),
      timestamp,
    }),
    revision,
  };
}

test("derives bounded host layout and falls modal back to inline", () => {
  assert.deepEqual(
    deriveLearningShellLayout({
      displayMode: "fullscreen",
      maxHeight: 900,
      safeAreaInsets: { top: 20, right: 12, bottom: 30, left: 12 },
    }),
    {
      mode: "fullscreen",
      maxHeight: 900,
      availableHeight: 850,
      safeAreaInsets: { top: 20, right: 12, bottom: 30, left: 12 },
      fallbackMessage: null,
    },
  );

  const fallback = deriveLearningShellLayout({
    displayMode: "modal",
    maxHeight: 320,
    safeAreaInsets: { top: -10, right: Number.NaN, bottom: 8, left: 4 },
  });

  assert.equal(fallback.mode, "inline");
  assert.equal(fallback.availableHeight, 312);
  assert.deepEqual(fallback.safeAreaInsets, {
    top: 0,
    right: 0,
    bottom: 8,
    left: 4,
  });
  assert.match(fallback.fallbackMessage ?? "", /not supported/);
});

test("uses an inline zero-inset shell while host layout data initializes", () => {
  assert.deepEqual(
    deriveLearningShellLayout({
      displayMode: undefined,
      maxHeight: undefined,
      safeAreaInsets: undefined,
    }),
    {
      mode: "inline",
      maxHeight: undefined,
      availableHeight: undefined,
      safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
      fallbackMessage: null,
    },
  );
});

test("derives distinct inline, fullscreen, and PiP presentations", () => {
  const session = createSession(4);
  const inline = deriveLearningShellViewModel({ session, mode: "inline" });
  const fullscreen = deriveLearningShellViewModel({
    session,
    mode: "fullscreen",
  });
  const pip = deriveLearningShellViewModel({ session, mode: "pip" });

  assert.deepEqual(inline.actions, ["open-fullscreen"]);
  assert.equal(inline.showBoard, false);
  assert.equal(inline.showTimeline, false);

  assert.deepEqual(fullscreen.actions, ["open-pip", "return-inline"]);
  assert.equal(fullscreen.showBoard, true);
  assert.equal(fullscreen.showTimeline, true);

  assert.deepEqual(pip.actions, ["open-fullscreen"]);
  assert.equal(pip.showBoard, false);
  assert.equal(pip.showTimeline, false);
  assert.equal(pip.topic, inline.topic);
  assert.equal(pip.revisionLabel, "Revision 4");
  assert.equal(pip.progressLabel, "Step 1 of 1");
});

test("reconciles only a newer revision from the same session", () => {
  const current = createSession(3);
  const older = createSession(2);
  const newer = createSession(4);
  const different = { ...newer, sessionId: "another-session" };

  assert.deepEqual(reconcileLearningSession(current, older), {
    session: current,
    accepted: false,
    reason: "same-or-older",
  });
  assert.deepEqual(reconcileLearningSession(current, newer), {
    session: newer,
    accepted: true,
    reason: "newer",
  });
  assert.deepEqual(reconcileLearningSession(current, different), {
    session: current,
    accepted: false,
    reason: "different-session",
  });
});

test("keeps the latest revision across three consecutive updates", () => {
  let mounted = createSession(1);

  for (const revision of [2, 3, 4]) {
    mounted = reconcileLearningSession(
      mounted,
      createSession(revision),
    ).session;
  }

  assert.equal(mounted.sessionId, "session-29");
  assert.equal(mounted.revision, 4);
});

test("tracks recoverable mode and synchronization lifecycle", () => {
  const initial = createMountedPresentationState(2);
  const requesting = beginDisplayModeRequest(initial, "fullscreen");
  const rejected = failDisplayModeRequest(
    requesting,
    "Fullscreen was rejected by the host.",
  );
  const accepted = completeDisplayModeRequest(rejected, "pip");
  const refreshing = beginSessionRefresh(accepted);
  const failedRefresh = failSessionSynchronization(
    refreshing,
    "The latest session could not be read.",
  );
  const synchronized = completeSessionSynchronization(failedRefresh, 5);

  assert.equal(requesting.modeRequestStatus, "pending");
  assert.equal(rejected.modeRequestStatus, "idle");
  assert.equal(rejected.recoverableError?.source, "display-mode");
  assert.equal(accepted.requestedMode, "pip");
  assert.equal(refreshing.synchronizationStatus, "refreshing");
  assert.equal(failedRefresh.lastSuccessfulRevision, 2);
  assert.equal(failedRefresh.recoverableError?.source, "synchronization");
  assert.equal(synchronized.synchronizationStatus, "in-sync");
  assert.equal(synchronized.lastSuccessfulRevision, 5);
  assert.equal(synchronized.recoverableError, null);
});
