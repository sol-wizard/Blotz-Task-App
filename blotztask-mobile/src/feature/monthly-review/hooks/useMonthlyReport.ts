import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, isSameMonth, startOfMonth } from "date-fns";
import { monthlyReviewKeys } from "@/shared/constants/query-key-factory";
import {
  fetchMonthlyReview,
  generateMonthlyReview,
} from "@/feature/monthly-review/services/monthly-review-service";
import { MonthlyReviewDTO } from "@/feature/monthly-review/models/monthly-review-dto";

export function useMonthlyReport() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));

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

  const isAtCurrentMonth = isSameMonth(selectedMonth, new Date());

  return {
    selectedMonth,
    report: reportQuery.data ?? null,
    isLoading: reportQuery.isLoading,
    isError: reportQuery.isError,
    refetch: reportQuery.refetch,
    isAtCurrentMonth,
    goPrev: () => setSelectedMonth((m) => addMonths(m, -1)),
    goNext: () => {
      if (!isAtCurrentMonth) setSelectedMonth((m) => addMonths(m, 1));
    },
    generate: () => generateMutation.mutate(),
    isGenerating: generateMutation.isPending,
  };
}
