export interface AiUsageSummaryDTO {
  usedTokens: number;
  totalLimit: number;
  remainingTokens: number;
  planName: string;
  periodStartDate: string;
  periodEndDate: string;
}
