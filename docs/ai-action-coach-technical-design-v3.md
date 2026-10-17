# AiCoach implementation: conversation and draft tools

This document describes the current replacement architecture. The filename is retained for existing documentation links; the API protocol is version 5. There is no legacy policy or model-output protocol branch.

## Ownership

New chats use Unified mode in one continuous timeline per user. Execution, Clarify and Companion remain available to the evaluation harness and share the same runtime and tools. In Unified, explicitly adopting a concrete action authorizes an unsaved draft; advice requests and explicit deferrals do not. Formal tasks still require card confirmation. `CoachPrompt` owns response guidance; the application has no question-count or response-category validator.

The application owns user authorization, draft identities and versions, concurrency, actual persistence and errors. The model cannot create formal tasks. A user-confirmed draft is saved by `ConfirmDraftCommandHandler` through the existing `AddTaskCommandHandler`.

There are no dialogue phases, strategy envelopes, intent/readiness classifications, evidence quotes, question counters, support-move enums or policy-driven regeneration. Natural replies do not use a JSON response format.

## Responsibilities and operational policy

| Layer | Owner | Responsibility |
| --- | --- | --- |
| Prompt | `CoachPrompt` | Conversation guidance and mode rules |
| Context | `ModelContextBuilder` | History selection, summary cursor validation, summary requests, context size and current draft projection |
| Runtime | `ModelTurnRuntime` | Shared model-call budget, per-call timeout, cancellation, tool loop, completion reasons and usage |
| Tool execution | `ToolExecutor` | Tool dispatch, argument-size/call limits, cancellation before execution, repeated-call-ID protection and execution result classification |
| Draft operations | `DraftTools` | Parse actual tool fields; apply each validated mutation atomically to a turn-local workspace |
| Operational policy | `OperationPolicy` | Session availability, draft/item editability and derived UI actions; no user-intent or prose classification |
| Application | `ConversationApplication` and commands | Ownership, request acceptance, locks, idempotency, task transactions, quota/usage accounting |
| Domain | `Conversation`, `ProposalSet` | Legal execution/data transitions and atomic acceptance or rejection of turn results |
| Infrastructure | Store and gateway | Storage and provider protocol adaptation |

`OperationPolicy` is used by application checks, draft operations and snapshot projection. It cannot demand a question, force a draft, rewrite a response or infer consent. Domain transition methods independently enforce essential data invariants so bypassing an application check cannot start a second running turn or record a task result outside an active save.

`ModelContextBuilder` requests summarization through a callback supplied by the runtime. It does not call the gateway independently: summaries share the same timeout, usage totals and model-call budget. Rolling summaries retain absolute dates using the first actual message time and local date-change events. `ClosingSummaryGenerator` separately makes one bounded, quota-checked call after a topic ends; its usage is accounted for and failures do not prevent the next topic.

`ToolExecutor` caches results by tool call ID within a turn. Identical repeats return the original result without repeating a mutation; changed arguments under the same ID fail. Different IDs remain distinct operations. Unknown tools, resource limits and invalid operations have diagnostic outcomes; none are converted into conversation advice.

## Execution lifecycle

The conversation exposes one completion operation, `CompleteTurn`, rather than requiring callers to apply a reply and clear busy state in a particular order:

- Matching active request and version: accept reply, tool history, drafts and summary together, then finish the request.
- Failed or cancelled request: release its running state without applying the workspace.
- Matching request but stale version: report `stale_turn`, discard the workspace and release that request.
- Late or duplicate result after another request became active: leave all current state untouched.

Cancellation is checked before tool execution, before accepting a model reply, and before application commit. Success alone adds the message ID to completed requests. Saving draft results requires `processing`; unknown item IDs and conflicting persisted task identities are rejected.

Usage accounting has a bounded 10-second cancellation token so cooperative database calls cannot indefinitely delay turn finalization. Model budget exhaustion has its own exception type; unrelated invalid operations no longer masquerade as budget failures. Technical failures remain visible operation outcomes. No new automatic whole-turn replay or business-operation retry is introduced.

## Turn execution

1. Lock the session, check ownership/version/idempotency and mark the message running. Capture immutable history and draft copies.
2. Release the lock, check the existing AI quota and run the model.
3. Supply the fixed local date/time, transcript, summary and actual draft data. Provide `create_draft`, `update_draft`, `discard_draft` and the on-demand `list_tasks` read tool.
4. Execute tools sequentially against a turn-local draft workspace. Return success or concrete parameter errors to the model. A multi-operation update is atomic. Other drafts do not block ordinary conversation or creation of a new draft.
5. For one successful draft tool call, the model may include a short `successReply` in the tool arguments. Show it only after the tool succeeds, and complete the turn without a second model call. A create or update with multiple items or changes may use this path only when the server's schedule assessment is `clear`; single-item operations retain the existing quick-reply behavior for `clear`, `incomplete` and `partial`. Missing or invalid replies, failed tools, schedule conflicts, unverified schedules and turns with multiple tool calls continue through the model loop for a final response. Reacquire the session lock and commit the reply, tool transcript and drafts together only if this is still the expected turn and version.
6. A failed/cancelled/filtered/exhausted turn commits no draft workspace or assistant success claim. Reset the busy flag even if the HTTP client disconnects. Usage includes all completed model calls, including summary calls.

Resource controls live in `AiCoachModuleOptions`: model/tool-call budgets, output tokens, context budget, timeout, topic idle threshold and retention. They do not classify or rewrite conversation content. The last allowed model call has no tools, allowing a final response after tool results.

`list_tasks` accepts an inclusive local date range of at most seven days. The application supplies the authenticated conversation owner and time zone; the model cannot choose another user. The reader reuses the Tasks module's date query, including virtual recurring occurrences, and returns only titles, local intervals, completion, due and recurrence/overdue flags. It omits descriptions and limits each result to 50 items and a small byte budget. At most two reads run in a turn. A truncated or failed result cannot establish that a time slot is free. The context builder reserves space for those read results; successful reads are marked on the corresponding visible assistant message. The model sees the full result in its current turn, while later turns retain only a short read marker and must query again for current task details.

Draft scheduling does not depend on whether the model calls `list_tasks`. After a draft tool mutation, the server checks each scheduled interval against the complete task-calendar query (including virtual recurring occurrences) and returns a schedule assessment to the model and card. It excludes completed tasks and single-time reminders from blocking intervals, uses half-open overlap boundaries, and reports calendar failures as `unverified`. Conflicts within a multi-item draft are also reported. The client shows conflicts and requires an explicit override; the confirmation handler rechecks the calendar and accepts an override only when the conflict token still matches the set the user reviewed. A changed set returns HTTP 409 with the latest snapshot. These checks are advisory because task writes outside AI Coach do not reserve time atomically. For recurring drafts, occurrences within seven days of the start date are checked, and later occurrences are not promised clear. A recurrence with no detected conflict has `partial` status.

When the user has not supplied a preferred scheduling window, the model may suggest a tentative time, and the card lets the user edit it. This release does not persist a guessed preference. Detailed model and tool payload logs remain available in the Development environment; production retains outcome and usage logs without conversation content.

The Azure adapter explicitly sends `max_completion_tokens`. The SDK cannot infer a model family from arbitrary Azure deployment names; its default output-limit mapping otherwise sends `max_tokens`, which the current deployment rejects. The experimental SDK patch API is confined to that adapter.

## History and context

The session retains original user and assistant messages and model/tool exchanges. Successful task reads retain a short tool-result marker rather than the full task list, which avoids resending stale task data on later turns. App-side edit/save/discard events also enter history so the model does not act on stale card content.

Model context is budgeted conservatively using serialized UTF-8 byte size as an upper estimate for token use. The builder subtracts the actual prompt, tool definitions and draft data before allocating space to history, so a longer user-maintained prompt triggers additional compression rather than an avoidable post-summary overflow. Older complete exchanges are summarized incrementally. Tool calls are never separated from tool results. The summary is revisable context, not an authorization source. Visible messages remain in SQL rows independently of compressed context. Summary-covered history is removed from the working payload and its summary cursor resets to zero. Current draft data is supplied independently of the summary. Each turn also receives only the immediately previous topic's closing summary as historical data; closing summaries are not chained.

A context that cannot fit within the configured resource budget fails visibly instead of silently dropping user context. Summaries remain model-generated and may lose detail; current messages and actual draft data remain available for correction.

## Drafts and persistence

A conversation holds independent drafts; each has stable IDs, a version, items and `pending`, `processing`, `completed`, `rejected` or `expired` status. Draft date/start/end fields are nullable. Missing scheduling information is valid until formal confirmation.

- `create_draft(items)` creates a pending draft.
- `update_draft(draftId, changes)` applies add/update/remove operations to unsaved items. Omitted fields are preserved; null clears optional fields. Unknown IDs and invalid times reject the whole operation. Removing all unsaved items discards the draft.
- `discard_draft(draftId)` discards a pending draft and never deletes saved tasks.
- App edits use a version-checked PUT and are visible to subsequent model turns.
- Confirmation validates all reviewed data, date/time/time-zone consistency and item ownership before accepting the command. Missing schedules are reported as `ScheduleRequired`; past starts return `ScheduleInPast` before any task write. `start_now` explicitly moves the interval to now.
- A database transaction wraps the new task batch. Failure rolls back the batch and keeps the draft editable. Previously saved item identities are not recreated.
- A command receipt hashes the complete request content, including descriptions. Reusing an ID with different content is rejected; replay returns the original result with a fresh snapshot. Retry a failed confirmation using a new command ID.
- `start_now` is a single-task confirmation that shifts the resolved interval to now and returns the focus-screen directive after successful persistence.

Working state is serialized in `AiCoachConversation.Payload` (schema v2). Visible messages and draft snapshots live in `AiCoachMessage`; saved message IDs remain stable for feedback. `SqlConversationStore` commits state, new messages and changed snapshots together, uses update-only revision checks, and cannot resurrect a deleted segment. `EndedAt` and a filtered unique user index enforce at most one open topic. The developer generated and applied the storage migration; subsequent chat endpoints, retention and UI changes require no additional migration.

## Mobile protocol

Version 5 snapshots contain:

- `conversationId`, `conversationVersion`, `mode`;
- `generationStatus` (`idle`, `running`, `failed`) and `generationError`;
- the latest 30 visible messages with stable IDs, timestamps, topic-start flags and draft snapshots;
- `artifacts[]`, each with its own version, status, payload and computed `allowedActions`;
- session actions and optional usage totals.

There is no `state`, `currentArtifact`, `assistantMessage`, blocked-reason enum or question metadata. Capability lists are computed from operation status; they are not stored dialogue state or model strategy instructions.

The mobile screen opens the existing Unified chat. An inverted `FlatList` merges snapshots with cursor-paged history by message ID, displays local Today/Yesterday/date separators and topic dividers, and loads older messages when scrolling up. Live cards use current artifact versions; historical cards are read-only and show saved/discarded/expired status. The menu starts a new topic or clears history after confirmation; the confirmation explains that ratings and optional feedback details remain. Past schedules show an edit-before-save warning. Server snapshots reconcile retries and in-flight work; a changed conversation ID switches the hook to the new topic. Query invalidation uses `['aiCoach', 'chat', 'messages']`; clear cancels pending page requests and empties cached history. A lifecycle counter prevents late open responses from restoring deleted messages.

## Chat API and topic boundaries

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/api/ai-coach/chat?timeZoneId=Australia/Perth` | Open snapshot; refresh pending draft schedule assessments older than ten minutes |
| GET | `/api/ai-coach/chat/messages?before=&limit=30` | User-scoped timeline, newest first; maximum page size 100 |
| POST | `/api/ai-coach/chat/topics` | JSON `{ "timeZoneId": "Australia/Perth" }`; end old topic and return the new empty snapshot; reuse an empty topic |
| DELETE | `/api/ai-coach/chat` | Hard-delete segments, messages and traces; keep feedback; return 409 while busy |

Timeline paging uses `(CreatedAt DESC, Id DESC)` with an opaque base64url cursor. Both comparisons execute in SQL Server, including its GUID ordering, so equal timestamps and inserts between pages do not duplicate or skip original rows. Timeline draft actions are empty. Existing per-conversation routes remain; foreign/deleted IDs return 404 and ended IDs return 409, including snapshot/feedback routes. The legacy start route reuses the open topic instead of creating duplicate open rows.

`ConversationSegments` ends a nonempty idle topic only when the last-message gap is strictly greater than `TopicIdleHours` (default 8). End runs under the segment lock, refuses a running turn/save, expires pending drafts and saves their originating message snapshots. Closing summary generation happens after releasing state locks. The new turn receives the new ID and no expired live drafts. Crossing local midnight records a data event before the next user turn and does not split an active topic.

## Retention and clear

`AiCoachTraceRetentionService` runs hourly. `MessageRetentionDays` defaults to 180; message timestamps determine expiry. It deletes empty ended topics and their traces, plus empty open topics older than one hour. Diagnostic traces independently default to 30 days. Retention skips segments with active work and retries them on a later run.

Deleting rows also removes old working-state copies: rolling/closing summaries reset, drafts from expired messages are removed, receipts are removed or rebuilt with retained snapshots, and only bounded recent retained text rebuilds model context. Revision-conditioned cleanup updates protect concurrent sends before deleting message rows. Current pending drafts remain separately available to the model. Clear uses a transaction and refuses active work; it deletes segments before traces so late trace recording cannot reintroduce cleared content. Trace writes check segment existence in the same transaction as insertion. Account deletion uses the existing user cascades, including feedback.

Website privacy-policy work is deferred at the user's request. The existing settings link remains the existing public website link; this change adds no new policy page or policy menu entry.

## Verification

The current evaluation suite and commands are documented in [AI Coach evaluation](ai-action-coach-evaluation.md). It includes real application-level model scenarios and SQL-backed scheduling boundaries; semantic quality is reviewed separately from objective assertions.

`DraftWorkflowTests` uses the real draft tools/store/handlers and a Testcontainers SQL Server. It covers atomic tool updates, incomplete schedules, multiple drafts, stable identities, saved-item protection, concurrent edits, ownership, confirmation replay, changed-content command IDs and transactional rollback/retry. Additional regressions cover stale/cancelled/duplicate turn completion, late results while a newer turn runs, repeated tool IDs, tool budgets, cancellation before tools and consistent policy/UI capability checks.

`CoachLiveTests` uses the actual Azure deployment and is opt-in:

```sh
AICOACH_MODEL_TESTS=1 dotnet test blotztask-test/BlotzTask.Tests.csproj --filter FullyQualifiedName~CoachLiveTests
```

Credentials are read from local development configuration, never included in test output. Without opt-in/credentials, tests are reported as skipped, not passed. Live checks cover natural replies in all three modes, a historical draft correction and continuity after summary compression. They do not require a question count, response category or exact phrasing.

## Operational limits

Conversations and receipts survive process restarts through SQL storage. In-process user/segment locks coordinate one instance; revision checks and the filtered unique index protect several instances. There is no durable distributed lock or automatic whole-turn retry. A process crash after a formal task transaction commits but before its result is recorded can still leave a confirmation retry at risk of duplication; interrupted processing is released after five minutes. Closing summaries are model-generated and can lose details or fail; the new topic still opens without them.
