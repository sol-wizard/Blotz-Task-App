# W4: mixed task and note review list

## Scope

Protocol 6 adds an opt-in review list to the existing AI Coach endpoints. Notes are saved into
the existing Notes module. The model can only capture and edit drafts; app confirmation performs
formal writes. `successReply`, its validation and the runtime's prewritten-reply shortcut remain
in place. This work does not implement the W5 mobile panel.

The model is instructed to capture notes only on explicit record/keep requests, including clear
references to previous content. Ordinary questions, background statements, emotions and assistant
suggestions do not authorize notes. This is model guidance, not a deterministic intent classifier;
items remain reviewable before saving. Four live-model examples passed, but production precision
and repeated-run stability have not been measured.

## Client opt-in

Send `X-Ai-Coach-Protocol: 6` on all AI Coach requests, including reads, writes and paginated
history. Missing headers and `5` preserve task-only responses. Unsupported versions return 400
with `UnsupportedProtocolVersion`.

Protocol 5 responses omit review-list artifacts from current state and message snapshots. An old
client attempting to send while a review list is pending, or edit/confirm/reject a review batch,
receives 409 `ReviewListRequiresProtocol6`. Existing task-only conversations continue using their
original tools and confirmation actions. This prevents old clients silently dropping notes.

Protocol 6 snapshots retain `artifacts` and add `pendingList` (null when no pending batch exists).
Each artifact includes `isReviewList`, `canConfirm` and `validationErrors`. Each item includes
`kind: task|note`, `persistedNoteId` and `suggestedFields: date|startTime|endTime[]`, alongside
the existing task fields. Compute the pending count from `pendingList.payload.items.length`.

`validationErrors` contains stable codes, optionally followed by `:<itemId>`: `ScheduleRequired`,
`ScheduleInPast`, `InvalidDraftFields`, `ScheduleUnverified`, `ScheduleConflict`. A conflict requires
the existing explicit conflict acceptance/token flow; `canConfirm` means confirmable without
that override. The confirm command always revalidates current data and checks the schedule.

## AI tools

Protocol 6 exposes `add_items`, `update_items`, `remove_items`, plus the existing bounded
`list_tasks`. Every mutation requires `successReply` (1–280 characters, no control characters).

```json
{
  "items": [
    { "kind": "task", "title": "Write paper", "date": "2026-10-20",
      "startTime": "15:00", "endTime": "17:00", "suggestedFields": ["endTime"] },
    { "kind": "note", "title": "APA", "description": "Use seventh edition" }
  ],
  "successReply": "已放入待确认清单，尚未保存。"
}
```

Update with `items: [{itemId, fields: {...}}]`; omitted fields are unchanged and null clears
optional fields. Kind cannot change. Remove with `itemIds: [...]`. Operations validate the whole
batch before mutation, with at most 100 entries per call/list. Existing pending task cards are
consolidated on the first successful review mutation, retaining item IDs. Completed/rejected/expired
batches remain historical. Removing the final item rejects the empty batch; the next capture
starts a new batch. Tool changes remain isolated until the model turn commits successfully.

Task scheduling may be blank when explicitly requested; confirmation then returns 422
`ScheduleRequired`. Notes reject scheduling/recurrence/suggestion fields. Note text is the trimmed
title, optionally followed by a newline and trimmed description, with a combined 2,000-character
limit. Saved notes are ordinary Notes (`IsPersistent = false`).

## Editing and confirmation

Use the existing draft PUT endpoint, with the reviewed item IDs and versions. For notes send
title/description and omit task fields; `timeZoneId` may be omitted. Task zones remain immutable.
User changes to individual date/time fields clear only the corresponding suggestion flags.
Use the existing reject endpoint to discard the entire pending list.

Use the existing confirm endpoint with `action: "add_all"`, a client-generated `commandId`, both
expected versions and `editedDraft.items`. Include every item and omit `selectedItemIds`.
Remove unwanted items through editing before confirmation. Review lists do not expose `start_now`.
Legacy task cards retain `start_now` / `add_to_task_list` and their existing selection behavior.

The batch saves ordinary tasks, recurring tasks, notes and a durable confirmation record in one
database transaction. Recurring creation joins an existing transaction or owns one when invoked
standalone. A failed batch rolls back all entities and the receipt, leaving the list pending.
The failed command returns its original failure on replay; retry after correction with a new
command ID and current versions.

The receipt uniquely identifies `(ConversationId, DraftId)` and `(UserId, CommandId)` and contains
the completed draft with saved entity IDs. Reusing a command ID with changed reviewed data returns
409 `IdempotencyKeyReused`. A completed batch with a new command ID returns existing results.
If a process stops after entity commit but before conversation save, SQL conversation reads apply
the receipt and recover the completed state. Retained receipts do not recreate deleted drafts.

## Database rollout

`AiCoachDraftConfirmation` is a new table, with two unique indexes and a cascading foreign key
to `AiCoachConversation`. Additive JSON fields keep payload schema 2 readable; existing drafts
default to `kind: task` and `isReviewList: false`.

Conversation deletion cascades to confirmation records. Message retention removes records for
pruned drafts so the saved draft text does not remain in a second copy. This does not delete the
formal notes or tasks that the user confirmed.

The developer must generate/apply the migration before deploying the updated backend. From
`blotztask-api/`:

```bash
dotnet ef migrations add AddAiCoachDraftConfirmation
dotnet ef database update
```

Generated migrations belong in `Infrastructure/Data/Migrations/`. No migration was generated or
applied by the agent. Ensure the migration targets the intended environment before running it.

## Verification

`ReviewListWorkflowTests` uses a real SQL Server Testcontainer for mixed writes, rollback/retry,
durable recovery, idempotency conflicts, editing, retention and protocol compatibility. Tool checks
also exercise the existing `successReply` dispatch. No external Azure calls are made by that class.

`ReviewListLiveTests` uses the existing opt-in Azure test credentials and makes four real-model
checks: explicit note request, combined task/note request, a knowledge question, and emotional
sharing without advice. All four passed on 2026-10-18. These examples do not measure repeated-run
stability or production false-positive rates. Enable them with `AICOACH_MODEL_TESTS=1`.
