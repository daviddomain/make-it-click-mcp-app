import { McpServer } from "skybridge/server";
import { z } from "zod";

import { sampleLearningCanvasState } from "@/domain/sample-learning-canvas-state.js";

const server = new McpServer(
  {
    name: "make-it-click-mcp-app",
    version: "0.0.1",
  },
  { capabilities: {} },
)
  .registerTool(
    {
      name: "start",
      description:
        "Open the Make It Click learning canvas. Use it for microturn coaching: keep the board current, update the timeline, teach one tiny idea, ask one check question, then wait.",
      inputSchema: {
        topic: z
          .string()
          .optional()
          .describe("Optional topic label for the learning canvas."),
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
    async ({ topic }) => {
      const state = topic
        ? { ...sampleLearningCanvasState, topic }
        : sampleLearningCanvasState;

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
