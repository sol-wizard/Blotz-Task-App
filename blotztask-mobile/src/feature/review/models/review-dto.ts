export enum ReviewPeriodType {
  Weekly = "weekly",
  Monthly = "monthly",
}

// Mirrors the backend ReviewReportDto. Local bounds are "YYYY-MM-DD" calendar dates;
// letter/generatedAtUtc are null until the review has been generated.
export type ReviewReportDTO = {
  periodType: ReviewPeriodType;
  periodStartLocal: string;
  periodEndLocalExclusive: string;
  // letter holds the body; theme and oneThingToTryNext are null on letters written before the
  // backend split them out. theme is also null on a period too quiet to name one, and
  // oneThingToTryNext when the data doesn't support a specific suggestion.
  letter: string | null;
  theme: string | null;
  oneThingToTryNext: string | null;
  // Counted live from the tasks, so it has a value even for a period with no letter.
  tasksCompleted: number;
  // Days in the period the app was opened, not necessarily consecutive. Null on weekly reviews
  // and on months before activity tracking started — hide the stat rather than show 0.
  daysActive: number | null;
  isLowActivity: boolean;
  generatedAtUtc: string | null;
};
