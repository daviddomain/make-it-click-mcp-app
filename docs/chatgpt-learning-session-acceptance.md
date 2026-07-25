# ChatGPT learning-session acceptance

Use this bounded procedure to validate the host-controlled parts of the final
learning-session workflow. Automated tests remain authoritative for session
revisions, conflict handling, reconciliation, presentation hierarchy, and tool
viewlessness. This procedure checks only behavior that depends on the real
ChatGPT host.

Do not automate ChatGPT private DOM selectors or internal endpoints. Record the
date, host, observed results, and exact session id. A prior spike result is not
evidence for the current build.

## Preconditions

1. Use the repository root and a clean build of the branch under test.
2. Run `npm test` and `npm run build`.
3. Use a ChatGPT account that can add a temporary developer app.
4. Close unrelated copies of this project's DevTools or tunnel.
5. Record the current project-related processes:

   ```powershell
   Get-CimInstance Win32_Process |
     Where-Object { $_.CommandLine -match 'make-it-click-mcp-app|skybridge' } |
     Select-Object ProcessId, ParentProcessId, Name, CommandLine
   ```

## Optional bounded local DevTools check

Run `npm run dev` in the foreground. Use the URL printed by Skybridge; do not
assume a fixed port.

1. Invoke `start_learning_canvas` and confirm that the compact launcher renders.
2. Invoke one valid update, one stale update, and one missing-session read.
3. Confirm that the valid update advances once, the stale update does not
   mutate the session, and the missing read returns
   `learning_session_not_found`.
4. Stop the foreground command with `Ctrl+C`.

DevTools can verify tool results and local rendering. It cannot prove ChatGPT
transcript placement, display-mode negotiation, PiP availability, surrounding
narration, or focus behavior in the ChatGPT shell.

## Start the bounded tunnel

The tunnel is acceptance-only; it is not the default development workflow.
Start it from PowerShell and retain its exact wrapper PID:

```powershell
$tunnelProcess = Start-Process `
  -FilePath "npm.cmd" `
  -ArgumentList "run", "dev:tunnel" `
  -PassThru `
  -NoNewWindow
$tunnelProcess.Id
```

Wait only until Skybridge prints the temporary MCP endpoint. Add that endpoint
as a temporary developer app in ChatGPT and select it for the following
messages. Do not deploy the app.

## Exact three-answer script

### Launch

Send:

```text
Use the Make It Click app and call start_learning_canvas exactly once for a learning session about the JavaScript event loop. Set confusion to: "I do not know why setTimeout(callback, 0) still waits." Keep surrounding narration to one short sentence. After the tool returns, tell me the session id and revision, but do not start another canvas.
```

Record the returned id as `<SESSION_ID>`. Expected state: revision `1`, one
compact inline launcher, and no other large learning canvas.

Open fullscreen with the launcher's button. Confirm that the existing surface
changes mode rather than adding another transcript widget.

### User answer 1

Replace `<SESSION_ID>` and send:

```text
For learning session <SESSION_ID>, my answer is: "The current call stack must finish before the timer callback can run." Call update_microturn with expectedRevision 1, mark the active step understood, and add exactly one next microturn. Use this tiny idea: "A timer callback can run only after the current call stack is empty." Ask exactly this check question: "What runs before the timer callback?" Do not call start_learning_canvas. Keep narration to one short sentence and then wait.
```

Expected server revision: `2`. The transcript must not gain another large
canvas. In the existing surface choose **Refresh latest** and confirm revision
`2`.

### User answer 2

Send:

```text
For learning session <SESSION_ID>, my answer is: "The current call stack runs first." Call update_microturn with expectedRevision 2, mark the active step understood, and add exactly one next microturn. Use this tiny idea: "A zero-millisecond delay makes a callback eligible; it does not interrupt running JavaScript." Ask exactly this check question: "Why is a zero-millisecond timer still delayed?" Do not call start_learning_canvas. Keep narration to one short sentence and then wait.
```

Expected server revision: `3`. Refresh the existing surface and confirm
revision `3`, with no new large canvas.

Request PiP from fullscreen. If ChatGPT offers PiP, confirm that it shows only
the topic, current tiny idea or question, compact progress, revision, refresh,
and return-to-fullscreen controls. If the host rejects or coerces PiP, record
the actual result and confirm that the existing mode stays usable.

### User answer 3

Send:

```text
For learning session <SESSION_ID>, my answer is: "The callback waits because queued work cannot run until the current stack is empty." Call update_microturn with expectedRevision 3, mark the active step understood, and add exactly one teach-back microturn. Use this tiny idea: "Execution order depends on the current stack and queued work, not only on the timer delay." Ask exactly this check question: "In one sentence, why does setTimeout(callback, 0) still wait?" Do not call start_learning_canvas. Keep narration to one short sentence and then wait.
```

Expected server revision: `4`. Refresh the same active surface, return to
fullscreen if needed, and confirm revision `4`.

## Error recovery check

Send one deliberate stale update:

```text
For learning session <SESSION_ID>, call update_microturn with expectedRevision 1 and userAnswer "Deliberate stale acceptance check." Do not call start_learning_canvas and do not retry automatically.
```

Pass when the tool returns `stale_revision` with current revision `4`, the
existing surface remains usable, and **Refresh latest** still shows revision
`4`. If a real host mode request is rejected during the run, also confirm the
visible recoverable mode error; do not attempt to force a private host failure.

## Manual validation matrix

Mark every row `Pass`, `Fail`, or `Not observable`, and add concise evidence.
`Not observable` is never promoted to `Pass`.

| Area | Deterministic checkpoint |
| --- | --- |
| Inline | Exactly one compact launcher appears after the single start call. |
| Fullscreen | The same session surface opens as the active workspace; no second large canvas appears. |
| PiP | PiP is compact and can return to fullscreen, or host rejection/coercion is recorded while the current surface stays usable. |
| Transcript growth | Three viewless updates and the stale update add no new large canvas widgets. |
| Revision synchronization | Explicit refreshes show revisions 2, 3, and 4; the stale update leaves revision 4 unchanged. |
| Narration | Each update has no more than one short surrounding assistant sentence, or the excess host narration is recorded. |
| Keyboard and focus | Tab reaches every visible mode, refresh, disclosure, and interaction control; Enter/Space activates buttons; focus remains visible after mode changes. |
| Accessibility | Buttons have spoken names, pending/error changes are announced, headings are ordered, and controls retain labels. |
| Overflow | Inline, fullscreen, and PiP have no horizontal overflow; fullscreen has one deliberate vertical scroll surface and no nested scroll trap. |
| Error recovery | The stale conflict is visible/recoverable, refresh still works, and any observed host mode rejection does not blank the surface. |
| Cleanup | The tunnel and every task-started child process are stopped and the post-run process check matches the baseline. |

## Host-controlled outcomes and limits

ChatGPT, not application code, controls:

- whether fullscreen or PiP requests are accepted, rejected, or coerced;
- transcript placement, status UI, reasoning indicators, and surrounding
  narration;
- iframe lifecycle, focus restoration across host mode changes, and effective
  host-provided max height and safe-area values;
- temporary developer-app connection behavior and tunnel reachability.

The application can request a mode, render bounded layouts from reported host
data, keep update/read tools viewless, expose recoverable errors, and reconcile
only newer revisions. It cannot guarantee the host outcomes above. Session
storage is process-local; persistence, authentication, and cross-device
recovery are follow-up work only.

## Evidence record

Copy this block into the issue or pull request and fill it with observations:

```text
Date / ChatGPT host:
Commit:
Session id:
Revisions observed: 1 -> 2 -> 3 -> 4
Inline:
Fullscreen:
PiP:
No repeated large canvas:
Narration:
Keyboard/focus:
Overflow:
Stale error recovery:
Cleanup:
Overall: Pass | Fail
```

## Recorded acceptance run

The Issue 31 acceptance script was run in ChatGPT on 2026-07-25 against this
branch through a temporary tunnel and developer app.

- Session: `8c528a0d-7f9b-4e91-8fb5-02fcea2939d4`
- Revision progression: `1 -> 2 -> 3 -> 4`
- Widget identity: one iframe throughout launch, all three updates, refreshes,
  presentation changes, and stale-revision recovery
- Presentation: inline, fullscreen, and picture-in-picture all rendered the
  same latest session; inline and picture-in-picture had no overflow, and
  fullscreen used one vertical scroll container without horizontal overflow
- Keyboard: presentation and refresh controls were reachable by Tab and showed
  a visible focus ring; collapsible summaries remained keyboard-focusable
- Stale revision: an update using `expectedRevision: 1` at revision 4 returned
  the expected conflict, was not retried, and refresh remained at revision 4
- Surrounding narration: concise launch/update/stale-result text remained
  outside the widget and did not duplicate the learning canvas
- Result: pass

Host-controlled observations:

- ChatGPT requested one-time confirmation before the third update.
- Presentation chrome and the exact amount of surrounding assistant prose are
  host-owned and may vary between ChatGPT versions.
- The temporary developer app and tunnel were removed after the run.

## Cleanup

Remove the temporary developer app connection, then stop only the recorded
tunnel wrapper and any verified task-started child PIDs:

```powershell
Stop-Process -Id $tunnelProcess.Id
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -match 'make-it-click-mcp-app|skybridge' } |
  Select-Object ProcessId, ParentProcessId, Name, CommandLine
```

If a task-started child remains, inspect its command line and stop that exact
PID with `Stop-Process -Id <PID>`. Do not stop unrelated Node, browser, or MCP
processes. The run is complete only after the final process list matches the
baseline.
