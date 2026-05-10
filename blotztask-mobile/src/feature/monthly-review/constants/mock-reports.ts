import { MonthlyReportDto } from "../models/monthly-report-dto";

// Key format: "YYYY-MM". Replace with API call later.
export const MOCK_REPORTS: Record<string, MonthlyReportDto> = {
  "2026-04": {
    summary:
      "This month you showed up for yourself in a real way. You completed 87 tasks across work, study and personal life — but more than the count, what stood out was your consistency. You opened Blotz on 26 of 30 days, and on the busiest weeks you still kept your mornings calm by planning the night before.",
    closing:
      "Take a breath, look back, and let yourself feel proud. Next month is another page — we'll be right here when you're ready to write it.",
  },
  "2026-03": {
    summary:
      "March was a month of finding your rhythm. You experimented with grouping tasks by energy level instead of by deadline, and the result was visible: fewer late-night catch-ups, more time for the things that matter outside the to-do list.",
    closing:
      "Small structural changes paid off this month. Keep noticing what works — that awareness is the real win.",
  },
  "2026-02": {
    summary:
      "February was a quieter month, and that's worth honouring too. You finished 41 tasks, mostly carrying long-running projects forward a little at a time. Slow progress is still progress.",
    closing: "Rest counts. See you in March.",
  },
};
