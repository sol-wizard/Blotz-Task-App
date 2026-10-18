# AI Coach streaming replies and review previews

The mobile client sends protocol 6 requests to
`POST /api/ai-coach/conversations/{conversationId}/messages/stream` with the same body as
the existing JSON message endpoint. The JSON endpoint remains available to older clients
and evaluation tools. Deploy the backend before releasing this mobile change.

## Events

The response uses `text/event-stream`. Each data frame contains `conversationId`, `turnId`
(the client message ID), a sequence starting at 1, `type`, and `payload`. Idle topic rollover
can change the conversation ID; the first event identifies the actual segment. SSE events
are transient, with no replay after reconnect.

| Type | Payload | Meaning |
| --- | --- | --- |
| `turn.started` | `conversationId`, `conversationVersion` | The user message and running state are durable. |
| `reply.reset` | empty object | Clear the current candidate reply. |
| `reply.delta` | `text` | Append user-visible text. |
| `review.preview` | `pendingList` (artifact or null) | Replace the whole preview after a successful review tool, including schedule checking. Null removes the preview list. |
| `turn.completed` | `conversationSnapshot`, `errorCode: null` | The turn was committed and saved; replace previews with this authoritative snapshot. |
| `turn.failed` | `errorCode`, optional `conversationSnapshot` | Discard previews. Apply the saved failure snapshot if supplied, otherwise fetch current state. |

Text is streamed from the model. Tool argument fragments are accumulated by tool index and
validated by existing tools only after the model call completes. Each successful `add_items`,
`update_items` or `remove_items` call emits a complete preview with stable item IDs. A batch
of multiple items appears together. Invalid and replayed tools emit no preview. No formal task
or note is created by a preview.

Tool-round text is temporary and cleared before tools run. The final reply or existing
`successReply` shortcut remains the only persisted assistant reply. Context summaries are
not streamed. Existing token accounting, tool budgets and whole-turn commit rules still apply.

## Mobile behavior and recovery

Text updates are batched every 75ms and rendered with the existing Markdown renderer. A
temporary reply has a blinking cursor and no feedback/copy controls. The review entry updates
its count and shows an organizing state. The modal permits viewing and expanding descriptions;
editing, removal, refresh and confirmation wait until generation finishes. Users can compose
their next message while sending remains disabled. Existing scroll-follow behavior respects
users reading older messages.

The client accepts ordered events for the matching turn, ignores duplicates, and rejects gaps
or malformed events. It reads UTF-8 incrementally and parses SSE frames independently of
network chunk boundaries. Authentication uses the existing token manager, with one refresh
on HTTP 401. A missing terminal saved snapshot triggers reconciliation, never an automatic
message resubmission. Snapshot polling resumes after a lost stream while generation is running.
The existing focus refresh also reconciles backgrounded clients.

The server sends heartbeat comments every 15 seconds, disables response buffering and flushes
each event. The client aborts after 45 seconds without incoming bytes. A client disconnect
only ends the event stream: the turn keeps running inside the same request (bounded by the
per-call model timeouts, cancelled only on server shutdown) and commits normally, and later
events are dropped. The client shows a reconnecting state and polls the snapshot until the
saved reply arrives; it does not report a send failure while the server is still generating.
The JSON endpoint keeps its existing request-cancellation behavior.
Navigation/unmount aborts the stream and clears pending UI updates. No database migration,
event persistence, or new package is required.

## Deployment checks

Confirm that ingress/proxy buffering is disabled and timeouts permit the response stream.
Device verification should cover Chinese Markdown, a mixed task/note batch appearing before
turn completion, updating/removing items, reading older messages during generation, a dropped
connection, and a saved result whose terminal event was lost. Full-project TypeScript checking
currently also reports unrelated errors in react-native-calendars and the widget hook.
