import { randomUUID } from "node:crypto";

import { McpServer } from "skybridge/server";
import { z } from "zod";

import { coachPolicyToolDescriptions } from "@/domain/coach-policy.js";
import {
  advanceLearningSessionSpikeEnvelope,
  createLearningSessionSpikeEnvelope,
  learningSessionSpikeEnvelopeSchema,
  setLearningSessionSpikeDisplayMode,
  spikeDisplayModeSchema,
  type LearningSessionSpikeEnvelope,
} from "@/domain/learning-session-spike.js";
import { createInitialLearningCanvasState } from "@/domain/start-learning-canvas.js";
import {
  applyMicroturnUpdate,
  updateMicroturnInputShape,
  updateMicroturnOutputSchema,
} from "@/domain/update-microturn.js";

const spikeSessions = new Map<string, LearningSessionSpikeEnvelope>();
const spikeEnvelopeOutputSchema = z.object({
  envelope: learningSessionSpikeEnvelopeSchema,
});

function getSpikeSession(sessionId: string) {
  const session = spikeSessions.get(sessionId);

  if (!session) {
    throw new Error(`Unknown Issue #27 spike session "${sessionId}".`);
  }

  return session;
}

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
      name: "start_learning_session_spike",
      description:
        "Issue #27 only: launch one temporary Make It Click session as a compact inline widget. Use this for the documented fullscreen/PiP technical spike, not as the production session architecture.",
      inputSchema: {
        topic: z
          .string()
          .trim()
          .min(1)
          .describe("Spike topic. Use 'React derived state' for the test run."),
        confusion: z
          .string()
          .optional()
          .describe("Optional confusion to diagnose in the first microturn."),
      },
      outputSchema: spikeEnvelopeOutputSchema.shape,
      view: {
        component: "learning-session-spike",
        description: "Issue #27 fullscreen and PiP session spike",
        csp: {
          resourceDomains: [
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
          ],
        },
      },
      _meta: {
        "openai/widgetAccessible": true,
        ui: { visibility: ["model", "app"] },
      },
    },
    async ({ topic, confusion }) => {
      const sessionId = `issue-27-${randomUUID()}`;
      const state = createInitialLearningCanvasState({ topic, confusion });
      const envelope = createLearningSessionSpikeEnvelope({
        sessionId,
        state,
      });
      spikeSessions.set(sessionId, envelope);

      return {
        structuredContent: { envelope },
        content: [
          {
            type: "text",
            text: `Opened Issue #27 spike session ${sessionId} at revision 1.`,
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "advance_learning_session_spike",
      description:
        "Issue #27 only: advance an existing temporary spike session without rendering a new widget. For normal ChatGPT-composer turns use source 'composer', one user answer, at most one tiny idea, and exactly one check question. Keep surrounding narration to one short sentence and do not call the launch tool again.",
      inputSchema: {
        sessionId: z
          .string()
          .trim()
          .min(1)
          .describe("Stable session id shown in the active spike widget."),
        source: z.enum(["widget", "composer"]).describe(
          "Use widget for a direct widget action and composer for a normal ChatGPT turn.",
        ),
        userAnswer: updateMicroturnInputShape.userAnswer.describe(
          "The user's latest answer for this spike revision.",
        ),
        timelineStatus: updateMicroturnInputShape.timelineStatus.describe(
          "How to mark the active microturn.",
        ),
        nextMicroturn: updateMicroturnInputShape.nextMicroturn.describe(
          "Optional next microturn with one tiny idea and exactly one check question.",
        ),
      },
      outputSchema: spikeEnvelopeOutputSchema.shape,
      _meta: {
        "openai/widgetAccessible": true,
        ui: { visibility: ["model", "app"] },
      },
    },
    async ({
      sessionId,
      source,
      userAnswer,
      timelineStatus,
      nextMicroturn,
    }) => {
      const envelope = advanceLearningSessionSpikeEnvelope({
        envelope: getSpikeSession(sessionId),
        source,
        update: {
          userAnswer,
          timelineStatus,
          nextMicroturn,
        },
      });
      spikeSessions.set(sessionId, envelope);

      return {
        structuredContent: { envelope },
        content: [
          {
            type: "text",
            text: `Spike session ${sessionId} reached revision ${envelope.revision}.`,
          },
        ],
        isError: false,
      };
    },
  )
  .registerTool(
    {
      name: "read_learning_session_spike",
      description:
        "Issue #27 only: refresh the active spike widget from the latest temporary server revision. This tool is app-only and does not render a widget.",
      inputSchema: {
        sessionId: z
          .string()
          .trim()
          .min(1)
          .describe("Stable session id shown in the active spike widget."),
        displayMode: spikeDisplayModeSchema
          .optional()
          .describe("Display mode reported by the host after a mode request."),
      },
      outputSchema: spikeEnvelopeOutputSchema.shape,
      _meta: {
        "openai/widgetAccessible": true,
        ui: { visibility: ["app"] },
      },
    },
    async ({ sessionId, displayMode }) => {
      const current = getSpikeSession(sessionId);
      const envelope = displayMode
        ? setLearningSessionSpikeDisplayMode(current, displayMode)
        : current;
      spikeSessions.set(sessionId, envelope);

      return {
        structuredContent: { envelope },
        content: [],
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
      outputSchema: updateMicroturnOutputSchema.shape,
      view: {
        component: "update-learning-canvas",
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
      const output = updateMicroturnOutputSchema.parse({
        state,
        interactionResult: input.interactionResult ?? null,
      });

      return {
        structuredContent: output,
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
