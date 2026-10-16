# AI Coach conversation history — design

Status: proposed. This document describes the planned change; nothing here is implemented yet.

## Problem

AI Coach conversations live only in `InMemoryConversationStore` (`IMemoryCache`, 24-hour absolute expiry):

- Every deploy, restart or app-pool recycle drops all in-progress conversations and unsaved drafts.
- A second App Service instance would not find the session and return 404.
- The mobile client starts a new conversation every time the AI screen opens or the mode changes, and never keeps the `conversationId`. Users cannot return to an earlier conversation.

## Goals

- Conversations survive process restarts and work across instances.
- Users can browse, reopen, continue and delete their past conversations.
- Retention is bounded and the deletion behaviour is predictable.

## Product rules

| Rule | Value |
| --- | --- |
| Retention | Deleted after **30 days without activity** (sliding; any message or draft action resets it) |
| Scope | One list for all modes; each row shows its mode; optional mode filter |
| Per-user cap | **50** conversations; the least recently active are removed first |
| Reopen | A reopened conversation can be continued, not only viewed |
| Delete | Single delete and "clear all"; hard delete |
| Feedback on delete | **Thumbs up/down feedback is kept** when a conversation is deleted |
| Title | First user message, truncated to 30 characters; no model-generated title or rename yet |
| Empty conversations | Never shown in the list |

## Storage

Persist the whole `Conversation` aggregate as JSON in SQL Server, with a few projected columns for listing and cleanup. Redis was considered and rejected: it adds a paid resource, connection configuration and a local/test dependency while the data volume (one small row per conversation) fits the existing database.

### Table `AiCoachConversation`

| Column | Type | Notes |
| --- | --- | --- |
| `Id` | `uniqueidentifier` PK | Conversation ID |
| `UserId` | FK → `AppUser`, **cascade delete** | Same as `AiCoachFeedback` / `AiCoachTraceEvent` |
| `Mode` | `nvarchar(20)` | |
| `Title` | `nvarchar(60)` null | First user message, truncated by text element |
| `LastMessagePreview` | `nvarchar(120)` null | |
| `MessageCount` | `int` | `0` = empty conversation |
| `HasPendingDraft` | `bit` | List badge |
| `CreatedAt`, `LastActivityAt` | `datetimeoffset` | `LastActivityAt` drives ordering and retention |
| `Revision` | `int` | Optimistic concurrency token |
| `SchemaVersion` | `int` | Payload format version |
| `Payload` | `nvarchar(max)` | Serialized `Conversation` |

Indexes: `(UserId, LastActivityAt DESC)` for the list and cap; `(LastActivityAt)` for cleanup. The list query reads projected columns only and never deserializes `Payload`.

### `SqlConversationStore : IConversationStore`

- Registered as a singleton; opens a scoped `BlotzTaskDbContext` per operation (same pattern as `AiCoachTraceRecorder`), so store writes never join a handler's task transaction.
- `CreateAsync` inserts. `SaveAsync` is **update-only**, conditioned on the `Revision` that was loaded, and increments it. Zero affected rows means the row was deleted or changed elsewhere and is reported as not-found/conflict. A deleted conversation can therefore never be recreated by a late save or a client retry.
- The loaded revision is tracked per `Conversation` instance inside the store (`ConditionalWeakTable`), so the domain model does not carry persistence state.
- `FindAsync` treats rows past retention as missing.
- `AcquireLockAsync` keeps the existing in-process striped semaphores. With one instance that serializes per conversation; the revision check protects correctness with several instances. `sp_getapplock` can replace the semaphore if scale-out becomes common.
- `InMemoryConversationStore` stays for unit tests and the evaluation harness.

### Serializing the aggregate

- `[JsonInclude]` on private setters (`Conversation.Version`, `RunningTurnId`, `GenerationError`, `Summary`, `SummarizedMessageCount`; `ProposalSet.Version`, `Status`, `Proposals`, `SaveError`, `Schedule`).
- `JsonObjectCreationHandling.Populate` on the getter-only collections of `Conversation`.
- `[JsonPolymorphic]` / `[JsonDerivedType]` on `GatewayMessage` and its four subtypes.
- `CommandReceipt.Result` changes from `object?` to `ConfirmDraftResultDto?`. Only confirmation replays read it; discard replays already return the current snapshot.
- Enums are written as strings. `SchemaVersion` starts at 1; a payload with an unknown version is treated as missing rather than partially read.

## Lifecycle changes

### Interrupted work

A crash between `BeginTurn` and `CompleteTurn` would otherwise leave `RunningTurnId` set forever.

- Add `RunningTurnStartedAt`. When a conversation is loaded and its turn started more than `ModelRequestTimeoutSeconds × MaxModelCallsPerTurn + 2 minutes` ago, the turn is released with error `interrupted`. A turn still running past that bound already exceeds every budget; if it completes later, `CompleteTurn` returns `NoLongerActive` and changes nothing.
- Add `SavingStartedAt` to `ProposalSet`. A draft in `processing` for more than 5 minutes returns to `pending` with `SaveError = "TaskPersistenceInterrupted"`. Known risk: if the process died after the task transaction committed but before the result was recorded, a retry can create a duplicate task. This window already exists today and is now at least recoverable.

### Cleanup

`AiCoachTraceRetentionService` runs hourly (currently daily) and also deletes:

- conversations with `LastActivityAt` older than 30 days;
- conversations beyond each user's 50 most recently active;
- empty conversations (`MessageCount = 0`) older than 1 hour.

`StartConversation` still writes a row immediately so the existing flow (start → snapshot → first message) is unchanged. Empty rows are hidden from the list and removed by cleanup, which keeps "never show empty conversations" without a separate pending-session cache.

### Returning after a gap

- `ConversationMessage` gains an optional `CreatedAt`.
- If the previous message is more than 6 hours old, `SendAsync` appends a system history event before the new turn, in the same form as `RecordDraftEvent`: the user returned at the given local time, and earlier relative dates ("today", "tomorrow") refer to when those messages were sent. The current local time is already supplied on every turn.
- Opening a conversation re-runs `DraftScheduleChecker` for pending drafts whose assessment is older than 10 minutes.
- The draft card shows "This time has passed — edit it before saving" when a pending item's local start is in the past. Confirmation already rechecks everything server-side.

### Options

`ConversationLifetimeHours` is replaced by `ConversationRetentionDays = 30` and `MaxConversationsPerUser = 50` in `AiCoachModuleOptions`.

## API

Existing endpoints are unchanged. `GET /api/ai-coach/conversations/{id}` doubles as "open conversation" and keeps returning 404 for expired, deleted or foreign conversations.

| Method | Route | Behaviour |
| --- | --- | --- |
| `GET` | `/api/ai-coach/conversations?mode=&cursor=&limit=20` | Current user's non-empty conversations, newest activity first, cursor-paged; summary fields only |
| `DELETE` | `/api/ai-coach/conversations/{id}` | Deletes the conversation and its `AiCoachTraceEvent` rows; keeps `AiCoachFeedback`; 409 while a turn or save is running; 404 if not owned |
| `DELETE` | `/api/ai-coach/conversations` | Deletes all of the current user's conversations and their trace events; keeps feedback |

List item: `conversationId`, `mode`, `title`, `lastMessagePreview`, `messageCount`, `hasPendingDraft`, `createdAt`, `lastActivityAt`.

Feedback rows keep their `ConversationId` and `AssistantMessageId` after deletion. The diagnostic SQL in `ai-coach-feedback-diagnostics.md` still returns the rating, reason and detail, but the joined trace events are gone, so the reply text is no longer available for a deleted conversation.

## Mobile

- **Entry**: a history button (clock icon) in the AI home header opens a new `ai-coach-history` route.
- **History screen**: rows grouped by Today / Yesterday / Earlier with mode tag, title, preview, relative time and a dot for pending drafts. Swipe to delete with confirmation (existing swipeable pattern from the notes and task lists), "Clear all" in the header menu, pull to refresh, infinite scroll, and an empty state with "Start a new conversation". A footer line states the 30-day retention.
- **Reopen**: navigate to `ai-home?conversationId=…`. `useAiCoachChat` calls `fetchSnapshot` instead of `startConversation` when an ID is supplied; the mode comes from the snapshot and the mode cards lock to it. A "New conversation" action starts a fresh one.
- **Missing conversation**: a 404 while opening or using a conversation shows "This conversation is no longer available" and returns to the list (history entry) or starts a new conversation (normal entry).
- **Cache**: React Query key `['aiCoach', 'conversations', mode]`, invalidated after send, confirm, discard and delete.
- **i18n**: new `en` / `zh` strings in `ai-coach.json`.

## Privacy

- The privacy policy must state that AI Coach conversations are stored for up to 30 days of inactivity and can be deleted by the user at any time.
- Account deletion removes conversations through the `AppUser` cascade, as it already does for feedback and trace events.
- User deletion removes the conversation and its trace events immediately. Feedback (rating, optional reason and detail) is retained for quality review.

## Delivery plan

Each step can be reviewed and merged on its own. Steps 1–3 already remove restart data loss, even if the history UI ships later.

| Step | Change | Depends on |
| --- | --- | --- |
| 1 | Make `Conversation` serializable; add `SchemaVersion`; round-trip test | — |
| 2 | `AiCoachConversation` entity and `SqlConversationStore`; switch registration. **EF migration generated and applied by the developer** | 1 |
| 3 | Interrupted turn/save recovery; retention, cap and empty-row cleanup | 2 |
| 4 | List and delete endpoints; integration tests for ownership, paging, trace removal and feedback retention | 2 |
| 5 | Gap notice, schedule refresh on open, past-time warning | 2 |
| 6 | Mobile history screen, reopen flow, 404 handling, i18n | 4 |
| 7 | Privacy policy text; update `ai-action-coach-technical-design-v3.md` (operational limits and the stale "no migrations" statement) | all |

## Tests

Following `.claude/skills/writing-tests/SKILL.md` (xUnit, FluentAssertions, SQL Server Testcontainers, no mocks):

- Serialization round trip preserves messages, history (all gateway message types), drafts, receipts, summary and versions.
- Store: update-only save cannot recreate a deleted conversation; a stale revision is rejected; expired rows are not returned.
- Recovery: an abandoned turn and an abandoned save are released after their bounds and not before.
- Cleanup: retention, per-user cap and empty rows; other users are untouched.
- API: list paging and ownership; delete removes trace events and keeps feedback; delete while busy returns 409.
- Existing `DraftWorkflowTests` keep running on the in-memory store; selected cases run on `SqlConversationStore` as well.

## Out of scope

- Model-generated titles, rename and search.
- Exporting conversations.
- Durable cross-instance locking beyond the revision check.
