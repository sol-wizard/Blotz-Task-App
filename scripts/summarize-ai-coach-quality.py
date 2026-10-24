#!/usr/bin/env python3
"""Summarize CoachConversationQualityTests runs; pass two run directories to compare them side by side.

Prices are estimates per million tokens (input, cached input, output), not invoices.
"""

import argparse
import json
import statistics
from collections import defaultdict
from pathlib import Path


def load(directory: Path) -> list[dict]:
    records = [json.loads(path.read_text()) for path in sorted(directory.glob("*.json"))]
    records = [r for r in records if r.get("suite") == "conversation-quality"]
    if not records:
        raise ValueError(f"No conversation-quality records in {directory}")
    return records


def rate(values: list[bool]) -> str:
    return f"{sum(values)}/{len(values)}" if values else "-"


def summarize(records: list[dict], prices: tuple[float, float, float] | None) -> dict[str, str]:
    rows: dict[str, str] = {}
    header = records[0]["header"]
    rows["model / transport"] = f'{header["deployment"]} / {header["transport"]}'
    rows["prompt / judge"] = f'{header["promptVersion"]} / {header["judgeDeployment"]}'

    checks: dict[tuple[str, str, str], list[bool]] = defaultdict(list)
    turns = [(r, t) for r in records for t in r["turns"]]
    for record, turn in turns:
        for kind in ("business", "tone"):
            for name, passed in turn[kind].items():
                checks[(kind, record["id"], name)].append(passed)
    for (kind, scenario, name), values in sorted(checks.items()):
        rows[f"{kind}: {scenario} · {name}"] = rate(values)
    failures = [f for _, t in turns for f in t["businessFailures"]]
    rows["business failures (must be 0)"] = str(len(failures))

    judged: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        verdict = (record.get("aiEvaluation") or {}).get("verdict")
        judged[record["id"]].append(verdict)
    for scenario, verdicts in sorted(judged.items()):
        done = [v for v in verdicts if v]
        score = f', avg {statistics.mean(v["overallScore"] for v in done):.1f}' if done else ""
        rows[f"judge: {scenario}"] = f'{rate([v["overallPassed"] for v in done])} passed{score}' + (
            f" ({len(verdicts) - len(done)} unavailable)" if len(done) < len(verdicts) else "")

    replies = [(r, t) for r, t in turns if t.get("reply")]
    factual = [len(t["reply"]) for r, t in replies if r["category"] == "basic" and r["id"] == "factual"]
    other = [len(t["reply"]) for r, t in replies if r["id"] != "factual"]
    rows["avg chars (non-factual / factual)"] = (
        f'{round(statistics.mean(other)) if other else "-"} / {round(statistics.mean(factual)) if factual else "-"}')
    rows["'听起来' count"] = str(sum(t["reply"].count("听起来") for _, t in replies))
    rows["turns with errors"] = str(sum(1 for _, t in turns if t.get("error")))
    elapsed = sorted(t["elapsedMs"] / 1000 for _, t in turns if not t.get("error"))
    if elapsed:
        rows["latency median / p90 (s)"] = f"{statistics.median(elapsed):.1f} / {elapsed[int(len(elapsed) * .9)]:.1f}"
    inputs = [t["inputTokens"] for _, t in turns]
    cached = [t["cachedInputTokens"] for _, t in turns]
    outputs = [t["outputTokens"] for _, t in turns]
    rows["avg tokens input / cached / output"] = (
        f"{round(statistics.mean(inputs))} / {round(statistics.mean(cached))} / {round(statistics.mean(outputs))}")
    if prices:
        input_price, cache_price, output_price = prices
        cost = [((i - c) * input_price + c * cache_price + o * output_price) / 1e6 for i, c, o in zip(inputs, cached, outputs)]
        rows["est. USD per turn (estimate)"] = f"{statistics.mean(cost):.5f}"
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("runs", nargs="+", type=Path, help="one or two quality-* run directories")
    parser.add_argument("--prices", nargs=3, type=float, metavar=("INPUT", "CACHED", "OUTPUT"),
                        help="USD per million tokens for the first run's model")
    parser.add_argument("--prices-b", nargs=3, type=float, metavar=("INPUT", "CACHED", "OUTPUT"),
                        help="USD per million tokens for the second run's model")
    args = parser.parse_args()
    if len(args.runs) > 2:
        parser.error("pass one or two run directories")
    summaries = [summarize(load(args.runs[0]), args.prices)]
    if len(args.runs) == 2:
        summaries.append(summarize(load(args.runs[1]), args.prices_b))
    keys = list(dict.fromkeys(k for s in summaries for k in s))
    width = max(len(k) for k in keys)
    for key in keys:
        print(f"{key:<{width}}  " + "  ".join(f"{s.get(key, '-'):<28}" for s in summaries).rstrip())


if __name__ == "__main__":
    main()
