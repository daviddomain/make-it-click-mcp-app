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
      view: {
        component: "start-learning-canvas",
        description: "Make It Click learning canvas",
        csp: {
          resourceDomains: [
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
          ],
        },
      },
      outputSchema: learningSessionStartOutputSchema.shape,
      _meta: {
        "openai/widgetAccessible": true,
        ui: { visibility: ["model", "app"] },
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
            text: `Opened learning session ${session.sessionId} at revision ${session.revision}.`,
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
      outputSchema: learningSessionUpdateOutputSchema.shape,
      _meta: {
        "openai/widgetAccessible": true,
        ui: { visibility: ["model", "app"] },
      },
    },
    async (input) => {
      const result = learningSessions.update(input);
      const text =
        result.status === "ok"
          ? `Learning session ${result.session.sessionId} reached revision ${result.session.revision}.`
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
      outputSchema: learningSessionReadOutputSchema.shape,
      _meta: {
        "openai/widgetAccessible": true,
        ui: { visibility: ["app"] },
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
