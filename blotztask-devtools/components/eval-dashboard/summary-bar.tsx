import type { EvalScorecard } from "@/types/eval";
import { StatCard } from "./stat-card";

export const SummaryBar = ({ scorecard }: { scorecard: EvalScorecard }) => {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <StatCard label="Total" value={scorecard.totalCases.toString()} />
      <StatCard label="Passed" value={scorecard.passed.toString()} variant="pass" />
      <StatCard label="Failed" value={scorecard.failed.toString()} variant="fail" />
      <StatCard label="Pass Rate" value={scorecard.passRate} />
      <StatCard label="Total Time" value={`${(scorecard.totalTimeMs / 1000).toFixed(1)}s`} />
    </div>
  );
};
