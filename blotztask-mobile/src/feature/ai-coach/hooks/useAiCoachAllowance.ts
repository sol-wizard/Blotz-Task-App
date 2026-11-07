import { useQuery } from "@tanstack/react-query";
import { aiCoachKeys } from "@/shared/constants/query-key-factory";
import { getAllowance } from "../services/ai-coach-service";
import { AiCoachAllowanceDto } from "../models/ai-coach-allowance";

/**
 * Refetched after every coach turn (see ExecutionChatPanel), and on every mount: spend also moves
 * without a turn here (background digests, the monthly reset), so the app-wide Infinity staleTime
 * would keep showing an old percentage.
 */
export const useAiCoachAllowance = () => {
  const query = useQuery<AiCoachAllowanceDto>({
    queryKey: aiCoachKeys.allowance(),
    queryFn: getAllowance,
    staleTime: 0,
  });
  return { allowance: query.data, isAllowanceLoading: query.isLoading };
};
