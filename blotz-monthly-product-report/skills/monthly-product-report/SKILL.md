---
name: monthly-product-report
description: Generate or refresh Blotz Chinese monthly product reports from App Store Connect and PostHog; analyze an existing report's product, retention, AI, or data-quality evidence; or review and redesign its information architecture and static HTML presentation. Use for 月报生成或更新、产品/留存/AI 分析、现有报告评审，以及报告结构或模板改版.
---

# Monthly Product Report

Work with evidence-backed Chinese monthly PM reports. Choose exactly one mode from the user's request before reading credentials, collecting data, or changing files.

## Modes

### Generate Or Refresh

Use when the user requests a report for a month or asks to refresh its source data. This is the only mode that collects from App Store Connect or PostHog.

Require a month in `YYYY-MM`. Resolve "last month" to a concrete month in the user's timezone and state it before collection. Accept an optional report output directory; default to `reports/` at the standalone repository root.

#### Workflow

1. Read [metrics.md](references/metrics.md) and [posthog-events.md](references/posthog-events.md) to understand supported metrics and instrumentation coverage.
2. Load configuration in this order:
   - Existing non-empty shell environment variables.
   - `.env` at the standalone repository root.
   - For variables still empty, `.env.example` at the standalone repository root.
   The committed `.env` is the variable template. The ignored `.env.example` contains local credentials and must never be printed, copied into reports, or committed.
3. Never display credential values. If configuration is missing, run `scripts/run.py` once only when doing so is needed to identify the missing variable names; report those names and stop.
4. Run:

   ```bash
   python3 skills/monthly-product-report/scripts/run.py --month YYYY-MM
   ```

   Add `--output-dir PATH` only when the user requests another destination. Do not add `--create-missing-app-store-request` unless the user explicitly authorizes creating a report request.
   A partial source is a successful collection with warnings. If every requested source fails, the command still writes a diagnostic snapshot but exits non-zero; report the source failures and stop before writing HTML.
5. Confirm `reports/YYYY-MM/metrics-snapshot.json` exists. The collector stores raw API responses only in a temporary directory and removes them before returning.
6. Read the complete snapshot, then read [analysis-guidelines.md](references/analysis-guidelines.md), [unsupported-claims.md](references/unsupported-claims.md), and [report-template.md](references/report-template.md).
7. Analyze the evidence directly. Do not invoke a deterministic report generator or mechanically map one threshold to a decision.
8. Write a Chinese HTML fragment to `reports/YYYY-MM/.report-content.html`. Follow the decision order in `report-template.md`; do not organize the report mechanically by API source. Include concrete evidence for every material conclusion. Only render metrics that are present, supported, and decision-useful in the snapshot.
9. Render the final report and consume the temporary fragment:

   ```bash
   python3 skills/monthly-product-report/scripts/render-report.py \
     --month YYYY-MM \
     --content-file reports/YYYY-MM/.report-content.html \
     --consume
   ```

10. Open `monthly-report.html`, re-read the visible report, and verify every numeric claim against the snapshot. Remove unsupported causal, retention, revenue, or quality claims. Confirm no template placeholder or temporary content file remains.

Completion requires both files, every visible numeric claim verified against the snapshot, and no temporary report fragment:

```text
reports/YYYY-MM/metrics-snapshot.json
reports/YYYY-MM/monthly-report.html
```

### Analyze An Existing Report

Use when the user provides or identifies a report or snapshot and asks for product analysis, comparison, evidence verification, or critique.

1. Read the complete provided report and its sibling `metrics-snapshot.json` when available. Do not collect fresh data unless the user explicitly asks to refresh it.
2. Read [metrics.md](references/metrics.md), [posthog-events.md](references/posthog-events.md), [analysis-guidelines.md](references/analysis-guidelines.md), and [unsupported-claims.md](references/unsupported-claims.md).
3. Treat the snapshot as the source of truth. If no snapshot is available, identify numeric claims as unverified instead of assuming they are correct.
4. Separate observed facts, interpretations, unsupported claims, presentation issues, and recommended follow-up.
5. Keep the task read-only unless the user explicitly requests changes.

Completion requires every material finding to cite report or snapshot evidence, all unavailable evidence to be named, and no collection or file change outside the user's request.

### Improve Report Presentation

Use when the user asks to improve report information architecture, PM readability, visual hierarchy, responsive layout, or the reusable static HTML template.

1. Read the existing report, its snapshot when available, [report-template.md](references/report-template.md), [analysis-guidelines.md](references/analysis-guidelines.md), and [unsupported-claims.md](references/unsupported-claims.md).
2. Preserve metric definitions, source-status semantics, evidence boundaries, privacy rules, and renderer safety. Do not collect fresh data unless the user explicitly asks to refresh it.
3. Distinguish reusable project-wide changes from one-report edits. Prefer the reusable template and report contract when the requested improvement should apply to future months.
4. Do not add a visual relationship that the evidence cannot support. In particular, do not turn unrelated aggregates into a funnel, overlapping counts into a composition, or correlated behavior groups into a conversion path.
5. When implementing changes, validate the generated HTML, verify every visible numeric claim against its snapshot, and check desktop, mobile, and print layouts in proportion to the visual change.

Completion requires the requested presentation scope to be implemented or analyzed, all displayed relationships to remain evidence-supported, and the renderer's active-content restrictions to remain intact.

## Shared Boundaries

- Do not persist raw App Store segments, raw PostHog responses, user prompts, task contents, or personal data.
- Do not print, copy, commit, or embed API keys and `.p8` contents.
- Do not treat missing values as zero. Omit unsupported or unavailable metric rows and sections instead of filling the report with `不可用` placeholders.
- Treat source status as coverage, not process execution alone. For PostHog, `ok` means every query succeeded, `partial` means some queries succeeded, and `failed` means no query produced usable data. For App Store Connect, `ok` means all required metrics are covered, `partial` means at least one required metric is covered, and `failed` means no required metric is usable. `skipped` always means the source was not requested.
- For each App Store report, use one target-month time granularity only. Prefer monthly, then daily, weekly, and unknown granularity; when the same coverage period has multiple processed versions, use the latest one.
- Continue with a partial report when one source is unavailable. Mention the failed source once in source coverage, then omit its metric sections.
- Keep facts, interpretation, and recommendations distinguishable.
- Treat the snapshot as the source of truth even when prior reports differ.
- Write all PM-facing titles, decision labels, explanations, limitations, and recommendations in Simplified Chinese. Keep event names, error codes, and source names in their original form when translation would make verification harder. Never expose internal English decision codes in the final report.
- Use plain product language. Expand analytics abbreviations on first use, then prefer Chinese names. Do not expose unexplained terms such as `P50/P90`, `cohort`, `person_id`, `distinct-user union`, `request/session ID`, `Get`, `Restore`, `acquisition`, `Standard/Detailed`, `Inventory`, or `Breakdown` in PM-facing prose.
- Never infer a funnel, retention cohort, activation metric, or month-over-month trend from unrelated aggregate counts. If the snapshot does not contain that analysis, omit it completely from the monthly report.
- Use `voice_only`, `text_only`, `mixed`, and `unknown` as the mutually exclusive AI input-mode composition. The compatibility counts for sessions containing voice or text overlap when a session is mixed; never add them together or present them as a partition.
- Count every successful `note_created` query row in the note total. Treat source values other than `manual` and `ai` as unknown; report their count, add a data-quality warning, and omit AI share until source coverage is complete.
- The renderer enforces an allowlist of report tags and known CSS classes. Do not add links, images, SVG, forms, inline styles, event-handler attributes, custom attributes, comments, or active content to the HTML fragment. Trusted trend SVGs are injected only by the deterministic renderer from empty approved placeholders and the same-month snapshot.
- Do not include the report-automation design explanation in each monthly report; keep it in the skill references.

## Completion Response

- Generate or refresh: return the resolved month, absolute report path, App Store and PostHog source status, final Chinese recommendation label, and the most important data limitation.
- Analyze an existing report: return the reviewed file, evidence-backed findings, unsupported or unverifiable claims, and the most important limitation.
- Improve report presentation: return the changed or reviewed files, the resulting information hierarchy and visual behavior, preserved evidence and safety constraints, and verification performed.
