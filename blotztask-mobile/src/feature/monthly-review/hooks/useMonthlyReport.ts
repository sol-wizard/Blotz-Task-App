import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { monthlyReviewKeys } from "@/shared/constants/query-key-factory";
import {
  fetchMonthlyReview,
  generateMonthlyReview,
} from "@/feature/monthly-review/services/monthly-review-service";
import { MonthlyReviewDTO } from "@/feature/monthly-review/models/monthly-review-dto";

export function useMonthlyReport(selectedMonth: Date) {
  const queryClient = useQueryClient();

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth() + 1;

  const reportQuery = useQuery<MonthlyReviewDTO | null>({
    queryKey: monthlyReviewKeys.byMonth(year, month),
    queryFn: () => fetchMonthlyReview(year, month),
  });

  // TODO: temporary user-triggered generation for testing. Remove once PBI 8A
  // scheduled backend trigger generates reports automatically.
  const generateMutation = useMutation<MonthlyReviewDTO, Error, void>({
    mutationFn: () => generateMonthlyReview(year, month),
    onSuccess: (data) => {
      queryClient.setQueryData(monthlyReviewKeys.byMonth(year, month), data);
    },
  });

  return {
    report: reportQuery.data ?? null,
    isLoading: reportQuery.isLoading,
    generate: () => generateMutation.mutate(),
    isGenerating: generateMutation.isPending,
  };
}
