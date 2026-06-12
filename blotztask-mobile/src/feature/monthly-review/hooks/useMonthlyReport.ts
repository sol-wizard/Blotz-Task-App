import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { reviewKeys } from "@/shared/constants/query-key-factory";
import {
  fetchReview,
  generateReview,
} from "@/feature/monthly-review/services/monthly-review-service";
import {
  ReviewPeriodType,
  ReviewReportDTO,
} from "@/feature/monthly-review/models/monthly-review-dto";

// anchorDate: any date inside the period ("YYYY-MM-DD"); the backend snaps it to the
// canonical start. Callers normalize to the period start so the cache key is stable.
export function useReview(periodType: ReviewPeriodType, anchorDate: string, enabled = true) {
  const queryClient = useQueryClient();
  const { t } = useTranslation("settings");

  const queryKey = reviewKeys.byPeriod(periodType, anchorDate);

  const reportQuery = useQuery<ReviewReportDTO>({
    queryKey,
    queryFn: () => fetchReview(periodType, anchorDate),
    enabled,
  });

  const generateMutation = useMutation<ReviewReportDTO, Error, void>({
    mutationFn: () => generateReview(periodType, anchorDate),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
    onError: (error) => {
      const quotaExceeded = isAxiosError(error) && error.response?.status === 429;
      Toast.show({
        type: "error",
        text1: t(quotaExceeded ? "review.quotaError" : "review.generateError"),
      });
    },
  });

  // The endpoint always returns the resolved period; a review only exists once its letter is set.
  const report = reportQuery.data?.letter != null ? reportQuery.data : null;

  return {
    report,
    isLoading: reportQuery.isLoading,
    generate: () => generateMutation.mutate(),
    isGenerating: generateMutation.isPending,
  };
}
