import { McpServer } from "skybridge/server";
import { z } from "zod";

import { createInitialLearningCanvasState } from "@/domain/start-learning-canvas.js";

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
      description:
        "Start a Make It Click learning canvas for microturn coaching. Diagnose the user's confusion first, keep the board current, add a diagnosis timeline entry, teach one tiny idea at a time, use one example max, ask exactly one check question, then wait for the user's next signal.",
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
  );

if (process.env.NODE_ENV === "production") {
  const { default: manifest } = await import("./vite-manifest.js");
  server.setViteManifest(manifest);
}

export default await server.run();

export type AppType = typeof server;
