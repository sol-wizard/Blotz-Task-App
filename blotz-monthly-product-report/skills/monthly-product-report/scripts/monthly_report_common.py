from __future__ import annotations

import argparse
import calendar
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SKILL_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
OUTPUT_ROOT = Path(
    os.environ.get("BLOTZ_MONTHLY_WORK_DIR", REPOSITORY_ROOT / ".work")
).expanduser()


def parse_month(value: str) -> tuple[str, str, str]:
    year_text, month_text = value.split("-", 1)
    year = int(year_text)
    month = int(month_text)
    if month < 1 or month > 12:
        raise ValueError("month must be in YYYY-MM format")

    start = f"{year:04d}-{month:02d}-01 00:00:00"
    if month == 12:
        end = f"{year + 1:04d}-01-01 00:00:00"
    else:
        end = f"{year:04d}-{month + 1:02d}-01 00:00:00"
    return f"{year:04d}-{month:02d}", start, end


def days_in_month(month: str) -> int:
    year_text, month_text = month.split("-", 1)
    return calendar.monthrange(int(year_text), int(month_text))[1]


def month_date_bounds(month: str) -> tuple[str, str]:
    normalized, start, end = parse_month(month)
    return normalized, start[:10], end[:10]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_env_file(path: Path | None = None) -> None:
    candidates = [path or REPOSITORY_ROOT / ".env", REPOSITORY_ROOT / ".env.example"]

    for env_path in candidates:
        if not env_path.exists():
            continue
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if value and not os.environ.get(key):
                os.environ[key] = value


def require_env(names: list[str]) -> dict[str, str]:
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise RuntimeError("Missing required environment variables: " + ", ".join(missing))
    return {name: os.environ[name] for name in names}


def month_dir(month: str) -> Path:
    return OUTPUT_ROOT / month


def ensure_month_dirs(month: str) -> dict[str, Path]:
    base = month_dir(month)
    paths = {
        "base": base,
        "raw_app_store": base / "raw" / "app-store",
        "raw_posthog": base / "raw" / "posthog",
        "normalized": base / "normalized",
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    return paths


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def safe_slug(value: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-").lower()
    return slug or "unknown"


def first_row(raw: dict[str, Any]) -> list[Any] | None:
    results = raw.get("results")
    if isinstance(results, list) and results:
        row = results[0]
        if isinstance(row, list):
            return row
    return None


def rows(raw: dict[str, Any]) -> list[list[Any]]:
    results = raw.get("results")
    if not isinstance(results, list):
        return []
    return [row for row in results if isinstance(row, list)]


def number(value: Any) -> float | int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return value
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if parsed.is_integer():
        return int(parsed)
    return parsed


def ratio(numerator: float | int | None, denominator: float | int | None) -> float | None:
    if numerator is None or denominator in (None, 0):
        return None
    return round(float(numerator) / float(denominator), 6)


def build_parser(description: str) -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--month", required=True, help="Target month in YYYY-MM format.")
    return parser
