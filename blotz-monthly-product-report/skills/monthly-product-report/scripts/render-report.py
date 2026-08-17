#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import math
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path

from monthly_report_common import REPOSITORY_ROOT, SKILL_ROOT, parse_month
from report_trend_charts import has_trend_placeholders, render_trend_placeholders


ALLOWED_TAGS = {
    "article",
    "aside",
    "blockquote",
    "br",
    "code",
    "div",
    "h2",
    "h3",
    "li",
    "ol",
    "p",
    "progress",
    "section",
    "span",
    "strong",
    "table",
    "tbody",
    "td",
    "th",
    "thead",
    "tr",
    "ul",
}
ALLOWED_CLASSES = {
    "appendix",
    "data-note",
    "decision-copy",
    "decision-item",
    "decision-list",
    "decision-meta",
    "distribution-accent",
    "distribution-bar",
    "distribution-critical",
    "distribution-good",
    "distribution-label",
    "distribution-list",
    "distribution-row",
    "distribution-value",
    "evidence-column",
    "evidence-grid",
    "issue",
    "issue-critical",
    "issue-warning",
    "metric-label",
    "metric-note",
    "metric-value",
    "priority",
    "failure-trend",
    "retention-trend",
    "section-intro",
    "signal",
    "signal-grid",
    "signal-label",
    "signal-positive",
    "signal-risk",
    "source-status",
    "status-critical",
    "status-good",
    "status-warning",
    "summary-grid",
    "summary-metric",
    "table-wrap",
    "verdict",
}
PROGRESS_ATTRIBUTES = {"aria-label", "class", "max", "value"}
VOID_TAGS = {"br"}


class ReportFragmentValidator(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.open_tags: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._validate_tag_and_attrs(tag, attrs)
        if tag not in VOID_TAGS:
            self.open_tags.append(tag)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._validate_tag_and_attrs(tag, attrs)
        if tag not in VOID_TAGS:
            raise ValueError(f"Self-closing report tag is not allowed: <{tag}/>.")

    def handle_endtag(self, tag: str) -> None:
        if tag not in ALLOWED_TAGS:
            raise ValueError(f"Report tag is not allowed: </{tag}>.")
        if tag in VOID_TAGS:
            raise ValueError(f"Void report tag cannot have a closing tag: </{tag}>.")
        if not self.open_tags or self.open_tags[-1] != tag:
            expected = self.open_tags[-1] if self.open_tags else "none"
            raise ValueError(f"Mismatched report tag: expected </{expected}>, got </{tag}>.")
        self.open_tags.pop()

    def handle_comment(self, data: str) -> None:
        raise ValueError("HTML comments are not allowed in report content.")

    def handle_decl(self, decl: str) -> None:
        raise ValueError("HTML declarations are not allowed in report content.")

    def handle_pi(self, data: str) -> None:
        raise ValueError("Processing instructions are not allowed in report content.")

    def close(self) -> None:
        super().close()
        if self.open_tags:
            raise ValueError(f"Unclosed report tag: <{self.open_tags[-1]}>.")

    @staticmethod
    def _validate_tag_and_attrs(tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag not in ALLOWED_TAGS:
            raise ValueError(f"Report tag is not allowed: <{tag}>.")
        if tag == "progress":
            ReportFragmentValidator._validate_progress_attrs(attrs)
            return
        if len(attrs) > 1 or (attrs and attrs[0][0] != "class"):
            raise ValueError(f"Only one class attribute is allowed on <{tag}>.")
        if not attrs:
            return
        ReportFragmentValidator._validate_classes(tag, attrs[0][1])

    @staticmethod
    def _validate_classes(tag: str, value: str | None) -> list[str]:
        class_names = (value or "").split()
        if not class_names or any(name not in ALLOWED_CLASSES for name in class_names):
            raise ValueError(f"Report contains an unsupported class on <{tag}>.")
        return class_names

    @staticmethod
    def _validate_progress_attrs(attrs: list[tuple[str, str | None]]) -> None:
        values: dict[str, str | None] = {}
        for name, value in attrs:
            if name in values:
                raise ValueError(f"Duplicate report attribute on <progress>: {name}.")
            values[name] = value

        if set(values) != PROGRESS_ATTRIBUTES:
            raise ValueError(
                "Progress requires only class, value, max, and aria-label attributes."
            )

        class_names = ReportFragmentValidator._validate_classes("progress", values["class"])
        if "distribution-bar" not in class_names:
            raise ValueError("Progress must use the distribution-bar class.")

        if not (values["aria-label"] or "").strip():
            raise ValueError("Progress aria-label must not be empty.")

        try:
            value = float(values["value"] or "")
            maximum = float(values["max"] or "")
        except ValueError as error:
            raise ValueError("Progress value and max must be numeric.") from error

        if not math.isfinite(value) or not math.isfinite(maximum):
            raise ValueError("Progress value and max must be finite.")
        if maximum <= 0 or value < 0 or value > maximum:
            raise ValueError("Progress requires max > 0 and 0 <= value <= max.")


def validate_fragment(content: str) -> None:
    validator = ReportFragmentValidator()
    validator.feed(content)
    validator.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Render a Chinese Blotz monthly HTML report.")
    parser.add_argument("--month", required=True, help="Target month in YYYY-MM format.")
    parser.add_argument("--content-file", type=Path, required=True, help="AI-generated HTML fragment.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=REPOSITORY_ROOT / "reports",
        help="Directory containing monthly report folders.",
    )
    parser.add_argument("--consume", action="store_true", help="Delete the content fragment after rendering.")
    args = parser.parse_args()

    month, _, _ = parse_month(args.month)
    content_path = args.content_file.expanduser().resolve()
    content = content_path.read_text(encoding="utf-8").strip()
    if not content:
        raise ValueError("Report content is empty.")
    validate_fragment(content)

    report_dir = args.output_dir.expanduser().resolve() / month
    if has_trend_placeholders(content):
        snapshot_path = report_dir / "metrics-snapshot.json"
        if not snapshot_path.exists():
            raise ValueError("Trend chart placeholders require metrics-snapshot.json.")
        snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
        if not isinstance(snapshot, dict):
            raise ValueError("Metrics snapshot must be a JSON object.")
        content = render_trend_placeholders(content, snapshot, month)

    year, month_number = month.split("-", 1)
    title = f"Blotz {year}年{int(month_number)}月产品分析报告"
    shell_path = SKILL_ROOT / "assets" / "report-shell.html"
    shell = shell_path.read_text(encoding="utf-8")
    rendered = (
        shell.replace("{{REPORT_TITLE}}", html.escape(title))
        .replace("{{GENERATED_AT}}", html.escape(datetime.now().astimezone().strftime("生成时间：%Y-%m-%d %H:%M %Z")))
        .replace("{{PERIOD}}", html.escape(f"报告周期：{month}"))
        .replace("<!-- REPORT_CONTENT -->", content)
    )
    if "{{" in rendered or "REPORT_CONTENT" in rendered:
        raise ValueError("Report template contains unresolved placeholders.")

    report_dir.mkdir(parents=True, exist_ok=True)
    output_path = report_dir / "monthly-report.html"
    output_path.write_text(rendered + "\n", encoding="utf-8")
    if args.consume:
        content_path.unlink()
    print(f"HTML report: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
