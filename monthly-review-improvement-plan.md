# Monthly Review — Working Context

Short context for the Monthly Review letter feature. Hand this to AI to continue the work.

## Done (shipped)
- Error-handling parity with Breakdown; AI quota + usage metering; moved out of Beta into Settings.
- Monthly task selection uses `StartTime` (not `CreatedAt`); `CompletedAt` added to task model + payload.
- `TimeTakenMinutes` → `PlannedDurationMinutes`.
- Prompt hardened: time-management/life-coach persona, privacy guardrail for shareable letters,
  dropped completion-rate framing, trimmed dead instructions.
- Mobile generate button handles quota (429) + generic failures with a toast.
- Month-end gating: a month is only viewable after it ends (frontend caps at last month; backend
  guards generate for any not-yet-ended month).

## Decisions (locked)
- **No minimum-task cap** — users can generate even with little/no data.
- **AI reasons from raw tasks itself** — do NOT pre-digest stats into the prompt.
- **Labels parked** — only 4 default labels today; not worth feeding until custom labels exist.
- **Stats belong to the future Instagram-story UI**, not the letter.

## Open
- **Double-generation** (waiting on PM): allow regenerating a month's letter? Currently the handler
  returns the existing report (no regen). Their answer decides the duplicate-report behavior.
- **`CompletedAt` migration** is generated + committed but still needs `dotnet ef database update`.

## Next
- After the PM answers double-generation, implement that behavior.
- Prod-readiness: replace the temporary manual generate button with the scheduled trigger (PBI 8A).
- Parked: UTC month-boundary nuance (tasks near a month edge bucket by UTC, not user TZ).

## Weekly report (later) — reuse map
Same shape as monthly; design so weekly is a thin handler, not a copy.
- **Share (period-agnostic):** task-window loader (already takes `(start, end)` — drop "Monthly" from
  the name), `LoadPreferredLanguageAsync`, and the Azure call + error tower in `GenerateLetterAsync`
  (extract a letter service taking `(prompt, languageLabel)` primitives; no DbContext).
- **Keep separate:** period math (month vs ISO-week), the prompt (monthly reflective / weekly tactical),
  persistence key, and the period-end gating (current week not viewable until it ends).
- **Decide first:** separate `WeeklyReviewReport` table (leaning this) vs. one `Reviews` table with a
  `PeriodType` discriminator.
