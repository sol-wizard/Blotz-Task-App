import { useQuery } from "@tanstack/react-query";
import { badgeKeys } from "@/shared/constants/query-key-factory";
import { fetchAllBadges } from "../services/badge-service";
import { useTranslation } from "react-i18next";

export const useBadgesQuery = () => {
  const { i18n } = useTranslation();

  const { data: badges, isLoading } = useQuery({
    queryKey: [...badgeKeys.all, i18n.language],
    queryFn: () => fetchAllBadges(),
  });

  return {
    badges: badges ?? [],
    isLoading,
  };
};
