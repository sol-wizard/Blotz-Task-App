#!/usr/bin/env python3
from __future__ import annotations

import sys
from typing import Any

from monthly_report_common import (
    build_parser,
    ensure_month_dirs,
    parse_month,
    read_json,
    utc_now_iso,
    write_json,
)


EMPTY_APP_STORE = {
    "downloads": None,
    "first_time_downloads": None,
    "redownloads": None,
    "app_updates": None,
    "restores": None,
    "product_page_views": None,
    "product_page_gets": None,
    "conversion_rate": None,
    "top_sources": [],
    "top_territories": [],
    "coverage": {
        "downloads": False,
        "product_page_views": False,
        "product_page_gets": False,
    },
    "selected_instances": [],
}


EMPTY_POSTHOG = {
    "activity": {
        "mau": None,
        "wau_average": None,
        "dau_average": None,
        "active_days_per_user_average": None,
        "active_day_tiers": [],
    },
    "manual_tasks": {
        "created_count": None,
        "creator_count": None,
        "created_per_active_user": None,
    },
    "ai_task_generation": {
        "session_count": None,
        "user_count": None,
        "accepted_sessions": None,
        "rejected_sessions": None,
        "abandoned_sessions": None,
        "acceptance_rate": None,
        "voice_session_count": None,
        "text_session_count": None,
        "voice_only_session_count": None,
        "text_only_session_count": None,
        "mixed_input_session_count": None,
        "unknown_input_mode_session_count": None,
        "average_turns_per_session": None,
        "average_generated_tasks_per_session": None,
        "average_generated_notes_per_session": None,
    },
    "ai_failures": {
        "failure_count": None,
        "failure_users": None,
        "by_stage": [],
        "by_error_code": [],
        "by_stage_and_error_code": [],
        "weekly": [],
    },
    "ai_breakdown": {
        "usage_count": None,
        "user_count": None,
        "success_rate": None,
        "average_duration_ms": None,
        "average_subtask_count": None,
    },
    "notes": {
        "created_count": None,
        "manual_created_count": None,
        "ai_created_count": None,
        "unknown_created_count": None,
        "ai_share": None,
    },
    "screen_views": {
        "notes_views": None,
        "notes_viewers": None,
        "gashapon_views": None,
        "gashapon_viewers": None,
    },
    "event_inventory": {"event_count": None, "events": []},
    "installation_retention": {"as_of": None, "cohorts": []},
    "ai_manual_combinations": [],
    "audience": {"countries": [], "app_versions": []},
    "historical_install_proxy": {
        "installed_users": None,
        "identified_users": None,
        "identified_user_ratio": None,
        "authenticated_active_users": None,
        "authenticated_active_ratio": None,
        "is_strict_funnel": False,
    },
}


def deep_merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = dict(base)
    for key, value in override.items():
        if key == "warnings":
            continue
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = deep_merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def status_from_file(data: Any) -> str:
    if not data:
        return "skipped"
    return "ok"


def posthog_status(
    posthog_summary: dict[str, Any],
    posthog_metadata: dict[str, Any],
    requested: bool,
) -> str:
    if not requested:
        return "skipped"
    if not posthog_metadata or not posthog_summary:
        return "failed"
    queries = posthog_metadata.get("queries", [])
    if not queries:
        return "failed"
    failed_queries = [
        item for item in queries if item.get("status") != "ok"
    ]
    if len(failed_queries) == len(queries):
        return "failed"
    if failed_queries:
        return "partial"
    return "ok"


def app_store_status(
    app_store_summary: dict[str, Any],
    app_store_metadata: dict[str, Any],
    requested: bool,
) -> str:
    if not requested:
        return "skipped"
    if not app_store_summary:
        return "failed"
    coverage = app_store_summary.get("coverage", {})
    required_coverage = [
        coverage.get("downloads") is True,
        coverage.get("product_page_views") is True,
        coverage.get("product_page_gets") is True,
    ]
    if all(required_coverage):
        return "ok"
    if any(required_coverage):
        return "partial"
    return "failed"


def check(name: str, status: str, details: str) -> dict[str, str]:
    return {"name": name, "status": status, "details": details}


def unique(values: list[Any]) -> list[Any]:
    result: list[Any] = []
    seen: set[str] = set()
    for value in values:
        key = str(value)
        if key in seen:
            continue
        seen.add(key)
        result.append(value)
    return result


def source_requested(sources: str, source: str) -> bool:
    return sources == "all" or sources == source


def main() -> int:
    parser = build_parser("Build Blotz monthly metrics summary and data-quality files.")
    parser.add_argument(
        "--sources",
        choices=["all", "posthog", "app-store"],
        default="all",
        help="Sources requested by the parent collection run.",
    )
    args = parser.parse_args()

    try:
        month, _, _ = parse_month(args.month)
    except Exception as error:  # noqa: BLE001
        print(f"Invalid --month: {error}", file=sys.stderr)
        return 2

    paths = ensure_month_dirs(month)
    normalized_dir = paths["normalized"]
    raw_posthog_dir = paths["raw_posthog"]

    posthog_summary = read_json(normalized_dir / "posthog_summary.json", {})
    app_store_summary = read_json(normalized_dir / "app_store_summary.json", {})
    posthog_metadata = read_json(raw_posthog_dir / "_metadata.json", {})
    app_store_metadata = read_json(paths["raw_app_store"] / "_metadata.json", {})
    posthog_requested = source_requested(args.sources, "posthog")
    app_store_requested = source_requested(args.sources, "app-store")
    current_posthog_status = posthog_status(
        posthog_summary,
        posthog_metadata,
        requested=posthog_requested,
    )
    current_app_store_status = app_store_status(
        app_store_summary,
        app_store_metadata,
        requested=app_store_requested,
    )

    posthog = deep_merge(EMPTY_POSTHOG, posthog_summary)
    app_store = deep_merge(EMPTY_APP_STORE, app_store_summary)
    summary = {
        "month": month,
        "app_store": app_store,
        "posthog": posthog,
    }
    write_json(normalized_dir / "monthly_metrics_summary.json", summary)

    query_warnings = [
        f"PostHog query `{item.get('name')}` returned {item.get('status')}: {item.get('reason')}"
        for item in posthog_metadata.get("queries", [])
        if item.get("status") != "ok"
    ]
    posthog_warnings = (
        list(posthog_summary.get("warnings", [])) + query_warnings
        if posthog_requested
        else []
    )
    app_store_warnings = (
        list(app_store_summary.get("warnings", [])) if app_store_requested else []
    )
    if app_store_requested and app_store_metadata.get("warnings"):
        app_store_warnings.extend(app_store_metadata["warnings"])
    app_store_warnings = unique(app_store_warnings)
    if app_store_requested and not app_store_summary and not app_store_metadata:
        app_store_warnings.append("App Store collection has not been implemented or was not run.")

    manifest = {
        "month": month,
        "generated_at": utc_now_iso(),
        "sources": {
            "app_store_connect": {
                "status": current_app_store_status,
                "data_complete_through": app_store_metadata.get("data_complete_through"),
                "warnings": app_store_warnings,
            },
            "posthog": {
                "status": current_posthog_status,
                "project_id": posthog_metadata.get("project_id"),
                "events_queried": posthog_metadata.get("events_queried", []),
                "warnings": posthog_warnings,
            },
        },
    }
    write_json(paths["base"] / "manifest.json", manifest)

    checks: list[dict[str, str]] = []
    if app_store_requested:
        checks.append(
            check(
                "app_store_data_present",
                "pass" if current_app_store_status == "ok" else "warning",
                {
                    "ok": "Required App Store normalized metrics are present.",
                    "partial": "Only part of the required App Store metrics is available.",
                    "failed": "App Store collection produced no usable required metrics.",
                }[current_app_store_status],
            )
        )
    if posthog_requested:
        checks.extend(
            [
                check(
                    "posthog_activity_events_present",
                    "pass" if posthog["activity"]["mau"] is not None else "warning",
                    "PostHog active user metrics are present."
                    if posthog["activity"]["mau"] is not None
                    else "PostHog active user metrics are missing or unavailable.",
                ),
                check(
                    "posthog_ai_session_events_present",
                    "pass"
                    if posthog["ai_task_generation"]["session_count"] is not None
                    else "warning",
                    "AI task generation session metrics are present."
                    if posthog["ai_task_generation"]["session_count"] is not None
                    else "AI task generation session metrics are missing or unavailable.",
                ),
                check(
                    "manual_task_recurring_deadline_properties",
                    "warning",
                    "`create_task_manually` currently defaults recurring/deadline properties because callers do not pass them.",
                ),
                check(
                    "screen_coverage",
                    "warning",
                    "`screen_viewed` currently covers only Notes and GashaponMachine; do not infer full feature usage.",
                ),
            ]
        )
    checks.append(
        check(
            "unsupported_metrics_not_collected",
            "pass",
            "Unsupported first-version metrics were not inferred or collected.",
        )
    )
    if posthog_requested and posthog_warnings:
        checks.append(
            check(
                "posthog_query_warnings",
                "warning",
                f"{len(posthog_warnings)} PostHog warning(s) were recorded in manifest.json.",
            )
        )
    write_json(paths["base"] / "data-quality.json", {"month": month, "checks": checks})

    print(f"Built monthly metrics summary for {month}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
