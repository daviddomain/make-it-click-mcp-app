import assert from "node:assert/strict";
import test from "node:test";

import { createInMemoryLearningSessionStore } from "../learning-session-store.js";
import {
  createLearningSession,
  validateExpectedRevision,
} from "./learning-session.js";
import { createInitialLearningCanvasState } from "./start-learning-canvas.js";

const createdAt = "2026-07-23T10:00:00.000Z";
const updatedAt = "2026-07-23T10:01:00.000Z";

function createDiagnosticState() {
  return createInitialLearningCanvasState({
    topic: "Event loops",
    confusion: "I cannot tell when queued callbacks run.",
  });
}

function createDeterministicStore() {
  const timestamps = [createdAt, updatedAt, updatedAt];

  return createInMemoryLearningSessionStore({
    createSessionId: () => "session-28",
    now: () => new Date(timestamps.shift() ?? updatedAt),
  });
}

test("creates and reads one stable authoritative session", () => {
  const store = createDeterministicStore();
  const created = store.create(createDiagnosticState());
  const read = store.read(created.sessionId);

  assert.equal(created.sessionId, "session-28");
  assert.equal(created.revision, 1);
  assert.equal(created.createdAt, createdAt);
  assert.equal(created.updatedAt, createdAt);
  assert.deepEqual(read, {
    status: "ok",
    session: created,
  });
});

test("a valid update applies the domain transition and advances once", () => {
  const store = createDeterministicStore();
  const initial = store.create(createDiagnosticState());
  const result = store.update({
    sessionId: initial.sessionId,
    expectedRevision: initial.revision,
    userAnswer: "The current stack finishes before the callback runs.",
    timelineStatus: "understood",
  });

  assert.equal(result.status, "ok");
  if (result.status !== "ok") {
    return;
  }

  assert.equal(result.session.revision, 2);
  assert.equal(result.session.createdAt, createdAt);
  assert.equal(result.session.updatedAt, updatedAt);
  assert.equal(
    result.session.state.board.userVersion,
    "The current stack finishes before the callback runs.",
  );
  assert.equal(result.session.state.timeline[0]?.status, "understood");
});

test("a stale revision conflicts without applying the update twice", () => {
  const store = createDeterministicStore();
  const initial = store.create(createDiagnosticState());
  const first = store.update({
    sessionId: initial.sessionId,
    expectedRevision: 1,
    userAnswer: "First accepted answer.",
  });
  const stale = store.update({
    sessionId: initial.sessionId,
    expectedRevision: 1,
    userAnswer: "This stale answer must not overwrite the first.",
  });
  const read = store.read(initial.sessionId);

  assert.equal(first.status, "ok");
  assert.deepEqual(stale, {
    status: "conflict",
    error: {
      code: "stale_revision",
      message:
        "The learning session changed before this update. Refresh the active canvas and retry from the latest revision.",
      expectedRevision: 1,
      currentRevision: 2,
    },
  });
  assert.equal(read.status, "ok");
  if (read.status !== "ok") {
    return;
  }

  assert.equal(read.session.revision, 2);
  assert.equal(read.session.state.board.userVersion, "First accepted answer.");
});

test("missing reads and updates return the same stable not-found result", () => {
  const store = createDeterministicStore();
  const read = store.read("missing-session");
  const update = store.update({
    sessionId: "missing-session",
    expectedRevision: 1,
    userAnswer: "This session does not exist.",
  });
  const expected = {
    status: "not_found",
    error: {
      code: "learning_session_not_found",
      message: "No learning session exists for the supplied session id.",
    },
  };

  assert.deepEqual(read, expected);
  assert.deepEqual(update, expected);
});

test("revision validation and session creation are pure computations", () => {
  const session = createLearningSession({
    sessionId: "pure-session",
    state: createDiagnosticState(),
    timestamp: createdAt,
  });

  assert.equal(validateExpectedRevision({
    expectedRevision: 1,
    currentRevision: session.revision,
  }).status, "ok");
  assert.equal(validateExpectedRevision({
    expectedRevision: 2,
    currentRevision: session.revision,
  }).status, "conflict");
  assert.equal(session.revision, 1);
  assert.equal(session.updatedAt, createdAt);
});
