import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryLearningSessionStore } from "../learning-session-store.js";
import { deriveLearningCanvasPresentation } from "./learning-canvas-presentation.js";
import {
  confidenceResultFixture,
  hardeningInitialState,
  hardeningPresentationFixtures,
  hardeningSequentialUpdates,
  hardeningSessionId,
  hardeningTimestamps,
  missingHardeningSessionId,
  multipleChoiceResultFixture,
  staleHardeningUpdate,
} from "./learning-session-hardening.fixtures.js";
import { learningSessionToolContract } from "./learning-session-tool-contract.js";
import {
  deriveLearningShellLayout,
  reconcileLearningSession,
} from "./learning-shell.js";

function createHardeningStore() {
  const timestamps = [...hardeningTimestamps];

  return createInMemoryLearningSessionStore({
    createSessionId: () => hardeningSessionId,
    now: () =>
      new Date(
        timestamps.shift() ??
          hardeningTimestamps[hardeningTimestamps.length - 1],
      ),
  });
}

test("keeps one authoritative session through three typed revisions", () => {
  const store = createHardeningStore();
  const initial = store.create(hardeningInitialState);
  const acceptedResults = hardeningSequentialUpdates.map((update) =>
    store.update(update),
  );
  const latest = store.read(hardeningSessionId);

  assert.equal(initial.revision, 1);
  assert.deepEqual(
    acceptedResults.map((result) =>
      result.status === "ok" ? result.session.revision : result.status,
    ),
    [2, 3, 4],
  );
  assert.deepEqual(
    acceptedResults.map((result) =>
      result.status === "ok" ? result.interactionResult : null,
    ),
    [null, multipleChoiceResultFixture, confidenceResultFixture],
  );
  assert.equal(latest.status, "ok");
  if (latest.status !== "ok") {
    return;
  }

  assert.equal(latest.session.sessionId, initial.sessionId);
  assert.equal(latest.session.revision, 4);
  assert.equal(latest.session.state.timeline.length, 4);
  assert.equal(
    latest.session.state.board.checkQuestion,
    "In one sentence, why does setTimeout(callback, 0) still wait?",
  );
});

test("rejects stale and missing updates without changing revision four", () => {
  const store = createHardeningStore();
  store.create(hardeningInitialState);
  hardeningSequentialUpdates.forEach((update) => {
    assert.equal(store.update(update).status, "ok");
  });

  const beforeConflict = store.read(hardeningSessionId);
  const conflict = store.update(staleHardeningUpdate);
  const afterConflict = store.read(hardeningSessionId);
  const missingRead = store.read(missingHardeningSessionId);
  const missingUpdate = store.update({
    ...staleHardeningUpdate,
    sessionId: missingHardeningSessionId,
  });

  assert.equal(beforeConflict.status, "ok");
  assert.deepEqual(conflict, {
    status: "conflict",
    error: {
      code: "stale_revision",
      message:
        "The learning session changed before this update. Refresh the active canvas and retry from the latest revision.",
      expectedRevision: 1,
      currentRevision: 4,
    },
  });
  assert.deepEqual(afterConflict, beforeConflict);
  assert.deepEqual(missingUpdate, missingRead);
  assert.equal(missingRead.status, "not_found");
});

test("derives the final inline, fullscreen, narrow, and PiP presentations", () => {
  for (const fixture of hardeningPresentationFixtures) {
    const layout = deriveLearningShellLayout(fixture.hostLayout);
    const presentation = deriveLearningCanvasPresentation({
      state: hardeningInitialState,
      mode: layout.mode,
      containerWidth: fixture.containerWidth,
      availableHeight: layout.availableHeight,
      hostLocale: "en-US",
    });

    assert.equal(layout.mode, fixture.expectedMode, fixture.name);
    assert.equal(
      presentation.workspaceLayout,
      fixture.expectedWorkspaceLayout,
      fixture.name,
    );
    assert.equal(presentation.density, fixture.expectedDensity, fixture.name);
    assert.ok((layout.availableHeight ?? 0) >= 0, fixture.name);
  }
});

test("reconciliation reaches revision four and rejects older or foreign state", () => {
  const store = createHardeningStore();
  let mounted = store.create(hardeningInitialState);

  for (const update of hardeningSequentialUpdates) {
    const result = store.update(update);
    assert.equal(result.status, "ok");
    if (result.status === "ok") {
      mounted = reconcileLearningSession(mounted, result.session).session;
    }
  }

  const older = { ...mounted, revision: 3 };
  const foreign = { ...mounted, sessionId: "another-learning-session" };

  assert.equal(mounted.revision, 4);
  assert.equal(reconcileLearningSession(mounted, older).accepted, false);
  assert.equal(
    reconcileLearningSession(mounted, foreign).reason,
    "different-session",
  );
});

test("only the launcher has a view in the inspectable tool contract", () => {
  assert.equal(
    learningSessionToolContract.start_learning_canvas.registration.view
      .component,
    "start-learning-canvas",
  );
  assert.deepEqual(
    learningSessionToolContract.update_microturn.registration,
    {},
  );
  assert.deepEqual(
    learningSessionToolContract.read_learning_session.registration,
    {},
  );
  assert.deepEqual(
    Object.entries(learningSessionToolContract)
      .filter(([, contract]) => "view" in contract.registration)
      .map(([name]) => name),
    ["start_learning_canvas"],
  );
});
