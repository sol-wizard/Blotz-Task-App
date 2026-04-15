import type { EvalScorecard } from "@/types/eval";
import { StatCard } from "./stat-card";

export const SummaryBar = ({ scorecard }: { scorecard: EvalScorecard | null }) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <StatCard label="Total Cases" value={scorecard ? scorecard.totalCases.toString() : "—"} />
      <StatCard label="Correct" value={scorecard ? scorecard.passed.toString() : "—"} variant="pass" />
      <StatCard label="Incorrect" value={scorecard ? scorecard.failed.toString() : "—"} variant="fail" />
      <StatCard label="Accuracy" value={scorecard ? scorecard.passRate : "—"} />
      <StatCard label="Total Time" value={scorecard ? `${(scorecard.totalTimeMs / 1000).toFixed(1)}s` : "—"} />
    </div>
  );
};
