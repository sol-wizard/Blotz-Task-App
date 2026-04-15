export interface EvalCheck {
  field: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface EvalExtractedTask {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  labelName: string;
}

export interface EvalCaseResult {
  id: string;
  passed: boolean;
  totalTimeMs: number;
  initTimeMs: number;
  aiTimeMs: number;
  checks: EvalCheck[];
  extractedTasks: EvalExtractedTask[];
}

export interface EvalScorecard {
  totalCases: number;
  passed: number;
  failed: number;
  passRate: string;
  totalTimeMs: number;
  results: EvalCaseResult[];
}
