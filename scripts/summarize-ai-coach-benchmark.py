#!/usr/bin/env python3
"""Summarize actual CoachEvaluationHarness JSONL files; prices are estimates, not invoices."""

import argparse
import json
import math
import statistics
from pathlib import Path


def summarize(directory: Path, prices: tuple[float, float, float]) -> dict:
    records = [json.loads(path.read_text()) for path in sorted(directory.glob("*.jsonl"))]
    if not records:
        raise ValueError(f"No evaluation records in {directory}")
    identities = {(r["deployment"], r["sourceFingerprint"]) for r in records}
    if len(identities) != 1:
        raise ValueError("A run must contain one deployment and one source fingerprint")
    input_price, cache_price, output_price = prices
    turns = []
    cases = []
    judge_cost = 0.0
    for record in records:
        if record.get("judgeDeployment", "gpt-5.6-luna") != "gpt-5.6-luna":
            raise ValueError("Judge cost calculation requires the fixed GPT-5.6 Luna judge")
        for turn in record["turns"]:
            calls = [call["Response"] for call in turn["calls"]]
            inputs = sum(call["InputTokens"] for call in calls)
            cached = sum(call.get("CachedInputTokens", 0) for call in calls)
            outputs = sum(call["OutputTokens"] for call in calls)
            turns.append({
                "scenario": record["caseId"], "repetition": record["repetition"],
                "elapsedSeconds": turn["elapsedMs"] / 1000,
                "inputTokens": inputs, "cachedInputTokens": cached, "outputTokens": outputs,
                "modelCalls": len(calls), "hasError": "errorType" in turn or bool(turn.get("snapshot", {}).get("GenerationError")),
                "estimatedUsd": ((inputs - cached) * input_price + cached * cache_price + outputs * output_price) / 1e6,
                "uncachedEquivalentUsd": (inputs * input_price + outputs * output_price) / 1e6,
            })
        judge = record.get("aiEvaluation", {})
        # The benchmark command explicitly fixes the judge to Azure GPT-5.6 Luna.
        judge_cost += (judge.get("InputTokens", 0) * .2 + judge.get("OutputTokens", 0) * 1.2) / 1e6
        cases.append({"scenario": record["caseId"], "repetition": record["repetition"],
                      "objectiveStatus": record["objectiveStatus"],
                      "judgeStatus": judge.get("Status"), "verdict": judge.get("Verdict"),
                      "failure": record.get("failure")})
    successful = [turn for turn in turns if not turn["hasError"]]
    elapsed = sorted(turn["elapsedSeconds"] for turn in successful)
    return {
        "deployment": records[0]["deployment"], "sourceFingerprint": records[0]["sourceFingerprint"],
        "transport": records[0].get("transport", "chat"),
        "judgeDeployment": records[0].get("judgeDeployment", "gpt-5.6-luna"),
        "runDirectory": str(directory.resolve()), "pricesInputCachedOutputUsdPerMillion": prices,
        "conversations": len(records), "userMessages": len(turns),
        "objectivePassed": sum(case["objectiveStatus"] == "passed" for case in cases),
        "meanSeconds": statistics.mean(elapsed) if elapsed else None,
        "medianSeconds": statistics.median(elapsed) if elapsed else None,
        "p95Seconds": elapsed[math.ceil(len(elapsed) * .95) - 1] if elapsed else None,
        "meanEstimatedUsd": statistics.mean(t["estimatedUsd"] for t in successful) if successful else None,
        "meanUncachedEquivalentUsd": statistics.mean(t["uncachedEquivalentUsd"] for t in successful) if successful else None,
        "totalEstimatedUsd": sum(t["estimatedUsd"] for t in turns),
        "judgeEstimatedUsdWithoutCacheDiscount": judge_cost,
        "inputTokens": sum(t["inputTokens"] for t in turns),
        "cachedInputTokens": sum(t["cachedInputTokens"] for t in turns),
        "outputTokens": sum(t["outputTokens"] for t in turns),
        "modelCalls": sum(t["modelCalls"] for t in turns),
        "cases": cases, "turns": turns,
        "limitations": ["USD values are rate-card estimates, not billed Azure charges.",
                        "Uncached equivalent changes pricing only; it does not measure cold-cache latency.",
                        "Latency covers the application turn through full reply, excluding judge and database setup.",
                        "Semantic judge is fixed to GPT-5.6 Luna and is not calibrated against human ratings.",
                        "Judge cost assumes uncached input because the judge report does not record cached tokens.",
                        "Failed/incomplete turns are excluded from successful-turn averages; their consumed tokens may be incomplete."],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--prices", type=float, nargs=3, required=True, metavar=("INPUT", "CACHED", "OUTPUT"))
    args = parser.parse_args()
    print(json.dumps(summarize(args.directory, tuple(args.prices)), ensure_ascii=False, indent=2))
