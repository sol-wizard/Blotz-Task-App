import type { QualityCheckScorecard } from "@/types/quality-check";
import { ResultsTable } from "./results-table";

export const ScorecardView = ({
  scorecard,
  expandedRows,
  onToggle,
}: {
  scorecard: QualityCheckScorecard;
  expandedRows: Set<string>;
  onToggle: (id: string) => void;
}) => {
  return <ResultsTable results={scorecard.results} expandedRows={expandedRows} onToggle={onToggle} />;
};
