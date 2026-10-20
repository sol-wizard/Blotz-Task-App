# W5: mobile review list

The mobile AI Coach opts into the [W4 protocol](ai-coach-w4-review-list.md) using
`X-Ai-Coach-Protocol: 6` on all Coach requests. Deploy the W4 backend and apply its migration
before releasing this client. W5 adds no database migration or dependency.

## User flow

- A bar above the composer shows the pending item count. It opens a native Modal containing the
  current task/note list. State comes from `snapshot.pendingList`; there is no second local list.
- Tasks display dates, times, their original time zone, recurrence and individual suggestion
  markers. Notes display only text. Long descriptions have a short preview and can be read in full
  in the editor.
- The task editor reuses existing date/time/recurrence controls and now edits description too.
  The note editor edits title/body, counts their combined trimmed text plus the joining newline,
  and blocks text over 2,000 UTF-16 characters, matching the backend.
- Editing captures the item and both versions at editor-open time. A later snapshot does not
  overwrite typed text. Saving against changed versions shows an error and preserves the editor.
  Closing a dirty editor requires explicit discard confirmation.
- Deleting an item submits the remaining list through the existing edit command. Deleting the
  final item rejects the batch. Saved tasks and notes are never deleted by these operations.
- Add all sends `action: add_all`, every reviewed item and both versions, omitting
  `selectedItemIds`. Note requests omit all task-only fields. Item kind cannot be changed.
- Missing/invalid/past times block adding. Calendar unavailability offers a refresh. Schedule
  conflicts use the existing explicit acceptance/token flow and do not permanently disable adding.
- Successful confirmation refreshes task, DDL and note caches. New review lists are not rendered
  again as task cards inside chat messages. Existing legacy task cards keep their original actions
  until a successful review-list tool mutation consolidates them server-side.

## Recovery and navigation

The Hook retains the complete in-flight confirmation in memory, including `commandId`, versions,
reviewed payload and accepted conflict token. A network or generic server failure leaves it
uncertain. Polling/opening reconciles committed state; retry resends the original request.
Validation/conflict responses, or an explicit failed transaction result, release the retained
request so a corrected attempt gets a new ID. App process restarts rely on W4's durable batch
confirmation record rather than this in-memory request.

While confirmation is uncertain, sending, editing, deleting and changing topics are blocked.
Users can check again or retry the same save, including when the current pending list is absent.
A failed refresh does not disable further refresh/retry attempts.

Native stack removal (back button, Android back and supported back gestures) uses Expo Router's
vendored `usePreventRemove` hook. A pending batch triggers at most one reminder per screen visit;
returning to the screen resets reminder tracking. Continuing review opens the list. Leaving does
not save or discard it. Backgrounding the app does not invoke this removal guard. The explicit
manual-task navigation path uses the same reminder. Starting a new topic separately warns that
its pending items expire, and clearing history retains the existing destructive confirmation.

## Main files

- `models/ai-coach-dto.ts`: protocol 6 wire additions.
- `models/review-list.ts`: discriminated editor inputs, reviewed payload conversion and confirmation
  identity/reconciliation helpers.
- `services/ai-coach-service.ts`: Coach-local protocol header.
- `hooks/useAiCoachChat.ts`: server snapshot reconciliation, edit/remove/add-all and cache updates.
- `components/review-list-bar.tsx`, `review-list-modal.tsx`, `review-note-editor.tsx`: review UI.
- `components/draft-edit-modal.tsx`: reusable task editor, description and dirty-close handling.
- `components/execution-chat-panel.tsx`: entry point, history filtering and navigation reminders.
- `src/i18n/locales/{en,zh}/ai-coach.json`: both language variants.

## Verification (2026-10-18)

Run from `blotztask-mobile/`:

```bash
npm run check:ai-coach-review
```

Nine Node checks exercise production conversion/confirmation helpers without introducing a test
framework: note field filtering, task metadata, add-all payload, exact retry identity, temporarily
missing lists, corrected attempts, uncertain errors, matching completion and note text length.

ESLint passes for the AI Coach directory and the check script. Full `tsc --noEmit` reports 187
errors; comparison with original tracked source using a TypeScript CompilerHost reports the same
187 baseline errors. AI Coach reports no type errors. The only application-source baseline error is
`src/feature/widget/hooks/useSyncTodayTasksWidget.ts:27`; the others are dependency diagnostics
from `react-native-calendars`.

A temporary standalone Expo web preview used the actual review components and disposable sample
data. Manual interaction verified the mixed list layout at phone width, note editing, live length
counts, disabling an oversized note, the task editor, item deletion and the empty-list state. That
preview does not call the user's backend. Native device keyboard/back-gesture behavior and the
authenticated app-to-backend save flow still need device verification after W4 rollout.
