import {
  learningCanvasStateSchema,
  learningCanvasStateVersion,
  type LearningCanvasState,
} from "./learning-canvas-state.js";

export const sampleLearningCanvasState = learningCanvasStateSchema.parse({
  version: learningCanvasStateVersion,
  id: "sample-learning-canvas",
  topic: "React state vs. derived values",
  board: {
    currentKnot:
      "You are not sure which values should live in React state and which values can be calculated during render.",
    tinyCoreIdea:
      "Store source data in state; calculate values from that source data when rendering.",
    exampleBlock: {
      kind: "code",
      language: "tsx",
      code: "const [items, setItems] = useState([]);\nconst itemCount = items.length;",
    },
    checkQuestion:
      "If `itemCount` always comes from `items.length`, should it be another state value?",
    userVersion:
      "I think state is for values that can change, but I am not sure where derived values belong.",
    confidence: {
      status: "medium",
      value: 0.55,
      note: "Ready for one focused check before moving on.",
    },
  },
  timeline: [
    {
      id: "diagnose-source-vs-derived",
      kind: "diagnose",
      status: "understood",
      title: "Name the knot",
      summary: "The current confusion is source data vs. derived data.",
      activeField: "currentKnot",
    },
    {
      id: "tiny-idea-source-data",
      kind: "tinyIdea",
      status: "open",
      title: "One tiny idea",
      summary: "Only source data needs state; derived values can be computed.",
      activeField: "tinyCoreIdea",
    },
    {
      id: "check-item-count",
      kind: "check",
      status: "open",
      title: "Check the model",
      summary: "The user should decide whether `itemCount` belongs in state.",
      activeField: "checkQuestion",
    },
  ],
} satisfies LearningCanvasState);
