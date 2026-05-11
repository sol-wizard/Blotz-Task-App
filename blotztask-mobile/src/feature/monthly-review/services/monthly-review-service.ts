import { apiClient } from "@/shared/services/api/client";
import { MonthlyReviewDTO } from "@/feature/monthly-review/models/monthly-review-dto";

export const fetchMonthlyReview = async (
  year: number,
  month: number
): Promise<MonthlyReviewDTO | null> => {
  const url = `/MonthlyReview?year=${year}&month=${month}`;
  return await apiClient.get<MonthlyReviewDTO | null>(url);
};
