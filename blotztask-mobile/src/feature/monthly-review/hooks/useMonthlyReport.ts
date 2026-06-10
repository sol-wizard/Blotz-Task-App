import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { monthlyReviewKeys } from "@/shared/constants/query-key-factory";
import {
  fetchMonthlyReview,
  generateMonthlyReview,
} from "@/feature/monthly-review/services/monthly-review-service";
import { MonthlyReviewDTO } from "@/feature/monthly-review/models/monthly-review-dto";

export function useMonthlyReport(selectedMonth: Date, enabled = true) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("settings");

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth() + 1;

  const reportQuery = useQuery<MonthlyReviewDTO | null>({
    queryKey: monthlyReviewKeys.byMonth(year, month),
    queryFn: () => fetchMonthlyReview(year, month),
    enabled,
  });

  const generateMutation = useMutation<MonthlyReviewDTO, Error, void>({
    mutationFn: () => generateMonthlyReview(year, month),
    onSuccess: (data) => {
      queryClient.setQueryData(monthlyReviewKeys.byMonth(year, month), data);
    },
    onError: (error) => {
      const quotaExceeded = isAxiosError(error) && error.response?.status === 429;
      Toast.show({
        type: "error",
        text1: t(quotaExceeded ? "monthlyReview.quotaError" : "monthlyReview.generateError"),
      });
    },
  });

  return {
    report: reportQuery.data ?? null,
    isLoading: reportQuery.isLoading,
    generate: () => generateMutation.mutate(),
    isGenerating: generateMutation.isPending,
  };
}
