import type {
  ConfidenceStatus,
  LearningCanvasState,
  MicroturnKind,
  TimelineStatus,
} from "./learning-canvas-state.js";
import type { LearningShellMode } from "./learning-shell.js";

export type LearningCanvasLocale = "de" | "en";
export type ContentProminence =
  | "primary"
  | "secondary"
  | "collapsed"
  | "hidden";
export type FullscreenWorkspaceLayout =
  | "two-region"
  | "single-column";

export type LearningCanvasCopy = {
  languageName: string;
  sessionEyebrow: string;
  canvasEyebrow: string;
  currentStep: string;
  currentMicroturn: string;
  currentKnot: string;
  tinyIdea: string;
  currentQuestion: string;
  oneExample: string;
  nextStep: string;
  yourCheck: string;
  reflectionAndContext: string;
  viewDetails: string;
  hideDetails: string;
  userVersion: string;
  confidenceStatus: string;
  learningProgress: string;
  openLearningCanvas: string;
  openingCanvas: string;
  returnToFullscreen: string;
  opening: string;
  refresh: string;
  refreshLatest: string;
  refreshing: string;
  pictureInPicture: string;
  inline: string;
  oneIdeaOneCheck: string;
  focusedWorkspaceHint: string;
  focusedCanvasHint: string;
  noCanvasState: string;
  noExample: string;
  waitingForIdea: string;
  noCheck: string;
  noUserVersion: string;
  selected: string;
  submitAnswer: string;
  submittingAnswer: string;
  answerSubmitted: string;
  answerError: string;
  submitConfidence: string;
  submittingConfidence: string;
  confidenceSubmitted: string;
  confidenceError: string;
  notConfident: string;
  veryConfident: string;
  confidence: string;
  revision: string;
  step: string;
  steps: string;
  noSteps: string;
  stepOf: string;
  rhythm: string;
  modeError: string;
  synchronizationError: string;
  differentSessionError: string;
  statusLabels: Record<TimelineStatus, string>;
  kindLabels: Record<MicroturnKind, string>;
  confidenceLabels: Record<ConfidenceStatus, string>;
};

export type LearningCanvasPresentation = {
  locale: LearningCanvasLocale;
  copy: LearningCanvasCopy;
  workspaceLayout: FullscreenWorkspaceLayout;
  density: "compact" | "comfortable";
  roles: {
    currentKnot: ContentProminence;
    tinyIdea: ContentProminence;
    example: ContentProminence;
    check: ContentProminence;
    progress: ContentProminence;
    reflection: ContentProminence;
  };
  progress: {
    current: number;
    total: number;
    completed: number;
    label: string;
    countLabel: string;
  };
  currentStep: {
    label: string;
    text: string;
  };
};

export type LearningCanvasPresentationInput = {
  state: LearningCanvasState;
  mode: LearningShellMode;
  containerWidth: number | undefined;
  availableHeight: number | undefined;
  hostLocale: string;
};

const copyByLocale: Record<LearningCanvasLocale, LearningCanvasCopy> = {
  en: {
    languageName: "English",
    sessionEyebrow: "Make It Click session",
    canvasEyebrow: "Make It Click canvas",
    currentStep: "Current step",
    currentMicroturn: "Current microturn",
    currentKnot: "Current knot",
    tinyIdea: "Tiny idea",
    currentQuestion: "Current question",
    oneExample: "One example",
    nextStep: "Your next step",
    yourCheck: "Your check",
    reflectionAndContext: "Reflection & context",
    viewDetails: "View details",
    hideDetails: "Hide details",
    userVersion: "Your version",
    confidenceStatus: "Confidence / status",
    learningProgress: "Learning progress",
    openLearningCanvas: "Open learning canvas",
    openingCanvas: "Opening canvas...",
    returnToFullscreen: "Return to fullscreen",
    opening: "Opening...",
    refresh: "Refresh",
    refreshLatest: "Refresh latest",
    refreshing: "Refreshing...",
    pictureInPicture: "PiP",
    inline: "Inline",
    oneIdeaOneCheck: "One idea · one check",
    focusedWorkspaceHint: "Stay with one small step until it clicks.",
    focusedCanvasHint: "Open the focused workspace to continue this session.",
    noCanvasState: "No learning canvas state was returned by the tool.",
    noExample: "No example selected yet.",
    waitingForIdea: "Waiting for your answer before choosing the tiny idea.",
    noCheck: "No check question queued.",
    noUserVersion: "No user version recorded yet.",
    selected: "Selected",
    submitAnswer: "Submit answer",
    submittingAnswer: "Submitting answer...",
    answerSubmitted: "Answer submitted. The coach can use the structured result.",
    answerError: "The answer could not be submitted. Please try again.",
    submitConfidence: "Submit confidence",
    submittingConfidence: "Submitting confidence...",
    confidenceSubmitted:
      "Confidence submitted. The coach can use the structured result.",
    confidenceError:
      "The confidence could not be submitted. Please try again.",
    notConfident: "Not confident yet",
    veryConfident: "Very confident",
    confidence: "confidence",
    revision: "Revision",
    step: "step",
    steps: "steps",
    noSteps: "No steps yet",
    stepOf: "Step {current} of {total}",
    rhythm: "Diagnose → one tiny idea → check → wait.",
    modeError:
      "The host could not change the view mode. You can keep using this view and try again.",
    synchronizationError:
      "The latest learning session could not be loaded. Please try again.",
    differentSessionError:
      "The refreshed result belongs to a different learning session.",
    statusLabels: {
      open: "Open",
      understood: "Understood",
      uncertain: "Uncertain",
      revisit: "Revisit",
    },
    kindLabels: {
      diagnose: "Diagnose",
      tinyIdea: "Tiny idea",
      example: "Example",
      check: "Check",
      teachBack: "Teach-back",
      nextKnot: "Next knot",
    },
    confidenceLabels: {
      unknown: "Unknown",
      low: "Low",
      medium: "Medium",
      high: "High",
    },
  },
  de: {
    languageName: "Deutsch",
    sessionEyebrow: "Make-It-Click-Lerneinheit",
    canvasEyebrow: "Make-It-Click-Lernfläche",
    currentStep: "Aktueller Schritt",
    currentMicroturn: "Aktueller Lernschritt",
    currentKnot: "Aktueller Knoten",
    tinyIdea: "Kleine Kernidee",
    currentQuestion: "Aktuelle Frage",
    oneExample: "Ein Beispiel",
    nextStep: "Dein nächster Schritt",
    yourCheck: "Deine Checkfrage",
    reflectionAndContext: "Reflexion & Kontext",
    viewDetails: "Details anzeigen",
    hideDetails: "Details ausblenden",
    userVersion: "Deine Version",
    confidenceStatus: "Sicherheit / Status",
    learningProgress: "Lernfortschritt",
    openLearningCanvas: "Lernfläche öffnen",
    openingCanvas: "Lernfläche wird geöffnet...",
    returnToFullscreen: "Zur Vollansicht",
    opening: "Wird geöffnet...",
    refresh: "Aktualisieren",
    refreshLatest: "Stand aktualisieren",
    refreshing: "Wird aktualisiert...",
    pictureInPicture: "PiP",
    inline: "Inline",
    oneIdeaOneCheck: "Eine Idee · eine Checkfrage",
    focusedWorkspaceHint:
      "Bleib bei einem kleinen Schritt, bis er wirklich sitzt.",
    focusedCanvasHint:
      "Öffne die fokussierte Lernfläche, um diese Einheit fortzusetzen.",
    noCanvasState: "Das Tool hat keinen Lernflächen-Status zurückgegeben.",
    noExample: "Noch kein Beispiel ausgewählt.",
    waitingForIdea:
      "Wir warten auf deine Antwort, bevor die kleine Kernidee festgelegt wird.",
    noCheck: "Noch keine Checkfrage vorhanden.",
    noUserVersion: "Noch keine eigene Version festgehalten.",
    selected: "Ausgewählt",
    submitAnswer: "Antwort senden",
    submittingAnswer: "Antwort wird gesendet...",
    answerSubmitted:
      "Antwort gesendet. Der Coach kann das strukturierte Ergebnis verwenden.",
    answerError:
      "Die Antwort konnte nicht gesendet werden. Bitte versuche es erneut.",
    submitConfidence: "Sicherheit senden",
    submittingConfidence: "Sicherheit wird gesendet...",
    confidenceSubmitted:
      "Sicherheit gesendet. Der Coach kann das strukturierte Ergebnis verwenden.",
    confidenceError:
      "Die Sicherheit konnte nicht gesendet werden. Bitte versuche es erneut.",
    notConfident: "Noch unsicher",
    veryConfident: "Sehr sicher",
    confidence: "Sicherheit",
    revision: "Revision",
    step: "Schritt",
    steps: "Schritte",
    noSteps: "Noch keine Schritte",
    stepOf: "Schritt {current} von {total}",
    rhythm: "Diagnose → eine kleine Idee → Checkfrage → warten.",
    modeError:
      "Der Host konnte die Ansicht nicht wechseln. Du kannst hier weiterarbeiten und es erneut versuchen.",
    synchronizationError:
      "Der neueste Stand konnte nicht geladen werden. Bitte versuche es erneut.",
    differentSessionError:
      "Der geladene Stand gehört zu einer anderen Lerneinheit.",
    statusLabels: {
      open: "Offen",
      understood: "Verstanden",
      uncertain: "Unsicher",
      revisit: "Erneut ansehen",
    },
    kindLabels: {
      diagnose: "Diagnose",
      tinyIdea: "Kleine Idee",
      example: "Beispiel",
      check: "Checkfrage",
      teachBack: "Erklären",
      nextKnot: "Nächster Knoten",
    },
    confidenceLabels: {
      unknown: "Unbekannt",
      low: "Niedrig",
      medium: "Mittel",
      high: "Hoch",
    },
  },
};

const germanMarkers =
  /\b(aber|beispiel|das|der|die|eine|einer|einen|frage|ich|idee|ist|kann|nicht|oder|schritt|unsicher|verstehe|warum|welche|wenn|wie|wir)\b/gi;
const englishMarkers =
  /\b(and|but|can|check|example|idea|is|not|or|question|step|the|understand|unsure|what|when|why)\b/gi;

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function deriveSessionLocale(
  state: LearningCanvasState,
  hostLocale: string,
): LearningCanvasLocale {
  const sessionText = [
    state.topic,
    state.board.currentKnot,
    state.board.tinyCoreIdea,
    state.board.userVersion,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const germanScore =
    countMatches(sessionText, germanMarkers) +
    (/[äöüß]/i.test(sessionText) ? 2 : 0);
  const englishScore = countMatches(sessionText, englishMarkers);

  if (germanScore >= 2 && germanScore >= englishScore) {
    return "de";
  }

  if (englishScore >= 2 && englishScore > germanScore) {
    return "en";
  }

  return hostLocale.toLowerCase().startsWith("de") ? "de" : "en";
}

function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function findCurrentTimelineIndex(state: LearningCanvasState): number {
  let currentIndex = Math.max(0, state.timeline.length - 1);

  for (let index = state.timeline.length - 1; index >= 0; index -= 1) {
    if (state.timeline[index]?.status === "open") {
      currentIndex = index;
      break;
    }
  }

  return currentIndex;
}

export function getLearningCanvasCopy(
  locale: LearningCanvasLocale,
): LearningCanvasCopy {
  return copyByLocale[locale];
}

export function deriveLearningCanvasPresentation({
  state,
  mode,
  containerWidth,
  availableHeight,
  hostLocale,
}: LearningCanvasPresentationInput): LearningCanvasPresentation {
  const locale = deriveSessionLocale(state, hostLocale);
  const copy = getLearningCanvasCopy(locale);
  const currentIndex = findCurrentTimelineIndex(state);
  const activeField = state.timeline[currentIndex]?.activeField;
  const isWideFullscreen =
    mode === "fullscreen" &&
    typeof containerWidth === "number" &&
    containerWidth >= 880;
  const total = state.timeline.length;
  const current = total === 0 ? 0 : currentIndex + 1;
  const completed = state.timeline.filter(
    (item) => item.status !== "open",
  ).length;
  const progressLabel =
    total === 0
      ? copy.noSteps
      : interpolate(copy.stepOf, { current, total });
  const countLabel = `${total} ${total === 1 ? copy.step : copy.steps}`;
  const currentStep =
    state.board.checkQuestion !== null
      ? {
          label: copy.currentQuestion,
          text: state.board.checkQuestion,
        }
      : state.board.tinyCoreIdea !== null
        ? {
            label: copy.tinyIdea,
            text: state.board.tinyCoreIdea,
          }
        : {
            label: copy.currentKnot,
            text: state.board.currentKnot,
          };

  return {
    locale,
    copy,
    workspaceLayout: isWideFullscreen
      ? "two-region"
      : "single-column",
    density:
      mode !== "fullscreen" ||
      (typeof availableHeight === "number" && availableHeight < 680)
        ? "compact"
        : "comfortable",
    roles: {
      currentKnot:
        activeField === "currentKnot"
          ? "primary"
          : mode === "fullscreen"
            ? "collapsed"
            : "hidden",
      tinyIdea:
        state.board.tinyCoreIdea === null
          ? "hidden"
          : mode === "fullscreen"
            ? "primary"
            : "secondary",
      example:
        state.board.exampleBlock === null || mode !== "fullscreen"
          ? "hidden"
          : "primary",
      check:
        state.board.checkQuestion === null ? "secondary" : "primary",
      progress:
        mode === "fullscreen"
          ? isWideFullscreen
            ? "secondary"
            : "collapsed"
          : "secondary",
      reflection:
        activeField === "userVersion" || activeField === "confidence"
          ? "primary"
          : mode === "fullscreen"
            ? "collapsed"
            : "hidden",
    },
    progress: {
      current,
      total,
      completed,
      label: progressLabel,
      countLabel,
    },
    currentStep,
  };
}
