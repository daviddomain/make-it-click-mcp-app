import { McpServer } from "skybridge/server";
import { z } from "zod";

import { coachPolicyToolDescriptions } from "@/domain/coach-policy.js";
import {
  learningSessionReadInputSchema,
  learningSessionReadOutputSchema,
  learningSessionStartOutputSchema,
  learningSessionUpdateInputShape,
  learningSessionUpdateOutputSchema,
} from "@/domain/learning-session.js";
import { learningSessionToolContract } from "@/domain/learning-session-tool-contract.js";
import { createInitialLearningCanvasState } from "@/domain/start-learning-canvas.js";
import { createInMemoryLearningSessionStore } from "@/learning-session-store.js";

const learningSessions = createInMemoryLearningSessionStore();

const server = new McpServer(
  {
    name: "make-it-click-mcp-app",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  .registerTool(
    {
      name: "start_learning_canvas",
      description: coachPolicyToolDescriptions.startLearningCanvas,
      inputSchema: {
        topic: z
          .string()
          .trim()
          .min(1)
          .describe("Topic or concept the user wants to understand."),
        confusion: z
          .string()
          .optional()
          .describe("User's current confusion, question, or suspected knot."),
        context: z
          .string()
          .optional()
          .describe("Optional context from the conversation or user's attempt."),
      },
      ...learningSessionToolContract.start_learning_canvas.registration,
      outputSchema: learningSessionStartOutputSchema.shape,
      _meta: {
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Opening learning canvas…",
        "openai/toolInvocation/invoked": "Learning canvas ready",
        ui: {
          visibility: [
            ...learningSessionToolContract.start_learning_canvas.visibility,
          ],
        },
      },
    },
    async ({ topic, confusion, context }) => {
      const state = createInitialLearningCanvasState({
        topic,
        confusion,
        context,
      });
      const session = learningSessions.create(state);

      return {
        structuredContent: { session },
        content: [
          {
            type: "text",
            text: "Learning canvas ready.",
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "update_microturn",
      description: coachPolicyToolDescriptions.updateMicroturn,
      inputSchema: {
        sessionId: learningSessionUpdateInputShape.sessionId.describe(
          "Stable session id returned by start_learning_canvas.",
        ),
        expectedRevision:
          learningSessionUpdateInputShape.expectedRevision.describe(
            "Authoritative revision being updated. A stale revision returns a conflict without changing the session.",
          ),
        userAnswer: learningSessionUpdateInputShape.userAnswer.describe(
          "The user's latest plain-text answer, teach-back, or prediction.",
        ),
        interactionResult:
          learningSessionUpdateInputShape.interactionResult.describe(
            "Optional structured result from a typed interaction block.",
          ),
        timelineStatus:
          learningSessionUpdateInputShape.timelineStatus.describe(
            "How to mark the active timeline item after evaluating the latest user signal.",
          ),
        nextMicroturn:
          learningSessionUpdateInputShape.nextMicroturn.describe(
            "Optional next microturn. Include only one tiny idea, at most one example, and exactly one check question.",
          ),
      },
      ...learningSessionToolContract.update_microturn.registration,
      outputSchema: learningSessionUpdateOutputSchema.shape,
      _meta: {
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Updating learning session…",
        "openai/toolInvocation/invoked": "Learning session updated",
        ui: {
          visibility: [
            ...learningSessionToolContract.update_microturn.visibility,
          ],
        },
      },
    },
    async (input) => {
      const result = learningSessions.update(input);
      const text =
        result.status === "ok"
          ? `Session updated to revision ${result.session.revision}.`
          : result.error.message;

      return {
        structuredContent: { result },
        content: [{ type: "text", text }],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "read_learning_session",
      description: coachPolicyToolDescriptions.readLearningSession,
      inputSchema: {
        sessionId: learningSessionReadInputSchema.shape.sessionId.describe(
          "Stable session id returned by start_learning_canvas.",
        ),
      },
      ...learningSessionToolContract.read_learning_session.registration,
      outputSchema: learningSessionReadOutputSchema.shape,
      _meta: {
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Refreshing learning session…",
        "openai/toolInvocation/invoked": "Learning session refreshed",
        ui: {
          visibility: [
            ...learningSessionToolContract.read_learning_session.visibility,
          ],
        },
      },
    },
    async ({ sessionId }) => {
      const result = learningSessions.read(sessionId);

      return {
        structuredContent: { result },
        content: [],
        isError: false,
      };
    },
  );

if (process.env.NODE_ENV === "production") {
  const { default: manifest } = await import("./vite-manifest.js");
  server.setViteManifest(manifest);
}

export default await server.run();

export type AppType = typeof server;
