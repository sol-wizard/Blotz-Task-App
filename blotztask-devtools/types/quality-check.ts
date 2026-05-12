export interface QualityCheckItem {
  field: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface QualityCheckExtractedTask {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  labelName: string;
}

export interface QualityCheckCaseResult {
  id: string;
  input: string;
  passed: boolean;
  totalTimeMs: number;
  initTimeMs: number;
  aiTimeMs: number;
  checks: QualityCheckItem[];
  extractedTasks: QualityCheckExtractedTask[];
  extractedNotes?: string[];
  // Populated only in reliability (multi-run) mode
  totalRuns?: number;
  passCount?: number;
  reliabilityRate?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface QualityCheckScorecard {
  modelId: string;
  totalCases: number;
  passed: number;
  failed: number;
  passRate: string;
  totalTimeMs: number;
  avgAiTimeMs: number;
  maxAiTimeMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  results: QualityCheckCaseResult[];
}
