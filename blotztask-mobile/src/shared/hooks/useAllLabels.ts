import { useQuery } from "@tanstack/react-query";
import { fetchAllLabel } from "../services/label-service";

export const useAllLabels = () => {
  const {
    data: labels,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["allLabels"],
    queryFn: () => fetchAllLabel(),
  });

  return {
    labels: labels ?? [],
    isLoading,
    loadingLabelError: isError,
  };
};
