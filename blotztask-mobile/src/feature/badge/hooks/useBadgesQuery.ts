import { useQuery } from "@tanstack/react-query";
import { badgeKeys } from "@/shared/constants/query-key-factory";
import { fetchAllBadges } from "../services/badge-service";

export const useBadgesQuery = () => {
  const { data: badges, isLoading } = useQuery({
    queryKey: badgeKeys.all,
    queryFn: () => fetchAllBadges(),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    badges: badges ?? [],
    isLoading,
  };
};
