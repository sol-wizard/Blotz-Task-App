import type { EvalScorecard } from "@/types/eval";
import { SummaryBar } from "./summary-bar";
import { ResultsTable } from "./results-table";

export const ScorecardView = ({
  scorecard,
  expandedRows,
  onToggle,
}: {
  scorecard: EvalScorecard;
  expandedRows: Set<string>;
  onToggle: (id: string) => void;
}) => {
  return (
    <div className="space-y-6">
      <SummaryBar scorecard={scorecard} />
      <ResultsTable results={scorecard.results} expandedRows={expandedRows} onToggle={onToggle} />
    </div>
  );
};
