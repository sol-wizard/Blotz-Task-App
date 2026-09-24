#!/usr/bin/env python3
from __future__ import annotations

import csv
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from monthly_report_common import (
    AI_FAILURE_PROBLEMS,
    FEATURE_EVENTS,
    FIRST_WEEK_DAYS,
    HISTORY_MONTHS,
    NEW_USER_EVENTS,
    build_parser,
    days_in_month,
    ensure_month_dirs,
    first_row,
    month_date_bounds,
    month_dir,
    number,
    ratio,
    read_json,
    rows,
    shift_month,
    write_json,
)


def write_csv(path: Path, fieldnames: list[str], records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)


def raw_query(month: str, name: str) -> dict[str, Any]:
    return read_json(month_dir(month) / "raw" / "posthog" / f"{name}.json", {})


def query_failed(raw: dict[str, Any]) -> bool:
    return raw.get("_collection_status") == "failed" or "results" not in raw


def warn_failed(warnings: list[str], name: str, raw: dict[str, Any]) -> None:
    if not raw:
        return
    if query_failed(raw):
        detail = raw.get("reason") or raw.get("body") or "unknown failure"
        warnings.append(f"PostHog query `{name}` did not return usable results: {detail}")


def normalize_activity(month: str, normalized_dir: Path, warnings: list[str]) -> dict[str, Any]:
    daily_raw = raw_query(month, "activity_daily")
    weekly_raw = raw_query(month, "activity_weekly")
    mau_raw = raw_query(month, "activity_mau")
    active_days_raw = raw_query(month, "activity_active_days")
    active_day_tiers_raw = raw_query(month, "activity_active_day_tiers")

    for name, raw in [
        ("activity_daily", daily_raw),
        ("activity_weekly", weekly_raw),
        ("activity_mau", mau_raw),
        ("activity_active_days", active_days_raw),
        ("activity_active_day_tiers", active_day_tiers_raw),
    ]:
        warn_failed(warnings, name, raw)

    daily_records = [{"day": row[0], "active_users": number(row[1])} for row in rows(daily_raw)]
    weekly_records = [{"week": row[0], "active_users": number(row[1])} for row in rows(weekly_raw)]
    active_day_tiers = [
        {
            "tier": row[0],
            "users": number(row[1]),
            "average_active_days": number(row[2]),
        }
        for row in rows(active_day_tiers_raw)
    ]

    write_csv(normalized_dir / "posthog_activity.csv", ["day", "active_users"], daily_records)
    write_csv(normalized_dir / "posthog_activity_weekly.csv", ["week", "active_users"], weekly_records)
    write_csv(
        normalized_dir / "posthog_activity_day_tiers.csv",
        ["tier", "users", "average_active_days"],
        active_day_tiers,
    )

    mau_row = first_row(mau_raw)
    active_days_row = first_row(active_days_raw)
    dau_values = [record["active_users"] for record in daily_records if record["active_users"] is not None]
    wau_values = [record["active_users"] for record in weekly_records if record["active_users"] is not None]

    return {
        "mau": number(mau_row[0]) if mau_row else None,
        "wau_average": round(sum(wau_values) / len(wau_values), 6) if wau_values else None,
        "dau_average": round(sum(dau_values) / days_in_month(month), 6) if dau_values else None,
        "active_days_per_user_average": number(active_days_row[0]) if active_days_row else None,
        "active_day_tiers": active_day_tiers,
    }


def normalize_manual_tasks(month: str, normalized_dir: Path, warnings: list[str], mau: Any) -> dict[str, Any]:
    raw = raw_query(month, "manual_tasks_summary")
    warn_failed(warnings, "manual_tasks_summary", raw)
    row = first_row(raw)
    created_count = number(row[0]) if row else None
    creator_count = number(row[1]) if row else None

    write_csv(
        normalized_dir / "posthog_manual_tasks.csv",
        ["created_count", "creator_count", "created_per_active_user"],
        [
            {
                "created_count": created_count,
                "creator_count": creator_count,
                "created_per_active_user": ratio(created_count, mau),
            }
        ],
    )
    return {
        "created_count": created_count,
        "creator_count": creator_count,
        "created_per_active_user": ratio(created_count, mau),
    }


def normalize_ai_sessions(month: str, normalized_dir: Path, warnings: list[str]) -> dict[str, Any]:
    outcomes_raw = raw_query(month, "ai_sessions_outcomes")
    totals_raw = raw_query(month, "ai_sessions_totals")
    input_modes_raw = raw_query(month, "ai_sessions_input_modes")
    turn_metrics_raw = raw_query(month, "ai_sessions_turn_metrics")

    for name, raw in [
        ("ai_sessions_outcomes", outcomes_raw),
        ("ai_sessions_totals", totals_raw),
        ("ai_sessions_input_modes", input_modes_raw),
        ("ai_sessions_turn_metrics", turn_metrics_raw),
    ]:
        warn_failed(warnings, name, raw)

    outcome_records = []

    for row in rows(outcomes_raw):
        outcome = row[0]
        count = number(row[1]) or 0
        users = number(row[2]) or 0
        outcome_records.append({"outcome": outcome, "session_count": count, "user_count": users})

    write_csv(
        normalized_dir / "posthog_ai_task_generation.csv",
        ["outcome", "session_count", "user_count"],
        outcome_records,
    )

    totals_row = first_row(totals_raw)
    input_row = first_row(input_modes_raw)
    turn_row = first_row(turn_metrics_raw)
    session_count = number(totals_row[0]) if totals_row else None
    user_count = number(totals_row[1]) if totals_row else None
    accepted_sessions = number(totals_row[2]) if totals_row else None
    rejected_sessions = number(totals_row[3]) if totals_row else None
    abandoned_sessions = number(totals_row[4]) if totals_row else None
    voice_only_sessions = number(input_row[0]) if input_row else None
    text_only_sessions = number(input_row[1]) if input_row else None
    mixed_input_sessions = number(input_row[2]) if input_row else None
    unknown_input_mode_sessions = number(input_row[3]) if input_row else None
    voice_sessions = (
        voice_only_sessions + mixed_input_sessions
        if voice_only_sessions is not None and mixed_input_sessions is not None
        else None
    )
    text_sessions = (
        text_only_sessions + mixed_input_sessions
        if text_only_sessions is not None and mixed_input_sessions is not None
        else None
    )
    input_mode_records = [
        {"input_mode": "voice_only", "session_count": voice_only_sessions},
        {"input_mode": "text_only", "session_count": text_only_sessions},
        {"input_mode": "mixed", "session_count": mixed_input_sessions},
        {"input_mode": "unknown", "session_count": unknown_input_mode_sessions},
    ]
    write_csv(
        normalized_dir / "posthog_ai_input_modes.csv",
        ["input_mode", "session_count"],
        input_mode_records,
    )
    if unknown_input_mode_sessions:
        warnings.append(
            f"`ai_task_generation_session` returned {unknown_input_mode_sessions} "
            "session(s) without a recognized input mode."
        )

    return {
        "session_count": session_count,
        "user_count": user_count,
        "accepted_sessions": accepted_sessions,
        "rejected_sessions": rejected_sessions,
        "abandoned_sessions": abandoned_sessions,
        "acceptance_rate": ratio(accepted_sessions, session_count),
        "voice_session_count": voice_sessions,
        "text_session_count": text_sessions,
        "voice_only_session_count": voice_only_sessions,
        "text_only_session_count": text_only_sessions,
        "mixed_input_session_count": mixed_input_sessions,
        "unknown_input_mode_session_count": unknown_input_mode_sessions,
        "average_turns_per_session": number(turn_row[0]) if turn_row else None,
        "average_generated_tasks_per_session": number(turn_row[1]) if turn_row else None,
        "average_generated_notes_per_session": number(turn_row[2]) if turn_row else None,
    }


def normalize_ai_failures(month: str, normalized_dir: Path, warnings: list[str]) -> dict[str, Any]:
    summary_raw = raw_query(month, "ai_failures_summary")
    stage_raw = raw_query(month, "ai_failures_by_stage")
    error_raw = raw_query(month, "ai_failures_by_error_code")
    stage_and_error_raw = raw_query(month, "ai_failures_by_stage_and_error_code")
    weekly_raw = raw_query(month, "ai_failures_weekly")

    for name, raw in [
        ("ai_failures_summary", summary_raw),
        ("ai_failures_by_stage", stage_raw),
        ("ai_failures_by_error_code", error_raw),
        ("ai_failures_by_stage_and_error_code", stage_and_error_raw),
        ("ai_failures_weekly", weekly_raw),
    ]:
        warn_failed(warnings, name, raw)

    summary_row = first_row(summary_raw)
    by_stage = [{"stage": row[0], "count": number(row[1])} for row in rows(stage_raw)]
    by_error_code = [{"error_code": row[0], "count": number(row[1])} for row in rows(error_raw)]
    by_stage_and_error_code = [
        {"stage": row[0], "error_code": row[1], "count": number(row[2])}
        for row in rows(stage_and_error_raw)
    ]
    weekly = [
        {"week": row[0], "failure_count": number(row[1]), "failure_users": number(row[2])}
        for row in rows(weekly_raw)
    ]

    write_csv(normalized_dir / "posthog_ai_failures.csv", ["stage", "count"], by_stage)
    write_csv(normalized_dir / "posthog_ai_failure_error_codes.csv", ["error_code", "count"], by_error_code)
    write_csv(
        normalized_dir / "posthog_ai_failures_by_stage_and_error_code.csv",
        ["stage", "error_code", "count"],
        by_stage_and_error_code,
    )
    write_csv(
        normalized_dir / "posthog_ai_failures_weekly.csv",
        ["week", "failure_count", "failure_users"],
        weekly,
    )

    return {
        "failure_count": number(summary_row[0]) if summary_row else None,
        "failure_users": number(summary_row[1]) if summary_row else None,
        "by_stage": by_stage,
        "by_error_code": by_error_code,
        "by_stage_and_error_code": by_stage_and_error_code,
        "weekly": weekly,
    }


def normalize_ai_breakdown(month: str, normalized_dir: Path, warnings: list[str]) -> dict[str, Any]:
    raw = raw_query(month, "ai_breakdown_summary")
    warn_failed(warnings, "ai_breakdown_summary", raw)
    row = first_row(raw)
    summary = {
        "usage_count": number(row[0]) if row else None,
        "user_count": number(row[1]) if row else None,
        "success_rate": number(row[2]) if row else None,
        "average_duration_ms": number(row[3]) if row else None,
        "average_subtask_count": number(row[4]) if row else None,
    }
    write_csv(normalized_dir / "posthog_ai_breakdown.csv", list(summary.keys()), [summary])
    return summary


def normalize_notes(month: str, normalized_dir: Path, warnings: list[str]) -> dict[str, Any]:
    raw = raw_query(month, "notes_by_source")
    warn_failed(warnings, "notes_by_source", raw)
    records = [
        {
            "source": row[0],
            "created_count": number(row[1]),
            "creator_count": number(row[2]),
        }
        for row in rows(raw)
    ]
    write_csv(
        normalized_dir / "posthog_notes.csv",
        ["source", "created_count", "creator_count"],
        records,
    )

    if query_failed(raw):
        return {
            "created_count": None,
            "manual_created_count": None,
            "ai_created_count": None,
            "unknown_created_count": None,
            "ai_share": None,
        }

    manual = sum(
        int(record["created_count"] or 0)
        for record in records
        if record["source"] == "manual"
    )
    ai = sum(
        int(record["created_count"] or 0)
        for record in records
        if record["source"] == "ai"
    )
    unknown = sum(
        int(record["created_count"] or 0)
        for record in records
        if record["source"] not in {"manual", "ai"}
    )
    total = manual + ai + unknown
    if unknown:
        warnings.append(
            f"`note_created` returned {unknown} event(s) with an unsupported or "
            "missing source; AI share is unavailable."
        )
    return {
        "created_count": total,
        "manual_created_count": manual,
        "ai_created_count": ai,
        "unknown_created_count": unknown,
        "ai_share": ratio(ai, total) if unknown == 0 else None,
    }


def normalize_screen_views(month: str, normalized_dir: Path, warnings: list[str]) -> dict[str, Any]:
    raw = raw_query(month, "screen_views")
    warn_failed(warnings, "screen_views", raw)
    records = [{"screen_name": row[0], "views": number(row[1]), "viewers": number(row[2])} for row in rows(raw)]
    write_csv(normalized_dir / "posthog_screen_views.csv", ["screen_name", "views", "viewers"], records)

    by_screen = {record["screen_name"]: record for record in records}
    notes = by_screen.get("Notes", {})
    gashapon = by_screen.get("GashaponMachine", {})
    default = 0 if not query_failed(raw) else None
    return {
        "notes_views": notes.get("views", default),
        "notes_viewers": notes.get("viewers", default),
        "gashapon_views": gashapon.get("views", default),
        "gashapon_viewers": gashapon.get("viewers", default),
    }


def normalize_event_inventory(month: str, normalized_dir: Path, warnings: list[str]) -> dict[str, Any]:
    raw = raw_query(month, "event_inventory")
    warn_failed(warnings, "event_inventory", raw)
    records = [
        {
            "event": row[0],
            "total_events": number(row[1]),
            "total_users": number(row[2]),
            "month_events": number(row[3]),
            "month_users": number(row[4]),
            "first_seen": row[5],
            "last_seen": row[6],
            "active_in_month": bool(number(row[3]) or 0),
        }
        for row in rows(raw)
    ]
    write_csv(
        normalized_dir / "posthog_event_inventory.csv",
        [
            "event",
            "total_events",
            "total_users",
            "month_events",
            "month_users",
            "first_seen",
            "last_seen",
            "active_in_month",
        ],
        records,
    )
    return {"event_count": len(records), "events": records}


def month_bounds(month: str) -> tuple[date, date]:
    _, start, end = month_date_bounds(month[:7])
    return date.fromisoformat(start), date.fromisoformat(end)


def event_first_seen_dates(event_inventory: dict[str, Any]) -> dict[str, date]:
    first_seen: dict[str, date] = {}
    for record in event_inventory.get("events", []):
        if record.get("event") and record.get("first_seen"):
            first_seen[record["event"]] = date.fromisoformat(str(record["first_seen"])[:10])
    return first_seen


def coverage_start(first_seen: dict[str, date], events: tuple[str, ...] | list[str]) -> date | None:
    """First full day on which every event existed; None when any event never fired."""
    dates = [first_seen.get(event) for event in events]
    if not dates or any(value is None for value in dates):
        return None
    return max(dates) + timedelta(days=1)


def month_coverage(first_seen: dict[str, date], events: tuple[str, ...] | list[str], month: str) -> str:
    """`complete` when the events existed all month, `partial` when they started mid-month, else `none`."""
    start_day = coverage_start(first_seen, events)
    month_start, month_end = month_bounds(month)
    if start_day is None or start_day >= month_end:
        return "none"
    if start_day <= month_start:
        return "complete"
    return "partial"


def change_ratio(current: Any, previous: Any) -> float | None:
    if current is None or previous in (None, 0):
        return None
    return ratio(current - previous, previous)


def point_change(current: Any, previous: Any) -> float | None:
    if current is None or previous is None:
        return None
    return round(float(current) - float(previous), 6)


def cohort_is_mature(cohort: str, window_days: int, as_of: date) -> bool:
    year_text, month_text, _ = cohort[:10].split("-", 2)
    year = int(year_text)
    month = int(month_text)
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    last_install_day = next_month - timedelta(days=1)
    return as_of >= last_install_day + timedelta(days=window_days)


def normalize_installation_retention(
    month: str,
    normalized_dir: Path,
    warnings: list[str],
    first_seen: dict[str, date],
    as_of: date,
) -> dict[str, Any]:
    raw = raw_query(month, "installation_retention")
    warn_failed(warnings, "installation_retention", raw)
    records = []
    for row in rows(raw):
        cohort = str(row[0])
        users = number(row[1])
        d1_users = number(row[2])
        d7_users = number(row[3])
        d30_users = number(row[4])
        next_month_active_users = number(row[5]) if len(row) > 5 else None
        next_month = shift_month(cohort, 1)
        # Readable only once the whole next month has passed and `active_user_5s` covered all of it.
        next_month_mature = as_of >= month_bounds(next_month)[1]
        next_month_measurable = (
            next_month_mature
            and next_month_active_users is not None
            and month_coverage(first_seen, ("active_user_5s",), next_month) == "complete"
        )
        records.append(
            {
                "cohort": cohort,
                "users": users,
                "d1_users": d1_users,
                "d1_rate": ratio(d1_users, users) if cohort_is_mature(cohort, 1, as_of) else None,
                "d1_mature": cohort_is_mature(cohort, 1, as_of),
                "d7_users": d7_users,
                "d7_rate": ratio(d7_users, users) if cohort_is_mature(cohort, 7, as_of) else None,
                "d7_mature": cohort_is_mature(cohort, 7, as_of),
                "d30_users": d30_users,
                "d30_rate": ratio(d30_users, users) if cohort_is_mature(cohort, 30, as_of) else None,
                "d30_mature": cohort_is_mature(cohort, 30, as_of),
                "next_month_active_users": next_month_active_users if next_month_measurable else None,
                "next_month_active_rate": (
                    ratio(next_month_active_users, users) if next_month_measurable else None
                ),
                "next_month_mature": next_month_mature,
            }
        )
    write_csv(
        normalized_dir / "posthog_installation_retention.csv",
        [
            "cohort",
            "users",
            "d1_users",
            "d1_rate",
            "d1_mature",
            "d7_users",
            "d7_rate",
            "d7_mature",
            "d30_users",
            "d30_rate",
            "d30_mature",
            "next_month_active_users",
            "next_month_active_rate",
            "next_month_mature",
        ],
        records,
    )
    return {"as_of": as_of.isoformat(), "cohorts": records}


def normalize_ai_manual_combinations(
    month: str, normalized_dir: Path, warnings: list[str]
) -> list[dict[str, Any]]:
    raw = raw_query(month, "ai_manual_combinations")
    warn_failed(warnings, "ai_manual_combinations", raw)
    records = [
        {"segment": row[0], "users": number(row[1]), "average_active_days": number(row[2])}
        for row in rows(raw)
    ]
    write_csv(
        normalized_dir / "posthog_ai_manual_combinations.csv",
        ["segment", "users", "average_active_days"],
        records,
    )
    return records


def normalize_audience(month: str, normalized_dir: Path, warnings: list[str]) -> dict[str, Any]:
    country_raw = raw_query(month, "active_by_country")
    version_raw = raw_query(month, "active_by_app_version")
    warn_failed(warnings, "active_by_country", country_raw)
    warn_failed(warnings, "active_by_app_version", version_raw)
    countries = [
        {
            "country": row[0] or "Unknown",
            "users": number(row[1]),
            "average_active_days": number(row[2]),
        }
        for row in rows(country_raw)
    ]
    app_versions = [
        {"app_version": row[0] or "Unknown", "users": number(row[1])}
        for row in rows(version_raw)
    ]
    write_csv(
        normalized_dir / "posthog_active_countries.csv",
        ["country", "users", "average_active_days"],
        countries,
    )
    write_csv(
        normalized_dir / "posthog_active_app_versions.csv",
        ["app_version", "users"],
        app_versions,
    )
    return {"countries": countries, "app_versions": app_versions}


def normalize_historical_install_proxy(
    month: str, normalized_dir: Path, warnings: list[str]
) -> dict[str, Any]:
    raw = raw_query(month, "historical_install_proxy")
    warn_failed(warnings, "historical_install_proxy", raw)
    row = first_row(raw)
    installed = number(row[0]) if row else None
    identified = number(row[1]) if row else None
    authenticated_active = number(row[2]) if row else None
    result = {
        "installed_users": installed,
        "identified_users": identified,
        "identified_user_ratio": ratio(identified, installed),
        "authenticated_active_users": authenticated_active,
        "authenticated_active_ratio": ratio(authenticated_active, installed),
        "is_strict_funnel": False,
    }
    write_csv(normalized_dir / "posthog_historical_install_proxy.csv", list(result.keys()), [result])
    return result


LOGIN_USER_EXIT_REASONS = ("cancelled", "browser_dismissed")
LOGIN_ERROR_REASONS = ("no_tokens", "auth0_error")


def login_reason_category(reason: Any) -> str:
    if reason in LOGIN_USER_EXIT_REASONS:
        return "user_exit"
    if reason in LOGIN_ERROR_REASONS:
        return "error"
    return "unknown"


def normalize_login_funnel(month: str, normalized_dir: Path, warnings: list[str]) -> dict[str, Any]:
    users_raw = raw_query(month, "login_funnel_users")
    attempts_raw = raw_query(month, "login_attempts_summary")
    failures_raw = raw_query(month, "login_failures_by_error_code")
    outcomes_raw = raw_query(month, "login_outcomes_by_user")
    for name, raw in [
        ("login_funnel_users", users_raw),
        ("login_attempts_summary", attempts_raw),
        ("login_failures_by_error_code", failures_raw),
        ("login_outcomes_by_user", outcomes_raw),
    ]:
        warn_failed(warnings, name, raw)

    # Per-user steps: each count is "person emitted the event at least once this month".
    users_row = first_row(users_raw)
    users_default = 0 if not query_failed(users_raw) else None
    sign_in_screen_users = number(users_row[0]) if users_row else users_default
    started_users = number(users_row[1]) if users_row else users_default
    succeeded_users = number(users_row[2]) if users_row else users_default
    failed_users = number(users_row[3]) if users_row else users_default
    failed_only_users = number(users_row[4]) if users_row else users_default

    steps_monotonic: bool | None = None
    if None not in (sign_in_screen_users, started_users, succeeded_users):
        steps_monotonic = sign_in_screen_users >= started_users >= succeeded_users
        if not steps_monotonic:
            warnings.append(
                "`login_funnel_users` steps are not monotonic "
                f"({sign_in_screen_users} saw SignIn, {started_users} started, "
                f"{succeeded_users} succeeded); user-level login ratios are unavailable."
            )

    # Per-user outcomes for people who tapped: what happened to those who never got in.
    # A person who hit an error and also cancelled counts as an error user.
    outcomes_row = first_row(outcomes_raw)
    outcomes_default = 0 if not query_failed(outcomes_raw) else None
    succeeded_after_failure_users = number(outcomes_row[0]) if outcomes_row else outcomes_default
    error_users = number(outcomes_row[1]) if outcomes_row else outcomes_default
    exit_only_users = number(outcomes_row[2]) if outcomes_row else outcomes_default
    no_outcome_users = number(outcomes_row[3]) if outcomes_row else outcomes_default

    not_succeeded_users = None
    if None not in (started_users, succeeded_users):
        not_succeeded_users = started_users - succeeded_users
    outcomes_partition = None
    if None not in (not_succeeded_users, error_users, exit_only_users, no_outcome_users):
        outcomes_partition = error_users + exit_only_users + no_outcome_users == not_succeeded_users
        if not outcomes_partition:
            warnings.append(
                "`login_outcomes_by_user` buckets do not partition the users who never logged in "
                f"({error_users} error + {exit_only_users} exit-only + {no_outcome_users} no-outcome "
                f"!= {not_succeeded_users}); per-user outcome ratios are unavailable."
            )

    # Attempt-level counts: one `login_started` per tap, then at most one outcome.
    attempts_row = first_row(attempts_raw)
    attempts_default = 0 if not query_failed(attempts_raw) else None
    started_attempts = number(attempts_row[0]) if attempts_row else attempts_default
    succeeded_attempts = number(attempts_row[1]) if attempts_row else attempts_default
    failed_attempts = number(attempts_row[2]) if attempts_row else attempts_default
    user_exit_attempts = number(attempts_row[3]) if attempts_row else attempts_default
    error_attempts = number(attempts_row[4]) if attempts_row else attempts_default

    unknown_reason_attempts = None
    if None not in (failed_attempts, user_exit_attempts, error_attempts):
        unknown_reason_attempts = failed_attempts - user_exit_attempts - error_attempts
        if unknown_reason_attempts:
            warnings.append(
                f"`login_failed` returned {unknown_reason_attempts} event(s) with an unsupported or missing reason."
            )

    unresolved_attempts = None
    if None not in (started_attempts, succeeded_attempts, failed_attempts):
        unresolved_attempts = started_attempts - succeeded_attempts - failed_attempts
        if unresolved_attempts < 0:
            warnings.append(
                "`login_attempts_summary` recorded more login outcomes "
                f"({succeeded_attempts + failed_attempts}) than `login_started` attempts "
                f"({started_attempts}); unresolved attempts are unavailable."
            )
            unresolved_attempts = None

    # `reason` is derived from `error_code` in the app, so the joint rows are the error-code table.
    by_error_code = [
        {
            "error_code": row[0],
            "reason": row[1],
            "category": login_reason_category(row[1]),
            "count": number(row[2]),
        }
        for row in rows(failures_raw)
    ]
    by_error_code.sort(key=lambda record: (-(record["count"] or 0), str(record["error_code"])))
    reason_counts: dict[Any, int] = {}
    for record in by_error_code:
        reason_counts[record["reason"]] = reason_counts.get(record["reason"], 0) + int(record["count"] or 0)
    by_reason = [
        {"reason": reason, "category": login_reason_category(reason), "count": count}
        for reason, count in sorted(reason_counts.items(), key=lambda item: (-item[1], str(item[0])))
    ]

    scalars = {
        "sign_in_screen_users": sign_in_screen_users,
        "started_users": started_users,
        "succeeded_users": succeeded_users,
        "failed_users": failed_users,
        "failed_only_users": failed_only_users,
        "sign_in_to_started_ratio": ratio(started_users, sign_in_screen_users) if steps_monotonic else None,
        "started_to_succeeded_ratio": ratio(succeeded_users, started_users) if steps_monotonic else None,
        "steps_monotonic": steps_monotonic,
        "is_strict_funnel": False,
        "succeeded_after_failure_users": succeeded_after_failure_users,
        "not_succeeded_users": not_succeeded_users,
        "exit_only_users": exit_only_users,
        "error_users": error_users,
        "no_outcome_users": no_outcome_users,
        "exit_only_user_ratio": ratio(exit_only_users, started_users) if outcomes_partition else None,
        "error_user_ratio": ratio(error_users, started_users) if outcomes_partition else None,
        "no_outcome_user_ratio": ratio(no_outcome_users, started_users) if outcomes_partition else None,
        "started_attempts": started_attempts,
        "succeeded_attempts": succeeded_attempts,
        "failed_attempts": failed_attempts,
        "user_exit_attempts": user_exit_attempts,
        "error_attempts": error_attempts,
        "unknown_reason_attempts": unknown_reason_attempts,
        "unresolved_attempts": unresolved_attempts,
        "attempt_success_rate": ratio(succeeded_attempts, started_attempts),
        "user_exit_rate": ratio(user_exit_attempts, started_attempts),
        "error_rate": ratio(error_attempts, started_attempts),
        "unresolved_rate": ratio(unresolved_attempts, started_attempts),
    }
    write_csv(normalized_dir / "posthog_login_funnel.csv", list(scalars.keys()), [scalars])
    write_csv(normalized_dir / "posthog_login_failures.csv", ["reason", "category", "count"], by_reason)
    write_csv(
        normalized_dir / "posthog_login_failure_error_codes.csv",
        ["error_code", "reason", "category", "count"],
        by_error_code,
    )
    return {**scalars, "by_reason": by_reason, "by_error_code": by_error_code}


NEW_USER_DAILY_COLUMNS = [
    "installs",
    "login_started_users",
    "login_succeeded_users",
    "login_error_users",
    "login_exit_only_users",
    "login_no_outcome_users",
    "task_created_users",
    "manual_task_users",
    "ai_users",
    "ai_generation_users",
    "ai_accepted_users",
    "note_users",
    "task_completed_users",
    "created_not_completed_users",
    "no_task_users",
]
FIRST_WEEK_BEHAVIORS = [
    "task_created_users",
    "manual_task_users",
    "ai_users",
    "ai_generation_users",
    "ai_accepted_users",
    "note_users",
    "task_completed_users",
]


def sum_new_user_days(days: list[dict[str, Any]]) -> dict[str, int]:
    return {column: sum(int(day[column] or 0) for day in days) for column in NEW_USER_DAILY_COLUMNS}


def new_user_cohort(totals: dict[str, int], warnings: list[str], label: str) -> dict[str, Any]:
    """Login steps and first-week behavior for one group of install days."""
    installs = totals["installs"]
    started = totals["login_started_users"]
    succeeded = totals["login_succeeded_users"]
    steps_monotonic = installs >= started >= succeeded
    if not steps_monotonic:
        warnings.append(
            f"New-user login steps for {label} are not monotonic ({installs} installed, "
            f"{started} started, {succeeded} succeeded); new-user login ratios are unavailable."
        )

    # Users who tapped continue but never logged in, split by what happened to them.
    not_succeeded = started - succeeded
    outcome_users = {
        "login_exit_only_users": totals["login_exit_only_users"],
        "login_error_users": totals["login_error_users"],
        "login_no_outcome_users": totals["login_no_outcome_users"],
    }
    outcomes_partition = sum(outcome_users.values()) == not_succeeded
    if not outcomes_partition:
        warnings.append(
            f"New-user login outcomes for {label} do not add up to the users who never logged in; "
            "their ratios are unavailable."
        )

    # First-week groups among users who logged in: completed a task / created but never
    # completed / neither. Preset tasks can be completed without being created.
    groups = [
        ("task_completed", totals["task_completed_users"]),
        ("created_not_completed", totals["created_not_completed_users"]),
        ("no_task", totals["no_task_users"]),
    ]
    groups_partition = sum(users for _, users in groups) == succeeded
    if not groups_partition:
        warnings.append(f"New-user first-week groups for {label} do not add up to logged-in users.")

    return {
        "installs": installs,
        "login_started_users": started,
        "login_succeeded_users": succeeded,
        "steps_monotonic": steps_monotonic,
        "login_started_ratio": ratio(started, installs) if steps_monotonic else None,
        "login_succeeded_ratio": ratio(succeeded, installs) if steps_monotonic else None,
        "started_to_succeeded_ratio": ratio(succeeded, started) if steps_monotonic else None,
        "not_succeeded_users": not_succeeded,
        **outcome_users,
        **{
            f"{key[:-len('_users')]}_ratio": ratio(value, started) if outcomes_partition else None
            for key, value in outcome_users.items()
        },
        "first_week": {
            "logged_in_users": succeeded,
            **{key: totals[key] for key in FIRST_WEEK_BEHAVIORS},
            **{f"{key[:-len('_users')]}_ratio": ratio(totals[key], succeeded) for key in FIRST_WEEK_BEHAVIORS},
            "groups": [
                {
                    "group": group,
                    "users": users,
                    "ratio": ratio(users, succeeded) if groups_partition else None,
                }
                for group, users in groups
            ],
        },
    }


def normalize_new_users(
    month: str,
    normalized_dir: Path,
    warnings: list[str],
    first_seen: dict[str, date],
    as_of: date,
) -> dict[str, Any]:
    raw = raw_query(month, "new_user_first_week_daily")
    warn_failed(warnings, "new_user_first_week_daily", raw)
    daily = [
        {
            "install_date": str(row[0])[:10],
            **{column: number(value) for column, value in zip(NEW_USER_DAILY_COLUMNS, row[1:])},
        }
        for row in rows(raw)
    ]
    write_csv(normalized_dir / "posthog_new_user_daily.csv", ["install_date", *NEW_USER_DAILY_COLUMNS], daily)
    if query_failed(raw):
        return {"coverage_start": None, "monthly": [], "target_month": None, "same_period": None}

    # Login and first-week counts only use install days on which every required event existed;
    # earlier installs still count as installs but not toward login or first-week rates.
    start_day = coverage_start(first_seen, NEW_USER_EVENTS)
    months = [shift_month(month, offset) for offset in range(-HISTORY_MONTHS, 1)]
    monthly: list[dict[str, Any]] = []
    cohorts: dict[str, dict[str, Any] | None] = {}
    for item in months:
        month_start, month_end = month_bounds(item)
        days = [day for day in daily if month_start <= date.fromisoformat(day["install_date"]) < month_end]
        covered_days = [
            day for day in days if start_day is not None and date.fromisoformat(day["install_date"]) >= start_day
        ]
        coverage = month_coverage(first_seen, NEW_USER_EVENTS, item)
        mature = cohort_is_mature(f"{item}-01", FIRST_WEEK_DAYS, as_of)
        cohort = (
            new_user_cohort(sum_new_user_days(covered_days), warnings, item)
            if coverage != "none" and mature
            else None
        )
        cohorts[item] = cohort
        installs = sum_new_user_days(days)["installs"]
        monthly.append(
            {
                "month": item,
                "installs": installs,
                "installs_change_ratio": change_ratio(installs, monthly[-1]["installs"]) if monthly else None,
                "first_week_coverage": coverage,
                "first_week_mature": mature,
                "covered_installs": cohort["installs"] if cohort else None,
                "login_succeeded_users": cohort["login_succeeded_users"] if cohort else None,
                "login_succeeded_ratio": cohort["login_succeeded_ratio"] if cohort else None,
            }
        )

    target = monthly[-1]
    previous = monthly[-2]
    month_start, month_end = month_bounds(month)
    same_period = None
    if as_of < month_end:
        # Month still running: compare the same day range of the previous month instead.
        through_day = (as_of - timedelta(days=1)).day
        previous_start, _ = month_bounds(previous["month"])
        same_period = {
            "through_day": through_day,
            "installs": sum(
                int(day["installs"] or 0)
                for day in daily
                if month_start <= date.fromisoformat(day["install_date"]) < month_end
                and date.fromisoformat(day["install_date"]).day <= through_day
            ),
            "previous_installs": sum(
                int(day["installs"] or 0)
                for day in daily
                if previous_start <= date.fromisoformat(day["install_date"]) < month_start
                and date.fromisoformat(day["install_date"]).day <= through_day
            ),
        }
        same_period["installs_change_ratio"] = change_ratio(
            same_period["installs"], same_period["previous_installs"]
        )

    write_csv(
        normalized_dir / "posthog_new_users_monthly.csv",
        list(monthly[0].keys()),
        monthly,
    )
    return {
        "coverage_start": start_day.isoformat() if start_day else None,
        "window_days": FIRST_WEEK_DAYS,
        "monthly": monthly,
        "target_month": {
            "month": month,
            "installs": target["installs"],
            "previous_month_installs": previous["installs"],
            "installs_change_ratio": target["installs_change_ratio"] if same_period is None else None,
            "coverage": target["first_week_coverage"],
            "coverage_start": (
                start_day.isoformat() if target["first_week_coverage"] == "partial" and start_day else None
            ),
            "mature": target["first_week_mature"],
            "cohort": cohorts[month],
            # Previous month is only a comparison baseline when its whole month was covered.
            "previous_month_cohort": (
                cohorts[previous["month"]] if previous["first_week_coverage"] == "complete" else None
            ),
        },
        "same_period": same_period,
    }


def normalize_user_lifecycle(
    month: str,
    normalized_dir: Path,
    warnings: list[str],
    first_seen: dict[str, date],
    activity: dict[str, Any],
    month_complete: bool,
) -> dict[str, Any]:
    raw = raw_query(month, "user_lifecycle_monthly")
    warn_failed(warnings, "user_lifecycle_monthly", raw)
    if query_failed(raw):
        return {"monthly": [], "target_month": None}
    by_month = {
        str(row[0])[:7]: {
            "active_users": int(number(row[1]) or 0),
            "retained_users": int(number(row[2]) or 0),
            "new_users": int(number(row[3]) or 0),
            "resurrected_users": int(number(row[4]) or 0),
        }
        for row in rows(raw)
    }
    empty = {"active_users": 0, "retained_users": 0, "new_users": 0, "resurrected_users": 0}

    monthly: list[dict[str, Any]] = []
    for item in [shift_month(month, offset) for offset in range(-HISTORY_MONTHS, 1)]:
        coverage = month_coverage(first_seen, ("active_user_5s",), item)
        previous = monthly[-1] if monthly else None
        if coverage == "none":
            monthly.append({"month": item, "coverage": coverage})
            continue
        values = by_month.get(item, empty)
        # Retention needs both this month and last month fully covered; a running target month
        # is never compared with a complete one.
        comparable = (
            coverage == "complete"
            and previous is not None
            and previous.get("coverage") == "complete"
            and (item != month or month_complete)
        )
        previous_active = previous["active_users"] if comparable else None
        composition_complete = (
            values["retained_users"] + values["new_users"] + values["resurrected_users"]
            == values["active_users"]
        )
        if not composition_complete:
            warnings.append(f"`user_lifecycle_monthly` groups for {item} do not add up to active users.")
        monthly.append(
            {
                "month": item,
                "coverage": coverage,
                **values,
                "previous_active_users": previous_active,
                "active_users_change_ratio": change_ratio(values["active_users"], previous_active),
                "retention_rate": ratio(values["retained_users"], previous_active),
                "churned_users": (
                    previous_active - values["retained_users"] if previous_active is not None else None
                ),
                "composition_complete": composition_complete,
            }
        )

    write_csv(
        normalized_dir / "posthog_user_lifecycle.csv",
        [
            "month",
            "coverage",
            "active_users",
            "retained_users",
            "new_users",
            "resurrected_users",
            "previous_active_users",
            "active_users_change_ratio",
            "retention_rate",
            "churned_users",
            "composition_complete",
        ],
        monthly,
    )
    target = dict(monthly[-1])
    target["dau_over_mau"] = ratio(activity.get("dau_average"), activity.get("mau"))
    return {"monthly": monthly, "target_month": target}


def normalize_feature_usage(
    month: str,
    normalized_dir: Path,
    warnings: list[str],
    first_seen: dict[str, date],
    month_complete: bool,
) -> dict[str, Any]:
    raw = raw_query(month, "feature_usage_monthly")
    warn_failed(warnings, "feature_usage_monthly", raw)
    if query_failed(raw):
        return {"active_users": None, "previous_active_users": None, "features": []}
    keys = [key for key, _ in FEATURE_EVENTS]
    by_month = {
        str(row[0])[:7]: {
            "active_users": int(number(row[1]) or 0),
            **{key: int(number(value) or 0) for key, value in zip(keys, row[2:])},
        }
        for row in rows(raw)
    }
    previous_month = shift_month(month, -1)

    def month_value(item: str, key: str, events: tuple[str, ...]) -> tuple[str, int | None]:
        coverage = month_coverage(first_seen, events, item)
        if coverage == "none":
            return coverage, None
        return coverage, by_month.get(item, {}).get(key, 0)

    active_coverage, active_users = month_value(month, "active_users", ("active_user_5s",))
    previous_active_coverage, previous_active_users = month_value(
        previous_month, "active_users", ("active_user_5s",)
    )
    features = []
    for key, events in FEATURE_EVENTS:
        coverage, users = month_value(month, key, events)
        previous_coverage, previous_users = month_value(previous_month, key, events)
        share = ratio(users, active_users)
        previous_share = ratio(previous_users, previous_active_users)
        comparable = month_complete and coverage == "complete" and previous_coverage == "complete"
        start_day = coverage_start(first_seen, events)
        features.append(
            {
                "feature": key,
                "events": list(events),
                "users": users,
                "share_of_active_users": share,
                "coverage": coverage,
                "coverage_start": start_day.isoformat() if coverage == "partial" and start_day else None,
                "previous_users": previous_users,
                "previous_share_of_active_users": previous_share,
                "previous_coverage": previous_coverage,
                "users_change_ratio": change_ratio(users, previous_users) if comparable else None,
                "share_change_points": point_change(share, previous_share) if comparable else None,
            }
        )
    write_csv(
        normalized_dir / "posthog_feature_usage.csv",
        [
            "feature",
            "users",
            "share_of_active_users",
            "coverage",
            "coverage_start",
            "previous_users",
            "previous_share_of_active_users",
            "previous_coverage",
            "users_change_ratio",
            "share_change_points",
        ],
        [{key: value for key, value in record.items() if key != "events"} for record in features],
    )
    return {
        "active_users": active_users if active_coverage != "none" else None,
        "previous_active_users": previous_active_users if previous_active_coverage != "none" else None,
        "features": features,
    }


def normalize_reliability(
    month: str,
    normalized_dir: Path,
    warnings: list[str],
    first_seen: dict[str, date],
    month_complete: bool,
    login_funnel: dict[str, Any],
) -> dict[str, Any]:
    previous_month = shift_month(month, -1)
    raws = {
        name: raw_query(month, name)
        for name in [
            "ai_failures_monthly",
            "ai_failures_by_problem_monthly",
            "ai_breakdown_monthly",
            "login_users_monthly",
        ]
    }
    for name, raw in raws.items():
        warn_failed(warnings, name, raw)

    def by_month(name: str) -> dict[str, list[Any]]:
        return {str(row[0])[:7]: row[1:] for row in rows(raws[name])}

    def coverages(events: tuple[str, ...]) -> tuple[str, str, bool]:
        current = month_coverage(first_seen, events, month)
        previous = month_coverage(first_seen, events, previous_month)
        return current, previous, month_complete and current == previous == "complete"

    def value(rows_by_month: dict[str, list[Any]], item: str, index: int, coverage: str) -> Any:
        if coverage == "none":
            return None
        row = rows_by_month.get(item)
        return number(row[index]) if row else 0

    result: dict[str, Any] = {}

    failure_coverage, previous_failure_coverage, failures_comparable = coverages(("ai_task_generation_failed",))
    if not query_failed(raws["ai_failures_monthly"]):
        totals = by_month("ai_failures_monthly")
        current_users = value(totals, month, 1, failure_coverage)
        previous_users = value(totals, previous_month, 1, previous_failure_coverage)
        current_count = value(totals, month, 0, failure_coverage)
        previous_count = value(totals, previous_month, 0, previous_failure_coverage)
        result["ai_failures"] = {
            "coverage": failure_coverage,
            "previous_coverage": previous_failure_coverage,
            "failure_count": current_count,
            "failure_users": current_users,
            "previous_failure_count": previous_count,
            "previous_failure_users": previous_users,
            "failure_count_change_ratio": (
                change_ratio(current_count, previous_count) if failures_comparable else None
            ),
            "failure_users_change_ratio": (
                change_ratio(current_users, previous_users) if failures_comparable else None
            ),
        }

    if not query_failed(raws["ai_failures_by_problem_monthly"]):
        problem_rows: dict[tuple[str, str], list[Any]] = {
            (str(row[0])[:7], row[1]): row[2:] for row in rows(raws["ai_failures_by_problem_monthly"])
        }

        def problem_value(item: str, problem: str, index: int, coverage: str) -> Any:
            if coverage == "none":
                return None
            row = problem_rows.get((item, problem))
            return number(row[index]) if row else 0

        by_problem = []
        for problem in [key for key, _ in AI_FAILURE_PROBLEMS] + ["other"]:
            record = {
                "problem": problem,
                "error_codes": dict(AI_FAILURE_PROBLEMS).get(problem, ()),
                "failure_count": problem_value(month, problem, 0, failure_coverage),
                "failure_users": problem_value(month, problem, 1, failure_coverage),
                "previous_failure_count": problem_value(previous_month, problem, 0, previous_failure_coverage),
                "previous_failure_users": problem_value(previous_month, problem, 1, previous_failure_coverage),
            }
            if problem == "other" and not record["failure_count"] and not record["previous_failure_count"]:
                continue
            record["error_codes"] = list(record["error_codes"])
            record["failure_count_change_ratio"] = (
                change_ratio(record["failure_count"], record["previous_failure_count"])
                if failures_comparable
                else None
            )
            record["failure_users_change_ratio"] = (
                change_ratio(record["failure_users"], record["previous_failure_users"])
                if failures_comparable
                else None
            )
            by_problem.append(record)
        by_problem.sort(key=lambda record: -(record["failure_count"] or 0))
        result["ai_failures_by_problem"] = by_problem
        write_csv(
            normalized_dir / "posthog_ai_failures_by_problem.csv",
            [
                "problem",
                "failure_count",
                "failure_users",
                "previous_failure_count",
                "previous_failure_users",
                "failure_count_change_ratio",
                "failure_users_change_ratio",
            ],
            [{key: value for key, value in record.items() if key != "error_codes"} for record in by_problem],
        )

    if not query_failed(raws["ai_breakdown_monthly"]):
        breakdown = by_month("ai_breakdown_monthly")
        current_coverage, previous_coverage, comparable = coverages(("breakdown_task",))
        current = {
            "user_count": value(breakdown, month, 1, current_coverage),
            "success_rate": value(breakdown, month, 2, current_coverage) if breakdown.get(month) else None,
            "average_duration_ms": value(breakdown, month, 3, current_coverage) if breakdown.get(month) else None,
        }
        previous = {
            "user_count": value(breakdown, previous_month, 1, previous_coverage),
            "success_rate": (
                value(breakdown, previous_month, 2, previous_coverage) if breakdown.get(previous_month) else None
            ),
            "average_duration_ms": (
                value(breakdown, previous_month, 3, previous_coverage) if breakdown.get(previous_month) else None
            ),
        }
        result["ai_breakdown"] = {
            "coverage": current_coverage,
            "previous_coverage": previous_coverage,
            **current,
            **{f"previous_{key}": item for key, item in previous.items()},
            "user_count_change_ratio": (
                change_ratio(current["user_count"], previous["user_count"]) if comparable else None
            ),
            "success_rate_change_points": (
                point_change(current["success_rate"], previous["success_rate"]) if comparable else None
            ),
            "average_duration_change_ms": (
                point_change(current["average_duration_ms"], previous["average_duration_ms"])
                if comparable
                else None
            ),
        }

    if not query_failed(raws["login_users_monthly"]):
        login = by_month("login_users_monthly")
        current_coverage, previous_coverage, comparable = coverages(("login_started", "login_succeeded"))
        started = value(login, month, 0, current_coverage)
        succeeded = value(login, month, 1, current_coverage)
        previous_started = value(login, previous_month, 0, previous_coverage)
        previous_succeeded = value(login, previous_month, 1, previous_coverage)
        success_ratio = ratio(succeeded, started)
        previous_success_ratio = ratio(previous_succeeded, previous_started)
        result["login"] = {
            "coverage": current_coverage,
            "coverage_start": (
                coverage_start(first_seen, ("login_started", "login_succeeded")).isoformat()
                if current_coverage == "partial"
                else None
            ),
            "previous_coverage": previous_coverage,
            "started_users": started,
            "succeeded_users": succeeded,
            "started_to_succeeded_ratio": success_ratio,
            "previous_started_users": previous_started,
            "previous_succeeded_users": previous_succeeded,
            "previous_started_to_succeeded_ratio": previous_success_ratio,
            "started_to_succeeded_change_points": (
                point_change(success_ratio, previous_success_ratio) if comparable else None
            ),
            "error_users": login_funnel.get("error_users"),
            "exit_only_users": login_funnel.get("exit_only_users"),
            "no_outcome_users": login_funnel.get("no_outcome_users"),
        }
    return result


def main() -> int:
    parser = build_parser("Normalize Blotz monthly PostHog raw query responses.")
    args = parser.parse_args()

    try:
        month = args.month
        paths = ensure_month_dirs(month)
    except Exception as error:  # noqa: BLE001
        print(f"Invalid --month: {error}", file=sys.stderr)
        return 2

    normalized_dir = paths["normalized"]
    warnings: list[str] = []
    if not (paths["raw_posthog"] / "_metadata.json").exists():
        warnings.append("PostHog raw collection metadata is missing; run collect-posthog before normalization.")

    activity = normalize_activity(month, normalized_dir, warnings)
    manual_tasks = normalize_manual_tasks(month, normalized_dir, warnings, activity["mau"])
    ai_task_generation = normalize_ai_sessions(month, normalized_dir, warnings)
    ai_failures = normalize_ai_failures(month, normalized_dir, warnings)
    ai_breakdown = normalize_ai_breakdown(month, normalized_dir, warnings)
    notes = normalize_notes(month, normalized_dir, warnings)
    screen_views = normalize_screen_views(month, normalized_dir, warnings)
    event_inventory = normalize_event_inventory(month, normalized_dir, warnings)
    first_seen = event_first_seen_dates(event_inventory)
    as_of = datetime.now(timezone.utc).date()
    month_complete = as_of >= month_bounds(month)[1]
    installation_retention = normalize_installation_retention(
        month, normalized_dir, warnings, first_seen, as_of
    )
    ai_manual_combinations = normalize_ai_manual_combinations(month, normalized_dir, warnings)
    audience = normalize_audience(month, normalized_dir, warnings)
    historical_install_proxy = normalize_historical_install_proxy(month, normalized_dir, warnings)
    login_funnel = normalize_login_funnel(month, normalized_dir, warnings)
    new_users = normalize_new_users(month, normalized_dir, warnings, first_seen, as_of)
    user_lifecycle = normalize_user_lifecycle(
        month, normalized_dir, warnings, first_seen, activity, month_complete
    )
    feature_usage = normalize_feature_usage(month, normalized_dir, warnings, first_seen, month_complete)
    reliability = normalize_reliability(
        month, normalized_dir, warnings, first_seen, month_complete, login_funnel
    )

    summary = {
        "report_context": {"as_of": as_of.isoformat(), "month_complete": month_complete},
        "new_users": new_users,
        "user_lifecycle": user_lifecycle,
        "feature_usage": feature_usage,
        "reliability": reliability,
        "activity": activity,
        "manual_tasks": manual_tasks,
        "ai_task_generation": ai_task_generation,
        "ai_failures": ai_failures,
        "ai_breakdown": ai_breakdown,
        "notes": notes,
        "screen_views": screen_views,
        "event_inventory": event_inventory,
        "installation_retention": installation_retention,
        "ai_manual_combinations": ai_manual_combinations,
        "audience": audience,
        "historical_install_proxy": historical_install_proxy,
        "login_funnel": login_funnel,
        "warnings": warnings,
    }
    write_json(normalized_dir / "posthog_summary.json", summary)
    print(f"Normalized PostHog metrics for {month}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
