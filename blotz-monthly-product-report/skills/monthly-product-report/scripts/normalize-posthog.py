#!/usr/bin/env python3
from __future__ import annotations

import csv
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from monthly_report_common import (
    build_parser,
    days_in_month,
    ensure_month_dirs,
    first_row,
    month_dir,
    number,
    ratio,
    read_json,
    rows,
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
    month: str, normalized_dir: Path, warnings: list[str]
) -> dict[str, Any]:
    raw = raw_query(month, "installation_retention")
    warn_failed(warnings, "installation_retention", raw)
    as_of = datetime.now(timezone.utc).date()
    records = []
    for row in rows(raw):
        cohort = str(row[0])
        users = number(row[1])
        d1_users = number(row[2])
        d7_users = number(row[3])
        d30_users = number(row[4])
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
    installation_retention = normalize_installation_retention(month, normalized_dir, warnings)
    ai_manual_combinations = normalize_ai_manual_combinations(month, normalized_dir, warnings)
    audience = normalize_audience(month, normalized_dir, warnings)
    historical_install_proxy = normalize_historical_install_proxy(month, normalized_dir, warnings)

    summary = {
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
        "warnings": warnings,
    }
    write_json(normalized_dir / "posthog_summary.json", summary)
    print(f"Normalized PostHog metrics for {month}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
