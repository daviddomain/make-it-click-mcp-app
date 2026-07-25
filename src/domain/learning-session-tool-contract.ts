export const learningSessionToolContract = {
  start_learning_canvas: {
    registration: {
      view: {
        component: "start-learning-canvas",
        description:
          "A compact Make It Click session launcher that expands into a focused fullscreen learning canvas or a small PiP companion.",
      },
    },
    visibility: ["model", "app"],
  },
  update_microturn: {
    registration: {},
    visibility: ["model", "app"],
  },
  read_learning_session: {
    registration: {},
    visibility: ["app"],
  },
} as const;

export type LearningSessionToolName =
  keyof typeof learningSessionToolContract;
