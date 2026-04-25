import { useQuery } from "@tanstack/react-query";
import { aiUsageKeys } from "@/shared/constants/query-key-factory";
import { getAiUsageSummary } from "@/shared/services/ai-usage-service";
import { AiUsageSummaryDTO } from "@/shared/models/ai-usage-summary-dto";

export const useAiUsageSummaryQuery = () => {
  const aiUsageSummaryQuery = useQuery<AiUsageSummaryDTO>({
    queryKey: aiUsageKeys.summary(),
    queryFn: getAiUsageSummary,
  });

  return {
    aiUsageSummary: aiUsageSummaryQuery.data,
    isAiUsageSummaryLoading: aiUsageSummaryQuery.isLoading,
  };
};
