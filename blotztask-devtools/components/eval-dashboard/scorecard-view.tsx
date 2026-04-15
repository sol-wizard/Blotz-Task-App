import type { EvalScorecard } from "@/types/eval";
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
  return <ResultsTable results={scorecard.results} expandedRows={expandedRows} onToggle={onToggle} />;
};
