# Source Metrics

Use only these first-version metrics for the Blotz monthly PM report dataset. Record useful-but-unsupported metrics as data-quality warnings in `metrics-snapshot.json`, not as inferred values.

## App Store Connect

Collect acquisition and store performance data when available:

| Metric | Decision Use | Required |
|---|---|---|
| First-time downloads, redownloads, and total downloads | Acquisition volume | Yes |
| App updates and restores | Separate acquisition from maintenance traffic | Optional |
| Product page views | Store listing traffic | Yes |
| Conversion rate | Store listing effectiveness | Yes |
| Source type breakdown | Source-level acquisition mix | Yes |
| Territory breakdown | Regional acquisition mix | Yes |
| App version or platform breakdown | Version/platform anomalies | Optional |
| Crashes | Quality risk | Optional |

Do not combine App Store acquisition source data with PostHog product behavior unless a reliable attribution join exists.

Record coverage separately from values. A zero is valid only when a successfully parsed Standard report covers that metric for the target month. Use `null` when no recognized row establishes coverage. App Store source status is `ok` only when downloads, product page views, and product page download-button taps are all covered; use `partial` when only some are covered.

Among instances whose exposed dates match the target month, use exactly one time granularity per App Store report in this order: `MONTHLY`, then all target-month `DAILY` instances, then `WEEKLY`, then `UNKNOWN`. Only use undated instances as a fallback when no dated instance matches. Never add different time granularities for the same report. When multiple instances represent the same coverage period, keep the latest `processingDate`. Persist the contributing report and instance IDs, selected granularity, and processing date in the normalized summary so totals remain auditable after temporary raw files are removed.

## PostHog

Collect only currently instrumented useful events:

| Event | Metrics | Decision Use |
|---|---|---|
| `active_user_5s` | DAU, WAU, MAU, active days per user | Product activity |
| `create_task_manually` | Manual task count, creators, per-active-user rate | Core task usage |
| `ai_task_generation_session` | AI sessions, users, outcomes, mutually exclusive voice-only/text-only/mixed/unknown input modes, turns, generated task/note counts | AI task generation value |
| `ai_task_generation_failed` | Failure count, users, stage, error code, input mode, duration | AI reliability |
| `breakdown_task` | Usage, users, success rate, duration, generated subtask count | AI breakdown comparison |
| `note_created` | Total, manual, AI-created, and unknown-source notes; AI share only with complete source coverage | Notes usage, AI assist, and instrumentation health |
| `screen_viewed` | Notes and Gashapon visits/users only | Limited feature discovery |
| Event inventory | Event count, user count, first/last seen, current-month health | Instrumentation health |
| `Application Installed` + `Application Opened` | Mature D1/D7/D30 cohorts | Retention baseline |
| Three AI event generations + manual task generations | AI/manual user combinations and active days | Behavior mix |
| `ai_task_generation_failed` | Weekly failure trend | Reliability trend |
| Geo and `app_version` properties | Active audience by country/version | Audience anomalies |

## Unsupported In First Version

Do not collect or infer:

- Onboarding conversion.
- New user activation.
- Task completion.
- AI-generated task completion.
- Full feature usage rankings beyond currently instrumented screens.
- Pomodoro, DDL, Review, Badge, Calendar, Settings, or complete screen usage.
- App Store source to product activation.
- Subscription, revenue, trial, churn, or AI cost ROI.
- AI quality from edited/deleted/regenerated outputs.
- AI 0/1-2/3+ frequency buckets across all three generations until event-count semantics are normalized.
- AI-group retention until the three AI generations have a stable usage-unit contract.
- Return visits after first AI success/failure until attempts can be joined reliably.
