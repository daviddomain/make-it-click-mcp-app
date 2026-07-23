# Issue #27: Fullscreen/PiP learning-session spike

Date: 2026-07-23

Decision: **Conditional Go**

Issue #28 may proceed in its own ChatGPT/Codex session. The condition is that
the production design keeps one view-backed launcher, uses viewless mutation
tools, and treats explicit refresh as the initial synchronization contract.
Push-style synchronization and complete suppression of host narration are not
proven.

## Tested versions and hosts

- Node.js `24.16.0`
- npm `11.13.0`
- `skybridge@1.0.2`
- `@skybridge/devtools@1.0.2`
- ChatGPT web with a Plus account, observed on 2026-07-23
- ChatGPT did not expose a stable host build number in the tested UI

No dependency upgrade was required. Skybridge 1.0.2 already exposes
`useDisplayMode`, app-callable tools, tool visibility, and structured tool
results needed by this spike.

Official API references checked:

- [OpenAI display modes](https://developers.openai.com/apps-sdk/build/chatgpt-ui)
- [OpenAI widget state](https://developers.openai.com/apps-sdk/build/state-management)
- [OpenAI Apps SDK reference](https://developers.openai.com/apps-sdk/reference)
- [Skybridge host context](https://docs.skybridge.tech/guides/host-environment-context)
- [Skybridge state management](https://docs.skybridge.tech/guides/managing-state)
- [Skybridge `useCallTool`](https://docs.skybridge.tech/api-reference/use-call-tool)

## Prototype shape

The spike deliberately uses:

1. one view-backed `start_learning_session_spike` tool;
2. one viewless `advance_learning_session_spike` tool callable by the model and
   widget;
3. one app-only, viewless `read_learning_session_spike` tool;
4. an ephemeral in-memory map keyed by a stable session id;
5. a monotonically increasing revision inside a typed session envelope.

The widget requests host modes through `useDisplayMode`. The active surface
does not receive server mutations automatically. It reaches the latest
revision by calling the app-only read tool when the user chooses
`Refresh latest`. This is the least invasive mechanism verified in the real
host.

No browser fetch is needed for synchronization. The widget uses the ChatGPT
tool bridge. The view declares only the Google Fonts resource domains; during
development Skybridge adds its own tunnel origin to the generated resource,
connect, and base-URI metadata. The real-host run used developer mode with CSP
enforcement off, so production-like CSP enforcement remains a follow-up check.

## Exact real-host sequence

The tunneled MCP endpoint was connected as a temporary developer app. The
tunnel URL and generated app ids are intentionally not retained because they
are ephemeral.

### Launch

```text
Use the Make It Click Issue 27 Spike app and call start_learning_session_spike for one temporary learning session about React derived state. Set confusion to: "I am unsure whether itemCount belongs in state." Do not call the normal canvas tool.
```

Observed:

- one compact inline widget;
- session id
  `issue-27-dcb90814-7e38-45cc-acc4-04289e48eda4`;
- revision 1, mode `inline`, synchronization `in-sync`.

The inline `Request fullscreen` action was accepted. ChatGPT reported
`fullscreen`, and the same iframe rendered the plain workspace at revision 1.

### Turn 1: direct widget interaction

The `Run direct-widget turn` button called the viewless update tool with a
deterministic answer and next microturn.

Observed:

- revision advanced from 1 to 2;
- mode remained `fullscreen`;
- the board and timeline updated in place;
- no second large widget was appended.

The fullscreen `Request PiP` action was accepted. ChatGPT reported `pip`, and
the same session rendered a compact PiP companion at revision 2.

### Turn 2: ChatGPT composer

```text
For spike session issue-27-dcb90814-7e38-45cc-acc4-04289e48eda4, my answer is: changing items should recalculate itemCount. Use the Make It Click Issue 27 Spike app and call advance_learning_session_spike with source composer, add one next microturn, do not launch another widget, and keep narration to one short sentence.
```

Observed:

- the viewless tool advanced the server to revision 3;
- no second large widget appeared;
- the PiP surface stayed at revision 2 until `Refresh latest`;
- the refresh moved the existing PiP surface to revision 3.

### Turn 3: ChatGPT composer

```text
For spike session issue-27-dcb90814-7e38-45cc-acc4-04289e48eda4, my answer is: itemCount is derived, not separate source state. Use the Make It Click Issue 27 Spike app and call advance_learning_session_spike with source composer, add one next microturn, do not launch another widget, and keep narration to one short sentence.
```

Observed:

- the viewless tool advanced the server to revision 4;
- no second large widget appeared;
- `Refresh latest` moved the existing PiP surface from revision 3 to 4;
- PiP -> fullscreen -> inline preserved the session id and revision 4;
- the final fullscreen timeline contained four entries and the final inline
  launcher still reported `in-sync`.

## Capability matrix

| Capability | Result | Evidence |
| --- | --- | --- |
| Real ChatGPT host | Pass | Tunneled developer app connected and exercised in ChatGPT web |
| Compact inline launch | Pass | One small revision-1 launcher rendered |
| Fullscreen request | Pass | Host accepted and reported `fullscreen` |
| PiP request | Pass | Host accepted and reported `pip` |
| Direct widget update | Pass | Revision 1 -> 2 updated the active fullscreen surface |
| Composer update | Pass | Two model-driven viewless calls produced revisions 3 and 4 |
| Three consecutive turns | Pass | Direct widget turn plus two composer turns |
| No extra large widgets | Pass | The thread retained one view-backed iframe throughout |
| Active surface reaches latest revision | Conditional pass | Reaches revision 4 through explicit app-only refresh; no push update was proven |
| Surrounding assistant narration | Conditional pass | Viewless calls avoid duplicate canvas widgets, but ChatGPT still owns reasoning/status/prose presentation |

Applying the pure spike evaluation to these observations returns
`conditional-go`, with `activeSurfaceLatestRevision` and
`surroundingNarration` as the conditional capabilities.

## DevTools versus ChatGPT

The bounded local DevTools smoke check proved that the server started, the
generated page returned HTTP 200, and the spike view was present in the build.
It did not prove display-mode negotiation or conversation behavior.

Only the tunneled ChatGPT run proved:

- actual `inline`, `fullscreen`, and `pip` host modes;
- continued use of the same session and iframe;
- model-driven viewless updates without appended large widgets;
- the need for an explicit refresh after composer-driven mutations;
- host-owned narration and status behavior.

## Limitations and consequences

- State is deliberately process-local and disappears when the spike server
  stops. Durable persistence remains out of scope.
- The active surface must refresh after a composer update. Issue #28 should
  start with this explicit refresh contract and may investigate a supported
  notification mechanism without making it a prerequisite.
- Tool descriptions and small tool results can reduce duplicate narration, but
  cannot guarantee that ChatGPT emits no surrounding prose, reasoning chip, or
  status message.
- The CSP declaration was sufficient for this developer-mode run, but Issue #28
  should repeat a bounded real-host check with developer CSP enforcement
  enabled before calling the configuration production-ready.
- Issue #28 may implement the minimal session shell around the proven
  view-backed-launch/viewless-update split.
- Issue #29 may build on the same typed envelope and revision contract.
- Issue #30 should preserve one active surface and avoid reintroducing
  view-backed update tools.
- Issue #31 should treat host narration and manual refresh as explicit product
  constraints unless a supported API is proven.
