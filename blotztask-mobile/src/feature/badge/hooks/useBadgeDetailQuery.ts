import { useQuery } from "@tanstack/react-query";
import { badgeKeys } from "@/shared/constants/query-key-factory";
import { fetchBadgeDetailById } from "../services/badge-service";
import { useTranslation } from "react-i18next";

export const useBadgeDetailQuery = (badgeId: number | null) => {
  const { i18n } = useTranslation();

  const badgeDetailQuery = useQuery({
    queryKey: [...badgeKeys.detail(badgeId ?? 0), i18n.language],
    queryFn: () => fetchBadgeDetailById(badgeId!),
    enabled: badgeId != null,
  });

  return {
    badgeDetail: badgeDetailQuery.data,
    isBadgeDetailLoading: badgeDetailQuery.isLoading,
    isBadgeDetailError: badgeDetailQuery.isError,
  };
};
