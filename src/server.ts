import { McpServer } from "skybridge/server";
import { z } from "zod";

import { coachPolicyToolDescriptions } from "@/domain/coach-policy.js";
import { createInitialLearningCanvasState } from "@/domain/start-learning-canvas.js";
import {
  applyMicroturnUpdate,
  updateMicroturnInputShape,
} from "@/domain/update-microturn.js";

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
        component: "learning-canvas",
        description: "Make It Click learning canvas",
        csp: {
          resourceDomains: [
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
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

      return {
        structuredContent: { state },
        content: [
          {
            type: "text",
            text: `Opened learning canvas for ${state.topic}.`,
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
        state: updateMicroturnInputShape.state.describe(
          "Existing LearningCanvasState returned by start_learning_canvas or update_microturn.",
        ),
        userAnswer: updateMicroturnInputShape.userAnswer.describe(
          "The user's latest plain-text answer, teach-back, or prediction.",
        ),
        interactionResult:
          updateMicroturnInputShape.interactionResult.describe(
            "Optional structured result from a typed interaction block.",
          ),
        timelineStatus: updateMicroturnInputShape.timelineStatus.describe(
          "How to mark the active timeline item after evaluating the latest user signal.",
        ),
        nextMicroturn: updateMicroturnInputShape.nextMicroturn.describe(
          "Optional next microturn. Include only one tiny idea, at most one example, and exactly one check question.",
        ),
      },
      view: {
        component: "learning-canvas",
        description: "Make It Click learning canvas",
        csp: {
          resourceDomains: [
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
          ],
        },
      },
    },
    async (input) => {
      const state = applyMicroturnUpdate(input);

      return {
        structuredContent: { state },
        content: [
          {
            type: "text",
            text: `Updated learning canvas for ${state.topic}.`,
          },
        ],
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
