# AI Coach conversation history — design

Status: implemented through steps 1–7 and the technical-document update in step 8. The developer generated and reported applying `20261016143306_AddAiCoachMessageTimelineAndSegments`. Chat API, hourly retention, mobile single-chat history and i18n are implemented; no further schema migration is needed. Website privacy-policy work and a separate policy entry were excluded after the user asked to skip them. SQL regression checks, mobile lint and iOS bundle export are validated; device gesture testing remains manual.

## Problem

AI Coach conversations lived only in `InMemoryConversationStore` (`IMemoryCache`, 24-hour absolute expiry):

- Every deploy, restart or app-pool recycle dropped all in-progress conversations and unsaved drafts.
- A second App Service instance would not find the session and returned 404.
- The mobile client starts a new conversation every time the AI screen opens or the mode changes, and never keeps the `conversationId`. Users cannot see anything they said before.

## Goals

- Conversations survive process restarts and work across instances.
- AI Coach is one continuous chat per user, like a messaging app: opening it shows the latest messages, scrolling up loads older ones, and dates separate the days.
- The model reads only recent messages plus summaries of earlier ones, so context stays bounded however long the chat gets.
- Retention is bounded and users can clear their history.

## Product rules

| Rule | Value |
| --- | --- |
| Entry | Opening AI Coach shows the chat at its latest message; there is no conversation list |
| Mode | Always `Unified`; the mode cards are removed. `AiCoachMode` and the `Mode` column stay so other modes can return |
| Unified drafts | Explicitly adopting a concrete action authorizes an unsaved draft. Advice requests, positive reactions alone and explicit requests to defer drafts do not. Saving tasks still requires card confirmation |
| Scroll back | Older messages load as the user scrolls up, with a date separator (Today / Yesterday / 12 Oct) whenever the local day changes |
| Topics | A new topic starts when a message arrives **more than 8 hours** after the previous one, or when the user taps "New topic". A thin divider marks it in the chat |
| Old drafts | Draft cards in history are read-only and show Saved / Discarded / Expired |
| Clear | "Clear chat history" in the header menu; hard delete; **thumbs up/down feedback is kept** |
| Retention | Each message is deleted **180 days** after it was sent |

## Model

The visible chat is one timeline. Behind it, each topic is one `Conversation` aggregate (a **segment**). The existing turn, draft, confirmation, feedback and summary logic keeps working per segment, unchanged.

- A user has at most one open segment (`EndedAt IS NULL`).
- Starting a segment ends the previous one: its pending drafts become expired and a closing summary is generated (see Model context).
- An ended segment is read-only. Sending, confirming or editing against it returns 409.

### Segment boundaries

- **Idle gap**: `SendAsync` compares the open segment's last message time with now. If more than `TopicIdleHours` (8) have passed, the segment is ended and the message goes to a new one. The client never decides this.
- **New topic**: `POST /api/ai-coach/chat/topics` ends the open segment. The next message starts a new one.
- An empty open segment is reused instead of being ended.

An active conversation is never split at midnight, so one segment can span two local days (22:00 → 01:00). When a message's local date differs from the previous message's, `SendAsync` appends a system history event before the new turn, in the same form as `RecordDraftEvent`: the date has changed, and earlier relative dates ("today", "tomorrow") refer to when those messages were sent. The current local time is already supplied on every turn.

Date separators in the chat follow the local day of each message and are independent of segments.

## Model context

Each turn sends:

1. The `Unified` system prompt.
2. The **closing summary of the previous segment**, if any, as data, with absolute dates.
3. The current segment's rolling summary (`Summary` / `SummarizedMessageCount`, existing).
4. The current segment's recent history (`ModelContextBuilder`, existing).
5. The current local time (existing).

Closing summary:

- Generated once, when a segment ends, by a single model call over the segment's existing `Summary` plus its unsummarized history. Target length about 300 words. It records what was planned, decided or left open, with absolute dates instead of relative ones.
- Stored on the ended segment as `ClosingSummary`. Only the most recent ended segment's summary is read; summaries are not chained, so drift does not accumulate across days.
- If generation fails, the segment still ends and the next one starts without it. The failure is logged and does not block the user's message.

Date grounding uses the first actual message time, not the empty segment's creation time: opening an empty chat days before speaking must not change the meaning of "tomorrow". Rolling-summary input also carries this reference time and preserves absolute dates through date-change events. Closing-summary calls have the configured model-request timeout and use the existing quota and token accounting services.

Expired drafts are not passed into the new segment. The closing summary mentions them so the user can ask for them again.

A user-level long-term memory (preferences, long-running goals) is out of scope for this change.

## Storage

Persist each segment's working state as JSON in SQL Server, and store the visible messages as rows. Redis was considered and rejected: it adds a paid resource, connection configuration and a local/test dependency while the data volume fits the existing database.

### Table `AiCoachConversation` (one row per segment)

| Column | Type | Notes |
| --- | --- | --- |
| `Id` | `uniqueidentifier` PK | Segment (conversation) ID |
| `UserId` | FK → `AppUser`, **cascade delete** | Same as `AiCoachFeedback` / `AiCoachTraceEvent` |
| `Mode` | `nvarchar(20)` | `Unified` for new segments |
| `MessageCount` | `int` | `0` = empty segment |
| `CreatedAt`, `LastActivityAt` | `datetimeoffset` | |
| `EndedAt` | `datetimeoffset` null | **New.** Null for the open segment |
| `ClosingSummary` | `nvarchar(max)` null | **New** |
| `Revision` | `int` | Optimistic concurrency token |
| `SchemaVersion` | `int` | Payload format version |
| `Payload` | `nvarchar(max)` | Model working state: `History`, live `Drafts`, `Receipts`, `Summary`, turn state |

- **Removed**: `Title`, `LastMessagePreview`, `HasPendingDraft` (no list to show them).
- Filtered unique index on `(UserId)` where `EndedAt IS NULL` enforces one open segment per user.
- `Messages` move out of `Payload` into `AiCoachMessage`. History already covered by `Summary` is trimmed from `Payload`, so a segment's payload stays bounded.

### Table `AiCoachMessage` (new)

| Column | Type | Notes |
| --- | --- | --- |
| `Id` | `uniqueidentifier` PK | Same ID as today's `ConversationMessage.Id`, so feedback rows still match |
| `ConversationId` | FK → `AiCoachConversation`, cascade delete | Segment |
| `UserId` | `uniqueidentifier` | Timeline queries without a join |
| `Role` | `nvarchar(20)` | `User` / `Assistant` |
| `Content` | `nvarchar(max)` | |
| `TaskContextRead` | `bit` | |
| `TurnId` | `uniqueidentifier` null | |
| `CreatedAt` | `datetimeoffset` | Ordering, date separators, retention |
| `DraftSnapshot` | `nvarchar(max)` null | Draft cards produced by this assistant message, with their latest status |

Indexes: `(UserId, CreatedAt DESC, Id DESC)` for scrolling back; `(CreatedAt)` for cleanup.

`DraftSnapshot` is needed because `Conversation.AcceptReply` replaces `Drafts` on every turn, so earlier cards are otherwise lost. Confirm, edit, discard and expiry update the snapshot on the message that produced the draft. `Conversation.Drafts` keeps only the drafts the open segment can still act on.

### `SqlConversationStore : IConversationStore` (message persistence implemented, lifecycle to extend)

- Singleton; opens a scoped `BlotzTaskDbContext` per operation, so store writes never join a handler's task transaction.
- `CreateAsync` inserts. `SaveAsync` is update-only, conditioned on the loaded `Revision`, and increments it; zero affected rows is reported as not-found or conflict, so a deleted conversation is never recreated by a late save or client retry.
- The loaded revision is tracked per `Conversation` instance (`ConditionalWeakTable`), outside the domain model.
- `AcquireLockAsync` keeps the in-process striped semaphores; the revision check protects correctness with several instances.
- `SaveAsync` inserts new messages and updates changed draft snapshots in the same transaction as the segment row. Reads use a repeatable-read transaction so the payload revision and visible messages come from the same committed state.
- `FindOpenAsync(userId)` reads the one open segment. Ending uses `Conversation.End` plus the existing revision-conditioned `SaveAsync`, including expiry snapshots in the same transaction, instead of a separate store mutation path. A save against an already ended row is rejected.
- `SaveClosingSummaryAsync` updates only an existing ended segment with a null summary. It never recreates cleared data or overwrites a summary. `FindPreviousSummaryAsync` reads only the most recent ended segment before the current segment started, even when that summary is null.
- User-level in-process locks coordinate opening and boundaries separately from segment locks, avoiding nested acquisition of the same semaphore stripe. The filtered SQL index and revision condition remain the cross-instance safeguards.
- `InMemoryConversationStore` stays for unit tests and the evaluation harness.

### Serializing the aggregate (implemented)

- `[JsonInclude]` on private setters, `JsonObjectCreationHandling.Populate` on getter-only collections, `[JsonPolymorphic]` on `GatewayMessage`.
- `CommandReceipt.Result` is `ConfirmDraftResultDto?`.
- Enums are written as strings. A payload with an unknown `SchemaVersion` is treated as missing. Moving `Messages` out of the payload raises `SchemaVersion` to 2; version 1 rows are pre-release data and are dropped.

## Lifecycle

### Interrupted work (implemented)

- A turn started more than `ModelRequestTimeoutSeconds × MaxModelCallsPerTurn + 2 minutes` ago is released with error `interrupted` on load; a late `CompleteTurn` returns `NoLongerActive`.
- A draft in `processing` for more than 5 minutes returns to `pending` with `SaveError = "TaskPersistenceInterrupted"`. Known risk: if the process died after the task transaction committed but before the result was recorded, a retry can create a duplicate task.

### Ending a segment

Ending is idempotent and runs under the segment lock:

1. Wait out or refuse (409) a running turn or draft save.
2. Mark pending drafts expired, in `Drafts` and in their messages' `DraftSnapshot`.
3. Set `EndedAt`.
4. Generate `ClosingSummary` after the segment is ended, outside the lock; failure leaves it null.

### Opening the chat

- Re-runs `DraftScheduleChecker` for pending drafts whose assessment is older than 10 minutes.
- The draft card shows "This time has passed — edit it before saving" when a pending item's local start is in the past. Confirmation already rechecks everything server-side.

### Cleanup

`AiCoachTraceRetentionService` runs hourly (currently daily) and deletes:

- messages older than 180 days;
- ended segments with no remaining messages, with their trace events;
- empty open segments older than 1 hour.

### Options

`ConversationRetentionDays = 30` and `MaxConversationsPerUser = 50` in `AiCoachModuleOptions` are replaced by `MessageRetentionDays = 180` and `TopicIdleHours = 8`.

## API

Existing per-conversation endpoints (send, snapshot, confirm, edit, reject, feedback) are unchanged; the client calls them with the open segment's ID. They return 409 for an ended segment and 404 for a deleted or foreign one.

| Method | Route | Behaviour |
| --- | --- | --- |
| `GET` | `/api/ai-coach/chat?timeZoneId=Australia/Perth` | Snapshot with the latest 30 messages of the open segment; creates an empty one if none exists |
| `GET` | `/api/ai-coach/chat/messages?before=&limit=30` | Timeline across segments, newest first, cursor-paged |
| `POST` | `/api/ai-coach/chat/topics` | JSON body `{ "timeZoneId": "Australia/Perth" }`; ends the open segment and returns the new empty snapshot |
| `DELETE` | `/api/ai-coach/chat` | Deletes all of the user's segments, messages and trace events; keeps feedback; 409 while a turn or save is running |

Timeline item: `messageId`, `conversationId`, `role`, `content`, `createdAt`, `topicStart` (first message of its segment), `draftSnapshot` (read-only cards). The latest 30 messages of the open segment are also in snapshots, with timestamps, topic-start flags and draft snapshots; the client merges by message ID. Older messages, including those of a long open segment, come from the paged timeline. Snapshot message records retain their existing `id` and `text` fields; timeline records use `messageId` and `content`. Pages return `{ items, nextCursor }`; an absent next cursor means there are no older rows. Limits must be 1–100, and invalid cursors return HTTP 400.

When `SendAsync` starts a new segment after an idle gap, the response carries the new `conversationId` and the client switches to it.

`POST /api/ai-coach/conversations` stays for the evaluation harness and older clients. It reuses the user's open segment; if none exists, it creates a Unified segment rather than inserting a second open row.

## Mobile

- `ai-home` calls `GET /chat` on open instead of `startConversation`; the mode cards are removed.
- The message list is an inverted `FlatList`; `onEndReached` loads the next page of older messages. A date separator is inserted where the local day of `createdAt` changes, and a topic divider before each `topicStart` message.
- "New topic" in the header menu, next to "Clear chat history" (with confirmation).
- Historical draft cards render from `draftSnapshot` and are read-only.
- After a send that returns a different `conversationId`, the hook switches to it.
- React Query key `['aiCoach', 'chat', 'messages']`, invalidated after send, confirm, discard, new topic and clear.
- i18n: new `en` / `zh` strings in `ai-coach.json`.

## Privacy (policy changes deferred)

The user asked to skip policy work in this delivery. The existing settings website link is retained; no website content or separate policy page/menu was changed. The clear confirmation still explains that feedback is retained. The intended future policy wording is:

- The privacy policy must state that AI Coach messages are stored for up to 180 days and can be cleared by the user at any time.
- Account deletion removes segments and messages through the `AppUser` cascade, as it already does for feedback and trace events.
- Clearing removes segments, messages and trace events immediately. Feedback (rating, optional reason and detail) is retained for quality review. Feedback rows keep their `ConversationId` and `AssistantMessageId`, but the reply text is no longer available for them.

## Delivery plan

| Step | Change | Depends on |
| --- | --- | --- |
| 1 | Make `Conversation` serializable; `SqlConversationStore`; migration; interrupted-work recovery | — (done) |
| 2 | Run the existing `CoachScenarioTests` scenarios on `Unified`; fix regressions before switching users — done, with the confirmed Unified draft-adoption rule | — |
| 3 | `AiCoachMessage` table, `DraftSnapshot`, segment columns, payload v2. Code complete; migration generated and database update reported complete by the developer | 1 |
| 4 | Segments: one open per user, idle and manual boundaries, date-change notice, expiry of drafts, closing summary in model context — implemented and validated | 3 |
| 5 | `/chat` endpoints; SQL-backed checks for ownership, tied-time paging, stale schedule refresh, clear and feedback retention — implemented and validated | 4 |
| 6 | Hourly cleanup, message retention and payload pruning — implemented and validated | 3 |
| 7 | Mobile single chat, scroll back, separators, read-only cards, new topic, clear, i18n — implemented; lint and iOS bundle pass, device gestures not yet exercised | 2, 5 |
| 8 | Technical design updated. Website privacy-policy work deferred after the user asked to skip it | all |

### Step 3 migration handoff

The developer generated `20261016143306_AddAiCoachMessageTimelineAndSegments`. Its schema changes have been reviewed and the schema v1 cleanup statement below was added to `Up`. The developer subsequently reported completing the database update. The instructions below are retained for reference; do not generate a duplicate migration or rerun an update solely because these commands appear here.

From `blotztask-api/`, the developer runs:

```bash
dotnet ef migrations add AddAiCoachMessageTimelineAndSegments
```

Generated files land in `blotztask-api/Infrastructure/Data/Migrations/`. The migration should create `AiCoachMessage` with cascade deletion from its segment and timeline/retention indexes, add `EndedAt` and `ClosingSummary`, remove `Title`, `LastMessagePreview` and `HasPendingDraft`, and add the filtered unique open-segment index.

Before applying, add this statement at the start of the generated `Up` method, before the unique index is created. Per the storage decision above, schema v1 rows are disposable pre-release data; feedback remains untouched:

```csharp
migrationBuilder.Sql("DELETE FROM [AiCoachConversation] WHERE [SchemaVersion] = 1;");
```

Then the developer runs:

```bash
dotnet ef database update
```

No EF migration has been generated or applied by the agent. Integration checks use an isolated SQL Server Testcontainer and `EnsureCreatedAsync`, so they validate the EF model and store behavior, not the eventual migration. Subsequent lifecycle, endpoints, retention and mobile work is now implemented. The tests validate the EF model/store behavior, not the developer-generated migration against the application database. Rollout and device testing have not been performed by the agent.

### Validation — 16 Oct 2026

Steps 5–8 validation and implementation notes:

- SQL-backed AI Coach regression suite: 55 passed, none skipped. The 12 chat/history checks cover a 35-message open segment with a bounded snapshot, paging across segments with equal timestamps using SQL Server GUID ordering, newer inserts between pages, ownership, malformed cursors/limits, clear preserving feedback and other users, busy clear refusal, stale assessment refresh, past-time confirmation rejection, payload-copy removal, and empty-segment cleanup.
- Clear deletes parent segments before traces. Trace recording checks segment existence transactionally so an assistant trace emitted after clear cannot reintroduce the deleted text. Retention first wins a revision-conditioned update, then removes the corresponding rows in that transaction; a concurrent operation that changes the revision is not pruned. Empty-segment deletion rechecks emptiness at deletion time.
- On retention, summaries reset, drafts sourced from expired messages are removed, receipt snapshots are rebuilt without old messages, and bounded retained text rebuilds model context. Busy segments are retried by a later hourly run. Ordinary save of an ended segment remains forbidden; retention performs its separate conditional internal update.
- AI Coach ESLint passes. Full-project TypeScript reports errors in `react-native-calendars` sources and an existing widget hook; there are no diagnostics in the AI Coach files. Those unrelated files/dependencies were not altered to suppress errors.
- The iOS JavaScript/Hermes bundle exports successfully to a temporary directory. This verifies bundling; native scrolling, keyboard behavior and device interactions have not been manually exercised.
- Mobile clear cancels in-flight history requests, clears its cached pages and guards against stale open responses with a lifecycle counter. Historical cards and feedback controls are read-only; copying an older reply remains available. The account logout hook already clears the shared query cache.
- Privacy-policy work was omitted following the user's request. No policy page/menu entry or website update is included; clear still explicitly states that thumbs up/down feedback and submitted reasons/details are retained.


Step 4 validation:

- Final SQL-backed persistence, segment and draft workflow regression run: 43 passed, none skipped. Added checks cover strictly greater than 8 hours (including a one-tick boundary), local midnight versus UTC midnight, empty segment reuse, busy-topic refusal, expiry snapshots, ended-topic send/edit/confirm/discard rejection, stale store saves, concurrent opens across two store instances, and optional/latest-only closing summaries.
- All 12 Unified scenarios passed their functional assertions after the send lifecycle change. Automated semantic flags for comparison/adoption scenarios were checked against the actual requests, draft snapshots and tool calls; they do not change the confirmed Unified adoption rule.
- Real-model idle rollover and closing-summary continuity passed for both immediate first messages and first messages delayed two days after creating an empty segment. The new topic correctly answered with the expired draft's absolute ISO date, kept its live draft workspace empty, and recorded model usage. One earlier run left both summaries null after roughly the 60-second request limit; an independent rerun passed both cases. The SQL integration suite separately verifies that summary failure still ends the old segment and accepts the new message.
- The existing real-model long-history compression test passed, preserving the earlier user-provided plan identifier.
- No new entity columns, EF configuration changes or migrations were needed for step 4. The old 30-day load-time inactivity rejection was removed so a long-idle open segment remains available for server-side rollover; message cleanup and replacement retention options remain step 6 work.

Earlier steps:

- AI Coach persistence and draft workflow regression checks: 30 passed. Coverage includes transaction rollback on message insertion failure, stale revisions, save after deletion, snapshot status updates on the original message, context trimming without timeline loss, unique open segments, cascade deletion and unsupported payload versions.
- All 12 existing scenario types were run against the real model in Unified mode: 12 passed, none skipped. The invitation scenario now expects a pending draft after the user explicitly adopts the action in Unified; other modes retain their existing consent behavior.
- Semantic review exposed an incorrect claim that an unsaved draft was already in the task list. Unified prompt v2 clarified unsaved status; the subsequent full 12-scenario run passed its functional assertions and the edit/save semantic review.
- A remaining no-advice sharing response still recommended relaxing. Unified prompt v3 strengthened this constraint; the affected `listen` scenario was then repeated three times, passing both functional assertions and semantic review each time. The full 12-scenario run was on v2; this final targeted check was on v3.
- Automated semantic judgments are advisory: the final full run incorrectly flagged requested walking advice as unsolicited and an existing pending draft as unsupported. These were checked against the actual user requests, replies and tool results rather than changing correct behavior to satisfy the judge. Evaluation artifacts remain under the ignored `blotztask-test/TestResults/ai-coach-evals/` directory.

## Tests

Following `.claude/skills/writing-tests/SKILL.md` (xUnit, FluentAssertions, SQL Server Testcontainers, no mocks):

- `Unified` passes the existing scenario set.
- Serialization round trip of payload v2.
- Store: messages and snapshots are written with the segment; update-only save cannot recreate a deleted segment; stale revisions are rejected.
- Segments: a message more than 8 hours after the previous one starts a new segment, one within 8 hours does not; a segment crossing midnight gets the date-change event; only one open segment per user; ended segments reject writes; pending drafts expire on end; a failed closing summary does not block the message.
- Timeline: paging across segment boundaries, `topicStart`, ownership.
- Cleanup: 180-day message retention, empty segments, other users untouched.
- Clear: removes messages and trace events, keeps feedback, 409 while busy.

## Out of scope

- Multiple conversations, conversation list, titles, rename.
- Search in history.
- User-level long-term memory across segments.
- Exporting history.
- Durable cross-instance locking beyond the revision check.
