import { useQuery } from "@tanstack/react-query";
import { fetchAllLabel } from "../services/label-service";
import { labelKeys } from "../constants/query-key-factory";

export const useAllLabels = () => {
  const { data: labels, isLoading } = useQuery({
    queryKey: labelKeys.all,
    queryFn: () => fetchAllLabel(),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return {
    labels: labels ?? [],
    isLoading,
  };
};
