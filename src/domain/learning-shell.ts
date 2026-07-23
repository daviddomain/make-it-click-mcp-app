import type { LearningSession } from "./learning-session.js";

export type LearningShellMode = "inline" | "fullscreen" | "pip";
export type HostDisplayMode = LearningShellMode | "modal";
export type RequestedDisplayMode = LearningShellMode;

export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type HostLayoutData = {
  displayMode: HostDisplayMode | undefined;
  maxHeight: number | undefined;
  safeAreaInsets: Partial<SafeAreaInsets> | undefined;
};

export type LearningShellLayout = {
  mode: LearningShellMode;
  maxHeight: number | undefined;
  availableHeight: number | undefined;
  safeAreaInsets: SafeAreaInsets;
  fallbackMessage: string | null;
};

export type LearningShellAction =
  | "open-fullscreen"
  | "open-pip"
  | "return-inline";

export type LearningShellViewModel = {
  mode: LearningShellMode;
  topic: string;
  revisionLabel: string;
  progressLabel: string;
  currentStepLabel: string;
  currentStepText: string;
  actions: readonly LearningShellAction[];
  showBoard: boolean;
  showTimeline: boolean;
};

export type RecoverablePresentationError = {
  source: "display-mode" | "synchronization";
  message: string;
};

export type MountedPresentationState = {
  requestedMode: RequestedDisplayMode | null;
  modeRequestStatus: "idle" | "pending";
  synchronizationStatus: "in-sync" | "refreshing" | "error";
  lastSuccessfulRevision: number;
  recoverableError: RecoverablePresentationError | null;
};

export type SessionReconciliation = {
  session: LearningSession;
  accepted: boolean;
  reason: "newer" | "same-or-older" | "different-session";
};

function normalizeInset(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : 0;
}

export function deriveLearningShellLayout({
  displayMode,
  maxHeight,
  safeAreaInsets,
}: HostLayoutData): LearningShellLayout {
  const normalizedInsets = {
    top: normalizeInset(safeAreaInsets?.top),
    right: normalizeInset(safeAreaInsets?.right),
    bottom: normalizeInset(safeAreaInsets?.bottom),
    left: normalizeInset(safeAreaInsets?.left),
  };
  const normalizedMaxHeight =
    typeof maxHeight === "number" && Number.isFinite(maxHeight)
      ? Math.max(0, maxHeight)
      : undefined;
  const mode =
    displayMode === undefined || displayMode === "modal"
      ? "inline"
      : displayMode;

  return {
    mode,
    maxHeight: normalizedMaxHeight,
    availableHeight:
      normalizedMaxHeight === undefined
        ? undefined
        : Math.max(
            0,
            normalizedMaxHeight -
              normalizedInsets.top -
              normalizedInsets.bottom,
          ),
    safeAreaInsets: normalizedInsets,
    fallbackMessage:
      displayMode === "modal"
        ? "This host mode is not supported by the learning canvas. Use the inline launcher to continue."
        : null,
  };
}

export function deriveLearningShellViewModel({
  session,
  mode,
}: {
  session: LearningSession;
  mode: LearningShellMode;
}): LearningShellViewModel {
  const state = session.state;
  let currentIndex = Math.max(0, state.timeline.length - 1);

  for (let index = state.timeline.length - 1; index >= 0; index -= 1) {
    if (state.timeline[index]?.status === "open") {
      currentIndex = index;
      break;
    }
  }
  const progressLabel =
    state.timeline.length === 0
      ? "No steps yet"
      : `Step ${currentIndex + 1} of ${state.timeline.length}`;
  const currentStep =
    state.board.tinyCoreIdea !== null
      ? {
          label: "Tiny idea",
          text: state.board.tinyCoreIdea,
        }
      : state.board.checkQuestion !== null
        ? {
            label: "Current question",
            text: state.board.checkQuestion,
          }
        : {
            label: "Current knot",
            text: state.board.currentKnot,
          };

  if (mode === "fullscreen") {
    return {
      mode,
      topic: state.topic,
      revisionLabel: `Revision ${session.revision}`,
      progressLabel,
      currentStepLabel: currentStep.label,
      currentStepText: currentStep.text,
      actions: ["open-pip", "return-inline"],
      showBoard: true,
      showTimeline: true,
    };
  }

  if (mode === "pip") {
    return {
      mode,
      topic: state.topic,
      revisionLabel: `Revision ${session.revision}`,
      progressLabel,
      currentStepLabel: currentStep.label,
      currentStepText: currentStep.text,
      actions: ["open-fullscreen"],
      showBoard: false,
      showTimeline: false,
    };
  }

  return {
    mode,
    topic: state.topic,
    revisionLabel: `Revision ${session.revision}`,
    progressLabel,
    currentStepLabel: currentStep.label,
    currentStepText: currentStep.text,
    actions: ["open-fullscreen"],
    showBoard: false,
    showTimeline: false,
  };
}

export function reconcileLearningSession(
  mountedSession: LearningSession,
  incomingSession: LearningSession,
): SessionReconciliation {
  if (mountedSession.sessionId !== incomingSession.sessionId) {
    return {
      session: mountedSession,
      accepted: false,
      reason: "different-session",
    };
  }

  if (incomingSession.revision <= mountedSession.revision) {
    return {
      session: mountedSession,
      accepted: false,
      reason: "same-or-older",
    };
  }

  return {
    session: incomingSession,
    accepted: true,
    reason: "newer",
  };
}

export function createMountedPresentationState(
  revision: number,
): MountedPresentationState {
  return {
    requestedMode: null,
    modeRequestStatus: "idle",
    synchronizationStatus: "in-sync",
    lastSuccessfulRevision: revision,
    recoverableError: null,
  };
}

export function beginDisplayModeRequest(
  state: MountedPresentationState,
  requestedMode: RequestedDisplayMode,
): MountedPresentationState {
  return {
    ...state,
    requestedMode,
    modeRequestStatus: "pending",
    recoverableError: null,
  };
}

export function completeDisplayModeRequest(
  state: MountedPresentationState,
  requestedMode: RequestedDisplayMode,
): MountedPresentationState {
  return {
    ...state,
    requestedMode,
    modeRequestStatus: "idle",
    recoverableError: null,
  };
}

export function failDisplayModeRequest(
  state: MountedPresentationState,
  message: string,
): MountedPresentationState {
  return {
    ...state,
    modeRequestStatus: "idle",
    recoverableError: {
      source: "display-mode",
      message,
    },
  };
}

export function beginSessionRefresh(
  state: MountedPresentationState,
): MountedPresentationState {
  return {
    ...state,
    synchronizationStatus: "refreshing",
    recoverableError: null,
  };
}

export function completeSessionSynchronization(
  state: MountedPresentationState,
  revision: number,
): MountedPresentationState {
  return {
    ...state,
    synchronizationStatus: "in-sync",
    lastSuccessfulRevision: Math.max(state.lastSuccessfulRevision, revision),
    recoverableError: null,
  };
}

export function failSessionSynchronization(
  state: MountedPresentationState,
  message: string,
): MountedPresentationState {
  return {
    ...state,
    synchronizationStatus: "error",
    recoverableError: {
      source: "synchronization",
      message,
    },
  };
}
