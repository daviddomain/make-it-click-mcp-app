import { randomUUID } from "node:crypto";

import {
  applyLearningSessionUpdate,
  createLearningSession,
  createLearningSessionNotFoundResult,
  learningSessionReadResultSchema,
  learningSessionSchema,
  learningSessionUpdateResultSchema,
  type LearningSession,
  type LearningSessionReadResult,
  type LearningSessionUpdateInput,
  type LearningSessionUpdateResult,
} from "@/domain/learning-session.js";
import type { LearningCanvasState } from "@/domain/learning-canvas-state.js";

type LearningSessionStoreDependencies = {
  createSessionId?: () => string;
  now?: () => Date;
};

export function createInMemoryLearningSessionStore({
  createSessionId = randomUUID,
  now = () => new Date(),
}: LearningSessionStoreDependencies = {}) {
  const sessions = new Map<string, LearningSession>();

  return {
    create(state: LearningCanvasState): LearningSession {
      const session = createLearningSession({
        sessionId: createSessionId(),
        state,
        timestamp: now().toISOString(),
      });
      sessions.set(session.sessionId, session);

      return learningSessionSchema.parse(session);
    },

    read(sessionId: string): LearningSessionReadResult {
      const session = sessions.get(sessionId);

      if (!session) {
        return createLearningSessionNotFoundResult();
      }

      return learningSessionReadResultSchema.parse({
        status: "ok",
        session,
      });
    },

    update(input: LearningSessionUpdateInput): LearningSessionUpdateResult {
      const session = sessions.get(input.sessionId);

      if (!session) {
        return learningSessionUpdateResultSchema.parse(
          createLearningSessionNotFoundResult(),
        );
      }

      const result = applyLearningSessionUpdate({
        session,
        input,
        timestamp: now().toISOString(),
      });

      if (result.status === "ok") {
        sessions.set(result.session.sessionId, result.session);
      }

      return learningSessionUpdateResultSchema.parse(result);
    },
  };
}

export type LearningSessionStore = ReturnType<
  typeof createInMemoryLearningSessionStore
>;
