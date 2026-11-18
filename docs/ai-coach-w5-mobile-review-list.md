# W5: mobile review list

The mobile AI Coach opts into the [W4 protocol](ai-coach-w4-review-list.md) using
`X-Ai-Coach-Protocol: 6` on all Coach requests. Deploy the W4 backend and apply its migration
before releasing this client. W5 adds no database migration or dependency.

## User flow

Updated 2026-11-14: the bar above the composer and its sheet are replaced by cards in the chat.

- Each suggested task or note is a card under the coach reply that suggested it
  (`suggestedInMessageId`; older items sit under the reply that stores their list). The open topic
  uses the live list from the snapshot; older topics use the copies stored on their replies.
- A card shows a circle, the title, the day and time ("Today · 09:00–11:00") or "Note", and ✎.
- The circle saves the item at once (W4 "Ticking single items") and an untick deletes it again.
  The circle flips immediately. Each item has at most one request in flight; taps made meanwhile
  only change the wanted state, and one last request sends it, so the end state matches the circle.
- Success shows a short message above the composer and refreshes task, DDL and note caches. A
  clash is saved and named in the message. A failure restores the server state and shows an error.
- A missing or past time is refused on the phone before any request, so the circle never flips.
- ✎ on an unsaved card opens the task or note editor, which saves through the edit command. ✎ on
  a saved card opens the app's normal task or note editor; a repeating task points to the task list.
- Circles are off while the coach replies, and a message waits until ticks have settled. Cards of an
  ended list (New topic) are read-only and keep showing what was saved.
- There is no bar, sheet, Add all, leave reminder or New topic warning: nothing waits to be saved.
- Legacy task cards keep their original actions until a review-list tool mutation consolidates them.

## Recovery

A tick sets a wanted state, so repeating a request is harmless. A refused tick (422) leaves the chat
as it is; a conflict (409) applies the returned snapshot; other failures reopen the chat to show the
server's state. Clearing history keeps its destructive confirmation.

## Main files

- `models/ai-coach-dto.ts`: protocol 6 wire additions.
- `models/review-list.ts`: discriminated editor inputs and reviewed payload conversion.
- `services/ai-coach-service.ts`: Coach-local protocol header and the tick request.
- `hooks/useAiCoachChat.ts`: server snapshot reconciliation, ticks, edits and cache updates.
- `components/review-item-card.tsx`, `review-note-editor.tsx`, `draft-edit-modal.tsx`: card and editors.
- `components/execution-chat-panel.tsx`: places cards under replies, tick messages and ✎ routing.
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
