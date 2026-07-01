import { useQuery } from "@tanstack/react-query";
import { badgeKeys } from "@/shared/constants/query-key-factory";
import { fetchBadgeDetailById } from "../services/badge-service";

export const useBadgeDetailQuery = (badgeId: number | null) => {
  const badgeDetailQuery = useQuery({
    queryKey: badgeKeys.detail(badgeId ?? 0),
    queryFn: () => fetchBadgeDetailById(badgeId!),
    enabled: badgeId != null,
  });

  return {
    badgeDetail: badgeDetailQuery.data,
    isBadgeDetailLoading: badgeDetailQuery.isLoading,
    isBadgeDetailError: badgeDetailQuery.isError,
  };
};
