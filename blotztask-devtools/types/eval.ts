export interface EvalCheck {
  field: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface EvalCaseResult {
  id: string;
  passed: boolean;
  timeMs: number;
  checks: EvalCheck[];
}

export interface EvalScorecard {
  totalCases: number;
  passed: number;
  failed: number;
  passRate: string;
  totalTimeMs: number;
  results: EvalCaseResult[];
}
