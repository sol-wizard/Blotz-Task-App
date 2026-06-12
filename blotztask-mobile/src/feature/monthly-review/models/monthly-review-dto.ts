export type ReviewPeriodType = "weekly" | "monthly";

// Mirrors the backend ReviewReportDto. Local bounds are "YYYY-MM-DD" calendar dates;
// letter/generatedAtUtc are null until the review has been generated.
export type ReviewReportDTO = {
  periodType: ReviewPeriodType;
  periodStartLocal: string;
  periodEndLocalExclusive: string;
  letter: string | null;
  isLowActivity: boolean;
  generatedAtUtc: string | null;
};
