from __future__ import annotations

import html
import math
import re
from datetime import date, datetime, timedelta
from html.parser import HTMLParser
from typing import Any, Callable


CHART_WIDTH = 760
CHART_HEIGHT = 300
PLOT_LEFT = 52
PLOT_RIGHT = 20
PLOT_TOP = 30
PLOT_BOTTOM = 54
MAX_RETENTION_COHORTS = 6
PLACEHOLDER_CLASSES = {"retention-trend", "failure-trend"}


class TrendPlaceholderValidator(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[tuple[str, str | None]] = []
        self.counts = {name: 0 for name in PLACEHOLDER_CLASSES}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.stack and self.stack[-1][1] is not None:
            raise ValueError("Trend chart placeholders must be empty.")

        attributes = dict(attrs)
        classes = (attributes.get("class") or "").split()
        placeholders = [name for name in classes if name in PLACEHOLDER_CLASSES]
        placeholder = placeholders[0] if placeholders else None
        if placeholder is not None:
            if tag != "div" or len(attrs) != 1 or classes != [placeholder]:
                raise ValueError("Trend chart placeholders must be empty divs with one class.")
            self.counts[placeholder] += 1
        self.stack.append((tag, placeholder))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        classes = (dict(attrs).get("class") or "").split()
        if any(name in PLACEHOLDER_CLASSES for name in classes):
            raise ValueError("Trend chart placeholders must use explicit closing tags.")

    def handle_data(self, data: str) -> None:
        if self.stack and self.stack[-1][1] is not None and data.strip():
            raise ValueError("Trend chart placeholders must be empty.")

    def handle_endtag(self, tag: str) -> None:
        if not self.stack or self.stack[-1][0] != tag:
            return
        self.stack.pop()


def has_trend_placeholders(content: str) -> bool:
    return any(name in content for name in PLACEHOLDER_CLASSES)


def render_trend_placeholders(
    content: str,
    snapshot: dict[str, Any],
    month: str,
) -> str:
    if snapshot.get("month") != month:
        raise ValueError("Trend chart snapshot month does not match the report month.")

    validator = TrendPlaceholderValidator()
    validator.feed(content)
    validator.close()

    renderers: dict[str, Callable[[dict[str, Any], str], str]] = {
        "retention-trend": render_retention_chart,
        "failure-trend": render_failure_chart,
    }
    rendered = content
    for class_name, renderer in renderers.items():
        pattern = re.compile(
            rf"<div\s+class\s*=\s*([\"']){class_name}\1\s*>\s*</div\s*>",
            re.IGNORECASE,
        )
        replacement = renderer(snapshot, month)
        rendered, replacements = pattern.subn(lambda _: replacement, rendered)
        if replacements != validator.counts[class_name]:
            raise ValueError(f"Could not safely replace {class_name} placeholder.")
    return rendered


def render_retention_chart(snapshot: dict[str, Any], month: str) -> str:
    posthog = _posthog(snapshot)
    retention = posthog.get("installation_retention")
    if not isinstance(retention, dict):
        return ""
    raw_cohorts = retention.get("cohorts")
    if not isinstance(raw_cohorts, list):
        return ""

    target = _month_start(month)
    cohorts: list[dict[str, Any]] = []
    for raw in raw_cohorts:
        if not isinstance(raw, dict):
            continue
        cohort_date = _parse_date(raw.get("cohort"), "retention cohort")
        if cohort_date > target:
            continue
        d1 = _mature_rate(raw, "d1")
        d7 = _mature_rate(raw, "d7")
        if d1 is None and d7 is None:
            continue
        cohorts.append(
            {
                "date": cohort_date,
                "label": cohort_date.strftime("%Y-%m"),
                "d1": d1,
                "d7": d7,
            }
        )

    cohorts.sort(key=lambda item: item["date"])
    cohorts = cohorts[-MAX_RETENTION_COHORTS:]
    if len(cohorts) < 2:
        return ""

    series = [
        (
            "次日回访率",
            "primary",
            [item["d1"] * 100 if item["d1"] is not None else None for item in cohorts],
        ),
        (
            "第 7 天回访率",
            "secondary",
            [item["d7"] * 100 if item["d7"] is not None else None for item in cohorts],
        ),
    ]
    maximum = max(
        value
        for _, _, values in series
        for value in values
        if value is not None
    )
    caption = (
        f"仅展示截至 {month} 已成熟的次日和第 7 天回访；"
        "精确值与样本量见相邻数据表。"
    )
    return _render_line_chart(
        chart_id="retention-chart",
        title="按安装月份分组的回访趋势",
        description="展示已成熟安装月份的次日和第 7 天回访率。",
        labels=[item["label"] for item in cohorts],
        series=series,
        maximum=maximum,
        value_formatter=lambda value: f"{_format_number(value)}%",
        caption=caption,
    )


def render_failure_chart(snapshot: dict[str, Any], month: str) -> str:
    posthog = _posthog(snapshot)
    ai_failures = posthog.get("ai_failures")
    if not isinstance(ai_failures, dict):
        return ""
    raw_weekly = ai_failures.get("weekly")
    if not isinstance(raw_weekly, list):
        return ""

    month_start = _month_start(month)
    month_end = _next_month(month_start)
    first_seen = _failure_first_seen(posthog)
    rows: list[dict[str, Any]] = []
    for raw in raw_weekly:
        if not isinstance(raw, dict):
            continue
        week = _parse_date(raw.get("week"), "failure week")
        week_end = week + timedelta(days=6)
        if week_end < month_start or week >= month_end:
            continue
        count = _non_negative_number(raw.get("failure_count"), "failure count")
        partial = week < month_start or week_end >= month_end
        if first_seen is not None and week < first_seen <= week_end:
            partial = True
        rows.append(
            {
                "date": week,
                "label": week.strftime("%m-%d") + ("*" if partial else ""),
                "count": count,
                "partial": partial,
            }
        )

    rows.sort(key=lambda item: item["date"])
    if len(rows) < 2:
        return ""

    caption = "星号表示该周数据覆盖不完整，不用于判断趋势已改善或恶化。"
    return _render_line_chart(
        chart_id="failure-chart",
        title="AI 失败事件周变化",
        description="展示目标月各周记录到的 AI 失败事件数。",
        labels=[item["label"] for item in rows],
        series=[("失败事件", "critical", [item["count"] for item in rows])],
        maximum=max(item["count"] for item in rows),
        value_formatter=_format_number,
        caption=caption,
        show_values=True,
    )


def _render_line_chart(
    *,
    chart_id: str,
    title: str,
    description: str,
    labels: list[str],
    series: list[tuple[str, str, list[float | None]]],
    maximum: float,
    value_formatter: Callable[[float], str],
    caption: str,
    show_values: bool = False,
) -> str:
    y_max, step = _nice_scale(maximum)
    plot_width = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT
    plot_height = CHART_HEIGHT - PLOT_TOP - PLOT_BOTTOM
    x_positions = [
        PLOT_LEFT + (plot_width * index / max(1, len(labels) - 1))
        for index in range(len(labels))
    ]

    parts = [
        '<figure class="trend-chart">',
        '<div class="trend-chart-scroll">',
        (
            f'<svg class="trend-svg" viewBox="0 0 {CHART_WIDTH} {CHART_HEIGHT}" '
            f'role="img" aria-labelledby="{chart_id}-title {chart_id}-description">'
        ),
        f'<title id="{chart_id}-title">{html.escape(title)}</title>',
        f'<desc id="{chart_id}-description">{html.escape(description)}</desc>',
    ]

    tick = 0.0
    while tick <= y_max + step / 2:
        y = PLOT_TOP + plot_height - (tick / y_max * plot_height)
        parts.append(
            f'<line class="trend-grid" x1="{PLOT_LEFT}" y1="{y:.1f}" '
            f'x2="{CHART_WIDTH - PLOT_RIGHT}" y2="{y:.1f}"></line>'
        )
        parts.append(
            f'<text class="trend-axis-label" x="{PLOT_LEFT - 8}" y="{y + 4:.1f}" '
            f'text-anchor="end">{html.escape(value_formatter(tick))}</text>'
        )
        tick += step

    for x, label in zip(x_positions, labels, strict=True):
        parts.append(
            f'<text class="trend-axis-label" x="{x:.1f}" y="{CHART_HEIGHT - 20}" '
            f'text-anchor="middle">{html.escape(label)}</text>'
        )

    for series_index, (label, tone, values) in enumerate(series):
        points: list[tuple[int, float, float, float]] = []
        for index, value in enumerate(values):
            if value is None:
                continue
            display_value = value
            x = x_positions[index]
            y = PLOT_TOP + plot_height - (display_value / y_max * plot_height)
            points.append((index, x, y, display_value))

        for segment in _contiguous_segments(points):
            if len(segment) < 2:
                continue
            coordinates = " ".join(f"{x:.1f},{y:.1f}" for _, x, y, _ in segment)
            parts.append(
                f'<polyline class="trend-line trend-{tone}" points="{coordinates}"></polyline>'
            )
        for _, x, y, display_value in points:
            parts.append(
                f'<circle class="trend-point trend-{tone}" cx="{x:.1f}" cy="{y:.1f}" r="4"></circle>'
            )
            if show_values:
                parts.append(
                    f'<text class="trend-point-label" x="{x:.1f}" y="{y - 10:.1f}" '
                    f'text-anchor="middle">{html.escape(value_formatter(display_value))}</text>'
                )

        legend_x = CHART_WIDTH - PLOT_RIGHT - (len(series) - series_index) * 126
        parts.append(
            f'<line class="trend-legend-line trend-{tone}" x1="{legend_x}" y1="14" '
            f'x2="{legend_x + 20}" y2="14"></line>'
        )
        parts.append(
            f'<text class="trend-legend-label" x="{legend_x + 27}" y="18">'
            f'{html.escape(label)}</text>'
        )

    parts.extend(
        [
            "</svg>",
            "</div>",
            f'<figcaption class="trend-caption">{html.escape(caption)}</figcaption>',
            "</figure>",
        ]
    )
    return "".join(parts)


def _posthog(snapshot: dict[str, Any]) -> dict[str, Any]:
    metrics = snapshot.get("metrics")
    if not isinstance(metrics, dict):
        return {}
    posthog = metrics.get("posthog")
    return posthog if isinstance(posthog, dict) else {}


def _mature_rate(row: dict[str, Any], prefix: str) -> float | None:
    if row.get(f"{prefix}_mature") is not True or row.get(f"{prefix}_rate") is None:
        return None
    rate = _finite_number(row[f"{prefix}_rate"], f"{prefix} retention rate")
    if rate < 0 or rate > 1:
        raise ValueError(f"{prefix} retention rate must be between 0 and 1.")
    return rate


def _failure_first_seen(posthog: dict[str, Any]) -> date | None:
    inventory = posthog.get("event_inventory")
    if not isinstance(inventory, dict) or not isinstance(inventory.get("events"), list):
        return None
    for event in inventory["events"]:
        if isinstance(event, dict) and event.get("event") == "ai_task_generation_failed":
            value = event.get("first_seen")
            if not isinstance(value, str) or not value:
                return None
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
            except ValueError as error:
                raise ValueError("Invalid ai_task_generation_failed first_seen date.") from error
    return None


def _parse_date(value: Any, field: str) -> date:
    if not isinstance(value, str):
        raise ValueError(f"Invalid {field} date.")
    try:
        return date.fromisoformat(value[:10])
    except ValueError as error:
        raise ValueError(f"Invalid {field} date.") from error


def _finite_number(value: Any, field: str) -> float:
    if isinstance(value, bool):
        raise ValueError(f"Invalid {field}.")
    try:
        result = float(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Invalid {field}.") from error
    if not math.isfinite(result):
        raise ValueError(f"Invalid {field}.")
    return result


def _non_negative_number(value: Any, field: str) -> float:
    result = _finite_number(value, field)
    if result < 0:
        raise ValueError(f"{field} must be non-negative.")
    return result


def _month_start(month: str) -> date:
    try:
        return date.fromisoformat(f"{month}-01")
    except ValueError as error:
        raise ValueError("Invalid chart month.") from error


def _next_month(value: date) -> date:
    if value.month == 12:
        return date(value.year + 1, 1, 1)
    return date(value.year, value.month + 1, 1)


def _nice_scale(maximum: float) -> tuple[float, float]:
    maximum = max(1.0, maximum)
    rough_step = maximum / 5
    magnitude = 10 ** math.floor(math.log10(rough_step))
    fraction = rough_step / magnitude
    if fraction <= 1:
        nice_fraction = 1
    elif fraction <= 2:
        nice_fraction = 2
    elif fraction <= 5:
        nice_fraction = 5
    else:
        nice_fraction = 10
    step = nice_fraction * magnitude
    return math.ceil(maximum / step) * step, step


def _contiguous_segments(
    points: list[tuple[int, float, float, float]],
) -> list[list[tuple[int, float, float, float]]]:
    segments: list[list[tuple[int, float, float, float]]] = []
    for point in points:
        if not segments or point[0] != segments[-1][-1][0] + 1:
            segments.append([point])
        else:
            segments[-1].append(point)
    return segments


def _format_number(value: float) -> str:
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.1f}".rstrip("0").rstrip(".")
