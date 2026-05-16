import { apiClient } from "@/shared/services/api/client";
import { MonthlyReviewDTO } from "@/feature/monthly-review/models/monthly-review-dto";

export const fetchMonthlyReview = async (
  year: number,
  month: number
): Promise<MonthlyReviewDTO | null> => {
  const url = `/MonthlyReview?year=${year}&month=${month}`;
  return await apiClient.get<MonthlyReviewDTO | null>(url);
};

// TODO: temporary — manual trigger for testing. Remove once PBI 8A scheduled
// trigger generates reports automatically.
export const generateMonthlyReview = async (
  year: number,
  month: number
): Promise<MonthlyReviewDTO> => {
  const url = `/MonthlyReview/generate?year=${year}&month=${month}`;
  return await apiClient.post<MonthlyReviewDTO>(url);
};
