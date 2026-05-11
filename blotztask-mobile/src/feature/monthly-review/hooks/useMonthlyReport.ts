import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addMonths, isSameMonth, startOfMonth } from "date-fns";
import { monthlyReviewKeys } from "@/shared/constants/query-key-factory";
import { fetchMonthlyReview } from "@/feature/monthly-review/services/monthly-review-service";
import { MonthlyReviewDTO } from "@/feature/monthly-review/models/monthly-review-dto";

export function useMonthlyReport() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => startOfMonth(new Date()));

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth() + 1;

  const reportQuery = useQuery<MonthlyReviewDTO | null>({
    queryKey: monthlyReviewKeys.byMonth(year, month),
    queryFn: () => fetchMonthlyReview(year, month),
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
  };
}
